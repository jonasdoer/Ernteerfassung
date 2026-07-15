const API_URL = "https://script.google.com/macros/s/AKfycbzHju4hpt_rvnlX4QzZv3tFLJYnC-iueWoNNVAyCrVeUUWwXm4RXrPqwsEulaTfzNg/exec";

const form = document.querySelector("#entryForm");
const rows = document.querySelector("#rows");
const search = document.querySelector("#search");
const today = new Date().toISOString().slice(0, 10);

form.elements.datum.value = today;

let entries = [];

const fields = [
  "betrieb", "schlag", "wagen", "feldfrucht", "datum", "einwiegen", "auswiegen", "menge",
  "feuchtigkeit", "fkleb", "sedi",  "testgewicht", "protein", "silo", "bemerkung"
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
  
  //Berechnet das Gesamtgewicht des aktuellen Tages
  const dayTotal = entries.filter(e => String(e.datum).trim() === todayGerman)
						  .reduce((s, e) => s + (Number(e.menge) || 0), 0);

  document.querySelector("#dayWeightKg").textContent = kg(dayTotal);
  document.querySelector("#dayWeightTon").textContent = (dayTotal / 1000).toLocaleString("de-DE", {
	  minimumFractionDigits: 2,
	  maximumFractionDigits: 2
  }) + " t";

  // NEU: Zentrale Liste aller Silos
  const siloNamen = [
    "Düren Flachlager alt", 
    "Düren Trockner", 
    "Düren Bucht Sumpf", 
    "Düren Box 1", 
    "Düren Box 2",
	"Bockholt große Bucht",
	"Bockholt vor Trockner",
	"Bockholt kleine Bucht",
	"Ruck vorne 1",
	"Ruck vorne 2",
	"Ruck vorne 3",
	"Ruck vorne 4",
	"Ruck hinten 1",
	"Ruck hinten 2",
	"Ruck hinten 3",
	"Ruck hinten 4"
  ];

  siloNamen.forEach((name, index) => {
    const htmlId = index + 1; // Generiert IDs von 1 bis 7
    const element = document.querySelector(`#silo${htmlId}`);
    if (element) {
      element.textContent = kg(entries.filter(e => String(e.silo) === name)
        .reduce((s, e) => s + (Number(e.menge) || 0), 0));
    }
  });

  renderSiloMenus(siloNamen);
}
function renderSiloMenus(siloNamen) {
  const betriebe = ["Bockholt", "Düren", "Steffen", "Agrarhandel Ruhr"];

  siloNamen.forEach((name, index) => {
    const htmlId = index + 1;
    const siloEntries = entries.filter(e => String(e.silo) === name);
    const total = siloEntries.reduce((sum, e) => sum + (Number(e.menge) || 0), 0);

    // NEU: Durchschnittliches Protein berechnen
    let proteinSum = 0;
    let proteinCount = 0;
    
    siloEntries.forEach(e => {
      // Wandelt eventuelle Kommas in Punkte um, damit JavaScript fehlerfrei rechnet
      const pVal = parseFloat(String(e.protein).replace(',', '.'));
      // Zählt nur Einträge, bei denen auch wirklich ein Protein-Wert > 0 eingetragen wurde
      if (!isNaN(pVal) && pVal > 0) { 
        proteinSum += pVal;
        proteinCount++;
      }
    });
    
    const avgProtein = proteinCount > 0 ? (proteinSum / proteinCount) : 0;
    // Formatiert die Zahl auf eine Nachkommastelle (z. B. "14,5")
    const avgProteinStr = avgProtein.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const menuRows = [
      `<div class="silo-menu-title">${escapeHtml(name)}</div>`,
      `<div class="silo-menu-row total"><span>Gesamt</span><strong>${kg(total)}</strong></div>`,
      ...betriebe.map(betrieb => {
        const betriebTotal = siloEntries
          .filter(e => String(e.betrieb) === betrieb)
          .reduce((sum, e) => sum + (Number(e.menge) || 0), 0);

        return `<div class="silo-menu-row"><span>${escapeHtml(betrieb)}</span><strong>${kg(betriebTotal)}</strong></div>`;
      }),
      // NEU: Zusätzliche Zeile für den Protein-Durchschnitt ganz unten im Menü
      `<div class="silo-menu-row" style="margin-top: 6px; border-top: 1px dashed var(--line); padding-top: 8px;">
        <span>Ø Protein</span><strong>${avgProteinStr} kg</strong>
      </div>`
    ].join("");

    const menuElement = document.querySelector(`#siloMenu${htmlId}`);
    if (menuElement) {
      menuElement.innerHTML = menuRows;
    }
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
const inputEinwiegen = document.querySelector("#einwiegen");
const inputAuswiegen = document.querySelector("#auswiegen");
const inputNetto = document.querySelector("#menge");

// Funktion zur Berechnung des Nettogewichts
function calculateNetto() {
  const ein = Number(inputEinwiegen.value) || 0;
  const aus = Number(inputAuswiegen.value) || 0;
  
  // Nur rechnen, wenn Einwiegen größer als Auswiegen ist
  if (ein > 0 && ein >= aus) {
    inputNetto.value = ein - aus;
  } else {
    inputNetto.value = ""; // Feld leeren, falls die Eingabe unlogisch ist
  }
}

// Sobald sich in den Feldern etwas ändert, wird neu gerechnet
inputEinwiegen.addEventListener("input", calculateNetto);
inputAuswiegen.addEventListener("input", calculateNetto);
