const APP_VERSION = "v1.5.0-firebase-edit";
console.log("✅ App OK - " + APP_VERSION);

let players = {};
let items = {};
let checks = {};
let admins = {};
let currentUser = null;
let isAdmin = false;
let selectedPlayerId = localStorage.getItem("selectedPlayerId") || "";
let unlockedPlayers = JSON.parse(localStorage.getItem("unlockedPlayers") || "{}");
let pendingPinPlayerId = "";
let urlPlayerId = new URLSearchParams(location.search).get("spiller") || "";
let toastTimer = null;

const DEFAULT_ADMIN_UIDS = [
  "QazXIVWPn2cPSyWkg4Vfs2Hb3TK2",
  "lZ785tP5JwXoiBdh4HbS23BhrXd2"
];

const defaultItems = [
  "Golfbag og køller",
  "Golfballer, pegger og markør",
  "Golfhanske",
  "Regntøy og vindjakke",
  "Golfklær til 3 dager",
  "Golfsko",
  "Sengetøy: laken, dynetrekk og putevar",
  "Badetøy",
  "Håndkle",
  "Toalettsaker",
  "Solkrem",
  "Myggmiddel",
  "Mobil og lader",
  "Powerbank",
  "Plastpose til vått tøy"
];

function el(id) { return document.getElementById(id); }

function setVersion() {
  const v = el("appVersion");
  if (v) v.textContent = "Versjon " + APP_VERSION;
}

function setStatus(text, type = "") {
  const box = el("status");
  if (!box) return;
  box.textContent = text;
  box.className = "status " + type;
}

function showToast(message, type = "ok") {
  const box = el("toast");
  if (!box) return;
  box.textContent = message;
  box.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.add("hidden"), 3500);
}

function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function toggleAdmin() {
  el("adminPanel").classList.toggle("hidden");
  renderAuthUi();
}

function makeId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function sortedEntries(obj) {
  return Object.entries(obj || {}).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
}

function saveLocal() {
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("items", JSON.stringify(items));
  localStorage.setItem("checks", JSON.stringify(checks));
}

function loadLocal() {
  players = JSON.parse(localStorage.getItem("players") || "{}");
  items = JSON.parse(localStorage.getItem("items") || "{}");
  checks = JSON.parse(localStorage.getItem("checks") || "{}");
}

function playerUrl(playerId) {
  return location.origin + location.pathname + "?spiller=" + encodeURIComponent(playerId);
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast("Kopiert ✅", "ok"))
    .catch(() => prompt("Kopier teksten:", text));
}

function userFriendlyFirebaseError(err, action) {
  console.error(action, err);
  if (err && String(err.code || "").includes("PERMISSION_DENIED")) {
    showToast("Ingen tilgang til å lagre her. Logg inn som admin og sjekk UID i /admins.", "warn");
  } else {
    showToast("Firebase-feil. Sjekk rules, Auth eller databaseURL.", "warn");
  }
  setStatus("⚠️ Firebase svarte med feil – se adminstatus", "warn");
}

function updateAdminStatus() {
  const uid = currentUser && currentUser.uid;
  isAdmin = !!uid && (admins[uid] === true || DEFAULT_ADMIN_UIDS.includes(uid));
}

function renderAuthUi() {
  const authInfo = el("authInfo");
  const loginBox = el("loginBox");
  const notAdminBox = el("notAdminBox");
  const adminTools = el("adminTools");
  if (!authInfo) return;

  if (!currentUser) {
    authInfo.innerHTML = "Ikke innlogget.";
    loginBox.classList.remove("hidden");
    notAdminBox.classList.add("hidden");
    adminTools.classList.add("hidden");
    return;
  }

  authInfo.innerHTML = `UID: <code>${currentUser.uid}</code> ${isAdmin ? "✅ Admin" : (currentUser.isAnonymous ? "• anonym bruker" : "")}`;
  loginBox.classList.toggle("hidden", isAdmin);
  notAdminBox.classList.toggle("hidden", isAdmin || currentUser.isAnonymous);
  adminTools.classList.toggle("hidden", !isAdmin);
}

