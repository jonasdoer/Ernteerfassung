const API_URL = "https://script.google.com/macros/s/AKfycbzHju4hpt_rvnlX4QzZv3tFLJYnC-iueWoNNVAyCrVeUUWwXm4RXrPqwsEulaTfzNg/exec";

const form = document.querySelector("#entryForm");
const rows = document.querySelector("#rows");
const search = document.querySelector("#search");
const today = new Date().toISOString().slice(0, 10);

form.elements.datum.value = today;

let entries = [];

const fields = [
  "betrieb", "schlag", "wagen", "feldfrucht", "datum", "leergewicht", "bruttogewicht", "menge",
  "feuchtigkeit", "hlgewicht", "Protein", "silo", "bemerkung"
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

  const filtered = entries.filter(e =>
    Object.values(e).join(" ").toLowerCase().includes(term)
  );

  rows.innerHTML = filtered.map(e => `
    <tr>
      ${fields.map(f => `<td>${escapeHtml(e[f] ?? "")}</td>`).join("")}
      <td></td>
    </tr>
  `).join("") || `<tr><td colspan="12">Noch keine Einträge vorhanden.</td></tr>`;

  const total = entries.reduce((s, e) => s + (Number(e.menge) || 0), 0);

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

  renderSiloMenus();
}

function renderSiloMenus() {
  const betriebe = ["Bockholt", "Düren", "Steffen", "Agrarhandel Ruhr"];

  [1, 2, 3].forEach(silo => {
    const siloEntries = entries.filter(e => String(e.silo) === String(silo));
    const total = siloEntries.reduce((sum, e) => sum + (Number(e.menge) || 0), 0);

    const menuRows = [
      `<div class="silo-menu-title">Silo ${silo}</div>`,
      `<div class="silo-menu-row total"><span>Gesamt</span><strong>${kg(total)}</strong></div>`,
      ...betriebe.map(betrieb => {
        const betriebTotal = siloEntries
          .filter(e => String(e.betrieb) === betrieb)
          .reduce((sum, e) => sum + (Number(e.menge) || 0), 0);

        return `<div class="silo-menu-row"><span>${escapeHtml(betrieb)}</span><strong>${kg(betriebTotal)}</strong></div>`;
      })
    ].join("");

    document.querySelector(`#siloMenu${silo}`).innerHTML = menuRows;
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

document.querySelectorAll("[data-silo-menu]").forEach(card => {
  card.addEventListener("click", event => {
    event.stopPropagation();
    toggleSiloMenu(card);
  });

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSiloMenu(card);
    }
  });
});

document.addEventListener("click", () => {
  closeSiloMenus();
});

function toggleSiloMenu(card) {
  const willOpen = !card.classList.contains("open");
  closeSiloMenus();

  if (willOpen) {
    card.classList.add("open");
    card.setAttribute("aria-expanded", "true");
  }
}

function closeSiloMenus() {
  document.querySelectorAll("[data-silo-menu]").forEach(card => {
    card.classList.remove("open");
    card.setAttribute("aria-expanded", "false");
  });
}

loadEntries();

// Felder für die Gewichtsberechnung auswählen
const inputLeer = document.querySelector("#leergewicht");
const inputBrutto = document.querySelector("#bruttogewicht");
const inputNetto = document.querySelector("#menge");

// Funktion zur Berechnung des Nettogewichts
function calculateNetto() {
  const leer = Number(inputLeer.value) || 0;
  const brutto = Number(inputBrutto.value) || 0;
  
  // Nur rechnen, wenn Brutto größer als Leer ist
  if (brutto > 0 && brutto >= leer) {
    inputNetto.value = brutto - leer;
  } else {
    inputNetto.value = ""; // Feld leeren, falls die Eingabe unlogisch ist
  }
}

// Sobald sich in den Feldern etwas ändert, wird neu gerechnet
inputLeer.addEventListener("input", calculateNetto);
inputBrutto.addEventListener("input", calculateNetto);
