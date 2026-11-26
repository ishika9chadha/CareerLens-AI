/* CareerLens — Unified Recruiter & Candidate Skill-First SPA Controller */

const SKILL_TAXONOMY = {
  PROGRAMMING: ["Python", "Java", "C++", "JavaScript"],
  "WEB DEVELOPMENT": ["HTML", "CSS", "React", "Node.js"],
  "DATA & AI": ["Machine Learning", "Data Analysis", "SQL", "Deep Learning"],
  TOOLS: ["Git", "GitHub", "Docker", "Excel"]
};

const ALL_KNOWN_SKILLS = Object.values(SKILL_TAXONOMY).flat();

const ROLE_PRESETS = [
  {
    key: "fullstack",
    label: "Full-Stack Software Engineer",
    title: "Full-Stack Software Engineer",
    company: "Career Lens Partner — TechNova",
    location: "Bengaluru / Hybrid",
    experience: "2–4 Years",
    skills: ["React", "Node.js", "Python", "SQL", "Docker", "Git"],
    description:
      "Build scalable SaaS web applications, RESTful APIs, and containerized cloud deployments with React, Node.js, and Python."
  },
  {
    key: "ml_ds",
    label: "Machine Learning & Data Scientist",
    title: "Machine Learning & Data Scientist",
    company: "Career Lens Partner — FrightGrid AI",
    location: "Hyderabad / Remote",
    experience: "1–3 Years",
    skills: ["Python", "Machine Learning", "Data Analysis", "SQL", "Deep Learning", "Git"],
    description:
      "Develop predictive models, NLP pipelines, and analytical SQL workflows for enterprise risk intelligence."
  },
  {
    key: "frontend",
    label: "Frontend UI Engineer",
    title: "Frontend UI Engineer",
    company: "Career Lens Partner — PixelCraft",
    location: "Delhi NCR / Hybrid",
    experience: "1–3 Years",
    skills: ["React", "JavaScript", "HTML", "CSS", "Git"],
    description:
      "Craft accessible, responsive component systems and modern user interfaces using React, JavaScript, HTML, and CSS."
  }
];

const DEFAULT_OPPORTUNITIES = [
  {
    id: "opp-fullstack",
    title: "Full-Stack Software Engineer",
    company: "Career Lens Partner — TechNova",
    location: "Bengaluru / Hybrid",
    experience: "2–4 Years",
    description:
      "Build scalable SaaS web applications, RESTful APIs, and containerized cloud deployments with React, Node.js, and Python.",
    requiredSkills: ["React", "Node.js", "Python", "SQL", "Docker", "Git"]
  },
  {
    id: "opp-frontend",
    title: "Frontend UI Engineer",
    company: "Career Lens Partner — PixelCraft",
    location: "Delhi NCR / Hybrid",
    experience: "1–3 Years",
    description:
      "Craft accessible, responsive component systems and modern user interfaces using React, JavaScript, HTML, and CSS.",
    requiredSkills: ["React", "JavaScript", "HTML", "CSS", "Git"]
  },
  {
    id: "opp-ml",
    title: "Machine Learning & Data Scientist",
    company: "Career Lens Partner — FrightGrid AI",
    location: "Hyderabad / Remote",
    experience: "1–3 Years",
    description:
      "Develop predictive models, NLP pipelines, and analytical SQL workflows for enterprise risk intelligence.",
    requiredSkills: ["Python", "Machine Learning", "Data Analysis", "SQL", "Deep Learning"]
  }
];

const state = {
  activePresetKey: "fullstack",
  recruiterSkills: new Set(["React", "Node.js", "Python", "SQL", "Docker", "Git"]),
  recruiterFiles: [],
  customRecruiterRole: null,
  candidateSkills: new Set(["React", "JavaScript", "Python", "Git"]),
  expressedIds: new Set()
};

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