function requireAdmin() {
  updateAdminStatus();
  if (!isAdmin) {
    showToast("Du må være admin for å gjøre dette. Sjekk UID i Admin-panelet.", "warn");
    return false;
  }
  return true;
}

function ensureAuth() {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return auth.signInAnonymously()
    .then(res => res.user)
    .catch(err => {
      console.warn("Anonym innlogging feilet:", err);
      showToast("Anonym innlogging feilet. Aktiver Anonymous i Firebase Auth.", "warn");
      return null;
    });
}

function write(path, value, adminOnly = false) {
  if (adminOnly && !requireAdmin()) return;
  if (db) {
    return ensureAuth()
      .then(() => db.ref(path).set(value))
      .then(() => { if (adminOnly) showToast("Lagret ✅", "ok"); })
      .catch(err => userFriendlyFirebaseError(err, "Firebase write-feil"));
  }
  applyLocal(path, value);
  saveLocal();
  render();
  showToast("Lagret lokalt ✅", "ok");
}

function updateMany(updates, adminOnly = false) {
  if (adminOnly && !requireAdmin()) return;
  if (db) {
    return ensureAuth()
      .then(() => db.ref().update(updates))
      .then(() => showToast("Lagret ✅", "ok"))
      .catch(err => userFriendlyFirebaseError(err, "Firebase update-feil"));
  }
  Object.entries(updates).forEach(([path, value]) => applyLocal(path, value));
  saveLocal();
  render();
  showToast("Lagret lokalt ✅", "ok");
}

function removePath(path, adminOnly = false) {
  if (adminOnly && !requireAdmin()) return;
  if (db) {
    return ensureAuth()
      .then(() => db.ref(path).remove())
      .then(() => showToast("Slettet ✅", "ok"))
      .catch(err => userFriendlyFirebaseError(err, "Firebase delete-feil"));
  }
  const parts = path.split("/");
  if (parts[0] === "players") delete players[parts[1]];
  if (parts[0] === "items") delete items[parts[1]];
  if (parts[0] === "checks") delete checks[parts[1]];
  saveLocal();
  render();
  showToast("Slettet lokalt ✅", "ok");
}

function applyLocal(path, value) {
  const parts = path.split("/");
  if (parts[0] === "players") players[parts[1]] = value;
  if (parts[0] === "items") items[parts[1]] = value;
  if (parts[0] === "checks") {
    checks[parts[1]] = checks[parts[1]] || {};
    checks[parts[1]][parts[2]] = value;
  }
  if (parts[0] === "admins") admins[parts[1]] = value;
}

function loginAdmin() {
  if (!auth) return showToast("Firebase Auth er ikke lastet.", "warn");
  const email = el("emailInput").value.trim();
  const password = el("passwordInput").value;
  if (!email || !password) return showToast("Skriv e-post og passord.", "warn");
  auth.signInWithEmailAndPassword(email, password)
    .then(() => showToast("Innlogget ✅", "ok"))
    .catch(err => showToast("Innlogging feilet: " + err.message, "warn"));
}

function loginAnon() {
  ensureAuth().then(() => {
    renderAuthUi();
    showToast("Bruker anonympålogging", "ok");
  });
}

function logoutAdmin() {
  if (!auth) return;
  auth.signOut().then(() => {
    currentUser = null;
    isAdmin = false;
    renderAuthUi();
    showToast("Logget ut", "ok");
  });
}

function hasPinAccess(playerId) {
  const p = players[playerId];
  if (!p || !p.pin) return true;
  return unlockedPlayers[playerId] === true;
}

function askPin(playerId) {
  const p = players[playerId];
  if (!p || !p.pin) return true;
  if (hasPinAccess(playerId)) return true;
  pendingPinPlayerId = playerId;
  el("pinText").textContent = "Skriv PIN for " + p.name;
  el("pinInput").value = "";
  el("pinModal").classList.remove("hidden");
  setTimeout(() => el("pinInput").focus(), 50);
  return false;
}

