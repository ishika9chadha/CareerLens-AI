# CareerLens-AI

CareerLens-AI is a skill-first hiring web app built with Flask, HTML, CSS, and JavaScript. Instead of just scanning job titles or keywords blindly, it helps recruiters rank candidates by matching skills and helps job seekers see how well their skills fit different roles.

## What You Can Do in This App

* **Recruiter Dashboard**
  * Upload multiple resumes at once (.pdf, .docx, .doc, or .txt).
  * Pick a preset role (like Full-Stack Software Engineer, Machine Learning & Data Scientist, or Frontend UI Engineer) or create your own role with custom skills and job details.
  * See candidates ranked by match percentage, check matched vs. missing skills, preview extracted resume text, and add extra skills to an individual candidate on the fly.
* **Candidate Career Portal**
  * Upload your resume to auto-detect skills, toggle skills on/off from categories, or type in custom skills.
  * Check your job fit score across roles, see what skills you already have and what skills to learn next, and mark roles you are interested in.

## Project Structure

CareerLens-AI/
├── app.py                 
├── requirements.txt        
├── generate_samples.py     
├── .env.example            
├── .gitignore              
├── README.md               
├── data/                   
├── services/               
├── templates/              
└── static/                 

## How to run this?

1- Clone the repository and open the folder
git clone [https://github.com/ishika9chadha/CareerLens-AI.git](https://github.com/ishika9chadha/CareerLens-AI.git)
cd CareerLens-AI

2- Create and activate a virtual environment 
python -m venv venv
.\venv\Scripts\Activate.ps1

3- Install the required packages
pip install -r requirements.txt

4- Start the Flask app
python app.py

5- Open in your browser
Go to http://127.0.0.1:5000