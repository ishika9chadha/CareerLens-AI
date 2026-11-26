"""Role catalog manager for Recruiter presets and Candidate opportunities."""

import json
import os


class RoleService:
    def __init__(self, roles_json_path: str = "data/roles.json"):
        self.roles_json_path = roles_json_path
        self.roles = self._load_roles()

    def _load_roles(self) -> list[dict]:
        if os.path.exists(self.roles_json_path):
            with open(self.roles_json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _save_roles(self) -> None:
        os.makedirs(os.path.dirname(self.roles_json_path), exist_ok=True)
        with open(self.roles_json_path, "w", encoding="utf-8") as f:
            json.dump(self.roles, f, indent=2)

    def get_all_roles(self) -> list[dict]:
        return self.roles

    def add_or_update_role(
        self,
        role_id: str,
        title: str,
        company: str,
        location: str,
        experience: str,
        description: str,
        required_skills: list[str],
    ) -> dict:
        role_obj = {
            "id": role_id,
            "title": title,
            "company": company,
            "location": location,
            "experience": experience,
            "description": description,
            "required_skills": required_skills,
        }
        for idx, existing in enumerate(self.roles):
            if existing.get("id") == role_id or existing.get("title", "").lower() == title.lower():
                self.roles[idx] = role_obj
                self._save_roles()
                return role_obj

        self.roles.insert(0, role_obj)
        self._save_roles()
        return role_obj