function unlockPin() {
  const id = pendingPinPlayerId || selectedPlayerId;
  const p = players[id];
  if (!p) return;
  const entered = el("pinInput").value.trim();
  if (String(p.pin || "") === entered) {
    unlockedPlayers[id] = true;
    localStorage.setItem("unlockedPlayers", JSON.stringify(unlockedPlayers));
    el("pinModal").classList.add("hidden");
    setStatus("✅ PIN godkjent", "ok");
    showToast("PIN godkjent ✅", "ok");
    render();
  } else showToast("Feil PIN", "warn");
}

function closePinModal() { el("pinModal").classList.add("hidden"); }

function lockSelectedPin() {
  if (!selectedPlayerId) return;
  delete unlockedPlayers[selectedPlayerId];
  localStorage.setItem("unlockedPlayers", JSON.stringify(unlockedPlayers));
  setStatus("🔒 PIN låst for valgt spiller", "warn");
  render();
}

function addPlayer() {
  if (!requireAdmin()) return;
  const name = el("name").value.trim();
  const pin = el("pin").value.trim() || generatePin();
  if (!name) return showToast("Skriv navn på spiller først.", "warn");
  const id = makeId("player");
  write("players/" + id, { name, pin, order: Date.now() }, true);
  el("name").value = "";
  el("pin").value = "";
  showToast(`Spiller lagt til: ${name} / PIN ${pin}`, "ok");
}

function addItem() {
  if (!requireAdmin()) return;
  const name = el("newItem").value.trim();
  if (!name) return showToast("Skriv pakkepunkt først.", "warn");
  const id = makeId("item");
  write("items/" + id, { name, order: Date.now() }, true);
  el("newItem").value = "";
}

function saveItemEdit(itemId) {
  if (!requireAdmin()) return;
  const input = el("item_" + itemId);
  if (!input) return showToast("Fant ikke feltet som skal lagres", "warn");
  const newName = input.value.trim();
  if (!newName) return showToast("Pakkepunkt kan ikke være tomt", "warn");
  const existing = items[itemId] || {};
  write("items/" + itemId, { ...existing, name: newName, order: existing.order || Date.now() }, true);
}

function selectPlayer() {
  selectedPlayerId = el("playerSelect").value;
  localStorage.setItem("selectedPlayerId", selectedPlayerId);
  askPin(selectedPlayerId);
  render();
}

function showAllPlayers() {
  history.replaceState(null, "", location.origin + location.pathname);
  urlPlayerId = "";
  el("directBox").classList.add("hidden");
  el("playerSelect").disabled = false;
  render();
}

function toggleCheck(itemId, checked) {
  if (!selectedPlayerId) return;
  if (!askPin(selectedPlayerId)) return;
  write(`checks/${selectedPlayerId}/${itemId}`, checked, false);
}

function copyPlayerLink(playerId) {
  const player = players[playerId];
  copyText(`${player.name}: ${playerUrl(playerId)}  PIN: ${player.pin || "ingen"}`);
}

function copySelectedPlayerLink() {
  if (!selectedPlayerId || !players[selectedPlayerId]) return;
  copyPlayerLink(selectedPlayerId);
}

function copyAllLinks() {
  const lines = sortedEntries(players).map(([id, p]) => `${p.name}: ${playerUrl(id)}  PIN: ${p.pin || "ingen"}`);
  copyText(lines.join("\n"));
}

function deletePlayer(playerId) {
  if (!confirm("Slette spiller og avkrysninger?")) return;
  removePath("players/" + playerId, true);
  removePath("checks/" + playerId, false);
}

function deleteItem(itemId) {
  if (!confirm("Slette pakkepunkt?")) return;
  removePath("items/" + itemId, true);
}

function savePlayerEdit(playerId) {
  if (!requireAdmin()) return;
  const existing = players[playerId] || {};
  write("players/" + playerId, {
    ...existing,
    name: el("name_" + playerId).value.trim() || "Uten navn",
    pin: el("pin_" + playerId).value.trim(),
    order: existing.order || Date.now()
  }, true);
}

function newPinFor(playerId) { el("pin_" + playerId).value = generatePin(); }

