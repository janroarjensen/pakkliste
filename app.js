console.log("✅ App lastet");

// ✅ ADMIN FUNKSJON (GARANTERT)
function toggleAdmin() {
  const panel = document.getElementById("adminPanel");
  panel.classList.toggle("hidden");
}

// ✅ DATA (LAGRER LOKALT FOR TEST)
let players = JSON.parse(localStorage.getItem("players") || "{}");

// ✅ LEGG TIL SPILLER
function addPlayer() {
  let name = document.getElementById("name").value;
  let pin = document.getElementById("pin").value;

  if (!name) {
    alert("Skriv navn!");
    return;
  }

  if (!pin) {
    pin = Math.floor(1000 + Math.random() * 9000);
  }

  let id = "player_" + Date.now();

  players[id] = {
    name: name,
    pin: pin
  };

  localStorage.setItem("players", JSON.stringify(players));

  alert(`✅ Lagret:\n${name} (PIN: ${pin})`);

  render();
}

// ✅ VIS SPILLERE
function render() {
  let div = document.getElementById("playerList");
  div.innerHTML = "";

  Object.entries(players).forEach(([id, p]) => {
    let el = document.createElement("div");
    el.innerHTML = `
      ${p.name} (PIN: ${p.pin})
    `;
    div.appendChild(el);
  });
}

render();