let players={}, items=["Golfbag","Klær","Regntøy","Badetøy"];
let selectedPlayer=null;
let unlockedPlayers=JSON.parse(localStorage.getItem("unlocked")||"{}");
let urlId=new URLSearchParams(location.search).get("spiller");

const list=document.getElementById("list");
const select=document.getElementById("playerSelect");
const pinBox=document.getElementById("pinBox");
const pinInput=document.getElementById("pinInput");

function render(){
list.innerHTML="";
if(!selectedPlayer) return;
items.forEach((t,i)=>{
let div=document.createElement("div");
div.className="item";
let cb=document.createElement("input");
cb.type="checkbox";
cb.onchange=()=>{
if(!checkAccess(selectedPlayer)){
cb.checked=!cb.checked;return;
}
db.ref(`checks/${selectedPlayer}/${i}`).set(cb.checked);
};
div.appendChild(cb);
div.appendChild(document.createTextNode(t));
list.appendChild(div);
});
}

function checkAccess(id){
if(unlockedPlayers[id]) return true;
pinBox.classList.remove("hidden");
return false;
}

window.unlock=()=>{
let id=selectedPlayer;
let pin=pinInput.value;
if(players[id].pin===pin){
unlockedPlayers[id]=true;
localStorage.setItem("unlocked",JSON.stringify(unlockedPlayers));
pinBox.classList.add("hidden");
render();
}else{
alert("Feil PIN");
}
};

function loadPlayers(){
db.ref("players").on("value",s=>{
players=s.val()||{};
select.innerHTML="";
Object.keys(players).forEach(id=>{
let o=document.createElement("option");
o.value=id;o.innerText=players[id].name;
select.appendChild(o);
});

if(urlId && players[urlId]){
selectedPlayer=urlId;
select.value=urlId;
checkAccess(selectedPlayer);
}else{
selectedPlayer=select.value;
}
render();
});
}

select.onchange=()=>{
selectedPlayer=select.value;
render();
};

loadPlayers();
