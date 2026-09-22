const STORAGE_KEY = "time-block-pwa-v1";
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"tasks":[],"records":[]}');
state.books ||= [];
state.dailySummaries ||= [];
const $ = (selector) => document.querySelector(selector);
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayKey = () => localDateKey();
const dateFromKey = (value) => new Date(`${value}T00:00:00`);
const saveLocal = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const SUPABASE_URL = "https://wacwjwtmmziakklcyuvt.supabase.co";
const SUPABASE_KEY = "sb_publishable_WygT01COp2jBZOKQMmQt-A_SQfVzgI5";
const OWNER_EMAIL = "2169365411@qq.com";
const PUBLIC_APP_URL = "https://2169365411-sudo.github.io/cike-time-journal-joyyan/";
const MIGRATION_KEY = "time-block-pending-migration";
const cloud = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: window.localStorage,
    storageKey: "cike-time-journal-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
let cloudUser = null;
const save = () => { saveLocal(); syncToCloud(); };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let selectedDate = todayKey();
let calendarMonth = new Date(dateFromKey(selectedDate).getFullYear(), dateFromKey(selectedDate).getMonth(), 1);
const formatDate = (value = selectedDate) => new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(dateFromKey(value));
const minutes = (time) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const categories = {
  money: { label: "钱", color: "#f4d34f" },
  learning: { label: "学习", color: "#72c579" },
  network: { label: "人脉", color: "#ef5b56" },
  fun: { label: "娱乐", color: "#ed82b4" },
  // PANTONE 17-3938 (Very Peri) screen-color mapping.
  rest: { label: "休息", color: "#6667AB" }
};
const categoryData = (records) => Object.keys(categories).map((key) => ({ key, ...categories[key], value: records.filter((record) => (record.category || "fun") === key).reduce((sum, record) => sum + Math.max(0, minutes(record.end) - minutes(record.start)), 0) }));
let selectedBookId = state.books[0]?.id || null;
const summaryKey = (summary) => `${summary.date}:${summary.slot}`;
const summaryPrompts = ["今天最值得记录的一件事", "今天学到或意识到什么", "明天最重要的一件事"];