function getPlayerProgress(playerId) {
  const total = Object.keys(items).length;
  if (total === 0) return 0;
  const done = Object.values(checks[playerId] || {}).filter(v => v === true).length;
  return Math.round((done / total) * 100);
}

function importTextList() {
  if (!requireAdmin()) return;
  const text = el("importBox").value.trim();
  if (!text) return showToast("Ingen data å importere", "warn");
  const updates = {};
  text.split("\n").forEach((line, index) => {
    const name = line.trim();
    if (!name) return;
    const id = makeId("item") + "_" + index;
    updates["items/" + id] = { name, order: Date.now() + index };
  });
  if (Object.keys(updates).length === 0) return showToast("Fant ingen pakkepunkter", "warn");
  updateMany(updates, true);
  el("importBox").value = "";
}

function importJSONBackup() {
  if (!requireAdmin()) return;
  const text = el("importBox").value.trim();
  if (!text) return showToast("Ingen JSON å importere", "warn");
  try {
    const data = JSON.parse(text);
    const updates = {};
    if (data.players) Object.entries(data.players).forEach(([id, val]) => updates["players/" + id] = val);
    if (data.items) Object.entries(data.items).forEach(([id, val]) => updates["items/" + id] = val);
    if (data.checks) Object.entries(data.checks).forEach(([id, val]) => updates["checks/" + id] = val);
    if (Object.keys(updates).length === 0) return showToast("JSON inneholder ikke players/items/checks", "warn");
    updateMany(updates, true);
    el("importBox").value = "";
  } catch (e) {
    showToast("Ugyldig JSON", "warn");
  }
}

function exportData() {
  if (!requireAdmin()) return;
  const data = { players, items, checks, exportedAt: new Date().toISOString(), version: APP_VERSION };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pakkliste-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Eksportert ✅", "ok");
}

function seedDefaultItemsIfEmpty(force = false) {
  if (!force && Object.keys(items).length > 0) return;
  if (force && !requireAdmin()) return;
  const updates = {};
  defaultItems.forEach((name, index) => {
    const id = "item_" + String(index + 1).padStart(3, "0");
    updates["items/" + id] = { name, order: index + 1 };
  });
  updateMany(updates, force);
}

function render() {
  setVersion();
  updateAdminStatus();
  renderDirectMode();
  renderPlayers();
  renderPackingList();
  renderAdmin();
  renderAuthUi();
}

function renderDirectMode() {
  const direct = !!urlPlayerId;
  el("directBox").classList.toggle("hidden", !direct);
  el("playerSelect").disabled = direct;
}

function renderPlayers() {
  const select = el("playerSelect");
  select.innerHTML = "";
  const entries = sortedEntries(players);
  if (entries.length === 0) {
    select.innerHTML = '<option value="">Ingen spillere lagt til</option>';
    selectedPlayerId = "";
    el("playerInfo").innerHTML = "Legg til spiller i Admin-panelet.";
    return;
  }
  if (urlPlayerId && players[urlPlayerId]) selectedPlayerId = urlPlayerId;
  if (!selectedPlayerId || !players[selectedPlayerId]) selectedPlayerId = entries[0][0];
  localStorage.setItem("selectedPlayerId", selectedPlayerId);
  entries.forEach(([id, player]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = player.name;
    option.selected = id === selectedPlayerId;
    select.appendChild(option);
  });
  const selected = players[selectedPlayerId];
  const locked = selected.pin && !hasPinAccess(selectedPlayerId);
  el("playerInfo").innerHTML = `<strong>${escapeHtml(selected.name)}</strong><br>${locked ? "🔒 Listen er låst med PIN" : "✅ Liste åpen"}<br><small>${playerUrl(selectedPlayerId)}</small>`;
  if (urlPlayerId && selectedPlayerId === urlPlayerId) askPin(selectedPlayerId);
}

