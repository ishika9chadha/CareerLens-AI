/* CareerLens AI — Frontend Controller */

const state = {
  meta: { sample_jds: [], jobs: [], sample_resumes: [] },
  recruiterFiles: [],
  recruiterResults: null,
  selectedCompareIds: new Set(),
  seekerParsed: null,
  seekerAnalysis: null,
  whatIfSkills: new Set(),
  charts: {}
};

// Initialize app metadata and drag-and-drop listeners
document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  setupDropzone("recDropzone", (files) => handleRecFilesSelected(files));
  setupDropzone("seekerDropzone", (files) => {
    if (files && files[0]) uploadSeekerResume(files[0]);
  });

  try {
    const res = await fetch("/api/meta");
    state.meta = await res.json();
    populateSelects();
  } catch (err) {
    console.error("Failed to load metadata:", err);
  }
});

function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  btn.addEventListener("click", () => {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
  });
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.getElementById(`view-${viewName}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupDropzone(id, onDropCallback) {
  const dz = document.getElementById(id);
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
    if (e.dataTransfer?.files?.length) onDropCallback(e.dataTransfer.files);
  });
}

function populateSelects() {
  const recJdSel = document.getElementById("recSampleJdSelect");
  state.meta.sample_jds.forEach((jd, i) => {
    const opt = new Option(jd.title, i);
    recJdSel.add(opt);
  });
  if (state.meta.sample_jds.length > 0) {
    recJdSel.value = "0";
    applyRecruiterSampleJD();
  }

  const seekerResSel = document.getElementById("seekerSampleResumeSelect");
  state.meta.sample_resumes.forEach((fname) => {
    seekerResSel.add(new Option(fname, fname));
  });

  const seekerRoleSel = document.getElementById("seekerRoleSelect");
  state.meta.jobs.forEach((job, idx) => {
    seekerRoleSel.add(new Option(`${job.title} (${job.min_experience}+ yrs)`, idx));
  });
  if (state.meta.jobs.length > 1) {
    seekerRoleSel.value = "1";
    selectSeekerTargetRole();
  }
}

/* ==================== RECRUITER MODE ==================== */

function applyRecruiterSampleJD() {
  const idx = document.getElementById("recSampleJdSelect").value;
  if (idx === "") return;
  const jd = state.meta.sample_jds[Number(idx)];
  document.getElementById("recJobTitle").value = jd.title;
  document.getElementById("recJdText").value = jd.description;
  document.getElementById("recMustSkills").value = jd.must_have_skills.join(", ");
  document.getElementById("recNiceSkills").value = jd.nice_to_have_skills.join(", ");
  document.getElementById("recMinExp").value = jd.min_experience;
}

function updateWeightLabels() {
  const sim = Number(document.getElementById("wSimSlider").value);
  const skill = Number(document.getElementById("wSkillSlider").value);
  const exp = Math.max(5, 100 - sim - skill);
  document.getElementById("weightDisplay").textContent = `${sim}% / ${skill}% / ${exp}%`;
}

function handleRecFilesSelected(fileList) {
  const valid = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
  state.recruiterFiles = valid;
  document.getElementById("recFileCount").textContent =
    valid.length > 0 ? `${valid.length} PDF resume(s) ready` : "Please select valid PDF files";
}

async function runRecruiterRanking(useSamples = false) {
  const loader = document.getElementById("recLoader");
  const resultsSec = document.getElementById("recResultsSection");
  loader.classList.remove("hidden");
  resultsSec.classList.add("hidden");

  const sim = Number(document.getElementById("wSimSlider").value);
  const skill = Number(document.getElementById("wSkillSlider").value);
  const exp = Math.max(5, 100 - sim - skill);

  const formData = new FormData();
  formData.append("job_title", document.getElementById("recJobTitle").value);
  formData.append("jd_text", document.getElementById("recJdText").value);
  formData.append("must_have_skills", document.getElementById("recMustSkills").value);
  formData.append("nice_to_have_skills", document.getElementById("recNiceSkills").value);
  formData.append("min_experience", document.getElementById("recMinExp").value);
  formData.append("w_similarity", sim);
  formData.append("w_skills", skill);
  formData.append("w_expedu", exp);
  formData.append("use_samples", useSamples ? "true" : "false");

  if (!useSamples) {
    state.recruiterFiles.forEach((file) => formData.append("resumes", file));
  }

  try {
    const res = await fetch("/api/rank", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ranking failed");

    state.recruiterResults = data;
    state.selectedCompareIds.clear();
    updateCompareButton();

    document.getElementById("totalRankedCount").textContent = data.total_candidates;
    renderDuplicateAlert(data.duplicates);
    renderRecruiterCharts(data);
    renderRecruiterTable();
    resultsSec.classList.remove("hidden");
  } catch (err) {
    alert(err.message);
  } finally {
    loader.classList.add("hidden");
  }
}

function renderDuplicateAlert(duplicates) {
  const el = document.getElementById("duplicateAlert");
  if (!duplicates || duplicates.length === 0) {
    el.classList.add("hidden");
    return;
  }
  const msg = duplicates
    .map((d) => `${d.candidate_a} (${d.file_a}) ↔ ${d.candidate_b} (${d.file_b}) [${d.similarity}% similar]`)
    .join(" | ");
  el.textContent = `⚠️ Duplicate Resume Alert: ${msg}`;
  el.classList.remove("hidden");
}

function renderRecruiterTable() {
  if (!state.recruiterResults) return;
  const blind = document.getElementById("blindScreeningToggle").checked;
  const tbody = document.getElementById("recLeaderboardBody");
  tbody.innerHTML = "";

  state.recruiterResults.candidates.forEach((cand) => {
    const displayName = blind ? cand.blind_id : cand.name;
    const contactInfo = blind ? "Hidden (Blind Mode)" : `${cand.email || "No email"} · ${cand.phone || ""}`;
    const eduText = cand.education?.[0]
      ? `${cand.education[0].degree}${blind ? "" : " (" + (cand.education[0].institution || "Grad") + ")"}`
      : "Degree not listed";

    const scoreClass = cand.score >= 75 ? "score-high" : cand.score >= 50 ? "score-mid" : "score-low";
    const matchedChips = cand.matched_skills
      .slice(0, 5)
      .map((s) => `<span class="chip chip-match">${s}</span>`)
      .join("");
    const missingChips = cand.missing_skills
      .slice(0, 4)
      .map((s) => `<span class="chip chip-miss">${s}</span>`)
      .join("");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" ${state.selectedCompareIds.has(cand.id) ? "checked" : ""} onchange="toggleCompareCandidate('${cand.id}', this)" /></td>
      <td><strong>#${cand.rank}</strong></td>
      <td>
        <strong>${displayName}</strong><br/>
        <span class="muted">${contactInfo}</span>
      </td>
      <td><span class="score-pill ${scoreClass}">${cand.score}%</span></td>
      <td>${cand.experience_years} yrs<br/><span class="muted">${eduText}</span></td>
      <td><div class="chip-wrap">${matchedChips || "-"}</div></td>
      <td><div class="chip-wrap">${missingChips || "None"}</div></td>
      <td>
        <select class="input-sm" onchange="saveCandidateStatus('${cand.id}', this.value)">
          <option value="">Set Status...</option>
          <option value="Shortlisted">Shortlist</option>
          <option value="Hold">Hold</option>
          <option value="Rejected">Reject</option>
        </select>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="inspectCandidate('${cand.id}')">Explain & AI</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleCompareCandidate(id, checkbox) {
  if (checkbox.checked) {
    if (state.selectedCompareIds.size >= 3) {
      checkbox.checked = false;
      alert("You can compare up to 3 candidates at a time.");
      return;
    }
    state.selectedCompareIds.add(id);
  } else {
    state.selectedCompareIds.delete(id);
  }
  updateCompareButton();
}

function updateCompareButton() {
  const btn = document.getElementById("compareBtn");
  const n = state.selectedCompareIds.size;
  btn.textContent = `Compare Selected (${n}/3)`;
  btn.disabled = n < 2;
}

async function saveCandidateStatus(candId, status) {
  if (!status || !state.recruiterResults) return;
  const cand = state.recruiterResults.candidates.find((c) => c.id === candId);
  if (!cand) return;
  const notes = prompt(`Optional recruiter notes for ${cand.name} (${status}):`, "") || "";
  await fetch("/api/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_title: state.recruiterResults.job_title,
      candidate: cand,
      status,
      notes
    })
  });
}

async function inspectCandidate(candId) {
  const cand = state.recruiterResults.candidates.find((c) => c.id === candId);
  if (!cand) return;
  const blind = document.getElementById("blindScreeningToggle").checked;
  const title = blind ? cand.blind_id : `${cand.name} — ${cand.score}% Match`;

  document.getElementById("modalTitle").textContent = title;
  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <div class="grid-2-col">
      <div>
        <h4>Score Breakdown</h4>
        <ul class="tips-list mt-8">
          <li><strong>Text Cosine Similarity:</strong> ${cand.breakdown.text_similarity}%</li>
          <li><strong>Weighted Skill Overlap:</strong> ${cand.breakdown.skill_match}%</li>
          <li><strong>Experience Fit:</strong> ${cand.breakdown.experience_fit}% (${cand.experience_years} yrs)</li>
          <li><strong>Education Fit:</strong> ${cand.breakdown.education_fit}%</li>
        </ul>
        <h4 class="mt-16">Why This Score?</h4>
        <ul class="tips-list mt-8">${cand.reasons.map((r) => `<li>${r}</li>`).join("")}</ul>
      </div>
      <div>
        <h4>✨ Gemini AI Candidate Brief & Interview Guide</h4>
        <div id="modalAiBox" class="ai-output-box mt-8">Generating AI summary & interview questions...</div>
      </div>
    </div>
  `;
  document.getElementById("modalOverlay").classList.remove("hidden");

  const jdText = document.getElementById("recJdText").value;
  const [sumRes, intRes] = await Promise.all([
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed_resume: cand, jd_text: jdText, mode: "recruiter" })
    }).then((r) => r.json()),
    fetch("/api/ai/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed_resume: cand, jd_text: jdText, missing_skills: cand.missing_skills })
    }).then((r) => r.json())
  ]);

  document.getElementById("modalAiBox").textContent =
    `3-LINE SUMMARY:\n${sumRes.content}\n\nTAILORED INTERVIEW QUESTIONS:\n${intRes.content}`;
}

