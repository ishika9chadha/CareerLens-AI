"""Skill taxonomy lookup, skill extraction, and candidate-to-role matching."""

import json
import os
import re


class SkillMatcher:
    def __init__(self, skills_json_path: str = "data/skills.json"):
        self.skills_json_path = skills_json_path
        self.data = self._load_skills()
        self.taxonomy: dict[str, list[str]] = self.data.get("taxonomy", {})
        self.aliases: dict[str, str] = {
            k.lower(): v for k, v in self.data.get("aliases", {}).items()
        }
        self.canonical_skills: list[str] = [
            skill for skills in self.taxonomy.values() for skill in skills
        ]

    def _load_skills(self) -> dict:
        if os.path.exists(self.skills_json_path):
            with open(self.skills_json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "taxonomy": {
                "PROGRAMMING": ["Python", "Java", "C++", "JavaScript"],
                "WEB DEVELOPMENT": ["HTML", "CSS", "React", "Node.js"],
                "DATA & AI": ["Machine Learning", "Data Analysis", "SQL", "Deep Learning"],
                "TOOLS": ["Git", "GitHub", "Docker", "Excel"],
            },
            "aliases": {
                "js": "JavaScript",
                "reactjs": "React",
                "react.js": "React",
                "node": "Node.js",
                "nodejs": "Node.js",
                "ml": "Machine Learning",
                "dl": "Deep Learning",
                "postgres": "SQL",
                "postgresql": "SQL",
                "mysql": "SQL",
            },
        }

    def get_taxonomy(self) -> dict[str, list[str]]:
        return self.taxonomy

    def extract_skills(self, text: str) -> list[str]:
        """Extract canonical skills from resume text using word boundaries and aliases."""
        lower_text = (text or "").lower()
        found = set()

        for skill in self.canonical_skills:
            escaped = re.escape(skill.lower())
            pattern = rf"(^|[^a-zA-Z0-9+#]){escaped}([^a-zA-Z0-9+#]|$)"
            if re.search(pattern, lower_text):
                found.add(skill)

        for alias, canonical in self.aliases.items():
            escaped = re.escape(alias)
            pattern = rf"(^|[^a-zA-Z0-9+#]){escaped}([^a-zA-Z0-9+#]|$)"
            if re.search(pattern, lower_text):
                found.add(canonical)

        return sorted(found)

    def evaluate_match(self, candidate_skills: list[str], target_skills: list[str]) -> dict:
        """Compute matched skills, missing skills, and percentage fit."""
        cand_lower = {s.lower().strip() for s in candidate_skills if s.strip()}
        cleaned_targets = [s.strip() for s in target_skills if s.strip()]

        if not cleaned_targets:
            return {"matched": [], "missing": [], "score": 100}

        matched = [t for t in cleaned_targets if t.lower() in cand_lower]
        missing = [t for t in cleaned_targets if t.lower() not in cand_lower]
        score = round((len(matched) / len(cleaned_targets)) * 100)

        return {
            "matched": matched,
            "missing": missing,
            "score": score,
        }

    def infer_candidate_name(self, filename: str, text: str) -> str:
        """Infer clean candidate name from the top line of text or filename."""
        lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
        if lines:
            first_line = lines[0]
            if 2 <= len(first_line.split()) <= 4 and len(first_line) <= 40 and "@" not in first_line:
                return first_line.title()

        base = re.sub(r"\.(pdf|docx|doc|txt)$", "", filename or "Candidate", flags=re.I)
        parts = [
            p for p in re.split(r"[_-]+", base)
            if p and p.lower() not in {"sample", "resumes", "resume", "cv"}
        ]
        return " ".join(parts).strip() or "Candidate"