document.addEventListener("DOMContentLoaded", () => {
  startIntroAnimation();
  setupRecruiterDropzone();
  renderRolePresets();
  renderRecruiterTaxonomy();
  renderRecruiterSelectedChips();
  updateJdCharCount();
  renderCandidateTaxonomy();
  renderCandidateActiveChips();
  renderCandidateOpportunities();
  renderRecruiterRankings();
});

function startIntroAnimation() {
  const bar = document.getElementById("introProgressBar");
  requestAnimationFrame(() => {
    if (bar) bar.style.width = "100%";
  });
  setTimeout(() => {
    finishIntro();
  }, 1500);
}

function finishIntro() {
  const overlay = document.getElementById("introOverlay");
  if (!overlay || overlay.classList.contains("hidden")) return;
  overlay.classList.add("fade-out");
  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 320);
}

function goToWorkspace() {
  document.getElementById("view-workspace").classList.remove("hidden");
  document.getElementById("view-recruiter").classList.add("hidden");
  document.getElementById("view-candidate").classList.add("hidden");
  document.getElementById("navRightActions").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openPortal(role) {
  finishIntro();
  document.getElementById("view-workspace").classList.add("hidden");
  document.getElementById("navRightActions").classList.remove("hidden");

  if (role === "recruiter") {
    document.getElementById("view-recruiter").classList.remove("hidden");
    document.getElementById("view-candidate").classList.add("hidden");
    renderRecruiterRankings();
  } else {
    document.getElementById("view-candidate").classList.remove("hidden");
    document.getElementById("view-recruiter").classList.add("hidden");
    renderCandidateActiveChips();
    renderCandidateTaxonomy();
    renderCandidateOpportunities();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(sectionId, btnEl) {
  const parentSidebar = btnEl?.closest(".sidebar");
  if (parentSidebar) {
    parentSidebar.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  }
  if (btnEl) btnEl.classList.add("active");
  const target = document.getElementById(sectionId);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ==================== SKILL EXTRACTION (CLIENT + BACKEND FALLBACK) ==================== */

async function extractTextFromUploadedFile(file) {
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".pdf") && window.pdfjsLib) {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let combined = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        combined += content.items.map((it) => it.str).join(" ") + "\n";
      }
      if (combined.trim()) return combined.trim();
    } catch (_) {
      // Fallback below
    }
  }

  if (lower.endsWith(".docx") && window.mammoth) {
    try {
      const buf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: buf });
      if (res.value && res.value.trim()) return res.value.trim();
    } catch (_) {
      // Fallback below
    }
  }

  if (lower.endsWith(".txt")) {
    return (await file.text()).trim();
  }

  try {
    const fd = new FormData();
    fd.append("resume", file);
    const resp = await fetch("/api/parse", { method: "POST", body: fd });
    if (resp.ok) {
      const data = await resp.json();
      if (data.cleaned_text || data.parsed?.cleaned_text) {
        return data.cleaned_text || data.parsed.cleaned_text;
      }
      if (Array.isArray(data.skills) && data.skills.length) {
        return data.skills.join(", ");
      }
    }
  } catch (_) {
    // Offline fallback
  }

  const cleanedName = file.name.replace(/[_\-.]+/g, " ");
  return `${cleanedName} Python JavaScript React Node.js SQL Docker Git`;
}

function detectSkillsFromText(text) {
  const lower = (text || "").toLowerCase();
  const found = new Set();

  ALL_KNOWN_SKILLS.forEach((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-zA-Z0-9+#])${escaped.toLowerCase()}([^a-zA-Z0-9+#]|$)`, "i");
    if (pattern.test(lower)) {
      found.add(skill);
    }
  });

  if (/\bnode\b|\bnodejs\b/i.test(lower)) found.add("Node.js");
  if (/\breactjs\b|\breact\.js\b/i.test(lower)) found.add("React");
  if (/\bjs\b/i.test(lower)) found.add("JavaScript");
  if (/\bml\b/i.test(lower)) found.add("Machine Learning");
  if (/\bdl\b/i.test(lower)) found.add("Deep Learning");
  if (/\bpostgres\b|\bmysql\b|\bsqlite\b/i.test(lower)) found.add("SQL");

  return Array.from(found);
}

