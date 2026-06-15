const API_URL = "https://script.google.com/macros/s/AKfycbzHju4hpt_rvnlX4QzZv3tFLJYnC-iueWoNNVAyCrVeUUWwXm4RXrPqwsEulaTfzNg/exec";

const form = document.querySelector("#entryForm");
const rows = document.querySelector("#rows");
const search = document.querySelector("#search");
const today = new Date().toISOString().slice(0, 10);

form.elements.datum.value = today;

let entries = [];
let activeSiloFilter = "all";

const fields = [
  "betrieb", "schlag", "wagen", "feldfrucht", "datum", "menge",
  "feuchtigkeit", "hlgewicht", "trockensubstanz", "silo", "bemerkung"
];

function kg(n) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 })
    .format(Number(n) || 0) + " kg";
}

async function loadEntries() {
  rows.innerHTML = `<tr><td colspan="12">Daten werden geladen...</td></tr>`;

  const response = await fetch(API_URL);
  entries = await response.json();

  render();
}

function render() {
  const term = search.value.toLowerCase();

 const filtered = entries.filter(e => {
  const matchesSearch = Object.values(e).join(" ").toLowerCase().includes(term);
  const matchesSilo =
    activeSiloFilter === "all" || String(e.silo) === activeSiloFilter;

  return matchesSearch && matchesSilo;
});

  rows.innerHTML = filtered.map(e => `
    <tr>
      ${fields.map(f => `<td>${escapeHtml(e[f] ?? "")}</td>`).join("")}
      <td></td>
    </tr>
  `).join("") || `<tr><td colspan="12">Noch keine Einträge vorhanden.</td></tr>`;

  const total = entries.reduce((s, e) => s + (Number(e.menge) || 0), 0);
  document.querySelector("#allSilos").textContent = kg(total);
  

  document.querySelector("#totalKg").textContent = kg(total);
  document.querySelector("#totalTon").textContent =
    (total / 1000).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " t";

const todayGerman = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
}).format(new Date());

document.querySelector("#dayWeight").textContent =
  kg(entries.filter(e => String(e.datum).trim() === todayGerman)
    .reduce((s, e) => s + (Number(e.menge) || 0), 0));

  [1, 2, 3].forEach(silo => {
    document.querySelector(`#silo${silo}`).textContent =
      kg(entries.filter(e => String(e.silo) === String(silo))
        .reduce((s, e) => s + (Number(e.menge) || 0), 0));
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  form.reset();
  form.elements.datum.value = today;

  await loadEntries();
});

search.addEventListener("input", render);

document.querySelector("#clearAll").style.display = "none";

document.querySelector("#exportCsv").addEventListener("click", () => {
  const header = fields.join(";");
  const body = entries.map(e =>
    fields.map(f => `"${String(e[f] ?? "").replaceAll('"', '""')}"`).join(";")
  ).join("\n");

  const blob = new Blob([header + "\n" + body], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ernteerfassung.csv";
  a.click();
  URL.revokeObjectURL(url);
});

document.querySelectorAll("[data-silo-filter]").forEach(card => {
  card.addEventListener("click", () => {
    activeSiloFilter = card.dataset.siloFilter;

    document.querySelectorAll("[data-silo-filter]").forEach(c =>
      c.classList.remove("active")
    );

    card.classList.add("active");
    render();
  });
});

loadEntries();
