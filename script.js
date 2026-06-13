const STORAGE_KEY = "ernteerfassung_eintraege_v1";
const form = document.querySelector("#entryForm");
const rows = document.querySelector("#rows");
const search = document.querySelector("#search");
const today = new Date().toISOString().slice(0,10);
form.elements.datum.value = today;
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const fields = ["betrieb","schlag","wagen","feldfrucht","datum","menge","feuchtigkeit","hlgewicht","trockensubstanz","silo","bemerkung"];
function kg(n){return new Intl.NumberFormat("de-DE",{maximumFractionDigits:0}).format(Number(n)||0)+" kg"}
function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); render();}
function render(){
  const term = search.value.toLowerCase();
  const filtered = entries.filter(e => Object.values(e).join(" ").toLowerCase().includes(term));
  rows.innerHTML = filtered.map(e => `<tr>${fields.map(f=>`<td>${escapeHtml(e[f] ?? "")}</td>`).join("")}<td><button class="delete" data-id="${e.id}">Löschen</button></td></tr>`).join("") || `<tr><td colspan="12">Noch keine Einträge vorhanden.</td></tr>`;
  const total = entries.reduce((s,e)=>s+(Number(e.menge)||0),0);
  document.querySelector("#totalKg").textContent = kg(total);
  document.querySelector("#totalTon").textContent = (total/1000).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " t";
  document.querySelector("#dayWeight").textContent = kg(entries.filter(e=>e.datum===today).reduce((s,e)=>s+(Number(e.menge)||0),0));
  [1,2,3].forEach(silo => document.querySelector(`#silo${silo}`).textContent = kg(entries.filter(e=>String(e.silo)===String(silo)).reduce((s,e)=>s+(Number(e.menge)||0),0)));
}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
form.addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.id = crypto.randomUUID();
  entries.push(data);
  form.reset(); form.elements.datum.value = today;
  save();
});
rows.addEventListener("click", event => {
  if(event.target.matches(".delete")) { entries = entries.filter(e => e.id !== event.target.dataset.id); save(); }
});
search.addEventListener("input", render);
document.querySelector("#clearAll").addEventListener("click", () => { if(confirm("Alle erfassten Daten wirklich löschen?")){ entries=[]; save(); }});
document.querySelector("#exportCsv").addEventListener("click", () => {
  const header = fields.join(";");
  const body = entries.map(e => fields.map(f => `"${String(e[f] ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
  const blob = new Blob([header + "\n" + body], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ernteerfassung.csv"; a.click(); URL.revokeObjectURL(url);
});
render();
