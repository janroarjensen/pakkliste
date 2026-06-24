const APP_VERSION = "v1.2.0";

let players = {}, items = {}, checks = {};

function el(id){ return document.getElementById(id); }

function showToast(msg, type="ok"){
 const box = el("toast");
 if(!box) return;
 box.textContent = msg;
 box.className = "toast " + type;
 box.classList.remove("hidden");
 setTimeout(()=>box.classList.add("hidden"),3000);
}

function setVersion(){
 const v = el("appVersion");
 if(v) v.textContent = "Versjon " + APP_VERSION;
}

function toggleAdmin(){
 el("adminPanel").classList.toggle("hidden");
}

function addPlayer(){
 const name = el("name").value;
 if(!name) return showToast("Skriv navn","warn");
 const id = "p_"+Date.now();
 players[id] = {name};
 el("name").value="";
 render();
}

function importText(){
 const text = el("importBox").value;
 if(!text) return showToast("Ingen data","warn");
 text.split("
").forEach(l=>{
  if(l.trim()){
    const id = "i_"+Date.now()+Math.random();
    items[id] = {name:l.trim()};
  }
 });
 render();
 showToast("Importert ✅");
}

function exportData(){
 const data={players,items,checks};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;
 a.download="pakking-backup.json";
 a.click();
 URL.revokeObjectURL(url);
 showToast("Eksportert ✅");
}

function getProgress(pid){
 const total=Object.keys(items).length;
 if(total===0) return 0;
 const done=Object.values(checks[pid]||{}).filter(v=>v).length;
 return Math.round(done/total*100);
}

function toggleCheck(pid,iid,val){
 checks[pid]=checks[pid]||{};
 checks[pid][iid]=val;
 render();
}

function render(){
 const pDiv = el("playerList");
 pDiv.innerHTML="";

 Object.entries(players).forEach(([pid,p])=>{
  const div=document.createElement("div");
  const prog=getProgress(pid);

  div.innerHTML = `<h3>${p.name}</h3>
  <div class="bar"><div class="fill" style="width:${prog}%"></div></div>
  ${prog}%`;

  Object.entries(items).forEach(([iid,it])=>{
    const chk=checks[pid]?.[iid]||false;
    const row=document.createElement("div");
    row.innerHTML = `<input type="checkbox" ${chk?'checked':''}
      onchange="toggleCheck('${pid}','${iid}',this.checked)"> ${it.name}`;
    div.appendChild(row);
  });

  pDiv.appendChild(div);
 });

 renderAdmin();
 setVersion();
}

function renderAdmin(){
 const a = el("adminPlayers");
 a.innerHTML="";
 Object.entries(players).forEach(([id,p])=>{
   const d=document.createElement("div");
   d.textContent = p.name + " " + getProgress(id) + "%";
   a.appendChild(d);
 });
}

render();