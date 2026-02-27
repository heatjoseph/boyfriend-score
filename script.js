const STORAGE_KEY = "boyfriend-score-records-v1";

const form = document.querySelector("#scoreForm");
const dateInput = document.querySelector("#scoreDate");
const totalScoreEl = document.querySelector("#totalScore");
const historyBody = document.querySelector("#historyBody");
const avgScoreEl = document.querySelector("#avgScore");
const bestScoreEl = document.querySelector("#bestScore");
const worstScoreEl = document.querySelector("#worstScore");
const totalDaysEl = document.querySelector("#totalDays");
const exportBtn = document.querySelector("#exportBtn");
const clearBtn = document.querySelector("#clearBtn");

const fields = [
  "communication",
  "care",
  "responsibility",
  "romance",
  "stability"
];

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function computeTotalFromForm() {
  return fields.reduce((sum, name) => sum + Number(form.elements[name].value || 0), 0);
}

function syncRangeOutputs() {
  for (const name of fields) {
    const input = form.elements[name];
    const out = document.querySelector(`#${name}Value`);
    if (out) out.textContent = input.value;
  }
  totalScoreEl.textContent = String(computeTotalFromForm());
}

function updateStats(records) {
  totalDaysEl.textContent = String(records.length);
  if (!records.length) {
    avgScoreEl.textContent = "--";
    bestScoreEl.textContent = "--";
    worstScoreEl.textContent = "--";
    return;
  }
  const scores = records.map((r) => r.total);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  avgScoreEl.textContent = avg.toFixed(1);
  bestScoreEl.textContent = String(Math.max(...scores));
  worstScoreEl.textContent = String(Math.min(...scores));
}

function renderHistory(records) {
  historyBody.innerHTML = "";
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const r of sorted) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.total}</td>
      <td>${r.communication}</td>
      <td>${r.care}</td>
      <td>${r.responsibility}</td>
      <td>${r.romance}</td>
      <td>${r.stability}</td>
      <td title="${r.comment || ""}">${r.comment || "-"}</td>
    `;
    historyBody.appendChild(tr);
  }
  updateStats(records);
}

function upsertRecord(record) {
  const records = readRecords();
  const idx = records.findIndex((r) => r.date === record.date);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  writeRecords(records);
  renderHistory(records);
}

function loadRecordToForm(date) {
  const records = readRecords();
  const existing = records.find((r) => r.date === date);
  if (!existing) {
    fields.forEach((f) => {
      form.elements[f].value = 10;
    });
    form.elements.comment.value = "";
    syncRangeOutputs();
    return;
  }
  fields.forEach((f) => {
    form.elements[f].value = String(existing[f]);
  });
  form.elements.comment.value = existing.comment || "";
  syncRangeOutputs();
}

function exportRecords() {
  const records = readRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boyfriend-score-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearRecords() {
  const ok = window.confirm("确认清空所有历史评分吗？此操作不可恢复。");
  if (!ok) return;
  writeRecords([]);
  renderHistory([]);
  loadRecordToForm(dateInput.value || getToday());
}

function init() {
  dateInput.value = getToday();
  syncRangeOutputs();
  renderHistory(readRecords());
  loadRecordToForm(dateInput.value);

  fields.forEach((name) => {
    form.elements[name].addEventListener("input", syncRangeOutputs);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = String(form.elements.date.value || "").trim();
    if (!date) return;
    const record = {
      date,
      communication: Number(form.elements.communication.value),
      care: Number(form.elements.care.value),
      responsibility: Number(form.elements.responsibility.value),
      romance: Number(form.elements.romance.value),
      stability: Number(form.elements.stability.value),
      comment: String(form.elements.comment.value || "").trim(),
      total: computeTotalFromForm()
    };
    upsertRecord(record);
    alert("已保存，今天的你继续加油。");
  });

  dateInput.addEventListener("change", () => {
    loadRecordToForm(dateInput.value);
  });

  exportBtn.addEventListener("click", exportRecords);
  clearBtn.addEventListener("click", clearRecords);
}

init();