function setSyncStatus(text, online = false) { $("#syncStatus").textContent = text; $("#syncDot").classList.toggle("is-online", online); }
function updateCategorySwatch(selectId, swatchId) {
  const category = categories[$(selectId).value] || categories.fun;
  $(swatchId).style.setProperty("--category-color", category.color);
  $(swatchId).title = `${category.label}：${category.color}`;
}
const pendingMigration = () => { try { return JSON.parse(localStorage.getItem(MIGRATION_KEY) || "null"); } catch { return null; } };
const isOwner = () => cloudUser?.email?.toLowerCase() === OWNER_EMAIL;
function emailRedirectUrl(migration) {
  const url = new URL(PUBLIC_APP_URL);
  if (migration) {
    url.searchParams.set("migration_source", migration.sourceUserId);
    url.searchParams.set("migration_token", migration.tokenHash);
  }
  return url.href;
}
function captureMigrationFromUrl() {
  const url = new URL(window.location.href);
  const sourceUserId = url.searchParams.get("migration_source");
  const tokenHash = url.searchParams.get("migration_token");
  if (!sourceUserId || !tokenHash) return;
  localStorage.setItem(MIGRATION_KEY, JSON.stringify({ sourceUserId, tokenHash }));
  url.searchParams.delete("migration_source");
  url.searchParams.delete("migration_token");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
async function hashToken(token) { const bytes = new TextEncoder().encode(token); const hash = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function blobToDataUrl(blob) { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); }); }
async function cacheBookImagesForMigration() {
  for (const book of state.books) for (const field of ["excerpts", "reflections"]) for (const note of book[field] || []) {
    if (note.image && !note.image.startsWith("data:")) { const response = await fetch(note.image); if (response.ok) note.image = await blobToDataUrl(await response.blob()); }
    if (note.image) note.imagePath = null;
  }
  saveLocal();
}
async function syncToCloud() {
  if (!cloudUser || !cloud) return;
  setSyncStatus("正在同步", true);
  const tasks = state.tasks.map((task) => ({ id: task.id, user_id: cloudUser.id, title: task.title, planned_time: task.time || null, date: task.date, done: task.done }));
  const records = state.records.map((record) => ({ id: record.id, user_id: cloudUser.id, title: record.title, start_time: record.start, end_time: record.end, category: record.category || "fun", date: record.date }));
  const [taskResult, recordResult] = await Promise.all([
    tasks.length ? cloud.from("time_tasks").upsert(tasks) : Promise.resolve({ error: null }),
    records.length ? cloud.from("time_records").upsert(records) : Promise.resolve({ error: null })
  ]);
  setSyncStatus(taskResult.error || recordResult.error ? "同步失败" : "已同步", !(taskResult.error || recordResult.error));
}
async function loadFromCloud() {
  if (!cloudUser || !cloud) return;
  setSyncStatus("读取云端", true);
  const [taskResult, recordResult, summaryResult] = await Promise.all([
    cloud.from("time_tasks").select("*"),
    cloud.from("time_records").select("*"),
    cloud.from("daily_summaries").select("*")
  ]);
  if (taskResult.error || recordResult.error) { setSyncStatus("同步失败"); return; }
  state.tasks = taskResult.data.map((task) => ({ id: task.id, title: task.title, time: task.planned_time || "", date: task.date, done: task.done }));
  state.records = recordResult.data.map((record) => ({ id: record.id, title: record.title, start: record.start_time, end: record.end_time, category: record.category, date: record.date }));
  const summariesToUpload = [];
  if (!summaryResult.error) {
    const cloudSummaries = new Map(summaryResult.data.map((summary) => [summaryKey(summary), { id: summary.id, date: summary.date, slot: Number(summary.slot), content: summary.content, savedAt: summary.updated_at, syncState: "synced", syncError: "" }]));
    for (const localSummary of state.dailySummaries.filter((summary) => summary.content?.trim())) {
      const key = summaryKey(localSummary);
      if (!cloudSummaries.has(key)) {
        const preserved = { ...localSummary, syncState: "syncing", syncError: "" };
        cloudSummaries.set(key, preserved);
        summariesToUpload.push(preserved);
      }
    }
    state.dailySummaries = [...cloudSummaries.values()];
  }
  saveLocal(); renderTasks(); renderRecords(); renderStats(); renderDailySummaries(); renderDateControls();
  if (summaryResult.error) { setSyncStatus("日程已同步；总结读取失败", false); return; }
  for (const summary of summariesToUpload) await syncDailySummaryToCloud(summary);
  setSyncStatus("已同步", true);
}
async function syncRecordToCloud(record) {
  if (!cloudUser || !cloud) return;
  setSyncStatus("正在同步", true);
  const { error } = await cloud.from("time_records").upsert({ id: record.id, user_id: cloudUser.id, title: record.title, start_time: record.start, end_time: record.end, category: record.category || "fun", date: record.date });
  setSyncStatus(error ? "记录同步失败" : "已同步", !error);
}
async function deleteRecordFromCloud(id) {
  if (!cloudUser || !cloud) return;
  setSyncStatus("正在删除", true);
  const { error } = await cloud.from("time_records").delete().eq("id", id);
  setSyncStatus(error ? "删除同步失败" : "已同步", !error);
}
function summaryErrorMessage(error, action = "保存") {
  const message = error?.message || "网络或权限异常";
  if (/row-level security|permission denied/i.test(message)) return `${action}失败：没有写入权限`;
  if (/relation .*daily_summaries|does not exist/i.test(message)) return `${action}失败：总结数据表尚未完成升级`;
  if (/check constraint|char_length/i.test(message)) return `${action}失败：内容需要在 1 至 500 字之间`;
  return `${action}失败：${message}`;
}
function summarySyncMeta(summary) {
  if (summary.syncState === "syncing") return { text: "正在同步", tone: "" };
  if (summary.syncState === "failed") return { text: summary.syncError || "保存失败，请重试", tone: "is-failed" };
  if (!cloudUser || summary.syncState === "local") return { text: "仅本机保存，请登录后同步", tone: "is-local" };
  return { text: "已同步", tone: "is-synced" };
}
function summaryTime(summary) {
  if (!summary.savedAt) return "已保存";
  const date = new Date(summary.savedAt);
  return Number.isNaN(date.valueOf()) ? "已保存" : `已保存 · ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
}
async function syncDailySummaryToCloud(summary) {
  if (!cloudUser || !cloud) {
    summary.syncState = "local";
    summary.syncError = "仅本机保存，请登录后同步";
    saveLocal(); renderDailySummaries(); renderDateControls();
    return { ok: false, local: true };
  }
  summary.syncState = "syncing";
  summary.syncError = "";
  saveLocal(); renderDailySummaries();
  setSyncStatus("正在同步", true);
  const { error } = await cloud.from("daily_summaries").upsert({ id: summary.id, user_id: cloudUser.id, date: summary.date, slot: summary.slot, content: summary.content, updated_at: new Date().toISOString() }, { onConflict: "user_id,date,slot" });
  if (error) {
    summary.syncState = "failed";
    summary.syncError = summaryErrorMessage(error);
    saveLocal(); renderDailySummaries();
    setSyncStatus(summary.syncError, false);
    return { ok: false };
  }
  summary.syncState = "synced";
  summary.syncError = "";
  summary.savedAt = new Date().toISOString();
  saveLocal(); renderDailySummaries(); renderDateControls();
  setSyncStatus("已同步", true);
  return { ok: true };
}
async function deleteDailySummaryFromCloud(summary) {
  if (!cloudUser || !cloud) return { ok: true, local: true };
  setSyncStatus("正在删除", true);
  const { error } = await cloud.from("daily_summaries").delete().eq("id", summary.id);
  if (error) {
    summary.syncState = "failed";
    summary.pendingAction = "delete";
    summary.syncError = summaryErrorMessage(error, "删除");
    saveLocal(); renderDailySummaries();
    setSyncStatus(summary.syncError, false);
    return { ok: false };
  }
  setSyncStatus("已同步", true);
  return { ok: true };
}
async function signedImage(path) {
  if (!path || !cloud) return "";
  const { data } = await cloud.storage.from("reading-images").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl || "";
}
async function syncBooksToCloud() {
  if (!cloudUser || !cloud) return;
  setSyncStatus("正在同步", true);
  const bookRows = state.books.map((book) => ({ id: book.id, user_id: cloudUser.id, title: book.title, author: book.author || null, rating: book.rating || 0 }));
  const { error: bookError } = await cloud.from("reading_books").upsert(bookRows);
  if (bookError) { setSyncStatus("阅读笔记同步失败"); return; }
  const noteRows = [];
  for (const book of state.books) {
    for (const [field, noteType] of [["excerpts", "excerpt"], ["reflections", "reflection"]]) {
      for (const note of book[field] || []) {
        if (note.image?.startsWith("data:") && !note.imagePath) {
          const imagePath = `${cloudUser.id}/${book.id}/${note.id}.jpg`;
          const blob = await (await fetch(note.image)).blob();
          const { error } = await cloud.storage.from("reading-images").upload(imagePath, blob, { upsert: true, contentType: "image/jpeg" });
          if (error) { setSyncStatus("图片上传失败"); continue; }
          note.imagePath = imagePath;
        }
        noteRows.push({ id: note.id, book_id: book.id, user_id: cloudUser.id, note_type: noteType, body: note.text || null, image_path: note.imagePath || null });
      }
    }
  }
  const { error: noteError } = noteRows.length ? await cloud.from("reading_notes").upsert(noteRows) : { error: null };
  saveLocal(); setSyncStatus(noteError ? "阅读笔记同步失败" : "已同步", !noteError);
}
async function loadBooksFromCloud() {
  if (!cloudUser || !cloud) return;
  const [bookResult, noteResult] = await Promise.all([cloud.from("reading_books").select("*").order("updated_at", { ascending: false }), cloud.from("reading_notes").select("*").order("created_at", { ascending: false })]);
  if (bookResult.error || noteResult.error) { setSyncStatus("阅读笔记同步失败"); return; }
  if (!bookResult.data.length && state.books.length) { await syncBooksToCloud(); return; }
  const notesWithImages = await Promise.all(noteResult.data.map(async (note) => ({ ...note, image: await signedImage(note.image_path) })));
  state.books = bookResult.data.map((book) => ({ id: book.id, title: book.title, author: book.author || "", rating: book.rating || 0, excerpts: notesWithImages.filter((note) => note.book_id === book.id && note.note_type === "excerpt").map((note) => ({ id: note.id, text: note.body || "", image: note.image, imagePath: note.image_path })), reflections: notesWithImages.filter((note) => note.book_id === book.id && note.note_type === "reflection").map((note) => ({ id: note.id, text: note.body || "", image: note.image, imagePath: note.image_path })) }));
  selectedBookId = state.books[0]?.id || null;
  saveLocal(); renderBooks();
}
async function deleteNoteFromCloud(note) {
  if (!cloudUser || !cloud) return;
  await cloud.from("reading_notes").delete().eq("id", note.id);
  if (note.imagePath) await cloud.storage.from("reading-images").remove([note.imagePath]);
}
async function prepareOwnerLogin() {
  if (!cloud || isOwner()) return;
  const button = $("#emailConfirmButton");
  button.disabled = true;
  try {
    let migration = pendingMigration();
    if (cloudUser?.is_anonymous) {
      setSyncStatus("正在准备迁移数据");
      await cacheBookImagesForMigration();
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await cloud.from("account_migrations").upsert({ source_user_id: cloudUser.id, token_hash: tokenHash, expires_at: expiresAt });
      if (error) { setSyncStatus(`迁移准备失败：${error.message}`); return; }
      migration = { sourceUserId: cloudUser.id, tokenHash, expiresAt };
      localStorage.setItem(MIGRATION_KEY, JSON.stringify(migration));
      await cloud.auth.signOut();
      cloudUser = null;
      updateAuthUI();
    }
    setSyncStatus("正在发送 QQ 邮箱登录链接");
    const { error } = await cloud.auth.signInWithOtp({ email: OWNER_EMAIL, options: { emailRedirectTo: emailRedirectUrl(migration), shouldCreateUser: false } });
    setSyncStatus(error ? `登录链接发送失败：${error.message}` : "链接已发送，请复制 QQ 邮箱中的登录链接并粘贴到 Safari 打开");
  } finally { button.disabled = false; }
}
async function completePendingMigration() {
  const pending = pendingMigration();
  if (!pending || !cloudUser || cloudUser.is_anonymous || !cloud) return false;
  if (!isOwner()) { setSyncStatus("请使用指定 QQ 邮箱完成确认"); return false; }
  setSyncStatus("正在迁移云端数据");
  const { error } = await cloud.rpc("claim_anonymous_migration", { p_source_user_id: pending.sourceUserId, p_token_hash: pending.tokenHash });
  if (error) { setSyncStatus(`数据迁移失败：${error.message}`); return false; }
  localStorage.removeItem(MIGRATION_KEY);
  await syncBooksToCloud();
  setSyncStatus("数据已迁移到 QQ 邮箱", true);
  return true;
}
async function initCloud() {
  if (!cloud) { setSyncStatus("本机模式"); return; }
  captureMigrationFromUrl();
  const { data } = await cloud.auth.getSession();
  cloudUser = data.session?.user || null;
  updateAuthUI();
  if (cloudUser) {
    await completePendingMigration();
    await loadFromCloud();
    await loadBooksFromCloud();
  } else if (pendingMigration()) {
    setSyncStatus("请用 QQ 邮箱登录");
  } else {
    setSyncStatus("请用 QQ 邮箱登录");
  }
  cloud.auth.onAuthStateChange(async (_event, session) => { cloudUser = session?.user || null; updateAuthUI(); if (cloudUser) { await completePendingMigration(); await loadFromCloud(); await loadBooksFromCloud(); } });
}
async function startAnonymousSession() {
  if (!cloud) return;
  setSyncStatus("正在连接云端");
  const { data, error } = await cloud.auth.signInAnonymously();
  if (error) { setSyncStatus(`云端连接失败：${error.message}`); return; }
  cloudUser = data.user;
  updateAuthUI();
  await loadFromCloud();
  await loadBooksFromCloud();
}
function updateAuthUI() {
  const pending = !!pendingMigration();
  const signedIn = isOwner();
  $("#emailConfirmButton").hidden = signedIn;
  $("#emailConfirmButton").textContent = pending ? "重新发送登录链接" : "发送 QQ 登录链接";
  $("#retrySyncButton").hidden = !cloudUser;
  $("#retrySyncButton").textContent = "立即同步";
  setSyncStatus(
    cloudUser ? (signedIn ? "已登录 QQ 邮箱" : "正在迁移旧数据") :
    "请用 QQ 邮箱登录",
    signedIn
  );
}

function renderTasks() {
  const tasks = state.tasks.filter((task) => task.date === todayKey());
  const list = $("#taskList");
  list.innerHTML = tasks.map((task) => `
    <div class="task-item">
      <input class="check" type="checkbox" ${task.done ? "checked" : ""} data-task-check="${task.id}" aria-label="完成任务" />
      <div class="item-main"><div class="item-title ${task.done ? "done" : ""}">${escapeHtml(task.title)}</div>${task.time ? `<div class="item-meta">预计 ${task.time}</div>` : ""}</div>
      <button class="delete-button" type="button" data-task-delete="${task.id}" aria-label="删除任务" title="删除任务">×</button>
    </div>`).join("");
  $("#taskEmpty").hidden = tasks.length > 0;
  $("#taskProgress").textContent = `${tasks.filter((task) => task.done).length} / ${tasks.length}`;
}

function renderRecords() {
  const records = state.records.filter((record) => record.date === selectedDate).sort((a, b) => a.start.localeCompare(b.start));
  $("#recordList").innerHTML = records.map((record) => { const category = categories[record.category] || categories.fun; return `
    <div class="record-item" data-record-card="${record.id}" style="--category:${category.color}"><div class="record-time">${record.start} - ${record.end}</div><div class="item-main"><div class="item-title">${escapeHtml(record.title)}</div><div class="item-meta">${category.label}</div></div><div class="record-actions"><button class="edit-button" type="button" data-record-edit="${record.id}" aria-label="编辑记录" title="编辑记录">✎</button><button class="delete-button" type="button" data-record-delete="${record.id}" aria-label="删除记录" title="删除记录">×</button></div></div>`; }).join("");
  $("#recordEmpty").hidden = records.length > 0;
  const total = records.reduce((sum, record) => sum + Math.max(0, minutes(record.end) - minutes(record.start)), 0);
  $("#timeTotal").textContent = `${(total / 60).toFixed(total % 60 ? 1 : 0)} 小时`;
}

function renderDateControls() {
  $("#timelineDateLabel").textContent = formatDate(selectedDate);
  $("#nextDateButton").disabled = selectedDate >= todayKey();
}
function setSelectedDate(value) {
  if (!value || value > todayKey()) return;
  selectedDate = value;
  calendarMonth = new Date(dateFromKey(value).getFullYear(), dateFromKey(value).getMonth(), 1);
  renderDateControls(); renderRecords(); renderDailySummaries(); renderStats();
}
function activeDateKeys() {
  return new Set([
    ...state.records.map((record) => record.date),
    ...state.dailySummaries.filter((summary) => summary.content?.trim()).map((summary) => summary.date)
  ]);
}
function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = todayKey();
  const activeDates = activeDateKeys();
  $("#calendarMonthLabel").textContent = `${year}年${month + 1}月`;
  $("#nextMonthButton").disabled = new Date(year, month + 1, 1) > new Date(dateFromKey(today).getFullYear(), dateFromKey(today).getMonth(), 1);
  $("#calendarGrid").innerHTML = `${"<span></span>".repeat(firstDay)}${Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const selected = key === selectedDate ? " is-selected" : "";
    const current = key === today ? " is-today" : "";
    const disabled = key > today ? " disabled" : "";
    return `<button class="calendar-day${selected}${current}" type="button" data-calendar-date="${key}"${disabled}>${day}${activeDates.has(key) ? '<span class="calendar-dot"></span>' : ""}</button>`;
  }).join("")}`;
}
function renderDailySummaries() {
  $("#summaryList").innerHTML = summaryPrompts.map((prompt, index) => {
    const slot = index + 1;
    const summary = state.dailySummaries.find((item) => item.date === selectedDate && item.slot === slot);
    if (!summary) return `<form class="summary-card" data-summary-form="${slot}"><label for="summary-${slot}">${prompt}</label><textarea id="summary-${slot}" data-summary-input="${slot}" maxlength="500" placeholder="写下这一句"></textarea><div class="summary-footer"><span class="char-count" data-summary-count="${slot}">0 / 500</span><button class="primary-button" type="submit">保存</button></div></form>`;
    const sync = summarySyncMeta(summary);
    const retryAction = summary.pendingAction === "delete" ? "删除重试" : "重试";
    return `<article class="summary-card summary-card--saved ${summary.syncState === "failed" ? "summary-card--failed" : ""}"><div class="summary-card-header"><label>${prompt}</label><span class="summary-status ${sync.tone}">${sync.text}</span></div><p class="summary-copy">${escapeHtml(summary.content)}</p><div class="summary-card-footer"><span>${summaryTime(summary)}</span><div class="summary-actions">${summary.syncState === "failed" ? `<button class="text-button" type="button" data-summary-retry="${summary.id}">${retryAction}</button>` : ""}<button class="text-button" type="button" data-summary-edit="${summary.id}">编辑</button><button class="delete-button" type="button" data-summary-delete="${summary.id}" aria-label="删除总结" title="删除总结">×</button></div></div></article>`;
  }).join("");
}

function renderChart(donutId, legendId, centerId, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const stops = data.map((item) => { const start = total ? cursor / total * 100 : 0; cursor += item.value; const end = total ? cursor / total * 100 : 0; return `${item.color} ${start}% ${end}%`; }).join(", ");
  $("#" + donutId).style.background = total ? `conic-gradient(${stops})` : "conic-gradient(#e3e0d8 0 100%)";
  $("#" + centerId).textContent = `${(total / 60).toFixed(total % 60 ? 1 : 0)}h`;
  $("#" + legendId).innerHTML = data.map((item) => `<div class="legend-row"><span class="legend-dot" style="background:${item.color}"></span><span>${item.label}</span><strong>${(item.value / 60).toFixed(item.value % 60 ? 1 : 0)}h</strong></div>`).join("");
}

function renderStats() {
  const daily = state.records.filter((record) => record.date === selectedDate);
  const dailyData = categoryData(daily);
  const allData = categoryData(state.records);
  const allTotal = allData.reduce((sum, item) => sum + item.value, 0);
  $("#statsDateLabel").textContent = formatDate(selectedDate);
  $("#dailyStatsLabel").textContent = selectedDate === todayKey() ? "今天" : formatDate(selectedDate);
  $("#statsTotal").textContent = `${(allTotal / 60).toFixed(allTotal % 60 ? 1 : 0)} 小时`;
  renderChart("dailyDonut", "dailyLegend", "dailyTotal", dailyData);
  renderChart("totalDonut", "totalLegend", "allTotal", allData);
}

function stars(rating) { return [1, 2, 3, 4, 5].map((value) => `<button class="star-button ${value <= rating ? "is-on" : ""}" type="button" data-rate="${value}" aria-label="${value} 星">★</button>`).join(""); }
function noteItem(note, type) { return `<article class="note-item"><div class="note-copy">${note.text ? `<p>${escapeHtml(note.text)}</p>` : ""}${note.image ? `<img src="${note.image}" alt="${type}图片" />` : ""}</div><button class="delete-button" type="button" data-note-delete="${note.id}" data-note-type="${type}" aria-label="删除${type}" title="删除">×</button></article>`; }
function renderBooks(showNew = false) {
  const list = $("#bookList");
  list.innerHTML = state.books.map((book) => `<button class="book-card ${book.id === selectedBookId ? "is-selected" : ""}" type="button" data-book-select="${book.id}"><span class="book-spine"></span><span class="book-card-copy"><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author || "未填写作者")}</small><span class="book-stars">${"★".repeat(book.rating || 0)}${"☆".repeat(5 - (book.rating || 0))}</span></span></button>`).join("");
  if (!state.books.length) list.innerHTML = '<div class="book-empty">书架还是空的</div>';
  const book = state.books.find((item) => item.id === selectedBookId);
  if (showNew || !book) { $("#bookDetail").innerHTML = `<form class="book-create-form" id="newBookForm"><p class="date-label">NEW BOOK</p><h3>把一本书放进书架</h3><input id="bookTitle" type="text" maxlength="80" placeholder="书名" required /><input id="bookAuthor" type="text" maxlength="60" placeholder="作者（可选）" /><button class="primary-button" type="submit">创建</button></form>`; return; }
  const excerpts = (book.excerpts || []).map((note) => noteItem(note, "书摘")).join("") || '<p class="note-empty">还没有书摘</p>';
  const reflections = (book.reflections || []).map((note) => noteItem(note, "心得")).join("") || '<p class="note-empty">还没有读书心得</p>';
  $("#bookDetail").innerHTML = `<div class="book-head"><div><p class="date-label">${escapeHtml(book.author || "READING NOTE")}</p><h3>${escapeHtml(book.title)}</h3></div><div class="rating" aria-label="书籍评分">${stars(book.rating || 0)}</div></div><div class="note-section"><div class="note-section-title"><h4>书摘</h4><span>截图或文字片段</span></div><form class="note-form" id="excerptForm"><textarea id="excerptText" maxlength="1000" placeholder="摘下让你停下来的那一段文字"></textarea><label class="upload-button">上传截图<input id="excerptImage" type="file" accept="image/*" /></label><button class="primary-button" type="submit">保存书摘</button></form><div class="note-list">${excerpts}</div></div><div class="note-section"><div class="note-section-title"><h4>读书心得</h4><span>图片或文字</span></div><form class="note-form" id="reflectionForm"><textarea id="reflectionText" maxlength="1600" placeholder="这本书给你留下了什么？"></textarea><label class="upload-button">上传图片<input id="reflectionImage" type="file" accept="image/*" /></label><button class="primary-button" type="submit">保存心得</button></form><div class="note-list">${reflections}</div></div>`;
}
function imageData(file) { return new Promise((resolve) => { if (!file) return resolve(""); const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { const max = 1200; const scale = Math.min(1, max / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", .82)); }; image.src = reader.result; }; reader.readAsDataURL(file); }); }
function saveBooks() { saveLocal(); renderBooks(); syncBooksToCloud(); }

function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
function updateRecordCount() { $("#recordTitleCount").textContent = `${$("#recordTitle").value.length} / 500`; }
function openRecordEditor(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  $("#recordEditForm").dataset.recordId = id;
  $("#recordEditDate").textContent = formatDate(record.date);
  $("#recordEditStart").value = record.start;
  $("#recordEditEnd").value = record.end;
  $("#recordEditCategory").value = record.category || "fun";
  updateCategorySwatch("#recordEditCategory", "#recordEditCategorySwatch");
  $("#recordEditTitle").value = record.title;
  $("#recordEditCount").textContent = `${record.title.length} / 500`;
  $("#recordDialog").showModal();
}
async function saveRecordEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const record = state.records.find((item) => item.id === form.dataset.recordId);
  const title = $("#recordEditTitle").value.trim();
  const start = $("#recordEditStart").value;
  const end = $("#recordEditEnd").value;
  if (!record || !title || title.length > 500 || !start || !end || minutes(end) <= minutes(start)) {
    setSyncStatus("请填写内容，并确认结束时间晚于开始时间");
    return;
  }
  record.title = title;
  record.start = start;
  record.end = end;
  record.category = $("#recordEditCategory").value;
  saveLocal();
  $("#recordDialog").close();
  renderRecords(); renderStats(); renderDateControls();
  await syncRecordToCloud(record);
}
async function saveDailySummary(event) {
  event.preventDefault();
  const form = event.target;
  const slot = Number(form.dataset.summaryForm);
  const content = form.querySelector("textarea").value.trim();
  if (!content || content.length > 500) { setSyncStatus("总结内容需要在 1 至 500 字之间"); return; }
  const summary = { id: uid(), date: selectedDate, slot, content, savedAt: new Date().toISOString(), syncState: cloudUser ? "syncing" : "local", syncError: "" };
  state.dailySummaries.push(summary);
  saveLocal(); renderDailySummaries(); renderDateControls();
  await syncDailySummaryToCloud(summary);
}

function openSummaryEditor(id) {
  const summary = state.dailySummaries.find((item) => item.id === id);
  if (!summary) return;
  $("#summaryEditForm").dataset.summaryId = id;
  $("#summaryEditDate").textContent = formatDate(summary.date);
  $("#summaryEditPrompt").textContent = summaryPrompts[summary.slot - 1];
  $("#summaryEditContent").value = summary.content;
  $("#summaryEditCount").textContent = `${summary.content.length} / 500`;
  $("#summaryDialog").showModal();
}
async function saveSummaryEdit(event) {
  event.preventDefault();
  const summary = state.dailySummaries.find((item) => item.id === event.currentTarget.dataset.summaryId);
  const content = $("#summaryEditContent").value.trim();
  if (!summary || !content || content.length > 500) { setSyncStatus("总结内容需要在 1 至 500 字之间"); return; }
  summary.content = content;
  summary.savedAt = new Date().toISOString();
  summary.pendingAction = "";
  summary.syncState = cloudUser ? "syncing" : "local";
  summary.syncError = "";
  saveLocal(); $("#summaryDialog").close(); renderDailySummaries(); renderDateControls();
  await syncDailySummaryToCloud(summary);
}
async function removeDailySummary(id, confirmed = false) {
  const summary = state.dailySummaries.find((item) => item.id === id);
  if (!summary || (!confirmed && !window.confirm("确定删除这条总结吗？删除后无法恢复。"))) return;
  summary.syncState = "syncing";
  summary.pendingAction = "delete";
  summary.syncError = "";
  saveLocal(); renderDailySummaries();
  const result = await deleteDailySummaryFromCloud(summary);
  if (!result.ok) return;
  state.dailySummaries = state.dailySummaries.filter((item) => item.id !== id);
  saveLocal(); renderDailySummaries(); renderDateControls();
}

$("#todayLabel").textContent = formatDate(todayKey());
$("#emailConfirmButton").addEventListener("click", prepareOwnerLogin);
$("#retrySyncButton").addEventListener("click", async () => {
  if (cloudUser) {
    await syncToCloud();
    await syncBooksToCloud();
  } else {
    await prepareOwnerLogin();
  }
});
$("#newBookButton").addEventListener("click", () => renderBooks(true));
document.addEventListener("click", (event) => {
  const bookButton = event.target.closest("[data-book-select]");
  if (bookButton) { selectedBookId = bookButton.dataset.bookSelect; renderBooks(); return; }
  const star = event.target.closest("[data-rate]");
  if (star) { const book = state.books.find((item) => item.id === selectedBookId); if (book) { book.rating = Number(star.dataset.rate); saveBooks(); } return; }
  const deleteNote = event.target.closest("[data-note-delete]");
  if (deleteNote) { const book = state.books.find((item) => item.id === selectedBookId); if (book) { const field = deleteNote.dataset.noteType === "书摘" ? "excerpts" : "reflections"; const note = (book[field] || []).find((item) => item.id === deleteNote.dataset.noteDelete); book[field] = (book[field] || []).filter((item) => item.id !== deleteNote.dataset.noteDelete); saveBooks(); if (note) deleteNoteFromCloud(note); } }
});
document.addEventListener("submit", async (event) => {
  if (event.target.matches("[data-summary-form]")) { await saveDailySummary(event); return; }
  if (event.target.id === "newBookForm") { event.preventDefault(); const title = $("#bookTitle").value.trim(); if (!title) return; const book = { id: uid(), title, author: $("#bookAuthor").value.trim(), rating: 0, excerpts: [], reflections: [] }; state.books.push(book); selectedBookId = book.id; saveBooks(); return; }
  if (!["excerptForm", "reflectionForm"].includes(event.target.id)) return;
  event.preventDefault(); const book = state.books.find((item) => item.id === selectedBookId); if (!book) return; const isExcerpt = event.target.id === "excerptForm"; const text = $(isExcerpt ? "#excerptText" : "#reflectionText").value.trim(); const image = await imageData($(isExcerpt ? "#excerptImage" : "#reflectionImage").files[0]); if (!text && !image) return; const field = isExcerpt ? "excerpts" : "reflections"; book[field] ||= []; book[field].unshift({ id: uid(), text, image }); saveBooks();
});
$("#taskForm").addEventListener("submit", (event) => { event.preventDefault(); const title = $("#taskTitle").value.trim(); if (!title) return; state.tasks.push({ id: uid(), title, time: $("#taskTime").value, date: todayKey(), done: false }); save(); event.target.reset(); renderTasks(); $("#taskTitle").focus(); });
$("#recordForm").addEventListener("submit", async (event) => { event.preventDefault(); const title = $("#recordTitle").value.trim(); const start = $("#recordStart").value; const end = $("#recordEnd").value; if (!title || title.length > 500 || !start || !end || minutes(end) <= minutes(start)) { setSyncStatus("请填写内容，并确认结束时间晚于开始时间"); return; } const record = { id: uid(), title, start, end, category: $("#recordCategory").value, date: selectedDate }; state.records.push(record); saveLocal(); event.target.reset(); updateRecordCount(); renderRecords(); renderStats(); renderDateControls(); await syncRecordToCloud(record); $("#recordTitle").focus(); });
$("#recordEditForm").addEventListener("submit", saveRecordEdit);
$("#recordEditClose").addEventListener("click", () => $("#recordDialog").close());
$("#recordCategory").addEventListener("change", () => updateCategorySwatch("#recordCategory", "#recordCategorySwatch"));
$("#recordEditCategory").addEventListener("change", () => updateCategorySwatch("#recordEditCategory", "#recordEditCategorySwatch"));
$("#summaryEditForm").addEventListener("submit", saveSummaryEdit);
$("#summaryEditClose").addEventListener("click", () => $("#summaryDialog").close());
$("#recordTitle").addEventListener("input", updateRecordCount);
$("#recordEditTitle").addEventListener("input", () => { $("#recordEditCount").textContent = `${$("#recordEditTitle").value.length} / 500`; });
$("#summaryEditContent").addEventListener("input", () => { $("#summaryEditCount").textContent = `${$("#summaryEditContent").value.length} / 500`; });
$("#selectedDateButton").addEventListener("click", () => { calendarMonth = new Date(dateFromKey(selectedDate).getFullYear(), dateFromKey(selectedDate).getMonth(), 1); renderCalendar(); $("#dateCalendar").showModal(); });
$("#calendarCloseButton").addEventListener("click", () => $("#dateCalendar").close());
$("#previousMonthButton").addEventListener("click", () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); renderCalendar(); });
$("#nextMonthButton").addEventListener("click", () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); renderCalendar(); });
$("#previousDateButton").addEventListener("click", () => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() - 1); setSelectedDate(localDateKey(date)); });
$("#nextDateButton").addEventListener("click", () => { const date = dateFromKey(selectedDate); date.setDate(date.getDate() + 1); setSelectedDate(localDateKey(date)); });
$("#todayDateButton").addEventListener("click", () => setSelectedDate(todayKey()));
$("#calendarGrid").addEventListener("click", (event) => { const day = event.target.closest("[data-calendar-date]"); if (!day) return; setSelectedDate(day.dataset.calendarDate); $("#dateCalendar").close(); });
document.addEventListener("click", async (event) => { const view = event.target.closest("[data-view]"); if (view) { document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab === view)); document.querySelectorAll(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view.dataset.view}View`)); }
  const summaryEdit = event.target.closest("[data-summary-edit]"); if (summaryEdit) { openSummaryEditor(summaryEdit.dataset.summaryEdit); return; }
  const summaryDelete = event.target.closest("[data-summary-delete]"); if (summaryDelete) { await removeDailySummary(summaryDelete.dataset.summaryDelete); return; }
  const summaryRetry = event.target.closest("[data-summary-retry]"); if (summaryRetry) { const summary = state.dailySummaries.find((item) => item.id === summaryRetry.dataset.summaryRetry); if (summary) { if (summary.pendingAction === "delete") await removeDailySummary(summary.id, true); else await syncDailySummaryToCloud(summary); } return; }
  const taskDelete = event.target.closest("[data-task-delete]"); if (taskDelete) { state.tasks = state.tasks.filter((task) => task.id !== taskDelete.dataset.taskDelete); save(); renderTasks(); return; }
  const recordDelete = event.target.closest("[data-record-delete]"); if (recordDelete) { const id = recordDelete.dataset.recordDelete; state.records = state.records.filter((record) => record.id !== id); saveLocal(); renderRecords(); renderStats(); renderDateControls(); await deleteRecordFromCloud(id); return; }
  const recordEdit = event.target.closest("[data-record-edit]"); if (recordEdit) { openRecordEditor(recordEdit.dataset.recordEdit); return; }
  const recordCard = event.target.closest("[data-record-card]"); if (recordCard && !event.target.closest("button")) openRecordEditor(recordCard.dataset.recordCard);
});
document.addEventListener("change", (event) => { const checkbox = event.target.closest("[data-task-check]"); if (!checkbox) return; const task = state.tasks.find((item) => item.id === checkbox.dataset.taskCheck); if (task) task.done = checkbox.checked; save(); renderTasks(); });
document.addEventListener("input", (event) => { const input = event.target.closest("[data-summary-input]"); if (!input) return; const count = document.querySelector(`[data-summary-count="${input.dataset.summaryInput}"]`); if (count) count.textContent = `${input.value.length} / 500`; });

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredPrompt = event; $("#installButton").hidden = false; });
$("#installButton").addEventListener("click", async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt = null; $("#installButton").hidden = true; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
renderTasks();
renderDateControls();
renderRecords();
renderStats();
renderDailySummaries();
renderBooks();
updateCategorySwatch("#recordCategory", "#recordCategorySwatch");
updateCategorySwatch("#recordEditCategory", "#recordEditCategorySwatch");
initCloud();