function openCompareModal() {
  const blind = document.getElementById("blindScreeningToggle").checked;
  const selected = state.recruiterResults.candidates.filter((c) => state.selectedCompareIds.has(c.id));
  document.getElementById("modalTitle").textContent = "Side-by-Side Candidate Comparison";

  const cols = selected
    .map(
      (c) => `
      <div class="card">
        <h4>${blind ? c.blind_id : c.name}</h4>
        <div class="ats-score-big">${c.score}%</div>
        <p><strong>Experience:</strong> ${c.experience_years} yrs</p>
        <p><strong>Skill Match:</strong> ${c.breakdown.skill_match}%</p>
        <p><strong>Text Similarity:</strong> ${c.breakdown.text_similarity}%</p>
        <p class="mt-8"><strong>Matched:</strong> ${c.matched_skills.join(", ") || "None"}</p>
        <p class="mt-8"><strong>Missing:</strong> ${c.missing_skills.join(", ") || "None"}</p>
      </div>
    `
    )
    .join("");

  document.getElementById("modalBody").innerHTML = `<div class="grid-3-col">${cols}</div>`;
  document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal(e) {
  if (e.target.id === "modalOverlay") forceCloseModal();
}
function forceCloseModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

function renderRecruiterCharts(data) {
  const blind = document.getElementById("blindScreeningToggle").checked;
  const labels = data.candidates.map((c) => (blind ? c.blind_id : c.name.split(" ")[0]));
  const scores = data.candidates.map((c) => c.score);

  drawChart("recScoreChart", "bar", {
    labels,
    datasets: [{ label: "Match Score (%)", data: scores, backgroundColor: "#4f46e5", borderRadius: 6 }]
  });

  drawChart("recTopSkillsChart", "bar", {
    labels: data.analytics.top_skills.map((x) => x.skill),
    datasets: [{ label: "Candidates", data: data.analytics.top_skills.map((x) => x.count), backgroundColor: "#16a34a", borderRadius: 6 }]
  });

  drawChart("recMissingSkillsChart", "bar", {
    labels: data.analytics.missing_skills.map((x) => x.skill),
    datasets: [{ label: "Missing Count", data: data.analytics.missing_skills.map((x) => x.count), backgroundColor: "#dc2626", borderRadius: 6 }]
  });
}

/* ==================== JOB SEEKER MODE ==================== */

async function loadSeekerSampleResume() {
  const fname = document.getElementById("seekerSampleResumeSelect").value;
  if (!fname) return;
  const fd = new FormData();
  fd.append("sample_resume", fname);
  await parseSeekerFormData(fd, fname);
}

async function uploadSeekerResume(file) {
  if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
    alert("Please upload a valid PDF resume.");
    return;
  }
  const fd = new FormData();
  fd.append("resume", file);
  await parseSeekerFormData(fd, file.name);
}

