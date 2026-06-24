console.log("✅ App lastet");

function toggleAdmin() {
  const panel = document.getElementById("adminPanel");
  panel.classList.toggle("hidden");
}

let players = JSON.parse(localStorage.getItem("players") || "{}");

function addPlayer() {
  let name = document.getElementById("name").value;
  let pin = document.getElementById("pin").value || Math.floor(1000 + Math.random() * 9000);

  if (!name) return alert("Skriv navn!");

  let id = "player_" + Date.now();

  players[id] = { name, pin };
  localStorage.setItem("players", JSON.stringify(players));

  alert(`✅ Lagret: ${name} (PIN: ${pin})`);
  render();
}

function render() {
  let div = document.getElementById("playerList");
  div.innerHTML = "";

  Object.values(players).forEach(p => {
    let el = document.createElement("div");
    el.textContent = `${p.name} (PIN: ${p.pin})`;
    div.appendChild(el);
  });
}

render();
