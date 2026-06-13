// Hier die Web-App-URL aus Google Apps Script eintragen:
const GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/AKfycbwjw32AWVMagkUwedLLy6wHe53vpV5RFlWYzMDpzzHp-xKNlpi1sprdl4Qov75_Yayo/exec;

const fields = ["Betrieb","Schlag/Fläche","Wagen Nr.","Feldfrucht","Erntedatum","Erntemenge (kg)","Feuchtigkeit (%)","Hektolitergewicht (kg/hl)","Trockensubstanz (kg)","Silo","Bemerkung"];
const betriebe = ["Bockholt","Düren","Steffen","Ruck"];
const silos = ["1","2","3"];
const form = document.querySelector("#entryForm");
const rows = document.querySelector("#rows");
const search = document.querySelector("#search");
const statusEl = document.querySelector("#status");
const saveBtn = document.querySelector("#saveBtn");
let entries = [];

form.elements["Erntedatum"].value = new Date().toISOString().slice(0,10);
if (GOOGLE_SCRIPT_URL.includes("DEINE_GOOGLE")) document.querySelector("#configWarning").classList.remove("hidden");

function jsonp(params){
  return new Promise((resolve,reject)=>{
    if (GOOGLE_SCRIPT_URL.includes("DEINE_GOOGLE")) return reject(new Error("Google-Apps-Script-URL fehlt."));
    const callback = "cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const query = new URLSearchParams({...params, callback});
    window[callback] = (data) => { cleanup(); data && data.ok ? resolve(data) : reject(new Error(data?.error || "Unbekannter Fehler")); };
    function cleanup(){ delete window[callback]; script.remove(); }
    script.onerror = () => { cleanup(); reject(new Error("Verbindung zu Google Sheets fehlgeschlagen.")); };
    script.src = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes("?") ? "&" : "?") + query.toString();
    document.body.appendChild(script);
  });
}

function esc(v){return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function num(v){return Number(String(v ?? "").replace(",",".")) || 0;}
function fmt(n){return new Intl.NumberFormat("de-DE",{maximumFractionDigits:2}).format(Number(n)||0);}
function setStatus(text, cls=""){ statusEl.textContent = text; statusEl.className = cls; }

function render(){
  const term = search.value.toLowerCase().trim();
  const filtered = entries.filter(e => fields.map(f => e[f]).join(" ").toLowerCase().includes(term));
  rows.innerHTML = filtered.length ? filtered.map(e => `<tr>${fields.map(f => `<td class="${f.includes('kg') || f.includes('%') || f==='Silo' ? 'number' : ''}">${esc(e[f])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="11">Keine Einträge vorhanden.</td></tr>`;

  betriebe.forEach(b => silos.forEach(s => {
    const sum = entries.filter(e => e["Betrieb"] === b && String(e["Silo"]) === s).reduce((a,e)=>a+num(e["Erntemenge (kg)"]),0);
    document.getElementById(`${b}-${s}`).textContent = fmt(sum);
  }));
  silos.forEach(s => {
    const sum = entries.filter(e => String(e["Silo"]) === s).reduce((a,e)=>a+num(e["Erntemenge (kg)"]),0);
    document.getElementById(`totalSilo${s}`).textContent = fmt(sum);
  });
  const today = new Date().toISOString().slice(0,10);
  const dayKg = entries.filter(e => e["Erntedatum"] === today).reduce((a,e)=>a+num(e["Erntemenge (kg)"]),0);
  document.getElementById("dayTotal").textContent = fmt(dayKg / 1000);
}

async function loadEntries(){
  setStatus("Lade Daten …");
  try{
    const data = await jsonp({action:"list"});
    entries = data.rows || [];
    render();
    setStatus(`Geladen: ${entries.length} Einträge`, "ok");
  }catch(err){ setStatus(err.message, "error"); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form).entries());
  const missing = fields.filter(f => !String(data[f] ?? "").trim());
  if (missing.length) { setStatus("Bitte alle Felder ausfüllen.", "error"); return; }
  saveBtn.disabled = true;
  setStatus("Speichere …");
  try{
    await jsonp({action:"save", data: JSON.stringify(data)});
    form.reset(); form.elements["Erntedatum"].value = new Date().toISOString().slice(0,10);
    await loadEntries();
    setStatus("Eintrag gespeichert und schreibgeschützt übernommen.", "ok");
  }catch(err){ setStatus(err.message, "error"); }
  finally{ saveBtn.disabled = false; }
});

search.addEventListener("input", render);
document.querySelector("#reloadBtn").addEventListener("click", loadEntries);
loadEntries();
