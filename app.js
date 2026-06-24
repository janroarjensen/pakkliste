console.log("✅ App OK - V10 FIXED");

// --- STATE ---
let players = {};
let items = {};
let checks = {};
let admins = {};
let currentUser = null;
let isAdmin = false;

// --- HELPERS ---
function el(id) {
  return document.getElementById(id);
}

function setStatus(text, type = "") {
  const box = el("status");
  if (!box) return;
  box.textContent = text;
  box.className = "status " + type;
}

function showToast(msg, type = "ok") {
  const box = el("toast");
  if (!box) return;

  box.textContent = msg;
  box.className = "toast " + type;
  box.classList.remove("hidden");

  setTimeout(() => box.classList.add("hidden"), 3000);
}

// --- ADMIN ---
function updateAdminStatus() {
  if (!currentUser) {
    isAdmin = false;
    return;
  }

  isAdmin = admins[currentUser.uid] === true;
}

function requireAdmin() {
  if (!isAdmin) {
    showToast("Ikke admin-tilgang", "warn");
    return false;
  }
  return true;
}

function toggleAdmin() {
  el("adminPanel").classList.toggle("hidden");
}

// --- FIXEN ER HER 👇 ---
function write(path, value, adminOnly = false) {

  // 🔥 STOPP før Firebase er klar (fikser feilen din)
  if (!currentUser) {
    console.log("⏳ Venter på auth...");
    return;
  }

  // 🔐 Krev admin hvis nødvendig
  if (adminOnly && !requireAdmin()) return;

  if (db) {
    db.ref(path)
      .set(value)
      .then(() => {
        if (adminOnly) showToast("Lagret ✅");
      })
      .catch(err => {
        console.error(err);

        if (err.code === "PERMISSION_DENIED") {
          showToast("Ingen tilgang (ikke admin)", "warn");
        } else {
          showToast("Firebase-feil", "warn");
        }
      });
  }
}

// --- SPILLERE ---
function addPlayer() {
  const name = el("name").value;

  if (!name) {
    showToast("Skriv navn", "warn");
    return;
  }

  const id = "player_" + Date.now();

  write("players/" + id, {
    name: name,
    order: Date.now()
  }, true);

  el("name").value = "";
}

// --- RENDER ---
function renderPlayers() {
  const select = el("playerSelect");
  if (!select) return;

  select.innerHTML = "";

  Object.entries(players).forEach(([id, p]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

// --- INIT ---
if (auth) {

  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAdminStatus();
  });

  auth.signInAnonymously();
}

if (db) {

  setStatus("Kobler til Firebase...");

  db.ref("admins").on("value", snap => {
    admins = snap.val() || {};
    updateAdminStatus();
  });

  db.ref("players").on("value", snap => {
    players = snap.val() || {};
    renderPlayers();
  });

  db.ref(".info/connected").on("value", snap => {
    setStatus(
      snap.val()
        ? "✅ Firebase tilkoblet"
        : "⚠️ Ikke kontakt med Firebase",
      snap.val() ? "ok" : "warn"
    );
  });
}
