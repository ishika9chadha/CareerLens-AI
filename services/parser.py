"""Text extraction for PDF, DOCX, DOC, and TXT resumes."""

import io
import re

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    """Extract clean text from PDF, DOCX, DOC, or TXT bytes."""
    lower = (filename or "").lower()
    text = ""

    if lower.endswith(".pdf") and PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages)
        except Exception:
            text = ""

    elif lower.endswith(".docx") and docx is not None:
        try:
            document = docx.Document(io.BytesIO(file_bytes))
            parts = [p.text for p in document.paragraphs if p.text and p.text.strip()]
            for table in document.tables:
                for row in table.rows:
                    row_cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
                    if row_cells:
                        parts.append(" | ".join(row_cells))
            text = "\n".join(parts)
        except Exception:
            text = ""

    elif lower.endswith(".txt"):
        text = file_bytes.decode("utf-8", errors="ignore")

    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text