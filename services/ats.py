"""ATS Resume Health Checker (0-100) evaluating structure, impact, and readability."""

import re

ACTION_VERBS = {
    "architected", "automated", "built", "collaborated", "created", "decreased",
    "delivered", "deployed", "designed", "developed", "engineered", "enhanced",
    "established", "executed", "implemented", "improved", "increased", "integrated",
    "launched", "led", "managed", "mentored", "migrated", "modeled", "optimized",
    "orchestrated", "pioneered", "reduced", "refactored", "resolved", "scaled",
    "spearheaded", "streamlined", "trained", "transformed"
}


class ATSHealthAnalyzer:
    """Evaluates resume ATS readiness across 5 weighted dimensions."""

    def evaluate(self, parsed_resume: dict) -> dict:
        raw_text = parsed_resume.get("raw_text", "")
        lower_text = raw_text.lower()
        word_count = len(raw_text.split())

        checks = []
        total_score = 0

        # 1. Contact Information (20 pts)
        contact_pts = 0
        if parsed_resume.get("email") != "Not provided":
            contact_pts += 8
        if parsed_resume.get("phone") != "Not provided":
            contact_pts += 6
        if parsed_resume.get("linkedin") or parsed_resume.get("github"):
            contact_pts += 6
        total_score += contact_pts
        checks.append({
            "criterion": "Contact & Links",
            "score": contact_pts,
            "max": 20,
            "status": "pass" if contact_pts >= 14 else "warn",
            "tip": "Include email, phone number, and GitHub/LinkedIn URLs at the top." if contact_pts < 20 else "Complete contact details detected."
        })

        # 2. Core Resume Sections (25 pts)
        sections = {
            "summary": bool(re.search(r"\b(summary|objective|profile|about me)\b", lower_text)),
            "skills": bool(re.search(r"\b(skills|technologies|technical stack)\b", lower_text)),
            "experience": bool(re.search(r"\b(experience|employment|internship|work history)\b", lower_text)),
            "education": bool(re.search(r"\b(education|academic|university|college|b\.tech|bachelor)\b", lower_text)),
            "projects": bool(re.search(r"\b(projects|personal projects|academic projects)\b", lower_text)),
        }
        present_count = sum(sections.values())
        sec_pts = present_count * 5
        missing_secs = [k.title() for k, v in sections.items() if not v]
        total_score += sec_pts
        checks.append({
            "criterion": "Essential Sections",
            "score": sec_pts,
            "max": 25,
            "status": "pass" if sec_pts >= 20 else "warn",
            "tip": f"Add clear section headers for: {', '.join(missing_secs)}." if missing_secs else "All 5 standard ATS sections present."
        })

        # 3. Quantified Achievements / Metrics (25 pts)
        metrics = re.findall(r"\b\d+(?:\.\d+)?%|\$\d+|\d+\+?\s*(?:users|requests|ms|x|times|clients|projects|models)\b", lower_text)
        metric_count = len(metrics)
        metric_pts = min(25, metric_count * 5)
        total_score += metric_pts
        checks.append({
            "criterion": "Quantified Impact",
            "score": metric_pts,
            "max": 25,
            "status": "pass" if metric_pts >= 15 else "warn",
            "tip": f"Found {metric_count} quantified metric(s). Aim for 5+ numbers (%, latency ms, users, revenue)." if metric_pts < 25 else "Strong use of quantified impact metrics."
        })

        # 4. Action Verbs Usage (15 pts)
        words_set = set(re.findall(r"[a-z]+", lower_text))
        used_verbs = sorted(words_set & ACTION_VERBS)
        verb_pts = min(15, len(used_verbs) * 3)
        total_score += verb_pts
        checks.append({
            "criterion": "Strong Action Verbs",
            "score": verb_pts,
            "max": 15,
            "status": "pass" if verb_pts >= 12 else "warn",
            "tip": "Start bullet points with strong verbs like Architected, Optimized, Deployed, Reduced." if verb_pts < 15 else f"Great action verb variety ({', '.join(used_verbs[:4])})."
        })

        # 5. Optimal Length & Skill Density (15 pts)
        length_pts = 0
        if 250 <= word_count <= 950:
            length_pts += 10
            len_msg = f"Ideal length ({word_count} words)."
        elif word_count < 250:
            length_pts += 4
            len_msg = f"Resume is brief ({word_count} words). Expand project impact bullets."
        else:
            length_pts += 6
            len_msg = f"Resume is dense ({word_count} words). Trim to 1-2 crisp pages."

        if len(parsed_resume.get("skills", [])) >= 8:
            length_pts += 5
        total_score += length_pts
        checks.append({
            "criterion": "Length & Keyword Density",
            "score": length_pts,
            "max": 15,
            "status": "pass" if length_pts >= 12 else "warn",
            "tip": len_msg
        })

        return {
            "ats_score": min(100, total_score),
            "word_count": word_count,
            "checks": checks,
            "detected_action_verbs": used_verbs[:10],
        }