"""Generates sample PDF resumes under data/sample_resumes/."""
import os
import fitz

SAMPLE_RESUMES = [
    {
        "filename": "arjun_sharma_ml.pdf",
        "text": (
            "ARJUN SHARMA\nEmail: arjun.sharma@example.com | Phone: +91 9876543210\n"
            "SUMMARY\nML Engineer with 4 years of experience in Python, PyTorch, NLP, and AWS.\n"
            "EXPERIENCE\nSenior ML Engineer | NovaTech | 2022 - Present\n"
            "- Built NLP classification models using PyTorch and Hugging Face, improving accuracy by 22%.\n"
            "- Deployed microservices with Docker and Kubernetes on AWS EKS.\n"
            "EDUCATION\nB.Tech in Computer Science | IIT Madras | 2018 - 2022\n"
            "PROJECTS\n- Document AI Parser: Built OCR and transformer pipeline with 94% F1 score."
        ),
    },
    {
        "filename": "priya_nair_fullstack.pdf",
        "text": (
            "PRIYA NAIR\nEmail: priya.nair@example.com | Phone: +91 9123456789\n"
            "SUMMARY\nFull Stack Developer with 3 years of experience in JavaScript, TypeScript, React, Node.js, and PostgreSQL.\n"
            "EXPERIENCE\nSoftware Engineer | CloudScale | 2023 - Present\n"
            "- Built React and TypeScript web apps and Node.js REST APIs with Redis caching, cutting latency by 35%.\n"
            "EDUCATION\nB.E. in Information Technology | PICT Pune | 2019 - 2023\n"
            "PROJECTS\n- TaskFlow: Full-stack project tracker using React, Node.js, and PostgreSQL."
        ),
    },
    {
        "filename": "rohan_verma_analyst.pdf",
        "text": (
            "ROHAN VERMA\nEmail: rohan.verma@example.com | Phone: +91 9988776655\n"
            "SUMMARY\nData Analyst with 2.5 years of experience in SQL, Python, Pandas, Power BI, and Excel.\n"
            "EXPERIENCE\nData Analyst | RetailPulse | 2023 - Present\n"
            "- Built Power BI dashboards and SQL queries across 150+ stores, reducing stockouts by 18%.\n"
            "EDUCATION\nB.Sc. in Statistics | Delhi University | 2020 - 2023"
        ),
    },
    {
        "filename": "ananya_iyer_devops.pdf",
        "text": (
            "ANANYA IYER\nEmail: ananya.iyer@example.com | Phone: +91 9001122334\n"
            "SUMMARY\nDevOps Engineer with 5 years of experience in AWS, Docker, Kubernetes, Terraform, Linux, and CI/CD.\n"
            "EXPERIENCE\nLead DevOps Engineer | InfraGrid | 2021 - Present\n"
            "- Automated AWS and Kubernetes infrastructure with Terraform and GitHub Actions, achieving 99.98% uptime.\n"
            "EDUCATION\nM.Tech in Cloud Computing | BITS Pilani | 2019 - 2021"
        ),
    },
]


def generate_all_samples(out_dir: str = "data/sample_resumes") -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for item in SAMPLE_RESUMES:
        path = os.path.join(out_dir, item["filename"])
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        page.insert_textbox(fitz.Rect(45, 45, 550, 800), item["text"], fontsize=10.5, fontname="helv", lineheight=1.35)
        doc.save(path)
        doc.close()
        paths.append(path)
    return paths


if __name__ == "__main__":
    generate_all_samples()