async function parseSeekerFormData(formData, label) {
  document.getElementById("seekerFileName").textContent = `Parsing ${label}...`;
  try {
    const res = await fetch("/api/parse", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Parse error");

    state.seekerParsed = data.parsed;
    state.whatIfSkills.clear();
    document.getElementById("seekerFileName").textContent = `Loaded: ${label}`;
    const box = document.getElementById("seekerParsedSummary");
    box.innerHTML = `
      <strong>${data.parsed.name}</strong> · ${data.parsed.experience_years} yrs exp · ${data.parsed.skills.length} skills extracted<br/>
      <span class="muted">${data.parsed.email || ""} ${data.parsed.phone ? "· " + data.parsed.phone : ""}</span>
    `;
    box.classList.remove("hidden");
  } catch (err) {
    alert(err.message);
  }
}

function selectSeekerTargetRole() {
  const idx = document.getElementById("seekerRoleSelect").value;
  if (idx === "") return;
  const job = state.meta.jobs[Number(idx)];
  document.getElementById("seekerRoleTitle").value = job.title;
  document.getElementById("seekerJdText").value = job.description;
  document.getElementById("seekerMustSkills").value = job.required_skills.join(", ");
}

async function runSeekerAnalysis() {
  if (!state.seekerParsed) {
    alert("Please upload a PDF resume or select a sample resume first.");
    return;
  }
  const loader = document.getElementById("seekerLoader");
  const sec = document.getElementById("seekerResultsSection");
  loader.classList.remove("hidden");
  sec.classList.add("hidden");

  const mustSkills = document
    .getElementById("seekerMustSkills")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parsed_resume: state.seekerParsed,
        jd_text: document.getElementById("seekerJdText").value,
        must_have_skills: mustSkills
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");

    state.seekerAnalysis = data;
    renderSeekerDashboard(data);
    sec.classList.remove("hidden");
    document.getElementById("downloadReportBtn").classList.remove("hidden");
  } catch (err) {
    alert(err.message);
  } finally {
    loader.classList.add("hidden");
  }
}

