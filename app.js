// V6: Full admin + PIN + spillerlenker + offline-kø
// Disse UID-ene ligger som hjelpeliste i UI. Firebase rules krever fortsatt at UID finnes under /admins.
const ADMIN_UIDS = [
  "QazXIVWPn2cPSyWkg4Vfs2Hb3TK2",
  "lZ785tP5JwXoiBdh4HbS23BhrXd2"
];

const defaultPlayers = ["Spiller 1", "Spiller 2", "Spiller 3", "Spiller 4"];
const defaultItems = [
  "Golfbag og køller",
  "Golfballer, pegger og markør",
  "Golfhanske og ekstra hanske",
  "Greengaffel / pitchfork",
  "Golfklær til 3 dager",
  "Regntøy og vindjakke",
  "Genser / mellomlag",
  "Golfsko",
  "Joggesko / fritidssko",
  "Sengetøy: laken, dynetrekk og putevar",
  "Håndkle til dusj",
  "Badetøy",
  "Toalettsaker",
  "Solkrem",
  "Myggmiddel",
  "Drikkeflaske",
  "Snacks / mellommåltid",
  "Mobil og lader",
  "Powerbank",
  "Plastpose til vått tøy"
];

let players = JSON.parse(localStorage.getItem("playersCacheV6") || "{}");
let items = JSON.parse(localStorage.getItem("itemsCacheV6") || "{}");
let checks = JSON.parse(localStorage.getItem("checksCacheV6") || "{}");
let adminMap = {};
let currentUser = null;
let isConnected = false;
let selectedPlayerId = localStorage.getItem("selectedPlayerIdV6") || "";
let urlPlayerId = new URLSearchParams(location.search).get("spiller") || "";
let unlockedPlayers = JSON.parse(localStorage.getItem("unlockedPlayersV6") || "{}");
let pendingPinPlayerId = "";
const PENDING_KEY = "pendingWritesV6";

const el = id => document.getElementById(id);
const statusBox = el("statusBox");
const playerSelect = el("playerSelect");
const checklist = el("checklist");
const playerSummary = el("playerSummary");
const loginBox = el("loginBox");
const notAdminBox = el("notAdminBox");
const adminTools = el("adminTools");

