let players = {};
let items = {};
let checks = {};

function toggleAdmin(){
 document.getElementById("adminPanel").classList.toggle("hidden");
}

function addPlayer(){
 const id="p_"+Date.now();
 players[id]={name:document.getElementById("name").value};
 render();
}

function importList(){
 const lines=document.getElementById("importBox").value.split("
");
 lines.forEach(l=>{
  if(l.trim()){
    const id="i_"+Date.now()+Math.random();
    items[id]={name:l.trim()};
  }
 });
 render();
}

function getProgress(pid){
 const total=Object.keys(items).length;
 if(total===0)return 0;
 const done=Object.values(checks[pid]||{}).filter(v=>v).length;
 return Math.round(done/total*100);
}

function toggleCheck(pid,iid,val){
 checks[pid]=checks[pid]||{};
 checks[pid][iid]=val;
 render();
}

function render(){
 let pDiv=document.getElementById("playerList");
 pDiv.innerHTML="";

 Object.entries(players).forEach(([pid,p])=>{
   let div=document.createElement("div");

   let prog=getProgress(pid);

   div.innerHTML=`<h3>${p.name}</h3>
   <div class="bar"><div class="fill" style="width:${prog}%"></div></div>
   ${prog}%`;

   Object.entries(items).forEach(([iid,it])=>{
     let chk=checks[pid]?.[iid]||false;
     let row=document.createElement("div");
     row.innerHTML=`<input type="checkbox" ${chk?'checked':''}
       onchange="toggleCheck('${pid}','${iid}',this.checked)">${it.name}`;
     div.appendChild(row);
   });

   pDiv.appendChild(div);
 });

 renderAdmin();
}

function renderAdmin(){
 let a=document.getElementById("adminPlayers");
 a.innerHTML="";
 Object.entries(players).forEach(([id,p])=>{
  let d=document.createElement("div");
  d.textContent=p.name+" "+getProgress(id)+"%";
  a.appendChild(d);
 });
}

render();