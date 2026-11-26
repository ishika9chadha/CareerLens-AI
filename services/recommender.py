"""Job recommender scoring a resume against career roles in data/jobs.csv."""

import csv
import os

DEFAULT_CAREER_ROLES = [
    {
        "job_id": "role_1",
        "id": "role_1",
        "title": "Software Engineer",
        "description": "Build scalable web applications, REST APIs, and reliable software systems.",
        "required_skills": ["python", "javascript", "sql", "git", "rest api"],
        "nice_to_have_skills": ["docker", "react", "aws", "typescript"],
        "min_experience": 1.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_2",
        "id": "role_2",
        "title": "Data Scientist",
        "description": "Analyze complex datasets, build statistical and machine learning models, and evaluate experiments.",
        "required_skills": ["python", "machine learning", "sql", "pandas", "statistics"],
        "nice_to_have_skills": ["scikit-learn", "deep learning", "data visualization"],
        "min_experience": 2.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_3",
        "id": "role_3",
        "title": "Machine Learning Engineer",
        "description": "Design, train, and deploy production machine learning, deep learning, and NLP pipelines.",
        "required_skills": ["python", "machine learning", "pytorch", "docker", "aws"],
        "nice_to_have_skills": ["deep learning", "kubernetes", "fastapi", "natural language processing"],
        "min_experience": 3.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_4",
        "id": "role_4",
        "title": "Full Stack Developer",
        "description": "Develop responsive frontends and scalable backend services with relational databases.",
        "required_skills": ["javascript", "typescript", "react", "node.js", "postgresql", "rest api"],
        "nice_to_have_skills": ["docker", "aws", "redis", "graphql"],
        "min_experience": 2.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_5",
        "id": "role_5",
        "title": "Frontend Developer",
        "description": "Create responsive, accessible user interfaces and component systems for web apps.",
        "required_skills": ["javascript", "react", "html", "css", "git"],
        "nice_to_have_skills": ["typescript", "tailwind css", "figma"],
        "min_experience": 1.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_6",
        "id": "role_6",
        "title": "Backend Developer",
        "description": "Build backend microservices, APIs, authentication, and database schemas.",
        "required_skills": ["python", "sql", "rest api", "git", "postgresql"],
        "nice_to_have_skills": ["fastapi", "django", "docker", "redis"],
        "min_experience": 2.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_7",
        "id": "role_7",
        "title": "DevOps & Cloud Engineer",
        "description": "Automate cloud infrastructure, container orchestration, and CI/CD delivery pipelines.",
        "required_skills": ["aws", "docker", "kubernetes", "ci/cd", "linux"],
        "nice_to_have_skills": ["terraform", "ansible", "github actions"],
        "min_experience": 3.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_8",
        "id": "role_8",
        "title": "Data Analyst",
        "description": "Clean datasets, write SQL queries, and build BI dashboards for business decisions.",
        "required_skills": ["sql", "python", "pandas", "power bi", "excel"],
        "nice_to_have_skills": ["tableau", "statistics", "data visualization"],
        "min_experience": 1.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_9",
        "id": "role_9",
        "title": "Product Manager",
        "description": "Define product roadmaps, PRDs, and success metrics alongside engineering and design.",
        "required_skills": ["product management", "agile", "scrum", "sql", "communication"],
        "nice_to_have_skills": ["figma", "a/b testing", "jira"],
        "min_experience": 3.0,
        "education": "Bachelor's",
    },
    {
        "job_id": "role_10",
        "id": "role_10",
        "title": "UI/UX Designer",
        "description": "Conduct user research, create wireframes and interactive prototypes, and maintain design systems.",
        "required_skills": ["figma", "ui/ux", "wireframing", "prototyping", "user research"],
        "nice_to_have_skills": ["design systems", "css"],
        "min_experience": 1.0,
        "education": "Bachelor's",
    },
]


def _safe_float(val, default: float = 0.0) -> float:
    if val is None or val == "":
        return default
    try:
        return float(str(val).strip().rstrip("+"))
    except ValueError:
        return default


def _split_skills(val) -> list[str]:
    if isinstance(val, list):
        return [str(s).strip() for s in val if str(s).strip()]
    if not val:
        return []
    sep = ";" if ";" in str(val) else ","
    return [s.strip() for s in str(val).split(sep) if s.strip()]


class JobRecommender:
    """Ranks top matching roles from data/jobs.csv for a parsed resume."""

    def __init__(self, jobs_csv_path: str, matcher):
        self.jobs_csv_path = jobs_csv_path
        self.matcher = matcher
        self.jobs = self._load_jobs()

    def _load_jobs(self) -> list[dict]:
        if not self.jobs_csv_path or not os.path.exists(self.jobs_csv_path):
            return [dict(r) for r in DEFAULT_CAREER_ROLES]

        roles = []
        with open(self.jobs_csv_path, "r", encoding="utf-8-sig") as f:
            for idx, row in enumerate(csv.DictReader(f), start=1):
                norm_row = {
                    (k or "").strip().lower(): (v or "").strip()
                    for k, v in row.items()
                }
                title = (
                    norm_row.get("title")
                    or norm_row.get("role")
                    or norm_row.get("job_title")
                    or norm_row.get("role_title")
                    or norm_row.get("name")
                    or ""
                ).strip()
                if not title:
                    continue

                req = _split_skills(norm_row.get("required_skills") or norm_row.get("must_have_skills") or "")
                nice = _split_skills(norm_row.get("nice_to_have_skills") or norm_row.get("nice_to_have") or "")
                job_id = (norm_row.get("job_id") or norm_row.get("id") or f"role_{idx}").strip()

                roles.append({
                    "job_id": job_id,
                    "id": job_id,
                    "title": title,
                    "description": (norm_row.get("description") or norm_row.get("jd_text") or "").strip(),
                    "required_skills": req,
                    "nice_to_have_skills": nice,
                    "min_experience": _safe_float(
                        norm_row.get("min_experience") or norm_row.get("min_exp"),
                        0.0,
                    ),
                    "education": (norm_row.get("education") or "Bachelor's").strip(),
                })

        return roles if roles else [dict(r) for r in DEFAULT_CAREER_ROLES]

    def get_all_jobs(self) -> list[dict]:
        return self.jobs

    def recommend_top_roles(self, parsed_resume: dict, top_k: int = 5) -> list[dict]:
        scored = []
        for idx, job in enumerate(self.jobs, start=1):
            title = (job.get("title") or job.get("role") or job.get("job_title") or f"Role {idx}").strip()
            job_id = job.get("job_id") or job.get("id") or f"role_{idx}"
            min_exp = _safe_float(job.get("min_experience") or job.get("min_exp"), 0.0)

            res = self.matcher.match_candidate(
                parsed_resume=parsed_resume,
                jd_text=f"{title}. {job.get('description', '')}",
                must_have=job.get("required_skills", []),
                nice_to_have=job.get("nice_to_have_skills", []),
                min_exp=min_exp,
                req_edu=job.get("education") or "Bachelor's",
            )
            matched = res["skills"]["matched_skills"]
            missing = res["skills"]["missing_must"]
            reason = f"Matches {', '.join(matched[:4])}." if matched else "Aligned with foundational profile."
            if missing:
                reason += f" Add {', '.join(missing[:2])} to strengthen fit."

            scored.append({
                "job_id": job_id,
                "id": job_id,
                "title": title,
                "match_score": res["final_score"],
                "matched_skills": matched,
                "missing_skills": res["skills"]["missing_skills"],
                "min_experience": min_exp,
                "reason": reason,
            })

        scored.sort(key=lambda r: r["match_score"], reverse=True)
        return scored[:top_k]