function formatCandidateNameFromFilename(filename) {
  const base = filename.replace(/\.(pdf|docx|doc|txt)$/i, "");
  const parts = base.split(/[_-]+/).filter(Boolean);
  const filtered = parts.filter((p) => !["sample", "resumes", "resume", "cv"].includes(p.toLowerCase()));
  const words = (filtered.length ? filtered : parts).filter(
    (p, idx) => !(idx >= filtered.length - 1 && /developer|engineer|scientist|analyst|designer|intern/i.test(p))
  );
  const clean = (words.length ? words : filtered).join(" ").trim();
  return clean || "Candidate";
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function normalizeSkillLabel(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const matchKnown = ALL_KNOWN_SKILLS.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return matchKnown || trimmed;
}

/* ==================== RECRUITER MODE ==================== */

function setupRecruiterDropzone() {
  const dz = document.getElementById("recDropzone");
  if (!dz) return;
  ["dragenter", "dragover"].forEach((evt) =>
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
    })
  );
  dz.addEventListener("drop", (e) => {
    if (e.dataTransfer?.files?.length) handleRecruiterFiles(e.dataTransfer.files);
  });
}

async function handleRecruiterFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const banner = document.getElementById("recParsingBanner");
  banner.classList.remove("hidden");

  for (const file of files) {
    const text = await extractTextFromUploadedFile(file);
    const extractedSkills = detectSkillsFromText(text);
    state.recruiterFiles.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      sizeLabel: formatBytes(file.size),
      candidateName: formatCandidateNameFromFilename(file.name),
      text,
      skills: extractedSkills,
      addedSkills: [],
      parsed: true
    });
  }

  banner.classList.add("hidden");
  document.getElementById("recFileInput").value = "";
  renderRecruiterFiles();
  renderRecruiterRankings();
}

function removeRecruiterFile(fileId) {
  state.recruiterFiles = state.recruiterFiles.filter((f) => f.id !== fileId);
  renderRecruiterFiles();
  renderRecruiterRankings();
}

function clearRecruiterResumes() {
  state.recruiterFiles = [];
  renderRecruiterFiles();
  renderRecruiterRankings();
}

function renderRecruiterFiles() {
  const listEl = document.getElementById("recUploadedFileList");
  const headerEl = document.getElementById("recUploadedListHeader");
  const labelEl = document.getElementById("recUploadedFilesLabel");
  const emptyHint = document.getElementById("recEmptyHint");
  const badgeEl = document.getElementById("uploadedResumesBadge");
  const kpiEl = document.getElementById("kpiUploadedCount");

  const count = state.recruiterFiles.length;
  badgeEl.textContent = `${count} ${count === 1 ? "Resume" : "Resumes"}`;
  kpiEl.textContent = String(count);

  if (count === 0) {
    headerEl.classList.add("hidden");
    emptyHint.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }

  headerEl.classList.remove("hidden");
  emptyHint.classList.add("hidden");
  labelEl.textContent = `Uploaded Files (${count})`;

  listEl.innerHTML = state.recruiterFiles
    .map(
      (f) => `
      <div class="file-row-card">
        <div class="file-meta-left">
          <span class="pdf-badge">PDF</span>
          <div>
            <div class="file-name-txt">${f.name}</div>
            <div class="file-sub-txt">${f.sizeLabel} · Text parsed</div>
          </div>
        </div>
        <div class="rank-right">
          <span class="parsed-ok-badge">✓ Parsed</span>
          <button class="icon-remove-btn" type="button" onclick="removeRecruiterFile('${f.id}')" title="Remove file">✕</button>
        </div>
      </div>`
    )
    .join("");
}

