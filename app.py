"""
Career Lens — Flask Backend Server
Supports PDF/DOCX/TXT resume parsing, skill-first candidate ranking,
recruiter job creation, and candidate career portal fit scoring.
"""

import os
import sqlite3
import uuid
from datetime import datetime
from flask import Flask, jsonify, render_template, request

from services.parser import extract_resume_text
from services.skill_matcher import SkillMatcher
from services.role_service import RoleService

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB max upload
DB_PATH = "career_lens.db"

skill_matcher = SkillMatcher("data/skills.json")
role_service = RoleService("data/roles.json")


def init_db() -> None:
    """Initialize SQLite storage for custom roles and candidate interest."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS candidate_interests (
            id TEXT PRIMARY KEY,
            role_id TEXT,
            role_title TEXT,
            candidate_skills TEXT,
            fit_score REAL,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/meta", methods=["GET"])
def api_meta():
    """Return skill taxonomy and active roles for Recruiter & Candidate portals."""
    return jsonify({
        "taxonomy": skill_matcher.get_taxonomy(),
        "roles": role_service.get_all_roles(),
    })


@app.route("/api/parse", methods=["POST"])
def api_parse():
    """Parse a single uploaded resume (.pdf, .docx, .doc, .txt) and detect skills."""
    if "resume" not in request.files or not request.files["resume"].filename:
        return jsonify({"error": "No resume file uploaded."}), 400

    file_storage = request.files["resume"]
    filename = file_storage.filename
    file_bytes = file_storage.read()

    if not file_bytes:
        return jsonify({"error": "Uploaded file is empty."}), 400

    text = extract_resume_text(filename, file_bytes)
    detected_skills = skill_matcher.extract_skills(text)

    return jsonify({
        "filename": filename,
        "cleaned_text": text,
        "skills": detected_skills,
    })


@app.route("/api/rank", methods=["POST"])
def api_rank():
    """Evaluate and rank multiple uploaded resumes against selected target skills."""
    files = request.files.getlist("resumes")
    raw_skills = request.form.get("target_skills", "")
    target_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]

    if not files or all(not f.filename for f in files):
        return jsonify({"error": "Please upload at least one resume file."}), 400

    results = []
    for f in files:
        if not f.filename:
            continue
        text = extract_resume_text(f.filename, f.read())
        detected = skill_matcher.extract_skills(text)
        evaluation = skill_matcher.evaluate_match(detected, target_skills)

        results.append({
            "id": str(uuid.uuid4())[:8],
            "filename": f.filename,
            "candidate_name": skill_matcher.infer_candidate_name(f.filename, text),
            "text": text,
            "detected_skills": detected,
            "matched_skills": evaluation["matched"],
            "missing_skills": evaluation["missing"],
            "match_score": evaluation["score"],
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    for idx, item in enumerate(results, start=1):
        item["rank"] = idx

    return jsonify({
        "total_evaluated": len(results),
        "candidates": results,
    })


@app.route("/api/roles", methods=["GET", "POST"])
def api_roles():
    """List roles or save a recruiter-created role into the live catalog."""
    if request.method == "GET":
        return jsonify({"roles": role_service.get_all_roles()})

    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Job title is required."}), 400

    saved_role = role_service.add_or_update_role(
        role_id=payload.get("id") or f"role-{str(uuid.uuid4())[:6]}",
        title=title,
        company=(payload.get("company") or "Recruiter Role").strip(),
        location=(payload.get("location") or "Remote / Hybrid").strip(),
        experience=(payload.get("experience") or "1–3 Years").strip(),
        description=(payload.get("description") or "").strip(),
        required_skills=payload.get("required_skills") or [],
    )
    return jsonify({"role": saved_role, "roles": role_service.get_all_roles()})


@app.route("/api/interest", methods=["POST"])
def api_express_interest():
    """Persist candidate interest expression in SQLite."""
    payload = request.get_json(silent=True) or {}
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO candidate_interests (id, role_id, role_title, candidate_skills, fit_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4())[:8],
            payload.get("role_id", ""),
            payload.get("role_title", ""),
            ", ".join(payload.get("skills", [])),
            float(payload.get("fit_score", 0)),
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"saved": True})


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)