const SUPABASE_URL = "https://snqgctogdneolyzfzpdh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aYXhza2svfc8G81TaqAMag_dNPW4Vhf";

const authForm = document.querySelector("#authForm");
const authStatus = document.querySelector("#authStatus");
const logoutBtn = document.querySelector("#logoutBtn");
const permissionHint = document.querySelector("#permissionHint");
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
const saveBtn = document.querySelector("#saveBtn");

const fields = ["communication", "care", "responsibility", "romance", "stability"];
const isSupabaseConfigured =
  !SUPABASE_URL.includes("YOUR_SUPABASE_URL") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

const supabase = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let currentRole = null;
let recordsCache = [];

// Always prevent native form submit (page reload), even if init exits early.
authForm.addEventListener("submit", (e) => {
  e.preventDefault();
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
});

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWriterRole() {
  return currentRole === "girlfriend";
}

function setStatus(text, isWarning = false) {
  authStatus.textContent = text;
  authStatus.classList.toggle("warning", isWarning);
}

function setPermissionHint(text, isWarning = false) {
  permissionHint.textContent = text;
  permissionHint.classList.toggle("warning", isWarning);
}

function computeTotalFromForm() {
  return fields.reduce((sum, name) => sum + Number(form.elements[name].value || 0), 0);
}

function syncRangeOutputs() {
  for (const name of fields) {
    const out = document.querySelector(`#${name}Value`);
    if (out) out.textContent = form.elements[name].value;
  }
  totalScoreEl.textContent = String(computeTotalFromForm());
}

function resetFormValues() {
  fields.forEach((f) => {
    form.elements[f].value = "10";
  });
  form.elements.comment.value = "";
  syncRangeOutputs();
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
  avgScoreEl.textContent = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  bestScoreEl.textContent = String(Math.max(...scores));
  worstScoreEl.textContent = String(Math.min(...scores));
}

function createCell(value, title) {
  const td = document.createElement("td");
  td.textContent = value;
  if (title) td.title = title;
  return td;
}

function renderHistory(records) {
  historyBody.innerHTML = "";
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const r of sorted) {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(r.date));
    tr.appendChild(createCell(String(r.total)));
    tr.appendChild(createCell(String(r.communication)));
    tr.appendChild(createCell(String(r.care)));
    tr.appendChild(createCell(String(r.responsibility)));
    tr.appendChild(createCell(String(r.romance)));
    tr.appendChild(createCell(String(r.stability)));
    tr.appendChild(createCell(r.comment || "-", r.comment || ""));
    historyBody.appendChild(tr);
  }
  updateStats(records);
}

async function fetchRole(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role || null;
}

async function fetchRecords() {
  if (!currentUser) {
    recordsCache = [];
    renderHistory([]);
    return;
  }

  const query = supabase.from("daily_scores").select("*").order("score_date", { ascending: false });
  if (isWriterRole()) query.eq("created_by", currentUser.id);

  const { data, error } = await query;
  if (error) throw error;

  recordsCache = (data || []).map((row) => ({
    date: row.score_date,
    communication: row.communication,
    care: row.care,
    responsibility: row.responsibility,
    romance: row.romance,
    stability: row.stability,
    comment: row.comment || "",
    total: row.total
  }));
  renderHistory(recordsCache);
}

function loadRecordToForm(date) {
  const existing = recordsCache.find((r) => r.date === date);
  if (!existing) {
    resetFormValues();
    return;
  }
  fields.forEach((f) => {
    form.elements[f].value = String(existing[f]);
  });
  form.elements.comment.value = existing.comment || "";
  syncRangeOutputs();
}