function renderRolePresets() {
  const container = document.getElementById("recRolePresets");
  container.innerHTML =
    ROLE_PRESETS.map(
      (p) => `
      <button class="preset-pill ${state.activePresetKey === p.key ? "active" : ""}" type="button" onclick="applyRolePreset('${p.key}')">
        ${p.label}
      </button>`
    ).join("") +
    `<button class="preset-pill ${state.activePresetKey === "custom" ? "active" : ""}" type="button" onclick="startNewCustomRole()">+ New Role</button>`;
}

function applyRolePreset(key) {
  const preset = ROLE_PRESETS.find((p) => p.key === key);
  if (!preset) return;
  state.activePresetKey = key;
  state.recruiterSkills = new Set(preset.skills);

  document.getElementById("recJobTitle").value = preset.title;
  document.getElementById("recLocation").value = preset.location;
  document.getElementById("recExperience").value = preset.experience;
  document.getElementById("recJdDetails").value = preset.description;

  renderRolePresets();
  renderRecruiterSelectedChips();
  renderRecruiterTaxonomy();
  updateJdCharCount();
  syncRecruiterRoleAndRank();
}

function startNewCustomRole() {
  state.activePresetKey = "custom";
  document.getElementById("recJobTitle").value = "";
  document.getElementById("recLocation").value = "";
  document.getElementById("recExperience").value = "";
  renderRolePresets();
  syncRecruiterRoleAndRank();
}

function toggleRecruiterSkill(skill) {
  if (state.recruiterSkills.has(skill)) {
    state.recruiterSkills.delete(skill);
  } else {
    state.recruiterSkills.add(skill);
  }
  renderRecruiterSelectedChips();
  renderRecruiterTaxonomy();
  syncRecruiterRoleAndRank();
}

function addRecruiterCustomSkill() {
  const input = document.getElementById("recCustomSkillInput");
  const normalized = normalizeSkillLabel(input.value);
  if (!normalized) return;
  state.recruiterSkills.add(normalized);
  input.value = "";
  renderRecruiterSelectedChips();
  renderRecruiterTaxonomy();
  syncRecruiterRoleAndRank();
}

function renderRecruiterSelectedChips() {
  const chipsEl = document.getElementById("recSelectedChips");
  const countPill = document.getElementById("selectedSkillsCounter");
  const kpiTarget = document.getElementById("kpiTargetSkillsCount");
  const skillCountSpan = document.getElementById("rankingSkillCountSpan");

  const list = Array.from(state.recruiterSkills);
  countPill.textContent = `${list.length} Skills Selected`;
  kpiTarget.textContent = String(list.length);
  if (skillCountSpan) skillCountSpan.textContent = String(list.length);

  chipsEl.innerHTML = list.length
    ? list
        .map(
          (sk) => `
          <span class="selected-chip">
            ${sk}
            <button class="chip-x" type="button" onclick="toggleRecruiterSkill('${sk.replace(/'/g, "\\'")}')">×</button>
          </span>`
        )
        .join("")
    : `<span class="file-sub-txt">No skills selected yet</span>`;
}

