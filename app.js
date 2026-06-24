console.log("✅ App OK");

let players = {};
let items = {};
let checks = {};
let selectedPlayerId = localStorage.getItem("selectedPlayerId") || "";

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

function el(id) {
  return document.getElementById(id);
}

function setStatus(text, type = "") {
  const box = el("status");
  box.textContent = text;
  box.className = "status " + type;
}

// ADMIN-knappen er bevisst enkel og direkte. Ikke gjør denne avhengig av Firebase.
function toggleAdmin() {
  const panel = el("adminPanel");
  panel.classList.toggle("hidden");
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
  // lokal fallback
  const parts = path.split("/");
  if (parts[0] === "players") players[parts[1]] = value;
  if (parts[0] === "items") items[parts[1]] = value;
  if (parts[0] === "checks") {
    checks[parts[1]] = checks[parts[1]] || {};
    checks[parts[1]][parts[2]] = value;
  }
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

function addPlayer() {
  const name = el("name").value.trim();
  const pin = el("pin").value.trim() || generatePin();

  if (!name) {
    alert("Skriv navn på spiller først.");
    return;
  }

  const id = makeId("player");
  write("players/" + id, {
    name,
    pin,
    order: Date.now()
  });

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
  write("items/" + id, {
    name,
    order: Date.now()
  });

  el("newItem").value = "";
}

function selectPlayer() {
  selectedPlayerId = el("playerSelect").value;
  localStorage.setItem("selectedPlayerId", selectedPlayerId);
  render();
}

function toggleCheck(itemId, checked) {
  if (!selectedPlayerId) return;
  write(`checks/${selectedPlayerId}/${itemId}`, checked);
}

function copyPlayerLink(playerId) {
  const player = players[playerId];
  const url = location.origin + location.pathname + "?spiller=" + encodeURIComponent(playerId);
  const text = `${player.name}: ${url}  PIN: ${player.pin || "ingen"}`;

  navigator.clipboard.writeText(text).then(() => {
    alert("✅ Spillerlenke kopiert");
  }).catch(() => {
    prompt("Kopier lenken:", text);
  });
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

function seedDefaultItemsIfEmpty() {
  if (Object.keys(items).length > 0) return;
  defaultItems.forEach((name, index) => {
    const id = "item_" + String(index + 1).padStart(3, "0");
    write("items/" + id, { name, order: index + 1 });
  });
}

function render() {
  renderPlayers();
  renderPackingList();
  renderAdmin();
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

  if (!selectedPlayerId || !players[selectedPlayerId]) {
    selectedPlayerId = entries[0][0];
    localStorage.setItem("selectedPlayerId", selectedPlayerId);
  }

  entries.forEach(([id, player]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = player.name;
    option.selected = id === selectedPlayerId;
    select.appendChild(option);
  });

  const selected = players[selectedPlayerId];
  const link = location.origin + location.pathname + "?spiller=" + encodeURIComponent(selectedPlayerId);
  el("playerInfo").innerHTML = `<strong>${selected.name}</strong><br>PIN: ${selected.pin || "ingen"}<br><small>${link}</small>`;
}

function renderPackingList() {
  const div = el("packingList");
  div.innerHTML = "";

  if (!selectedPlayerId || !players[selectedPlayerId]) {
    div.innerHTML = '<p>Velg eller legg til spiller først.</p>';
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
    row.className = "adminRow";
    row.innerHTML = `<span>${p.name} <small>PIN: ${p.pin || "ingen"}</small></span>`;

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Kopier lenke";
    copyBtn.onclick = () => copyPlayerLink(id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Slett";
    delBtn.className = "danger";
    delBtn.onclick = () => deletePlayer(id);

    row.appendChild(copyBtn);
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

  const urlPlayer = new URLSearchParams(location.search).get("spiller");
  if (urlPlayer) selectedPlayerId = urlPlayer;

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
