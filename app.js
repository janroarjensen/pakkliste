const APP_VERSION="v1.4.0";
let players={},items={},checks={};

function el(id){return document.getElementById(id);}

function toggleAdmin(){el("adminPanel").classList.toggle("hidden");}

function addPlayer(){
 const id="p_"+Date.now();
 players[id]={name:el("name").value};
 render();
}

function importText(){
 el("importBox").value.split("
").forEach(l=>{
  if(l.trim()){
    const id="i_"+Date.now()+Math.random();
    items[id]={name:l.trim()};
  }
 });
 render();
}

function exportData(){
 const blob=new Blob([JSON.stringify({players,items,checks},null,2)],{type:"application/json"});
 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download="backup.json";
 a.click();
}

function saveItem(id){
 items[id].name=el("item_"+id).value;
 render();
}

function deleteItem(id){
 delete items[id];
 render();
}

function getProgress(pid){
 const total=Object.keys(items).length;
 if(!total)return 0;
 const done=Object.values(checks[pid]||{}).filter(v=>v).length;
 return Math.round(done/total*100);
}

function toggleCheck(pid,iid,val){
 checks[pid]=checks[pid]||{};
 checks[pid][iid]=val;
 render();
}

function render(){
 el("version").textContent="Versjon "+APP_VERSION;

 const pDiv=el("playerList");
 pDiv.innerHTML="";

 Object.entries(players).forEach(([pid,p])=>{
  const d=document.createElement("div");
  const prog=getProgress(pid);
  d.innerHTML=`<h3>${p.name}</h3><div class="bar"><div class="fill" style="width:${prog}%"></div></div>${prog}%`;
  Object.entries(items).forEach(([iid,it])=>{
    const chk=checks[pid]?.[iid]||false;
    const row=document.createElement("div");
    row.innerHTML=`<input type="checkbox" ${chk?'checked':''} onchange="toggleCheck('${pid}','${iid}',this.checked)">${it.name}`;
    d.appendChild(row);
  });
  pDiv.appendChild(d);
 });

 renderAdmin();
}

function renderAdmin(){
 const a=el("adminItems");
 a.innerHTML="";
 Object.entries(items).forEach(([id,it])=>{
  const d=document.createElement("div");
  d.innerHTML=`<input id="item_${id}" value="${it.name}">`;

  const save=document.createElement("button");
  save.textContent="Lagre";
  save.onclick=()=>saveItem(id);

  const del=document.createElement("button");
  del.textContent="Slett";
  del.onclick=()=>deleteItem(id);

  d.appendChild(save);
  d.appendChild(del);
  a.appendChild(d);
 });
}

render();