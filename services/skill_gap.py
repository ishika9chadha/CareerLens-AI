"""Prioritized Skill Gap Analysis & Actionable Learning Roadmap Generator."""


LEARNING_RESOURCES = {
    "python": ("Interactive Coding + Official Docs", "2-3 weeks", "Core language for backend, scripting, and AI workflows."),
    "javascript": ("MDN Web Docs + Frontend Mini-Projects", "2-3 weeks", "Essential for interactive web applications."),
    "typescript": ("TypeScript Handbook + React TS Migration", "1-2 weeks", "Adds compile-time type safety to large codebases."),
    "react": ("Official React Docs (react.dev) + Full-Stack Clone", "3-4 weeks", "Industry standard for component-driven UI engineering."),
    "node.js": ("Node.js Docs + REST API Capstone", "2 weeks", "Enables JavaScript execution on server environments."),
    "fastapi": ("FastAPI Official Tutorial + OpenAPI Project", "1 week", "High-performance Python framework for ML & REST APIs."),
    "sql": ("SQLBolt + LeetCode Database Top 50", "1-2 weeks", "Foundational for querying and modeling relational data."),
    "postgresql": ("PostgreSQL Tutorial + Indexing Practice", "1-2 weeks", "Production-grade relational database used across startups and enterprises."),
    "docker": ("Docker Get Started Guide + Multi-Stage Builds", "1 week", "Ensures reproducible environments across dev and production."),
    "kubernetes": ("Kubernetes Basics + Minikube Lab", "3-4 weeks", "Standard orchestrator for containerized microservices."),
    "aws": ("AWS Cloud Practitioner + Free Tier Hands-On Labs", "3-4 weeks", "Dominant cloud platform for compute, storage, and deployment."),
    "machine learning": ("Andrew Ng ML Specialization + Kaggle Competitions", "4-6 weeks", "Core foundation for predictive modeling and feature engineering."),
    "pytorch": ("PyTorch 60-Minute Blitz + Custom Neural Net", "2-3 weeks", "Preferred deep learning framework for research and production AI."),
    "large language models": ("Hugging Face NLP Course + RAG Pipeline Build", "2-3 weeks", "High-demand skill for building modern generative AI apps."),
    "langchain": ("LangChain Docs + Document QA Bot", "1-2 weeks", "Accelerates orchestration of LLM prompts, tools, and vector stores."),
    "git": ("Pro Git Book + GitHub Branching Workflow", "3-4 days", "Mandatory version control skill for collaborative engineering."),
    "terraform": ("HashiCorp Terraform Tutorials + AWS VPC Lab", "2 weeks", "Automates repeatable cloud infrastructure provisioning."),
    "apache spark": ("Databricks PySpark Intro + ETL Pipeline", "2-3 weeks", "Enables distributed big data processing at scale."),
    "tableau": ("Tableau Public Gallery + Sales Dashboard Project", "1-2 weeks", "Communicates complex business metrics visually to stakeholders."),
    "power bi": ("Microsoft Learn Power BI Path", "1-2 weeks", "Enterprise standard for business intelligence reporting."),
}


class SkillGapAnalyzer:
    """Orders missing skills by importance and creates a structured learning roadmap."""

    def __init__(self, extractor):
        self.extractor = extractor

    def analyze(self, missing_must: list, missing_nice: list) -> list:
        """Return prioritized learning roadmap items for missing skills."""
        roadmap = []

        for skill in missing_must:
            roadmap.append(self._build_item(skill, priority="High (Must-Have)"))

        for skill in missing_nice:
            roadmap.append(self._build_item(skill, priority="Medium (Nice-to-Have)"))

        return roadmap

    def _build_item(self, skill: str, priority: str) -> dict:
        norm = skill.lower().strip()
        category = self.extractor.canonical_to_category.get(norm, "technical")

        if norm in LEARNING_RESOURCES:
            res_type, est_time, why = LEARNING_RESOURCES[norm]
        else:
            res_type = f"Official {skill.title()} Documentation + Guided Hands-On Project"
            est_time = "1-2 weeks" if category in {"tools", "databases"} else "2-3 weeks"
            why = f"Directly listed in the job requirements under {category.replace('_', ' ')} competencies."

        return {
            "skill": skill,
            "priority": priority,
            "category": category.replace("_", " ").title(),
            "why_it_matters": why,
            "resource_type": res_type,
            "estimated_time": est_time,
        }