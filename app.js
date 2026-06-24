console.log("✅ App OK - V8 PIN og spillerlenker");

let players = {};
let items = {};
let checks = {};
let selectedPlayerId = localStorage.getItem("selectedPlayerId") || "";
let unlockedPlayers = JSON.parse(localStorage.getItem("unlockedPlayers") || "{}");
let pendingPinPlayerId = "";
let urlPlayerId = new URLSearchParams(location.search).get("spiller") || "";

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

function setStatus(text, type = "") {
  const box = el("status");
  box.textContent = text;
  box.className = "status " + type;
}

// Admin-knappen skal ALDRI være avhengig av Firebase.
function toggleAdmin() {
  el("adminPanel").classList.toggle("hidden");
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

function write(path, value) {
  if (db) {
    return db.ref(path).set(value).catch(err => {
      console.error("Firebase write-feil:", err);
      alert("Firebase-feil ved lagring. Sjekk rules/databaseURL.");
    });
  }
  applyLocal(path, value);
  saveLocal();
  render();
}

function removePath(path) {
  if (db) {
    return db.ref(path).remove().catch(err => {
      console.error("Firebase delete-feil:", err);
      alert("Firebase-feil ved sletting. Sjekk rules/databaseURL.");
    });
  }
  const parts = path.split("/");
  if (parts[0] === "players") delete players[parts[1]];
  if (parts[0] === "items") delete items[parts[1]];
  if (parts[0] === "checks") delete checks[parts[1]];
  saveLocal();
  render();
}

function applyLocal(path, value) {
  const parts = path.split("/");
  if (parts[0] === "players") players[parts[1]] = value;
  if (parts[0] === "items") items[parts[1]] = value;
  if (parts[0] === "checks") {
    checks[parts[1]] = checks[parts[1]] || {};
    checks[parts[1]][parts[2]] = value;
  }
}

function playerUrl(playerId) {
  return location.origin + location.pathname + "?spiller=" + encodeURIComponent(playerId);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("✅ Kopiert");
  }).catch(() => {
    prompt("Kopier teksten:", text);
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
    render();
  } else {
    alert("Feil PIN");
  }
}

function closePinModal() {
  el("pinModal").classList.add("hidden");
}

function lockSelectedPin() {
  if (!selectedPlayerId) return;
  delete unlockedPlayers[selectedPlayerId];
  localStorage.setItem("unlockedPlayers", JSON.stringify(unlockedPlayers));
  setStatus("🔒 PIN låst for valgt spiller", "warn");
  render();
}

function addPlayer() {
  const name = el("name").value.trim();
  const pin = el("pin").value.trim() || generatePin();

  if (!name) {
    alert("Skriv navn på spiller først.");
    return;
  }

  const id = makeId("player");
  write("players/" + id, { name, pin, order: Date.now() });
  el("name").value = "";
  el("pin").value = "";
  alert(`✅ Spiller lagt til
${name}
PIN: ${pin}`);
}

function addItem() {
  const name = el("newItem").value.trim();
  if (!name) {
    alert("Skriv pakkepunkt først.");
    return;
  }

  const id = makeId("item");
  write("items/" + id, { name, order: Date.now() });
  el("newItem").value = "";
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
  write(`checks/${selectedPlayerId}/${itemId}`, checked);
}

function copyPlayerLink(playerId) {
  const player = players[playerId];
  const text = `${player.name}: ${playerUrl(playerId)}  PIN: ${player.pin || "ingen"}`;
  copyText(text);
}

function copySelectedPlayerLink() {
  if (!selectedPlayerId || !players[selectedPlayerId]) return;
  copyPlayerLink(selectedPlayerId);
}

function deletePlayer(playerId) {
  if (!confirm("Slette spiller og avkrysninger?")) return;
  removePath("players/" + playerId);
  removePath("checks/" + playerId);
}

function deleteItem(itemId) {
  if (!confirm("Slette pakkepunkt?")) return;
  removePath("items/" + itemId);
}

function savePlayerEdit(playerId) {
  const nameInput = el("name_" + playerId);
  const pinInput = el("pin_" + playerId);
  const existing = players[playerId] || {};
  write("players/" + playerId, {
    ...existing,
    name: nameInput.value.trim() || "Uten navn",
    pin: pinInput.value.trim(),
    order: existing.order || Date.now()
  });
}

function newPinFor(playerId) {
  el("pin_" + playerId).value = generatePin();
}

function seedDefaultItemsIfEmpty() {
  if (Object.keys(items).length > 0) return;
  defaultItems.forEach((name, index) => {
    const id = "item_" + String(index + 1).padStart(3, "0");
    write("items/" + id, { name, order: index + 1 });
  });
}

function render() {
  renderDirectMode();
  renderPlayers();
  renderPackingList();
  renderAdmin();
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

  el("playerInfo").innerHTML = `<strong>${selected.name}</strong><br>${locked ? "🔒 Listen er låst med PIN" : "✅ Liste åpen"}<br><small>${playerUrl(selectedPlayerId)}</small>`;

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
    span.textContent = item.name;

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
    const row = document.createElement("div");
    row.className = "adminRow playerEdit";
    row.innerHTML = `
      <input id="name_${id}" value="${String(p.name || "").replace(/"/g, '&quot;')}" aria-label="Navn">
      <input id="pin_${id}" value="${String(p.pin || "").replace(/"/g, '&quot;')}" aria-label="PIN">
    `;

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Kopier lenke";
    copyBtn.onclick = () => copyPlayerLink(id);

    const pinBtn = document.createElement("button");
    pinBtn.textContent = "Ny PIN";
    pinBtn.onclick = () => newPinFor(id);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Lagre";
    saveBtn.onclick = () => savePlayerEdit(id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Slett";
    delBtn.className = "danger";
    delBtn.onclick = () => deletePlayer(id);

    row.appendChild(copyBtn);
    row.appendChild(pinBtn);
    row.appendChild(saveBtn);
    row.appendChild(delBtn);
    adminPlayers.appendChild(row);
  });

  sortedEntries(items).forEach(([id, item]) => {
    const row = document.createElement("div");
    row.className = "adminRow";
    row.innerHTML = `<span>${item.name}</span>`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Slett";
    delBtn.className = "danger";
    delBtn.onclick = () => deleteItem(id);

    row.appendChild(delBtn);
    adminItems.appendChild(row);
  });
}

function init() {
  loadLocal();

  if (urlPlayerId) selectedPlayerId = urlPlayerId;

  if (db) {
    setStatus("Kobler til Firebase...");

    db.ref("players").on("value", snap => {
      players = snap.val() || {};
      saveLocal();
      render();
    });

    db.ref("items").on("value", snap => {
      items = snap.val() || {};
      saveLocal();
      render();
      seedDefaultItemsIfEmpty();
    });

    db.ref("checks").on("value", snap => {
      checks = snap.val() || {};
      saveLocal();
      render();
    });

    db.ref(".info/connected").on("value", snap => {
      setStatus(snap.val() ? "✅ Firebase tilkoblet" : "⚠️ Ikke kontakt med Firebase", snap.val() ? "ok" : "warn");
    });
  } else {
    setStatus("Kjører lokalt uten Firebase", "warn");
    render();
    seedDefaultItemsIfEmpty();
  }
}

init();