function setStatus(text, type = "") { statusBox.textContent = text; statusBox.className = "status" + (type ? " " + type : ""); }
function safeKey(prefix="id") { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2,8); }
function generatePin(){ return String(Math.floor(1000 + Math.random() * 9000)); }
function sortedObj(obj) { return Object.entries(obj || {}).sort((a,b)=>(a[1].order||0)-(b[1].order||0)); }
function escapeHtml(str){ return String(str ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function isAdminUid(uid){ return !!uid && (ADMIN_UIDS.includes(uid) || adminMap[uid] === true); }
function pendingWrites(){ return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); }
function savePending(list){ localStorage.setItem(PENDING_KEY, JSON.stringify(list)); }
function cacheAll(){ localStorage.setItem("playersCacheV6", JSON.stringify(players)); localStorage.setItem("itemsCacheV6", JSON.stringify(items)); localStorage.setItem("checksCacheV6", JSON.stringify(checks)); }
function currentBaseUrl(){ return location.origin + location.pathname; }
function playerLink(playerId){ return currentBaseUrl() + "?spiller=" + encodeURIComponent(playerId); }
async function copyText(text){ try { await navigator.clipboard.writeText(text); setStatus("Kopiert ✅", "ok"); } catch(e){ prompt("Kopier teksten:", text); } }
function updateUrlToPlayer(playerId){ history.replaceState(null, "", playerLink(playerId)); urlPlayerId = playerId; }
function clearPlayerUrl(){ history.replaceState(null, "", currentBaseUrl()); urlPlayerId = ""; renderAll(); }
function fallbackAnon(){ if(!currentUser) return auth.signInAnonymously().catch(console.warn); return Promise.resolve(); }

function hasPinAccess(playerId){ const p=players[playerId]; if(!p || !p.pin) return true; return unlockedPlayers[playerId] === true; }
function askPin(playerId){
  const p = players[playerId];
  if(!p || !p.pin) return true;
  if(hasPinAccess(playerId)) return true;
  pendingPinPlayerId = playerId;
  el("pinModalText").textContent = `Skriv PIN for ${p.name}`;
  el("pinInput").value = "";
  el("pinModal").classList.remove("hidden");
  setTimeout(()=>el("pinInput").focus(), 50);
  return false;
}
function unlockPin(){
  const id = pendingPinPlayerId || selectedPlayerId;
  if(!id || !players[id]) return;
  const entered = el("pinInput").value.trim();
  if(String(players[id].pin || "") === entered){
    unlockedPlayers[id] = true;
    localStorage.setItem("unlockedPlayersV6", JSON.stringify(unlockedPlayers));
    el("pinModal").classList.add("hidden");
    setStatus("PIN godkjent ✅", "ok");
    renderAll();
  } else {
    setStatus("Feil PIN", "error");
    alert("Feil PIN");
  }
}
function lockSelected(){ if(selectedPlayerId){ delete unlockedPlayers[selectedPlayerId]; localStorage.setItem("unlockedPlayersV6", JSON.stringify(unlockedPlayers)); setStatus("PIN låst for valgt spiller", "ok"); renderAll(); } }

async function smartSet(path, value){
  applyLocal(path, value); renderAll();
  await fallbackAnon();
  if (isConnected && currentUser) { try { await db.ref(path).set(value); return; } catch(e){ console.warn(e); } }
  const q = pendingWrites(); q.push({op:"set", path, value, ts:Date.now()}); savePending(q); setStatus(`Offline/endring køet lokalt (${q.length})`, "offline");
}
async function smartRemove(path){
  applyLocal(path, null, true); renderAll();
  await fallbackAnon();
  if (isConnected && currentUser) { try { await db.ref(path).remove(); return; } catch(e){ console.warn(e); } }
  const q = pendingWrites(); q.push({op:"remove", path, ts:Date.now()}); savePending(q); setStatus(`Offline/endring køet lokalt (${q.length})`, "offline");
}
async function smartUpdate(updates){
  Object.entries(updates).forEach(([p,v])=>applyLocal(p,v)); renderAll();
  await fallbackAnon();
  if (isConnected && currentUser) { try { await db.ref().update(updates); return; } catch(e){ console.warn(e); } }
  const q = pendingWrites(); q.push({op:"update", updates, ts:Date.now()}); savePending(q); setStatus(`Offline/endring køet lokalt (${q.length})`, "offline");
}
function applyLocal(path, value, remove=false){
  const parts = path.split("/").filter(Boolean);
  if(parts[0]==="players") { if(remove || value===null) delete players[parts[1]]; else if(parts.length===2) players[parts[1]]=value; else { players[parts[1]]=players[parts[1]]||{}; players[parts[1]][parts[2]]=value; } }
  if(parts[0]==="items") { if(remove || value===null) delete items[parts[1]]; else if(parts.length===2) items[parts[1]]=value; else { items[parts[1]]=items[parts[1]]||{}; items[parts[1]][parts[2]]=value; } }
  if(parts[0]==="checks") { checks[parts[1]] = checks[parts[1]] || {}; if(remove || value===null){ if(parts.length===2) delete checks[parts[1]]; else delete checks[parts[1]][parts[2]]; } else checks[parts[1]][parts[2]]=value; }
  if(parts[0]==="admins") { if(remove || value===null) delete adminMap[parts[1]]; else adminMap[parts[1]]=value; }
  cacheAll();
}
async function flushPending(){
  await fallbackAnon();
  if(!isConnected || !currentUser) return;
  const q = pendingWrites(); if(!q.length) return;
  const failed=[];
  for(const w of q){
    try{
      if(w.op==="set") await db.ref(w.path).set(w.value);
      if(w.op==="remove") await db.ref(w.path).remove();
      if(w.op==="update") await db.ref().update(w.updates);
    }catch(e){ failed.push(w); }
  }
  savePending(failed);
  setStatus(failed.length ? `Noe kunne ikke synkes (${failed.length})` : "Alt er synket ✅", failed.length ? "error" : "ok");
}

function renderAll(){ renderDirectLinkMode(); renderAuth(); renderPlayerSelect(); renderChecklist(); renderSummary(); renderAdmin(); }
function renderDirectLinkMode(){ const active = !!urlPlayerId; el("directLinkBox").classList.toggle("hidden", !active); playerSelect.disabled = active; }
function renderAuth(){
  const uid = currentUser ? currentUser.uid : "Ikke innlogget";
  const extra = currentUser ? (isAdminUid(uid) ? " ✅ Admin" : (currentUser.isAnonymous ? " • anonym bruker" : "")) : "";
  el("uidInfo").innerHTML = currentUser ? `Din UID: <code>${escapeHtml(uid)}</code>${extra}` : "Ikke innlogget";
  loginBox.classList.toggle("hidden", !!(currentUser && isAdminUid(currentUser.uid)));
  el("logoutBtn").classList.toggle("hidden", !currentUser);
  notAdminBox.classList.toggle("hidden", !currentUser || isAdminUid(uid) || currentUser.isAnonymous);
  adminTools.classList.toggle("hidden", !currentUser || !isAdminUid(uid));
}
function renderPlayerSelect(){
  const entries = sortedObj(players); playerSelect.innerHTML="";
  if(!entries.length){ playerSelect.innerHTML = `<option>Ingen spillere lagt inn</option>`; selectedPlayerId=""; return; }
  if(urlPlayerId && players[urlPlayerId]) selectedPlayerId = urlPlayerId;
  if(!selectedPlayerId || !players[selectedPlayerId]) selectedPlayerId = entries[0][0];
  localStorage.setItem("selectedPlayerIdV6", selectedPlayerId);
  entries.forEach(([id,p])=>{ const opt=document.createElement("option"); opt.value=id; opt.textContent=p.name || id; opt.selected=id===selectedPlayerId; playerSelect.appendChild(opt); });
  if(urlPlayerId && selectedPlayerId === urlPlayerId) askPin(selectedPlayerId);
}
function renderChecklist(){
  checklist.innerHTML=""; const entries=sortedObj(items);
  if(!selectedPlayerId){ checklist.innerHTML=`<p class="hint">Legg til minst én spiller i admin-panelet.</p>`; return; }
  if(!entries.length){ checklist.innerHTML=`<p class="hint">Ingen punkter i pakkelisten ennå.</p>`; return; }
  if(!hasPinAccess(selectedPlayerId)){
    checklist.innerHTML=`<p class="hint">Denne listen er låst med PIN. Skriv PIN for å se og krysse av.</p>`;
    return;
  }
  entries.forEach(([itemId,item])=>{
    const checked=!!(checks[selectedPlayerId] && checks[selectedPlayerId][itemId]);
    const row=document.createElement("label"); row.className="item"+(checked?" done":"");
    const cb=document.createElement("input"); cb.type="checkbox"; cb.checked=checked;
    cb.addEventListener("change",()=>{ if(!askPin(selectedPlayerId)){ cb.checked=!cb.checked; return; } smartSet(`checks/${selectedPlayerId}/${itemId}`, cb.checked); });
    const span=document.createElement("span"); span.className="label"; span.textContent=item.name || itemId;
    row.appendChild(cb); row.appendChild(span); checklist.appendChild(row);
  });
}
function getProgress(pid){ const entries=sortedObj(items); const total=entries.length; if(!total) return {done:0,total:0,pct:0}; const done=entries.filter(([iid])=>checks[pid]&&checks[pid][iid]).length; return {done,total,pct:Math.round(done/total*100)}; }
function renderSummary(){
  if(!selectedPlayerId || !players[selectedPlayerId]){ playerSummary.innerHTML=`<p class="hint">Velg eller legg til spiller.</p>`; return; }
  const p=players[selectedPlayerId], prog=getProgress(selectedPlayerId);
  const locked = p.pin && !hasPinAccess(selectedPlayerId);
  const warning = locked ? "Listen er låst med PIN 🔒" : (prog.pct<100 ? "Husk spesielt: sengetøy, badetøy og regntøy 👀" : "Alt pakket. Klar for Lag-NM! ✅");
  playerSummary.innerHTML=`<div class="summaryBox"><div><h2>${escapeHtml(p.name)}</h2><div class="progressOuter"><div class="progressInner" style="width:${prog.pct}%"></div></div><p class="hint">${warning}</p></div><div class="progressText">${prog.done}/${prog.total} • ${prog.pct}%</div></div>`;
}
function renderAdmin(){
  if(!currentUser || !isAdminUid(currentUser.uid)) return;
  const adminPlayers=el("adminPlayers"), adminItems=el("adminItems"), adminUidList=el("adminUidList"); adminPlayers.innerHTML=""; adminItems.innerHTML=""; adminUidList.innerHTML="";
  sortedObj(players).forEach(([id,p])=>{
    const line=document.createElement("div"); line.className="adminLine";
    line.innerHTML=`<input value="${escapeHtml(p.name)}" aria-label="Spillernavn" /><input value="${escapeHtml(p.pin || "")}" aria-label="PIN" />`;
    const copy=document.createElement("button"); copy.className="secondary small"; copy.textContent="Kopier"; copy.onclick=()=>copyText(`${p.name}: ${playerLink(id)} PIN: ${p.pin || "ingen"}`);
    const open=document.createElement("button"); open.className="secondary small"; open.textContent="Åpne"; open.onclick=()=>{ updateUrlToPlayer(id); selectedPlayerId=id; renderAll(); window.scrollTo({top:0,behavior:"smooth"}); };
    const newPin=document.createElement("button"); newPin.className="secondary small"; newPin.textContent="Ny PIN"; newPin.onclick=()=>{ line.querySelectorAll("input")[1].value = generatePin(); };
    const save=document.createElement("button"); save.className="secondary small"; save.textContent="Lagre"; save.onclick=()=>{ const ins=line.querySelectorAll("input"); smartUpdate({[`players/${id}/name`]: ins[0].value.trim()||"Uten navn", [`players/${id}/pin`]: ins[1].value.trim()}); };
    const del=document.createElement("button"); del.className="danger small"; del.textContent="Slett"; del.onclick=()=>{ if(confirm("Slette spiller og avkrysninger?")){ smartRemove(`players/${id}`); smartRemove(`checks/${id}`); } };
    line.appendChild(copy); line.appendChild(open); line.appendChild(newPin); line.appendChild(save); line.appendChild(del); adminPlayers.appendChild(line);
  });
  sortedObj(items).forEach(([id,item])=>{ const line=document.createElement("div"); line.className="adminLine itemLine"; line.innerHTML=`<input value="${escapeHtml(item.name)}" />`; const save=document.createElement("button"); save.className="secondary small"; save.textContent="Lagre"; const del=document.createElement("button"); del.className="danger small"; del.textContent="Slett"; save.onclick=()=>smartSet(`items/${id}/name`, line.querySelector("input").value.trim()||"Uten navn"); del.onclick=()=>{ if(confirm("Slette punkt?")){ smartRemove(`items/${id}`); Object.keys(players).forEach(pid=>smartRemove(`checks/${pid}/${id}`)); } }; line.appendChild(save); line.appendChild(del); adminItems.appendChild(line); });
  const allAdmins = Array.from(new Set([...ADMIN_UIDS, ...Object.keys(adminMap||{})]));
  allAdmins.forEach(uid=>{ const line=document.createElement("div"); line.className="adminLine uidLine"; line.innerHTML=`<span><code>${escapeHtml(uid)}</code></span>`; const fixed=document.createElement("span"); fixed.className="hint"; fixed.textContent = adminMap[uid] ? "i Firebase" : "kun i app.js"; const del=document.createElement("button"); del.className="danger small"; del.textContent="Fjern"; del.disabled = !adminMap[uid]; del.onclick=()=>smartRemove(`admins/${uid}`); line.appendChild(fixed); line.appendChild(del); adminUidList.appendChild(line); });
}
function seedDefaults(){ const updates={}; defaultPlayers.forEach((name,i)=>{ const id=safeKey("player"); updates[`players/${id}`]={name,pin:generatePin(),order:Date.now()+i}; }); defaultItems.forEach((name,i)=>{ const id=safeKey("item"); updates[`items/${id}`]={name,order:Date.now()+i}; }); return smartUpdate(updates); }
function copyAllLinks(){
  const lines = sortedObj(players).map(([id,p])=>`${p.name}: ${playerLink(id)}  PIN: ${p.pin || "ingen"}`);
  copyText(lines.join("\n"));
}

playerSelect.addEventListener("change",()=>{ selectedPlayerId=playerSelect.value; localStorage.setItem("selectedPlayerIdV6",selectedPlayerId); askPin(selectedPlayerId); renderAll(); });
el("adminJumpBtn").addEventListener("click",()=>el("adminPanel").scrollIntoView({behavior:"smooth",block:"start"}));
el("showAllPlayersBtn").addEventListener("click", clearPlayerUrl);
el("copyCurrentLinkBtn").addEventListener("click",()=>{ if(selectedPlayerId && players[selectedPlayerId]) copyText(`${players[selectedPlayerId].name}: ${playerLink(selectedPlayerId)} PIN: ${players[selectedPlayerId].pin || "ingen"}`); });
el("lockPlayerBtn").addEventListener("click", lockSelected);
el("pinOkBtn").addEventListener("click", unlockPin);
el("pinCancelBtn").addEventListener("click",()=>el("pinModal").classList.add("hidden"));
el("pinInput").addEventListener("keydown",e=>{ if(e.key==="Enter") unlockPin(); });
el("emailLoginBtn").addEventListener("click",async()=>{ try{ await auth.signInWithEmailAndPassword(el("emailInput").value.trim(), el("passwordInput").value); }catch(e){ alert("Innlogging feilet: "+e.message); } });
el("anonLoginBtn").addEventListener("click",async()=>{ try{ await auth.signInAnonymously(); }catch(e){ alert("Anonym innlogging feilet: "+e.message); } });
el("logoutBtn").addEventListener("click",()=>auth.signOut());
el("generateNewPinBtn").addEventListener("click",()=>{ el("newPlayerPin").value = generatePin(); });
el("addPlayerBtn").addEventListener("click",()=>{ const name=el("newPlayerName").value.trim(); if(!name)return alert("Skriv navn først"); const pin=(el("newPlayerPin").value.trim() || generatePin()); const id=safeKey("player"); smartSet(`players/${id}`,{name,pin,order:Date.now()}); el("newPlayerName").value=""; el("newPlayerPin").value=""; });
el("addItemBtn").addEventListener("click",()=>{ const name=el("newItemName").value.trim(); if(!name)return; const id=safeKey("item"); smartSet(`items/${id}`,{name,order:Date.now()}); el("newItemName").value=""; });
el("addAdminUidBtn").addEventListener("click",()=>{ const uid=el("newAdminUid").value.trim(); if(!uid)return; smartSet(`admins/${uid}`, true); el("newAdminUid").value=""; });
el("copyAllLinksBtn").addEventListener("click", copyAllLinks);
el("markAllBtn").addEventListener("click",()=>{ if(!selectedPlayerId)return; if(!askPin(selectedPlayerId)) return; const updates={}; Object.keys(items).forEach(iid=>updates[`checks/${selectedPlayerId}/${iid}`]=true); smartUpdate(updates); });
el("resetSelectedBtn").addEventListener("click",()=>{ if(selectedPlayerId && confirm("Nullstille valgt spiller?")) smartRemove(`checks/${selectedPlayerId}`); });
el("resetAllBtn").addEventListener("click",()=>{ if(confirm("Nullstille ALLE avkrysninger?")) smartRemove("checks"); });
el("seedBtn").addEventListener("click",()=>{ if(confirm("Legge inn standard spillere og standard pakkeliste?")) seedDefaults(); });
el("syncBtn").addEventListener("click",flushPending);

window.addEventListener("online",()=>{ setStatus("På nett igjen – synker...", "ok"); flushPending(); });
window.addEventListener("offline",()=>setStatus("Offline – endringer lagres lokalt", "offline"));

try{
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("service-worker.js").catch(console.warn); }
  auth.onAuthStateChanged(user=>{ currentUser=user; renderAll(); if(user) flushPending(); });
  // Auto anonym innlogging gjør at foreldre/spillere kan krysse av uten konto når rules krever auth.
  setTimeout(()=>{ if(!auth.currentUser) auth.signInAnonymously().catch(console.warn); }, 500);
  db.ref(".info/connected").on("value",snap=>{ isConnected=!!snap.val(); const pending=pendingWrites().length; setStatus(isConnected ? (pending?`Firebase tilkoblet – ${pending} lokale endringer venter på sync`:"Firebase tilkoblet ✅") : "Offline / ikke kontakt med Firebase – bruker lokal cache", isConnected ? "ok" : "offline"); if(isConnected) flushPending(); });
  db.ref("players").on("value",snap=>{ players=snap.val()||{}; cacheAll(); renderAll(); });
  db.ref("items").on("value",snap=>{ items=snap.val()||{}; cacheAll(); renderAll(); });
  db.ref("checks").on("value",snap=>{ checks=snap.val()||{}; cacheAll(); renderAll(); });
  db.ref("admins").on("value",snap=>{ adminMap=snap.val()||{}; renderAll(); });
  renderAll();
}catch(e){ console.error(e); setStatus("App-feil: sjekk Firebase config og at Auth/Realtime Database er aktivert", "error"); renderAll(); }