function renderSeekerDashboard(data) {
  const score = data.match.final_score;
  document.getElementById("seekerScoreText").textContent = `${score}%`;
  document.getElementById("seekerMatchVerdict").textContent =
    score >= 75 ? "Strong Fit — Ready to Apply!" : score >= 50 ? "Moderate Fit — Close 2-3 Key Gaps" : "Low Fit — Upskilling Recommended";

  drawChart("seekerGaugeChart", "doughnut", {
    labels: ["Match", "Gap"],
    datasets: [{ data: [score, Math.max(0, 100 - score)], backgroundColor: ["#4f46e5", "#e2e8f0"], borderWidth: 0 }]
  }, { cutout: "76%", plugins: { legend: { display: false } } });

  // ATS Health
  document.getElementById("atsScoreBig").textContent = `${data.ats.ats_score} / 100`;
  document.getElementById("atsTipsList").innerHTML = data.ats.tips.map((t) => `<li>${t}</li>`).join("");

  // Radar Chart
  const b = data.match.breakdown;
  drawChart("seekerRadarChart", "radar", {
    labels: ["Text Similarity", "Skill Match", "Experience Fit", "Education Fit", "ATS Health"],
    datasets: [{
      label: "Your Profile",
      data: [b.text_similarity, b.skill_match, b.experience_fit, b.education_fit, data.ats.ats_score],
      backgroundColor: "rgba(79, 70, 229, 0.2)",
      borderColor: "#4f46e5"
    }]
  });

  // Keyword Heatmap
  const hmBox = document.getElementById("jdHeatmapBox");
  hmBox.innerHTML = data.match.jd_heatmap
    .map((seg) => {
      if (seg.status === "matched") return `<span class="hl-matched">${seg.text}</span>`;
      if (seg.status === "missing") return `<span class="hl-missing">${seg.text}</span>`;
      return seg.text;
    })
    .join("");

  // Learning Roadmap
  const gapBox = document.getElementById("skillGapList");
  gapBox.innerHTML =
    data.skill_gaps.length === 0
      ? `<p class="muted">Zero missing skills for this role!</p>`
      : data.skill_gaps
          .map(
            (g) => `
        <div class="roadmap-item">
          <div class="flex-between">
            <strong>${g.skill}</strong>
            <span class="chip ${g.priority.includes("Critical") ? "chip-miss" : "chip-neutral"}">${g.priority} · ${g.estimated_time}</span>
          </div>
          <p class="muted mt-8">${g.why_it_matters}</p>
          <p class="mt-8" style="font-size:0.84rem;">📚 <strong>Resource:</strong> ${g.resource}</p>
        </div>
      `
          )
          .join("");

  // Top 5 Jobs
  document.getElementById("topJobsList").innerHTML = data.recommendations
    .map(
      (job) => `
      <div class="roadmap-item">
        <div class="flex-between">
          <strong>${job.title}</strong>
          <span class="score-pill score-high">${job.match_score}% Fit</span>
        </div>
        <p class="muted mt-8">${job.reason}</p>
      </div>
    `
    )
    .join("");
}