function updatePermissionsUi() {
  const loggedIn = Boolean(currentUser);
  const canWrite = loggedIn && isWriterRole();

  for (const name of [...fields, "comment", "date"]) {
    form.elements[name].disabled = !canWrite;
  }
  saveBtn.disabled = !canWrite;
  clearBtn.disabled = !canWrite;
  exportBtn.disabled = !loggedIn;
  logoutBtn.disabled = !loggedIn;

  if (!loggedIn) {
    setPermissionHint("请先登录。女友账号可提交评分，你账号仅查看。", true);
    return;
  }
  if (canWrite) {
    setPermissionHint("当前为女友账号：可提交和修改自己的每日评分。");
  } else {
    setPermissionHint("当前为你账号：只读查看，不能提交或清空评分。");
  }
}

async function upsertRecord(record) {
  const payload = {
    score_date: record.date,
    communication: record.communication,
    care: record.care,
    responsibility: record.responsibility,
    romance: record.romance,
    stability: record.stability,
    comment: record.comment,
    total: record.total,
    created_by: currentUser.id
  };

  const { error } = await supabase.from("daily_scores").upsert(payload, {
    onConflict: "score_date,created_by"
  });
  if (error) throw error;
  await fetchRecords();
}

function exportRecords() {
  const blob = new Blob([JSON.stringify(recordsCache, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boyfriend-score-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearRecords() {
  if (!isWriterRole()) return;
  const ok = window.confirm("确认清空你账号下的全部评分吗？此操作不可恢复。");
  if (!ok) return;
  const { error } = await supabase.from("daily_scores").delete().eq("created_by", currentUser.id);
  if (error) {
    alert(`清空失败：${error.message}`);
    return;
  }
  await fetchRecords();
  loadRecordToForm(dateInput.value || getToday());
}

async function handleSession(session) {
  currentUser = session?.user || null;
  currentRole = null;

  if (!currentUser) {
    setStatus("未登录");
    recordsCache = [];
    renderHistory([]);
    updatePermissionsUi();
    resetFormValues();
    return;
  }

  try {
    currentRole = await fetchRole(currentUser.id);
    if (!currentRole) {
      setStatus(`已登录：${currentUser.email}（未分配角色）`, true);
      setPermissionHint("请在 Supabase 的 profiles 表中为该账号分配角色。", true);
    } else {
      setStatus(`已登录：${currentUser.email}（${currentRole}）`);
    }
    updatePermissionsUi();
    await fetchRecords();
    loadRecordToForm(dateInput.value || getToday());
  } catch (err) {
    setStatus(`登录态读取失败：${err.message}`, true);
  }
}

async function init() {
  dateInput.value = getToday();
  syncRangeOutputs();

  if (!window.supabase) {
    setStatus("未加载 Supabase SDK，请检查网络或脚本引入。", true);
    setPermissionHint("无法连接云端服务。", true);
    return;
  }

  if (!isSupabaseConfigured) {
    setStatus("请先在 script.js 配置 SUPABASE_URL 和 SUPABASE_ANON_KEY。", true);
    setPermissionHint("配置完成后刷新页面即可登录。", true);
    updatePermissionsUi();
    return;
  }

  fields.forEach((name) => {
    form.elements[name].addEventListener("input", syncRangeOutputs);
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = String(authForm.elements.email.value || "").trim();
    const password = String(authForm.elements.password.value || "");
    if (!email || !password) return;
    setStatus("登录中...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(`登录失败：${error.message}`, true);
      return;
    }
    authForm.reset();
  });

  logoutBtn.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(`退出失败：${error.message}`, true);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !isWriterRole()) return;
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

    try {
      await upsertRecord(record);
      alert("云端保存成功。");
    } catch (err) {
      alert(`保存失败：${err.message}`);
    }
  });

  dateInput.addEventListener("change", () => {
    loadRecordToForm(dateInput.value);
  });

  exportBtn.addEventListener("click", exportRecords);
  clearBtn.addEventListener("click", () => {
    clearRecords();
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    setStatus(`初始化失败：${error.message}`, true);
    return;
  }
  await handleSession(data.session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleSession(session);
  });
}

init();
