"""NLP and Regex entity extraction for resumes and job descriptions."""

import json
import os
import re
from datetime import datetime

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "in", "out", "on", "off", "over", "under", "again",
    "further", "once", "here", "there", "where", "why", "how", "all", "any",
    "both", "each", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
    "t", "can", "will", "just", "don", "should", "now", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "having", "do",
    "does", "did", "doing", "as", "of", "this", "that", "these", "those",
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "he",
    "him", "his", "she", "her", "it", "its", "they", "them", "their", "what",
    "which", "who", "whom", "using", "used", "use", "work", "working", "worked",
    "experience", "experienced", "role", "team", "project", "projects", "skills"
}


class ResumeExtractor:
    """Extracts structured candidate profile fields and normalized skills."""

    def __init__(self, skills_path: str = "data/skills.json"):
        with open(skills_path, "r", encoding="utf-8") as f:
            self.skills_taxonomy = json.load(f)

        self.alias_to_canonical = {}
        self.canonical_to_category = {}
        self._build_lookup_tables()

    def _build_lookup_tables(self):
        """Map canonical skill names and all aliases to normalized canonical names."""
        for category, skills_dict in self.skills_taxonomy.items():
            for canonical, aliases in skills_dict.items():
                norm_canon = canonical.lower().strip()
                self.canonical_to_category[norm_canon] = category
                self.alias_to_canonical[norm_canon] = norm_canon
                for alias in aliases:
                    self.alias_to_canonical[alias.lower().strip()] = norm_canon

        self.sorted_terms = sorted(
            self.alias_to_canonical.keys(), key=len, reverse=True
        )

    def preprocess_text(self, text: str) -> str:
        """Lowercase, clean noise, tokenize, and remove stopwords for TF-IDF."""
        text = text.lower()
        text = re.sub(r"http\S+|www\.\S+", " ", text)
        text = re.sub(r"\S+@\S+", " ", text)
        text = re.sub(r"[^a-z0-9\+\#\.\-\s]", " ", text)
        tokens = text.split()
        cleaned = [
            tok.strip(".-")
            for tok in tokens
            if tok.strip(".-") and tok.strip(".-") not in STOPWORDS and len(tok) > 1
        ]
        return " ".join(cleaned)

    def extract_skills(self, text: str) -> dict:
        """
        Extract canonical skills and group them by category.
        Uses boundary-safe regex matching to handle symbols like C++, C#, .NET.
        """
        lower_text = text.lower()
        found_canonical = set()

        for term in self.sorted_terms:
            escaped = re.escape(term)
            pattern = rf"(?<![a-z0-9\+\#]){escaped}(?![a-z0-9\+\#])"
            if re.search(pattern, lower_text):
                found_canonical.add(self.alias_to_canonical[term])

        categorized = {}
        for skill in sorted(found_canonical):
            cat = self.canonical_to_category.get(skill, "other")
            categorized.setdefault(cat, []).append(skill)

        return {
            "all_skills": sorted(found_canonical),
            "by_category": categorized,
        }

    def extract_contact_info(self, text: str, filename: str = "") -> dict:
        """Extract candidate name, email, phone, and links."""
        email_match = re.search(
            r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text
        )
        phone_match = re.search(
            r"(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{3,5}\)?[\s\-]?)?\d{3,5}[\s\-]?\d{4,5}",
            text,
        )
        linkedin_match = re.search(
            r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_%]+", text, re.I
        )
        github_match = re.search(
            r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9\-_]+", text, re.I
        )

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        name = ""
        skip_words = {
            "resume", "curriculum", "vitae", "cv", "profile", "summary",
            "contact", "email", "phone", "address", "objective"
        }
        for line in lines[:6]:
            clean_line = re.sub(r"[^a-zA-Z\s\.]", "", line).strip()
            words = clean_line.split()
            if (
                2 <= len(words) <= 4
                and not any(w.lower() in skip_words for w in words)
                and "@" not in line
                and not any(char.isdigit() for char in line)
            ):
                name = clean_line.title()
                break

        if not name and filename:
            base = os.path.splitext(os.path.basename(filename))[0]
            base = re.sub(r"\(\d+\)", " ", base)
            parts = [p for p in re.split(r"[\s_-]+", base) if p.isalpha()][:2]
            if len(parts) >= 2:
                name = " ".join(p.capitalize() for p in parts)

        if not name:
            name = "Candidate"

        return {
            "name": name,
            "email": email_match.group(0) if email_match else "Not provided",
            "phone": phone_match.group(0).strip() if phone_match else "Not provided",
            "linkedin": linkedin_match.group(0) if linkedin_match else "",
            "github": github_match.group(0) if github_match else "",
        }

    def extract_experience_years(self, text: str) -> float:
        """Estimate total years of experience from explicit mentions or date ranges."""
        explicit_matches = re.findall(
            r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp|work)",
            text.lower(),
        )
        if explicit_matches:
            return round(max(float(x) for x in explicit_matches), 1)

        exp_section = text
        sec_match = re.search(
            r"(?:experience|employment|work history)(.*?)(?:education|projects|skills|certifications|$)",
            text,
            re.I | re.S,
        )
        if sec_match and len(sec_match.group(1).strip()) > 30:
            exp_section = sec_match.group(1)

        current_year = datetime.now().year
        ranges = re.findall(
            r"(20\d{2})\s*[\-–to]+\s*(20\d{2}|present|current|till date)",
            exp_section.lower(),
        )
        total_years = 0.0
        for start_str, end_str in ranges:
            start_yr = int(start_str)
            end_yr = current_year if end_str in {"present", "current", "till date"} else int(end_str)
            if 2000 <= start_yr <= end_yr <= current_year + 1:
                total_years += max(0.5, float(end_yr - start_yr))

        return round(min(total_years, 30.0), 1)

    def extract_education(self, text: str) -> dict:
        """Extract highest degree level, degree text, and institution."""
        degree_patterns = [
            (r"\b(?:ph\.?d|doctorate)\b", "PhD", 4),
            (r"\b(?:m\.?tech|m\.?s\.?|m\.?sc|mca|mba|master'?s)\b", "Master's", 3),
            (r"\b(?:b\.?tech|b\.?e\.?|b\.?sc|bca|bachelor'?s|b\.?a\.?)\b", "Bachelor's", 2),
            (r"\b(?:diploma|associate)\b", "Diploma", 1),
        ]
        highest_level = "Not specified"
        rank = 0
        degree_line = ""

        for line in text.splitlines():
            for pat, label, lvl_rank in degree_patterns:
                if re.search(pat, line, re.I) and lvl_rank > rank:
                    rank = lvl_rank
                    highest_level = label
                    degree_line = line.strip()

        institution = "Not specified"
        inst_match = re.search(
            r"([A-Z][A-Za-z&\s,.-]{3,60}(?:University|Institute of Technology|College|School of|IIT|NIT|IIIT|BITS)[A-Za-z\s,.-]{0,30})",
            text,
        )
        if inst_match:
            institution = inst_match.group(1).strip(" ,.-")

        return {
            "level": highest_level,
            "rank": rank,
            "degree_detail": degree_line[:120] if degree_line else highest_level,
            "institution": institution,
        }

    def extract_certifications_and_projects(self, text: str) -> dict:
        """Extract lists of certifications and project titles."""
        certifications = []
        cert_sec = re.search(
            r"(?:certifications?|licenses?|achievements?)\s*:?\s*\n(.*?)(?:\n\s*[A-Z][A-Za-z\s]{2,25}\s*:?\s*\n|$)",
            text,
            re.I | re.S,
        )
        if cert_sec:
            for line in cert_sec.group(1).splitlines():
                clean = line.strip("•-* \t")
                if 4 < len(clean) < 110:
                    certifications.append(clean)

        projects = []
        proj_sec = re.search(
            r"(?:projects?|personal projects?|academic projects?)\s*:?\s*\n(.*?)(?:\n\s*(?:education|experience|skills|certifications?|achievements?)\s*:?\s*\n|$)",
            text,
            re.I | re.S,
        )
        if proj_sec:
            for line in proj_sec.group(1).splitlines():
                clean = line.strip("•-* \t")
                if 5 < len(clean) < 95 and not clean.lower().startswith(("built ", "developed ", "implemented ", "designed ", "created ")):
                    projects.append(clean)

        return {
            "certifications": certifications[:6],
            "projects": projects[:6],
        }

    def parse_resume(self, raw_text: str, filename: str = "") -> dict:
        """Full structured extraction pipeline for a resume."""
        contact = self.extract_contact_info(raw_text, filename=filename)
        skills_info = self.extract_skills(raw_text)
        experience_years = self.extract_experience_years(raw_text)
        education = self.extract_education(raw_text)
        extras = self.extract_certifications_and_projects(raw_text)
        cleaned_text = self.preprocess_text(raw_text)

        return {
            "name": contact["name"],
            "email": contact["email"],
            "phone": contact["phone"],
            "linkedin": contact["linkedin"],
            "github": contact["github"],
            "skills": skills_info["all_skills"],
            "skills_by_category": skills_info["by_category"],
            "experience_years": experience_years,
            "education": education,
            "certifications": extras["certifications"],
            "projects": extras["projects"],
            "raw_text": raw_text,
            "cleaned_text": cleaned_text,
        }