async function runWhatIfSimulation() {
  if (!state.seekerParsed) return;
  const raw = document.getElementById("whatIfInput").value;
  raw.split(",").forEach((s) => {
    if (s.trim()) state.whatIfSkills.add(s.trim().toLowerCase());
  });
  document.getElementById("whatIfInput").value = "";

  const chipsEl = document.getElementById("whatIfChips");
  chipsEl.innerHTML = Array.from(state.whatIfSkills)
    .map((s) => `<span class="chip chip-match">+ ${s}</span>`)
    .join("");

  const mustSkills = document
    .getElementById("seekerMustSkills")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const res = await fetch("/api/whatif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_resume: state.seekerParsed,
      added_skills: Array.from(state.whatIfSkills),
      jd_text: document.getElementById("seekerJdText").value,
      must_have_skills: mustSkills
    })
  });
  const data = await res.json();
  const prevScore = state.seekerAnalysis?.match?.final_score || 0;
  const newScore = data.match.final_score;
  const delta = (newScore - prevScore).toFixed(1);

  document.getElementById("whatIfResultBanner").innerHTML = `
    <div class="fairness-banner">
      Simulated Match Score: <strong>${newScore}%</strong> (${delta >= 0 ? "+" + delta : delta}% change)
    </div>
  `;
}

async function rewriteBullet() {
  const bullet = document.getElementById("bulletInput").value.trim();
  if (!bullet) return alert("Enter a resume bullet point first.");
  showSeekerAiLoading();
  const res = await fetch("/api/ai/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bullet, role_title: document.getElementById("seekerRoleTitle").value })
  }).then((r) => r.json());
  showSeekerAiOutput(res.content);
}

async function generateCoverLetter() {
  if (!state.seekerParsed) return;
  showSeekerAiLoading();
  const res = await fetch("/api/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_resume: state.seekerParsed,
      jd_text: document.getElementById("seekerJdText").value,
      role_title: document.getElementById("seekerRoleTitle").value
    })
  }).then((r) => r.json());
  showSeekerAiOutput(res.content);
}

async function generateMockInterview() {
  if (!state.seekerParsed) return;
  showSeekerAiLoading();
  const res = await fetch("/api/ai/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_resume: state.seekerParsed,
      jd_text: document.getElementById("seekerJdText").value,
      missing_skills: state.seekerAnalysis?.match?.missing_skills || []
    })
  }).then((r) => r.json());
  showSeekerAiOutput(res.content);
}

async function generateSeekerTips() {
  if (!state.seekerParsed) return;
  showSeekerAiLoading();
  const res = await fetch("/api/ai/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parsed_resume: state.seekerParsed,
      jd_text: document.getElementById("seekerJdText").value,
      missing_skills: state.seekerAnalysis?.match?.missing_skills || [],
      mode: "seeker"
    })
  }).then((r) => r.json());
  showSeekerAiOutput(res.content);
}

function showSeekerAiLoading() {
  const box = document.getElementById("seekerAiOutput");
  box.classList.remove("hidden");
  box.textContent = "Generating AI insights...";
}
function showSeekerAiOutput(text) {
  const box = document.getElementById("seekerAiOutput");
  box.classList.remove("hidden");
  box.textContent = text;
}

function downloadTextReport() {
  if (!state.seekerAnalysis || !state.seekerParsed) return;
  const a = state.seekerAnalysis;
  const p = state.seekerParsed;
  const lines = [
    `CAREERLENS AI — CANDIDATE ANALYSIS REPORT`,
    `Candidate: ${p.name} | Target Role: ${document.getElementById("seekerRoleTitle").value}`,
    `Match Score: ${a.match.final_score}% | ATS Health: ${a.ats.ats_score}/100`,
    `\nMATCHED SKILLS: ${a.match.matched_skills.join(", ") || "None"}`,
    `MISSING SKILLS: ${a.match.missing_skills.join(", ") || "None"}`,
    `\nATS IMPROVEMENT TIPS:\n- ${a.ats.tips.join("\n- ")}`,
    `\nLEARNING ROADMAP:\n${a.skill_gaps.map((g) => `- ${g.skill} (${g.estimated_time}): ${g.resource}`).join("\n")}`,
    `\nTOP 5 RECOMMENDED ROLES:\n${a.recommendations.map((r) => `- ${r.title}: ${r.match_score}%`).join("\n")}`
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${p.name.replace(/\s+/g, "_")}_CareerLens_Report.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function drawChart(canvasId, type, data, extraOptions = {}) {
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  state.charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: { responsive: true, maintainAspectRatio: true, ...extraOptions }
  });
}