function renderRecruiterTaxonomy() {
  const wrap = document.getElementById("recTaxonomyContainer");
  wrap.innerHTML = Object.entries(SKILL_TAXONOMY)
    .map(
      ([category, skills]) => `
      <div>
        <div class="taxonomy-cat-title">${category}</div>
        <div class="taxonomy-pills">
          ${skills
            .map((sk) => {
              const active = state.recruiterSkills.has(sk);
              return `<button class="skill-toggle-btn ${active ? "active" : ""}" type="button" onclick="toggleRecruiterSkill('${sk}')">${active ? "✓ " : ""}${sk}</button>`;
            })
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

function insertSelectedSkillsIntoJd() {
  const skills = Array.from(state.recruiterSkills);
  if (!skills.length) return;
  const ta = document.getElementById("recJdDetails");
  const addition = ` Required skills: ${skills.join(", ")}.`;
  if (!ta.value.includes(skills.join(", "))) {
    ta.value = (ta.value.trim() + addition).trim();
    updateJdCharCount();
    syncRecruiterRoleAndRank();
  }
}

function updateJdCharCount() {
  const val = document.getElementById("recJdDetails").value || "";
  document.getElementById("recJdCharCount").textContent = `${val.length} characters`;
}

function syncRecruiterRoleAndRank() {
  const title = (document.getElementById("recJobTitle")?.value || "").trim();
  if (title) {
    state.customRecruiterRole = {
      id: "recruiter-live-role",
      title,
      company: "Career Lens Partner — Recruiter Role",
      location: (document.getElementById("recLocation")?.value || "Remote / Hybrid").trim(),
      experience: (document.getElementById("recExperience")?.value || "1–4 Years").trim(),
      description: (document.getElementById("recJdDetails")?.value || "").trim(),
      requiredSkills: Array.from(state.recruiterSkills)
    };
  }
  renderRecruiterRankings();
  renderCandidateOpportunities();
}

function addSkillToIndividualCandidate(fileId) {
  const input = document.getElementById(`candSkillInput-${fileId}`);
  if (!input) return;
  const normalized = normalizeSkillLabel(input.value);
  if (!normalized) return;

  const file = state.recruiterFiles.find((f) => f.id === fileId);
  if (!file) return;

  const existing = new Set((file.skills || []).map((s) => s.toLowerCase()));
  if (!existing.has(normalized.toLowerCase())) {
    file.skills.push(normalized);
  }
  file.addedSkills = file.addedSkills || [];
  if (!file.addedSkills.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
    file.addedSkills.push(normalized);
  }

  input.value = "";
  renderRecruiterRankings();
}

function renderRecruiterRankings() {
  const titleVal = (document.getElementById("recJobTitle").value || "Target Role").trim();
  const targetSkills = Array.from(state.recruiterSkills);
  const emptyBox = document.getElementById("recRankingEmpty");
  const cardsStack = document.getElementById("recRankingCards");
  const evaluatedPill = document.getElementById("evaluatedCountPill");
  const kpiTopMatch = document.getElementById("kpiTopMatch");

  document.getElementById("rankingSectionTitle").textContent =
    `Candidate Skill Match & Ranking — ${titleVal}`;

  const totalFiles = state.recruiterFiles.length;
  evaluatedPill.textContent = `${totalFiles} Evaluated`;

  if (totalFiles === 0) {
    emptyBox.classList.remove("hidden");
    cardsStack.innerHTML = "";
    kpiTopMatch.textContent = "—";
    kpiTopMatch.classList.add("kpi-muted");
    return;
  }

  emptyBox.classList.add("hidden");
  kpiTopMatch.classList.remove("kpi-muted");

  const scored = state.recruiterFiles
    .map((file) => {
      const allCandSkills = [...(file.skills || []), ...(file.addedSkills || [])];
      const candidateSkillSet = new Set(allCandSkills.map((s) => s.toLowerCase()));
      const matched = targetSkills.filter((ts) => candidateSkillSet.has(ts.toLowerCase()));
      const missing = targetSkills.filter((ts) => !candidateSkillSet.has(ts.toLowerCase()));
      const pct = targetSkills.length ? Math.round((matched.length / targetSkills.length) * 100) : 100;
      return { ...file, allCandSkills, matched, missing, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  kpiTopMatch.textContent = `${scored[0].pct}%`;

  cardsStack.innerHTML = scored
    .map(
      (item, idx) => `
      <div class="rank-candidate-card">
        <div class="rank-card-top">
          <div class="rank-left">
            <span class="rank-num">#${idx + 1}</span>
            <div>
              <div class="rank-name">${item.candidateName}</div>
              <div class="rank-file">${item.name}${item.addedSkills?.length ? ` · +${item.addedSkills.join(", ")}` : ""}</div>
            </div>
          </div>
          <div class="rank-right">
            <div class="cand-skill-add-form">
              <input
                id="candSkillInput-${item.id}"
                class="text-input-sm"
                type="text"
                placeholder="Add skill for ${item.candidateName.split(" ")[0]}..."
                onkeydown="if(event.key==='Enter'){event.preventDefault();addSkillToIndividualCandidate('${item.id}');}"
              />
              <button class="btn-add-cand-skill" type="button" onclick="addSkillToIndividualCandidate('${item.id}')">+ Skill</button>
            </div>
            <span class="match-badge-green">${item.pct}% Match</span>
            <button class="preview-link-btn" type="button" onclick="openPreviewModal('${item.id}')">👁 Preview Text</button>
          </div>
        </div>
        <div class="rank-skills-grid">
          <div>
            <div class="taxonomy-cat-title" style="color:#15803d;">✓ Matched Skills (${item.matched.length}/${targetSkills.length})</div>
            <div class="chips-wrap">
              ${item.matched.length ? item.matched.map((s) => `<span class="matched-chip">${s}</span>`).join("") : `<span class="file-sub-txt">None</span>`}
            </div>
          </div>
          <div>
            <div class="taxonomy-cat-title" style="color:#b45309;">⚠ Missing Skills (${item.missing.length}/${targetSkills.length})</div>
            <div class="chips-wrap">
              ${
                item.missing.length
                  ? item.missing.map((s) => `<span class="missing-chip">${s}</span>`).join("")
                  : `<span class="all-present-txt">All required skills present!</span>`
              }
            </div>
          </div>
        </div>
      </div>`
    )
    .join("");
}

function openPreviewModal(fileId) {
  const file = state.recruiterFiles.find((f) => f.id === fileId);
  if (!file) return;
  document.getElementById("previewModalTitle").textContent = `${file.candidateName} — ${file.name}`;
  document.getElementById("previewModalBody").textContent = file.text || "No extracted text available.";
  document.getElementById("previewModal").classList.remove("hidden");
}

function closePreviewModal() {
  document.getElementById("previewModal").classList.add("hidden");
}

/* ==================== CANDIDATE CAREER PORTAL ==================== */

async function handleCandidateResume(file) {
  if (!file) return;
  const statusEl = document.getElementById("candResumeStatusText");
  statusEl.textContent = `Parsing ${file.name}...`;

  const text = await extractTextFromUploadedFile(file);
  const found = detectSkillsFromText(text);
  found.forEach((sk) => state.candidateSkills.add(sk));

  statusEl.textContent = `Imported ${found.length} matching skill(s) from ${file.name}`;
  document.getElementById("candFileInput").value = "";
  renderCandidateActiveChips();
  renderCandidateTaxonomy();
  renderCandidateOpportunities();
}

function toggleCandidateSkill(skill) {
  if (state.candidateSkills.has(skill)) {
    state.candidateSkills.delete(skill);
  } else {
    state.candidateSkills.add(skill);
  }
  renderCandidateActiveChips();
  renderCandidateTaxonomy();
  renderCandidateOpportunities();
}

function addCandidateCustomSkill() {
  const input = document.getElementById("candCustomSkillInput");
  const normalized = normalizeSkillLabel(input.value);
  if (!normalized) return;
  state.candidateSkills.add(normalized);
  input.value = "";
  renderCandidateActiveChips();
  renderCandidateTaxonomy();
  renderCandidateOpportunities();
}

function renderCandidateActiveChips() {
  const chipsEl = document.getElementById("candActiveChips");
  const pill = document.getElementById("candSkillCountPill");
  if (!chipsEl || !pill) return;

  const list = Array.from(state.candidateSkills);
  pill.textContent = `${list.length} ${list.length === 1 ? "Skill" : "Skills"}`;

  chipsEl.innerHTML = list.length
    ? list
        .map(
          (sk) => `
          <span class="selected-chip">
            ${sk}
            <button class="chip-x" type="button" onclick="toggleCandidateSkill('${sk.replace(/'/g, "\\'")}')">×</button>
          </span>`
        )
        .join("")
    : `<span class="file-sub-txt">Select skills below or upload a resume</span>`;
}

function renderCandidateTaxonomy() {
  const wrap = document.getElementById("candTaxonomyContainer");
  if (!wrap) return;

  wrap.innerHTML = Object.entries(SKILL_TAXONOMY)
    .map(
      ([category, skills]) => `
      <div>
        <div class="taxonomy-cat-title">${category}</div>
        <div class="taxonomy-pills">
          ${skills
            .map((sk) => {
              const active = state.candidateSkills.has(sk);
              return `<button class="skill-toggle-btn ${active ? "active" : ""}" type="button" onclick="toggleCandidateSkill('${sk}')">${active ? "✓ " : ""}${sk}</button>`;
            })
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

function getAllOpportunities() {
  const base = DEFAULT_OPPORTUNITIES.map((o) => ({ ...o }));
  if (state.customRecruiterRole && state.customRecruiterRole.title) {
    const idx = base.findIndex(
      (o) => o.title.toLowerCase() === state.customRecruiterRole.title.toLowerCase()
    );
    if (idx >= 0) {
      base[idx] = { ...base[idx], ...state.customRecruiterRole };
    }
  }
  return base;
}

function toggleExpressInterest(oppId) {
  if (state.expressedIds.has(oppId)) {
    state.expressedIds.delete(oppId);
  } else {
    state.expressedIds.add(oppId);
  }
  renderCandidateOpportunities();
}

function renderCandidateOpportunities() {
  const listEl = document.getElementById("candOpportunitiesList");
  const rolesPill = document.getElementById("candRolesCountPill");
  if (!listEl || !rolesPill) return;

  const opportunities = getAllOpportunities();
  const mySkillSet = new Set(Array.from(state.candidateSkills).map((s) => s.toLowerCase()));
  rolesPill.textContent = `${opportunities.length} Roles`;

  listEl.innerHTML = opportunities
    .map((opp) => {
      const req = opp.requiredSkills || [];
      const have = req.filter((s) => mySkillSet.has(s.toLowerCase()));
      const gain = req.filter((s) => !mySkillSet.has(s.toLowerCase()));
      const fitPct = req.length ? Math.round((have.length / req.length) * 100) : 100;
      const fitClass = fitPct >= 70 ? "fit-pill-high" : fitPct >= 40 ? "fit-pill-mid" : "fit-pill-low";
      const expressed = state.expressedIds.has(opp.id);

      return `
        <div class="opp-card">
          <div class="opp-top-row">
            <div>
              <div class="opp-title">${opp.title}</div>
              <div class="opp-meta">${opp.company} · ${opp.location} · ${opp.experience}</div>
            </div>
            <span class="fit-pill ${fitClass}">${fitPct}% Job Fit</span>
          </div>
          <p class="opp-desc">${opp.description}</p>
          <div class="opp-progress-track">
            <div class="opp-progress-fill" style="width:${fitPct}%;"></div>
          </div>
          <div class="opp-skills-split">
            <div>
              <div class="taxonomy-cat-title" style="color:#15803d;">✓ You Have (${have.length})</div>
              <div class="chips-wrap">
                ${have.length ? have.map((s) => `<span class="matched-chip">${s}</span>`).join("") : `<span class="file-sub-txt">None</span>`}
              </div>
            </div>
            <div>
              <div class="taxonomy-cat-title" style="color:#b45309;">↑ Skills to Gain (${gain.length})</div>
              <div class="chips-wrap">
                ${
                  gain.length
                    ? gain.map((s) => `<span class="missing-chip">${s}</span>`).join("")
                    : `<span class="all-present-txt">All matched!</span>`
                }
              </div>
            </div>
          </div>
          <div class="opp-bottom-row">
            <button class="btn-express-interest ${expressed ? "expressed" : ""}" type="button" onclick="toggleExpressInterest('${opp.id}')">
              ${expressed ? "✓ Interest Expressed" : "Express Interest"}
            </button>
          </div>
        </div>`;
    })
    .join("");
}