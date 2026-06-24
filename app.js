console.log("APP STARTED ✅");

// ✅ ADMIN TOGGLE (GARANTERT FUNKSJON)
function toggleAdmin() {
  const panel = document.getElementById("adminPanel");
  panel.classList.toggle("hidden");

  console.log("Admin clicked ✅");
}

const players = {};
const db = window.firebase ? firebase.database() : null;

function addPlayer() {
  const name = document.getElementById("newPlayerName").value;
  let pin = document.getElementById("newPlayerPin").value;

  if (!pin) {
    pin = Math.floor(1000 + Math.random() * 9000);
  }

  const id = "player_" + Date.now();

  if (db) {
    db.ref("players/" + id).set({
      name: name,
      pin: pin
    });
  }

  alert(`Spiller lagt til ✅ \n${name} | PIN: ${pin}`);
}

function renderAdmin() {
  const div = document.getElementById("adminList");
  div.innerHTML = "";

  Object.keys(players).forEach(id => {
    const p = players[id];

    let row = document.createElement("div");
    row.innerHTML = `
      ${p.name} (PIN: ${p.pin})
      <button onclick="copyLink('${id}')">Kopier</button>
    `;

    div.appendChild(row);
  });
}

function copyLink(id) {
  const url = location.origin + location.pathname + "?spiller=" + id;
  navigator.clipboard.writeText(url);
  alert("Link kopiert ✅");
}
``