function renderPackingList() {
  const div = el("packingList");
  div.innerHTML = "";
  if (!selectedPlayerId || !players[selectedPlayerId]) {
    div.innerHTML = '<p>Velg eller legg til spiller først.</p>';
    return;
  }
  if (!hasPinAccess(selectedPlayerId)) {
    div.innerHTML = '<p>Denne listen er låst med PIN. Skriv PIN for å se og krysse av.</p>';
    return;
  }
  const entries = sortedEntries(items);
  if (entries.length === 0) {
    div.innerHTML = '<p>Ingen pakkepunkter. Legg til i Admin.</p>';
    return;
  }
  entries.forEach(([itemId, item]) => {
    const checked = !!(checks[selectedPlayerId] && checks[selectedPlayerId][itemId]);
    const row = document.createElement("label");
    row.className = "packItem" + (checked ? " done" : "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;
    checkbox.onchange = () => toggleCheck(itemId, checkbox.checked);
    const span = document.createElement("span");
    span.textContent = item.name || "Uten navn";
    row.appendChild(checkbox);
    row.appendChild(span);
    div.appendChild(row);
  });
}

function renderAdmin() {
  const adminPlayers = el("adminPlayers");
  const adminItems = el("adminItems");
  adminPlayers.innerHTML = "";
  adminItems.innerHTML = "";

  sortedEntries(players).forEach(([id, p]) => {
    const progress = getPlayerProgress(id);
    const row = document.createElement("div");
    row.className = "adminRow playerEdit";
    row.innerHTML = `
      <input id="name_${id}" value="${escapeAttr(p.name || "")}" aria-label="Navn">
      <input id="pin_${id}" value="${escapeAttr(p.pin || "")}" aria-label="PIN">
      <div class="progressBox"><div class="bar mini"><div class="fill" style="width:${progress}%"></div></div><span>${progress}%</span></div>
    `;
    const copyBtn = document.createElement("button"); copyBtn.textContent = "Kopier lenke"; copyBtn.onclick = () => copyPlayerLink(id);
    const pinBtn = document.createElement("button"); pinBtn.textContent = "Ny PIN"; pinBtn.onclick = () => newPinFor(id);
    const saveBtn = document.createElement("button"); saveBtn.textContent = "Lagre"; saveBtn.onclick = () => savePlayerEdit(id);
    const delBtn = document.createElement("button"); delBtn.textContent = "Slett"; delBtn.className = "danger"; delBtn.onclick = () => deletePlayer(id);
    row.appendChild(copyBtn);
    row.appendChild(pinBtn);
    row.appendChild(saveBtn);
    row.appendChild(delBtn);
    adminPlayers.appendChild(row);
  });

  sortedEntries(items).forEach(([id, item]) => {
    const row = document.createElement("div");
    row.className = "adminRow itemEdit";
    row.innerHTML = `<input id="item_${id}" value="${escapeAttr(item.name || "")}" aria-label="Pakkepunkt">`;
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Lagre";
    saveBtn.onclick = () => saveItemEdit(id);
    const delBtn = document.createElement("button");
    delBtn.textContent = "Slett";
    delBtn.className = "danger";
    delBtn.onclick = () => deleteItem(id);
    row.appendChild(saveBtn);
    row.appendChild(delBtn);
    adminItems.appendChild(row);
  });
}

function init() {
  loadLocal();
  setVersion();
  if (urlPlayerId) selectedPlayerId = urlPlayerId;

  if (auth) {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      updateAdminStatus();
      renderAuthUi();
      render();
    });
    ensureAuth();
  }

  if (db) {
    setStatus("Kobler til Firebase...");
    db.ref("admins").on("value", snap => { admins = snap.val() || {}; updateAdminStatus(); renderAuthUi(); });
    db.ref("players").on("value", snap => { players = snap.val() || {}; saveLocal(); render(); });
    db.ref("items").on("value", snap => { items = snap.val() || {}; saveLocal(); render(); seedDefaultItemsIfEmpty(false); });
    db.ref("checks").on("value", snap => { checks = snap.val() || {}; saveLocal(); render(); });
    db.ref(".info/connected").on("value", snap => { setStatus(snap.val() ? "✅ Firebase tilkoblet" : "⚠️ Ikke kontakt med Firebase", snap.val() ? "ok" : "warn"); });
  } else {
    setStatus("Kjører lokalt uten Firebase", "warn");
    render();
    seedDefaultItemsIfEmpty(false);
  }
}

init();
