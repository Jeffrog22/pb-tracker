import { exportResults } from "./exporter.js";

const state = {
  teamName: "",
  competitionDate: "",
  importedAt: null,
  importedRows: [],
  groupedEvents: new Map(),
  selectedProofs: new Set(),
  activityLog: [],
  activeChrono: {
    eventKey: null,
    seriesKey: null,
    athletes: [],
    splitPlan: [],
    isRunning: false,
    startedAt: 0,
    elapsedMs: 0,
    timerId: null,
    pendingCaptures: [],
    currentSplitIndex: 0,
    clickInSplit: 0,
    lastStopCaptured: false,
  },
};

let swRegistration = null;
let swUpdateAvailable = false;

const el = {
  screenImport: document.getElementById("screenImport"),
  screenFilter: document.getElementById("screenFilter"),
  screenControl: document.getElementById("screenControl"),
  fileInput: document.getElementById("fileInput"),
  teamName: document.getElementById("teamName"),
  competitionDate: document.getElementById("competitionDate"),
  processBtn: document.getElementById("processBtn"),
  importStatus: document.getElementById("importStatus"),
  proofList: document.getElementById("proofList"),
  goControlBtnTop: document.getElementById("goControlBtnTop"),
  goControlBtnBottom: document.getElementById("goControlBtnBottom"),
  controlContainer: document.getElementById("controlContainer"),
  backToFilterBtn: document.getElementById("backToFilterBtn"),
  exportBtn: document.getElementById("exportBtn"),
  refreshAppBtn: document.getElementById("refreshAppBtn"),
  downloadLogBtn: document.getElementById("downloadLogBtn"),
  appBadge: document.getElementById("appBadge"),
  chronoDialog: document.getElementById("chronoDialog"),
  startLapBtn: document.getElementById("startLapBtn"),
  stopResetBtn: document.getElementById("stopResetBtn"),
  closeChronoBtn: document.getElementById("closeChronoBtn"),
  registerBtn: document.getElementById("registerBtn"),
  chronoDisplay: document.getElementById("chronoDisplay"),
  chronoTitle: document.getElementById("chronoTitle"),
  nextCapture: document.getElementById("nextCapture"),
  pendingList: document.getElementById("pendingList"),
  chronoAthletes: document.getElementById("chronoAthletes"),
};

const EVENT_SPLITS = {
  50: [25, 50],
  "100_FREE": [50, 100],
  "100_MEDLEY": [25, 50, 75, 100],
  "200_FREE": [50, 100, 150, 200],
  "200_MEDLEY": [50, 100, 150, 200],
  400: [100, 200, 300, 400],
  800: [100, 200, 300, 400, 500, 600, 700, 800],
  1500: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500],
};

init();

function init() {
  registerServiceWorker();
  bindEvents();
  bindDeviceGuard();
  applyDeviceGuard();
  loadActivityLog();
  logAction("App iniciado");
  showScreen("import");
}

function loadActivityLog() {
  try {
    const stored = window.localStorage.getItem("pbtracker_activity_log");
    if (stored) {
      state.activityLog = JSON.parse(stored) || [];
    }
  } catch (e) {
    state.activityLog = [];
  }
}

function logAction(message) {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
  };
  state.activityLog.push(entry);
  try {
    window.localStorage.setItem("pbtracker_activity_log", JSON.stringify(state.activityLog));
  } catch (e) {
    // ignore storage failures
  }
}

function downloadActivityLog() {
  const content = state.activityLog
    .map((entry) => `${entry.timestamp} - ${entry.message}`)
    .join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pbtracker-log-${new Date().toISOString().slice(0,19).replace(/[:T]/g, "-")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function handleExportResults() {
  const result = await exportResults({
    teamName: state.teamName,
    competitionDate: state.competitionDate,
    selectedProofs: state.selectedProofs,
    groupedEvents: state.groupedEvents,
    getSplitsForEvent,
    activityLog: state.activityLog,
  });

  if (result.ok) {
    const formatLabel = result.format === "xlsx" ? "Excel (XLSX)" : "CSV";
    logAction(`Exportação ${formatLabel} dos resultados realizada.`);
    alert(
      result.fallback
        ? "Sem internet: exportado em CSV (abre no Excel com acentos corretos)."
        : "Exportação concluída."
    );
    return;
  }

  alert(result.reason || "Nada a exportar.");
}


function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        swRegistration = registration;
        setupServiceWorkerUpdateFlow(registration);
      })
      .catch(() => {
        // Falha silenciosa para não impactar a operação de prova.
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

function setupServiceWorkerUpdateFlow(registration) {
  if (registration.waiting) {
    markUpdateAvailable();
  }

  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        markUpdateAvailable();
      }
    });
  });
}

function markUpdateAvailable() {
  swUpdateAvailable = true;
  if (el.refreshAppBtn) {
    el.refreshAppBtn.textContent = "Aplicar atualização";
    el.refreshAppBtn.classList.add("primary");
  }
  if (el.appBadge) {
    el.appBadge.textContent = "Nova versão";
  }
}

function bindEvents() {
  el.processBtn.addEventListener("click", handleImport);
  el.goControlBtnTop.addEventListener("click", goToControl);
  el.goControlBtnBottom.addEventListener("click", goToControl);
  el.backToFilterBtn.addEventListener("click", () => showScreen("filter"));
  if (el.exportBtn) {
    el.exportBtn.addEventListener("click", handleExportResults);
  }
  el.refreshAppBtn.addEventListener("click", handleAppRefresh);
  if (el.downloadLogBtn) {
    el.downloadLogBtn.addEventListener("click", () => {
      downloadActivityLog();
      logAction("Exportação do log de atividade requisitada pelo usuário.");
    });
  }

  el.startLapBtn.addEventListener("click", handleChronoStartLap);
  el.stopResetBtn.addEventListener("click", handleChronoStopReset);
  el.closeChronoBtn.addEventListener("click", closeChrono);
  el.registerBtn.addEventListener("click", registerPendingTimes);
}

async function handleAppRefresh() {
  try {
    if (swRegistration?.waiting && swUpdateAvailable) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    if (swRegistration) {
      await swRegistration.update();
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    window.location.reload();
  } catch {
    window.location.reload();
  }
}

function bindDeviceGuard() {
  window.addEventListener("resize", applyDeviceGuard);
}

function applyDeviceGuard() {
  const desktopNotice = document.getElementById("desktopNotice");
  const isDesktopLayout = window.innerWidth > 1024;
  document.body.classList.toggle("desktop-blocked", isDesktopLayout);
  if (desktopNotice) {
    desktopNotice.setAttribute("aria-hidden", isDesktopLayout ? "false" : "true");
  }
}

function showScreen(screen) {
  el.screenImport.classList.toggle("active", screen === "import");
  el.screenFilter.classList.toggle("active", screen === "filter");
  el.screenControl.classList.toggle("active", screen === "control");
}

function setStatus(message, tone = "neutral") {
  const elStatus = document.getElementById("importStatus");
  elStatus.textContent = message;
  elStatus.className = "status " + (tone || "neutral");
  // Diagnóstico visual
  setTimeout(() => {
    const diag = window.__PBSWIM_DIAGNOSTIC__;
    const area = document.getElementById("diagnostic-area");
    if (!area) return;
    if (!diag || !Array.isArray(diag) || !diag.length) {
      area.style.display = "none";
      area.innerHTML = "";
      return;
    }
    area.style.display = "block";
    let html = '<b>Diagnóstico do parser PDF:</b><br><ul style="margin:6px 0 0 16px;padding:0;">';
    diag.forEach((d, i) => {
      html += `<li><b>Linha ${d.idx+1}:</b> <code>${(d.line||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code><br><span style="color:#b00">${d.reason||''}</span></li>`;
    });
    html += '</ul>';
    area.innerHTML = html;
  }, 100);
}

async function handleImport() {
  const teamName = el.teamName.value.trim();
  const competitionDate = el.competitionDate.value;
  const file = el.fileInput.files?.[0];

  if (!teamName || !competitionDate || !file) {
    setStatus("Preencha equipe, data e arquivo antes de processar.", "error");
    return;
  }

  state.teamName = teamName;
  state.competitionDate = competitionDate;

  try {
    setStatus("Processando arquivo...", "neutral");
    let rows = [];

    if (file.name.toLowerCase().endsWith(".pdf")) {
      rows = await parsePdfFile(file, teamName);
    } else if (file.name.toLowerCase().endsWith(".json")) {
      rows = await parseJsonFile(file, teamName);
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      rows = await parseCsvFile(file, teamName);
    } else {
      throw new Error("Formato não suportado. Use PDF, JSON ou CSV.");
    }

    if (!rows.length) {
      throw new Error("Nenhum atleta da equipe foi encontrado no arquivo.");
    }

    state.importedRows = rows.map(normalizeImportedRow);
    state.groupedEvents = groupByProofAndSeries(state.importedRows);
    state.importedAt = new Date();
    state.selectedProofs.clear();

    setStatus(`Importação concluída: ${state.importedRows.length} atleta(s) da equipe ${teamName}.`, "success");
    logAction(`Arquivo importado: ${file.name} (${state.importedRows.length} atleta(s)).`);
    renderProofList();
    showScreen("filter");
  } catch (error) {
    setStatus(`Falha ao importar: ${error.message}`, "error");
    logAction(`Falha de importação: ${error.message}`);
  }
}


async function parseJsonFile(file, teamName) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.data || parsed.atletas || [];
  return list
    .map(adaptGenericRow)
    .filter((row) => isSameTeam(row.equipe, teamName));
}

async function parseCsvFile(file, teamName) {
  const text = await file.text();
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    rows.push(adaptGenericRow(obj));
  }

  return rows.filter((row) => isSameTeam(row.equipe, teamName));
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

async function parsePdfFile(file, teamName) {
  let lines = [];
  try {
    lines = await extractPdfLines(file);
  } catch (e) {
    if (typeof window !== 'undefined') {
      window.__PBSWIM_DIAGNOSTIC__ = [{ idx: 0, line: '', reason: 'Falha ao ler PDF: ' + (e.message || e) }];
    }
    throw new Error('Falha ao ler PDF: ' + (e.message || e));
  }
  const strictRows = parseRowsFromPdfLines(lines, teamName, { allowUnknownTeam: false });
  if (strictRows.length) {
    return strictRows;
  }
  return parseRowsFromPdfLines(lines, teamName, { allowUnknownTeam: true });
}

async function extractPdfLines(file) {
  const module = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
  module.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const loadingTask = module.getDocument({ data });
  const pdf = await loadingTask.promise;

  const allLines = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();

    const rows = [];
    content.items.forEach((item) => {
      const value = String(item.str || "").trim();
      if (!value) return;

      const x = item.transform?.[4] || 0;
      const y = item.transform?.[5] || 0;

      const foundRow = rows.find((row) => Math.abs(row.y - y) <= 2);
      if (foundRow) {
        foundRow.parts.push({ x, value });
      } else {
        rows.push({ y, parts: [{ x, value }] });
      }
    });

    rows
      .sort((a, b) => b.y - a.y)
      .forEach((row) => {
        const line = row.parts
          .sort((a, b) => a.x - b.x)
          .map((part) => part.value)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (line) {
          allLines.push(line);
        }
      });
  }

  return allLines;
}

function parseRowsFromPdfLines(lines, teamName, options = {}) {
  const allowUnknownTeam = Boolean(options.allowUnknownTeam);
  const rows = [];
  const dedupe = new Set();
  let currentProof = "";
  let currentSeries = "";
  let teamContextState = "unknown";
  let currentGender = "Indefinido";

  let diagnostics = [];
  lines.forEach((line, idx) => {
    const normalized = normalizeText(line);
    // Ignorar cabeçalho de colunas
    if (/^ser\.?\s+bal\.?\s+atleta\s+equipe\s+categoria\s+tempo/i.test(normalized)) return;
    const teamHeaderMatch = line.match(/(equipe|clube|time|cidade)\s*[:.-]?\s*(.+)/i);
    if (teamHeaderMatch) {
      teamContextState = isSameTeam(teamHeaderMatch[2], teamName) ? "target" : "other";
    }
    if (normalized.includes(normalizeText(teamName))) {
      teamContextState = "target";
    }
    const proofFromLine = parseProofFromLine(line, currentProof);
    if (proofFromLine) {
      currentProof = proofFromLine;
    }
    const genderFromLine = extractGenderFromText(line);
    if (genderFromLine !== "Indefinido") {
      currentGender = genderFromLine;
    }
    const seriesMatch = line.match(/s[ée]rie\s*[:.-]?\s*(\d+)/i) || line.match(/(\d+)\s*[aª]?\s*s[ée]rie/i);
    if (seriesMatch) {
      currentSeries = seriesMatch[1].trim();
    }
    const effectiveProof = currentProof || "Prova não identificada";
    const effectiveSeries = currentSeries || "1";
    try {
      const parsed = parseAthleteLine(
        line,
        normalized,
        teamName,
        effectiveProof,
        effectiveSeries,
        teamContextState,
        allowUnknownTeam,
        currentGender
      );
      if (!parsed) {
        diagnostics.push({ idx, line, reason: "Linha não reconhecida como atleta" });
        return;
      }
      const key = `${parsed.prova}|${parsed.serie}|${parsed.baliza}|${normalizeText(parsed.nome)}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      rows.push(parsed);
    } catch (e) {
      diagnostics.push({ idx, line, reason: e.message });
    }
  });

  if (!rows.length) {
    // Diagnóstico em tela se falhar
    if (typeof window !== 'undefined') {
      window.__PBSWIM_DIAGNOSTIC__ = diagnostics.length ? diagnostics.slice(0, 10) : [{ idx: 0, line: '', reason: 'Nenhum atleta reconhecido nas linhas do PDF.' }];
    }
    return [];
  }
  if (typeof window !== 'undefined') {
    window.__PBSWIM_DIAGNOSTIC__ = undefined;
  }
  return rows;
}

function parseAthleteLine(
  line,
  normalizedLine,
  teamName,
  currentProof,
  currentSeries,
  teamContextState,
  allowUnknownTeam,
  currentGender
) {
  const headerMatch = line.match(/^\s*(\d+)\s+(\d+)\s+(\d{5,})\s+(.*)$/);
  if (!headerMatch) {
    return null;
  }

  const [, serie, baliza, codigo, restLine] = headerMatch;
  let time = null;
  const tempoMatch = restLine.match(/(S\/T|NT|00:00:00|00:00|[0-9]{1,2}[:.][0-9]{2}(?:[.,:][0-9]{2})?)\s*$/i);
  if (!tempoMatch) {
    return null;
  }

  time = tempoMatch[1].trim();
  if (!time || /^S\/T$/i.test(time) || /^NT$/i.test(time) || /^0{1,2}:0{2}:0{2}$/.test(time) || /^0{1,2}:0{2}$/.test(time)) {
    time = time || "S/T";
  }

  const restWithoutTempo = restLine.slice(0, tempoMatch.index).trim();
  let team = teamName;
  let nome = "";
  let categoria = "";

  const lowerLine = line.toLowerCase();
  const lowerTeam = teamName.toLowerCase();
  const origTeamStart = lowerTeam ? lowerLine.indexOf(lowerTeam) : -1;

  if (origTeamStart >= 0) {
    team = line.slice(origTeamStart, origTeamStart + teamName.length).trim();
    const prefix = line.slice(0, origTeamStart).trim();
    const suffix = line.slice(origTeamStart + teamName.length).trim();

    categoria = suffix.trim();
    const prefixParts = prefix.split(/\s+/);
    if (prefixParts.length >= 4) {
      nome = prefixParts.slice(3).join(" ");
    }
  }

  if (!nome) {
    if (!allowUnknownTeam) {
      return null;
    }
    const parts = restWithoutTempo.split(/\s+/);
    if (parts.length >= 4) {
      categoria = parts.slice(-2).join(" ");
      nome = parts.slice(0, -2).join(" ");
      team = teamName;
    }
  }

  if (!nome) {
    return null;
  }

  return {
    prova: currentProof,
    serie,
    baliza,
    codigo,
    nome: toTitleCase(nome.trim()),
    equipe: team.trim(),
    categoria: categoria.trim(),
    sexo: currentGender || "Indefinido",
    tempoBalizado: normalizeTime(time),
  };
}

function parseProofFromLine(line, currentProof) {
  if (!/prova/i.test(line)) {
    return currentProof;
  }

  const match = line.match(/prova\s*[:.-]?\s*(.+)$/i);
  if (!match) {
    return currentProof;
  }

  let candidate = match[1]
    .replace(/\s*\|\s*.*/g, "")
    .replace(/\b(s[ée]rie|baliza|raia)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate) {
    return currentProof;
  }

  const onlyNumber = /^\d+$/.test(candidate);
  if (onlyNumber && currentProof && !/^\d+$/.test(currentProof)) {
    return currentProof;
  }

  return candidate;
}

function extractGenderFromText(text) {
  const normalized = normalizeText(text);
  if (/\bfeminino\b/.test(normalized)) return "Feminino";
  if (/\bmasculino\b/.test(normalized)) return "Masculino";
  return "Indefinido";
}

function extractNameCandidate(text) {
  return text
    .replace(/prova\s*[:.-]?\s*\d+[^\s]*/gi, "")
    .replace(/s[ée]rie\s*[:.-]?\s*\d+/gi, "")
    .replace(/baliza\s*[:.-]?\s*\d{1,2}/gi, "")
    .replace(/\b\d{1,2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessTeamInLine(lineNormalized, teamName) {
  return lineNormalized.includes(normalizeText(teamName));
}

function adaptGenericRow(raw) {
  const getByKeys = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(raw).find((rawKey) => rawKey.toLowerCase().includes(k));
      if (found) return raw[found];
    }
    return "";
  };

  return {
    prova: String(getByKeys("prova", "event")).trim(),
    serie: String(getByKeys("serie", "série", "heat")).trim(),
    baliza: String(getByKeys("baliza", "lane")).trim(),
    nome: String(getByKeys("nome", "atleta", "swimmer")).trim(),
    equipe: String(getByKeys("equipe", "time", "team", "clube", "cidade")).trim(),
    tempoBalizado: String(getByKeys("balizado", "seed", "tempo")).trim(),
  };
}

function normalizeImportedRow(row) {
  return {
    prova: row.prova || "Sem prova",
    serie: row.serie || "1",
    baliza: String(row.baliza || "").replace(/\D/g, ""),
    nome: row.nome || "Sem nome",
    equipe: row.equipe || state.teamName,
    sexo: row.sexo || extractGenderFromText(row.prova || ""),
    tempoBalizado: normalizeTime(row.tempoBalizado),
    history: {},
    current: {},
  };
}

function groupByProofAndSeries(rows) {
  const eventMap = new Map();

  rows.forEach((athlete, index) => {
    const eventKey = buildEventKey(athlete.prova, athlete.sexo);
    if (!eventMap.has(eventKey)) {
      eventMap.set(eventKey, { eventName: eventKey, series: new Map() });
    }

    const event = eventMap.get(eventKey);
    const seriesKey = athlete.serie;

    if (!event.series.has(seriesKey)) {
      event.series.set(seriesKey, []);
    }

    event.series.get(seriesKey).push({
      ...athlete,
      id: `${eventKey}::${seriesKey}::${athlete.baliza || "X"}::${index}`,
    });
  });

  return eventMap;
}

function renderProofList() {
  el.proofList.innerHTML = "";
  const entries = [...state.groupedEvents.values()];

  entries.forEach((event) => {
    const eventKey = event.eventName;
    const seriesCount = event.series.size;

    const wrapper = document.createElement("article");
    wrapper.className = "proof-row";

    const detailsId = `details-${slugify(eventKey)}`;

    wrapper.innerHTML = `
      <div class="proof-head">
        <div class="proof-name">
          <input type="checkbox" data-proof="${escapeHtml(eventKey)}" />
          <span>${escapeHtml(eventKey)} (${seriesCount} série(s))</span>
        </div>
        <button class="ghost" data-toggle="${detailsId}">Ver séries e atletas</button>
      </div>
      <div id="${detailsId}" class="proof-details"></div>
    `;

    const checkbox = wrapper.querySelector("input[type='checkbox']");
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) state.selectedProofs.add(eventKey);
      else state.selectedProofs.delete(eventKey);
      syncGoControlButtons();
    });

    const toggleBtn = wrapper.querySelector("button[data-toggle]");
    const details = wrapper.querySelector(`#${CSS.escape(detailsId)}`);

    toggleBtn.addEventListener("click", () => {
      const isOpen = details.classList.toggle("open");
      toggleBtn.textContent = isOpen ? "Ocultar detalhes" : "Ver séries e atletas";
      if (isOpen && !details.dataset.loaded) {
        details.appendChild(buildEventDetailsTable(event));
        details.dataset.loaded = "1";
      }
    });

    el.proofList.appendChild(wrapper);
  });
}

function buildEventKey(proofName, sexo) {
  const safeProof = proofName || "Sem prova";
  const normalizedProof = normalizeText(safeProof);
  if (/\b(feminino|masculino)\b/.test(normalizedProof)) {
    return safeProof;
  }

  const gender = sexo && sexo !== "Indefinido" ? sexo : "Indefinido";
  return `${safeProof} | ${gender}`;
}

function syncGoControlButtons() {
  const disabled = state.selectedProofs.size === 0;
  el.goControlBtnTop.disabled = disabled;
  el.goControlBtnBottom.disabled = disabled;
}

function buildEventDetailsTable(event) {
  const table = document.createElement("table");
  table.className = "details-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Série</th>
        <th>Baliza</th>
        <th>Atleta</th>
        <th>Tempo balizado</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  [...event.series.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([seriesKey, athletes]) => {
      athletes
        .sort((a, b) => Number(a.baliza) - Number(b.baliza))
        .forEach((athlete) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${escapeHtml(seriesKey)}</td>
            <td>${escapeHtml(athlete.baliza)}</td>
            <td>${escapeHtml(athlete.nome)}</td>
            <td>${escapeHtml(athlete.tempoBalizado)}</td>
          `;
          tbody.appendChild(tr);
        });
    });

  return table;
}

function goToControl() {
  renderControl();
  showScreen("control");
}

function renderControl() {
  el.controlContainer.innerHTML = "";

  const selectedEvents = [...state.selectedProofs]
    .map((key) => state.groupedEvents.get(key))
    .filter(Boolean);

  selectedEvents.forEach((event) => {
    const eventBlock = document.createElement("article");
    eventBlock.className = "event-block";

    eventBlock.innerHTML = `<h3>${escapeHtml(event.eventName)}</h3>`;

    [...event.series.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([seriesKey, athletes]) => {
        const seriesBlock = document.createElement("section");
        seriesBlock.className = "series-block";

        const sortedAthletes = [...athletes].sort((a, b) => Number(a.baliza) - Number(b.baliza));

        seriesBlock.innerHTML = `
          <div class="series-head">
            <h4>Série ${escapeHtml(seriesKey)}</h4>
            <button class="primary">Abrir Cronômetro</button>
          </div>
          <div class="athlete-grid"></div>
        `;

        const openBtn = seriesBlock.querySelector("button");
        openBtn.addEventListener("click", () => openChrono(event.eventName, seriesKey, sortedAthletes));

        const grid = seriesBlock.querySelector(".athlete-grid");
        sortedAthletes.forEach((athlete) => {
          grid.appendChild(renderAthleteCard(event.eventName, seriesKey, athlete));
        });

        eventBlock.appendChild(seriesBlock);
      });

    el.controlContainer.appendChild(eventBlock);
  });
}

function renderAthleteCard(eventName, seriesKey, athlete) {
  const card = document.createElement("article");
  card.className = "athlete-card";

  const splits = getSplitsForEvent(eventName);
  let historyLines = "";
  for (let i = 0; i < splits.length; i += 2) {
    const splitA = splits[i];
    const splitB = splits[i + 1];
    const histA = athlete.history[splitA] || "00:00:00";
    const currA = athlete.current[splitA] || "00:00:00";
    const diffA = buildDiffLabel(currA, athlete.history[splitA] || "00:00:00");
    let histB = "", currB = "", diffB = "";
    if (splitB !== undefined) {
      histB = athlete.history[splitB] || "00:00:00";
      currB = athlete.current[splitB] || "00:00:00";
      diffB = buildDiffLabel(currB, athlete.history[splitB] || "00:00:00");
    }
    historyLines += `
      <div class="split-compact">
        <div>
          <div class="split-title">Histórico ${splitA}m</div>
          <input class="time-input" data-role="history" data-split="${splitA}" value="${histA}" maxlength="8" />
        </div>
        ${splitB !== undefined ? `
        <div>
          <div class="split-title">Histórico ${splitB}m</div>
          <input class="time-input" data-role="history" data-split="${splitB}" value="${histB}" maxlength="8" />
        </div>` : ""}
      </div>
      <div class="split-compact">
        <div>
          <div class="split-title">Prova ${splitA}m</div>
          <div class="current-value">${currA}${diffA}</div>
        </div>
        ${splitB !== undefined ? `
        <div>
          <div class="split-title">Prova ${splitB}m</div>
          <div class="current-value">${currB}${diffB}</div>
        </div>` : ""}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="athlete-main">
      <div>
        <div class="split-title">Nome</div>
        <div class="athlete-name">${escapeHtml(athlete.nome)}</div>
        <div class="tagline">
          <span class="tag">Baliza ${escapeHtml(athlete.baliza)}</span>
          <span class="tag">Balizado ${escapeHtml(athlete.tempoBalizado)}</span>
          ${athlete.categoria ? `<span class="tag">${escapeHtml(athlete.categoria)}</span>` : ""}
        </div>
      </div>
      <div>
        <div class="split-title">Equipe</div>
        <strong>${escapeHtml(athlete.equipe)}</strong>
      </div>
      <div>
        <div class="split-title">Série</div>
        <strong>${escapeHtml(seriesKey)}</strong>
      </div>
    </div>
    ${historyLines}
  `;

  card.querySelectorAll("input[data-role='history']").forEach((input) => {
    attachTimeMask(input);
    input.addEventListener("input", () => {
      const split = Number(input.dataset.split);
      athlete.history[split] = input.value;
      renderControl();
    });
  });

  return card;
}

function buildDiffLabel(current, history) {
  const currMs = parseTimeToMs(current);
  const histMs = parseTimeToMs(history);

  if (!currMs || !histMs) {
    return "";
  }

  const diff = currMs - histMs;
  const sign = diff > 0 ? "+" : "-";
  const diffStr = msToDisplay(Math.abs(diff));

  if (diff < 0) {
    return ` <span class="improved">(${sign}${diffStr})</span>`;
  }
  if (diff > 0) {
    return ` <span class="worse">(${sign}${diffStr})</span>`;
  }
  return ' <span class="neutral-diff">(+00:00:00)</span>';
}

function getSplitsForEvent(eventName) {
  const normalized = normalizeText(eventName);
  const distanceMatch = normalized.match(/(50|100|200|400|800|1500)(?:m)?\b/);
  const distance = distanceMatch ? Number(distanceMatch[1]) : 50;
  const medley = /medley/.test(normalized);

  if (distance === 50) return EVENT_SPLITS[50];
  if (distance === 100) return medley ? EVENT_SPLITS["100_MEDLEY"] : EVENT_SPLITS["100_FREE"];
  if (distance === 200) return medley ? EVENT_SPLITS["200_MEDLEY"] : EVENT_SPLITS["200_FREE"];
  if (distance === 400) return EVENT_SPLITS[400];
  if (distance === 800) return EVENT_SPLITS[800];
  if (distance === 1500) return EVENT_SPLITS[1500];
  return EVENT_SPLITS[50];
}

function openChrono(eventKey, seriesKey, athletes) {
  stopChronoTimer();

  state.activeChrono = {
    eventKey,
    seriesKey,
    athletes,
    splitPlan: getSplitsForEvent(eventKey),
    isRunning: false,
    startedAt: 0,
    elapsedMs: 0,
    timerId: null,
    pendingCaptures: [],
    currentSplitIndex: 0,
    clickInSplit: 0,
  };

  el.chronoTitle.textContent = `${eventKey} | Série ${seriesKey}`;
  el.chronoDisplay.textContent = "00:00:00";
  renderChronoAthletes();
  renderPending();
  refreshNextCapture();
  el.chronoDialog.showModal();
}

function closeChrono() {
  stopChronoTimer();
  el.chronoDialog.close();
}

function handleChronoStartLap() {
  if (!state.activeChrono.eventKey) return;

  if (!state.activeChrono.isRunning) {
    state.activeChrono.isRunning = true;
    state.activeChrono.startedAt = Date.now() - state.activeChrono.elapsedMs;
    state.activeChrono.timerId = window.setInterval(updateChronoDisplay, 30);
    updateChronoDisplay();
    return;
  }

  captureLap();
}

function handleChronoStopReset() {
  if (!state.activeChrono.eventKey) return;

  if (state.activeChrono.isRunning) {
    captureLap(true);
    state.activeChrono.isRunning = false;
    stopChronoTimer();
    setStatus("Cronômetro parado e último clique registrado.", "neutral");
    return;
  }

  state.activeChrono.elapsedMs = 0;
  state.activeChrono.pendingCaptures = [];
  state.activeChrono.currentSplitIndex = 0;
  state.activeChrono.clickInSplit = 0;
  state.activeChrono.lastStopCaptured = false;
  el.chronoDisplay.textContent = "00:00:00";
  renderPending();
  refreshNextCapture();
}

function stopChronoTimer() {
  if (state.activeChrono.timerId) {
    clearInterval(state.activeChrono.timerId);
    state.activeChrono.timerId = null;
  }
}

function updateChronoDisplay() {
  if (!state.activeChrono.isRunning) return;

  state.activeChrono.elapsedMs = Date.now() - state.activeChrono.startedAt;
  el.chronoDisplay.textContent = msToDisplay(state.activeChrono.elapsedMs);
}

function captureLap(isStop = false) {
  const ac = state.activeChrono;
  const split = ac.splitPlan[ac.currentSplitIndex];
  if (!split) return;

  ac.clickInSplit += 1;

  ac.pendingCaptures.push({
    id: `${split}-${ac.clickInSplit}-${Date.now()}`,
    split,
    order: ac.clickInSplit,
    ms: ac.elapsedMs,
    lane: "",
    isStopCapture: isStop,
  });

  if (isStop) {
    ac.lastStopCaptured = true;
    logAction(`Clique de parar registrado no cronômetro: parcial ${split}m, ordem ${ac.clickInSplit}, tempo ${msToDisplay(ac.elapsedMs)}.`);
  } else {
    logAction(`Clique de volta registrado: parcial ${split}m, ordem ${ac.clickInSplit}, tempo ${msToDisplay(ac.elapsedMs)}.`);
  }

  const laneCount = ac.athletes.length;
  if (ac.clickInSplit >= laneCount) {
    ac.currentSplitIndex += 1;
    ac.clickInSplit = 0;
  }

  renderPending();
  refreshNextCapture();
}

function refreshNextCapture() {
  const ac = state.activeChrono;
  const split = ac.splitPlan[ac.currentSplitIndex];

  if (!split) {
    el.nextCapture.textContent = "Próximo registro: todos os parciais capturados";
    el.nextCapture.classList.remove("warning-note");
    return;
  }

  const nextClick = ac.clickInSplit + 1;
  const laneCount = ac.athletes.length;
  const isLastSplit = ac.currentSplitIndex === ac.splitPlan.length - 1;
  const nextText = `parcial ${split}m, clique ${nextClick}`;

  if (isLastSplit && nextClick === laneCount) {
    el.nextCapture.innerHTML = `Próximo registro: <strong class="next-capture-highlight">${nextText}</strong>`;
    el.nextCapture.classList.add("warning-note");
    return;
  }

  el.nextCapture.textContent = `Próximo registro: ${nextText}`;
  el.nextCapture.classList.remove("warning-note");
}


function renderPending() {
  const ac = state.activeChrono;
  if (!ac.pendingCaptures.length) {
    el.pendingList.innerHTML = '<p class="muted">Nenhum tempo pendente até o momento.</p>';
    return;
  }

  const grouped = groupPendingBySplit(ac.pendingCaptures);

  const table = document.createElement("table");
  table.className = "pending-list-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Parcial</th>
        <th>Ordem</th>
        <th>Tempo</th>
        <th>Baliza</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  ac.pendingCaptures.forEach((capture) => {
    const tr = document.createElement("tr");
    if (capture.isStopCapture) {
      tr.className = "stop-capture-row";
    }
    const options = buildLaneOptionsForCapture(ac.athletes, grouped, capture);

    tr.innerHTML = `
      <td>${capture.split}m</td>
      <td>${capture.order}</td>
      <td>${msToDisplay(capture.ms)}</td>
      <td>
        <select data-capture-id="${capture.id}">
          <option value="">Selecionar...</option>
          ${options
            .map((lane) => `<option value="${lane}" ${capture.lane === lane ? "selected" : ""}>${lane}</option>`)
            .join("")}
        </select>
      </td>
    `;

    const select = tr.querySelector("select");
    select.addEventListener("change", () => {
      capture.lane = select.value;
      renderPending();
    });

    tbody.appendChild(tr);
  });

  el.pendingList.innerHTML = "";
  el.pendingList.appendChild(table);
}

function buildLaneOptionsForCapture(athletes, grouped, capture) {
  const allLanes = athletes.map((a) => a.baliza).filter(Boolean);
  const usedLanes = new Set(
    (grouped.get(capture.split) || [])
      .filter((item) => item.id !== capture.id)
      .map((item) => item.lane)
      .filter(Boolean)
  );

  return allLanes.filter((lane) => !usedLanes.has(lane) || lane === capture.lane);
}

function groupPendingBySplit(pending) {
  const map = new Map();
  pending.forEach((item) => {
    if (!map.has(item.split)) map.set(item.split, []);
    map.get(item.split).push(item);
  });
  return map;
}

function registerPendingTimes() {
  const ac = state.activeChrono;
  if (!ac.pendingCaptures.length) {
    alert("Não há registros pendentes para salvar.");
    return;
  }

  const hasMissingLane = ac.pendingCaptures.some((c) => !c.lane);
  if (hasMissingLane) {
    alert("Atribua a baliza em todos os registros pendentes antes de registrar.");
    return;
  }

  const event = state.groupedEvents.get(ac.eventKey);
  if (!event) return;

  const seriesAthletes = event.series.get(ac.seriesKey);
  if (!seriesAthletes) return;

  let savedCount = 0;
  ac.pendingCaptures.forEach((capture) => {
    const athlete = seriesAthletes.find((a) => a.baliza === capture.lane);
    if (!athlete) return;
    athlete.current[capture.split] = msToDisplay(capture.ms);
    savedCount += 1;
  });

  ac.pendingCaptures = [];
  renderPending();
  renderControl();
  logAction(`Tempos registrados: ${savedCount} registros salvos na série ${ac.seriesKey}.`);
  alert("Tempos registrados na tela de controle.");
}

function renderChronoAthletes() {
  const ac = state.activeChrono;
  el.chronoAthletes.innerHTML = "";

  ac.athletes.forEach((athlete) => {
    const card = document.createElement("article");
    card.className = "athlete-card";
    // Compacta splits no cronômetro também
    const splits = getSplitsForEvent(ac.eventKey);
    let historyLines = "";
    for (let i = 0; i < splits.length; i += 2) {
      const splitA = splits[i];
      const splitB = splits[i + 1];
      historyLines += `
        <div class="split-compact">
          <div>
            <div class="split-title">Histórico ${splitA}m</div>
            <input class="time-input" data-role="history" data-split="${splitA}" value="${athlete.history[splitA] || "00:00:00"}" maxlength="8" />
          </div>
          ${splitB !== undefined ? `
          <div>
            <div class="split-title">Histórico ${splitB}m</div>
            <input class="time-input" data-role="history" data-split="${splitB}" value="${athlete.history[splitB] || "00:00:00"}" maxlength="8" />
          </div>` : ""}
        </div>
      `;
      historyLines += `
        <div class="split-compact">
          <div>
            <div class="split-title">Prova ${splitA}m</div>
            <div class="current-value">${athlete.current[splitA] || "00:00:00"}${buildDiffLabel(athlete.current[splitA] || "00:00:00", athlete.history[splitA] || "00:00:00")}</div>
          </div>
          ${splitB !== undefined ? `
          <div>
            <div class="split-title">Prova ${splitB}m</div>
            <div class="current-value">${athlete.current[splitB] || "00:00:00"}${buildDiffLabel(athlete.current[splitB] || "00:00:00", athlete.history[splitB] || "00:00:00")}</div>
          </div>` : ""}
        </div>
      `;
    }
    card.innerHTML = `
      <div class="athlete-main">
        <div>
          <div class="split-title">Nome</div>
          <div class="athlete-name">${escapeHtml(athlete.nome)}</div>
          <div class="tagline">
            <span class="tag">Baliza ${escapeHtml(athlete.baliza)}</span>
            <span class="tag">Balizado ${escapeHtml(athlete.tempoBalizado)}</span>
          </div>
        </div>
        <div>
          <div class="split-title">Equipe</div>
          <strong>${escapeHtml(athlete.equipe)}</strong>
        </div>
        <div>
          <div class="split-title">Série</div>
          <strong>${escapeHtml(ac.seriesKey)}</strong>
        </div>
      </div>
      ${historyLines}
    `;
    el.chronoAthletes.appendChild(card);
  });
}

function attachTimeMask(input) {
  input.addEventListener("beforeinput", (event) => {
    if (event.data && /\D/.test(event.data)) {
      event.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    const onlyDigits = input.value.replace(/\D/g, "").slice(0, 6);
    input.value = digitsToTimeMask(onlyDigits);
  });

  input.addEventListener("focus", () => {
    const digits = input.value.replace(/\D/g, "");
    if (!digits) input.value = "00:00:00";
  });
}

function digitsToTimeMask(digits) {
  const padded = digits.padEnd(6, "0");
  const mm = padded.slice(0, 2);
  const ss = padded.slice(2, 4);
  const cc = padded.slice(4, 6);
  return `${mm}:${ss}:${cc}`;
}

function normalizeTime(value) {
  if (!value) return "00:00:00";

  const cleaned = String(value).replace(/,/g, ":").replace(/\./g, ":").trim();
  const numeric = cleaned.replace(/\D/g, "");
  if (numeric.length >= 6) {
    return digitsToTimeMask(numeric.slice(0, 6));
  }

  const hms = cleaned;
  const fullPattern = /^\d{2}:\d{2}:\d{2}$/;
  if (fullPattern.test(hms)) return hms;

  const mmsscc = hms.match(/^(\d{1,2})[:.](\d{2})[:.](\d{2})$/);
  if (mmsscc) {
    const [, mm, ss, cc] = mmsscc;
    return `${mm.padStart(2, "0")}:${ss}:${cc}`;
  }

  const sscc = hms.match(/^(\d{1,2})[:.](\d{2})$/);
  if (sscc) {
    const [, ss, cc] = sscc;
    return `00:${ss.padStart(2, "0")}:${cc}`;
  }

  return "00:00:00";
}

function parseTimeToMs(display) {
  if (!display) return null;
  const match = String(display).match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const mm = Number(match[1]);
  const ss = Number(match[2]);
  const cc = Number(match[3]);
  return ((mm * 60) + ss) * 1000 + (cc * 10);
}

function msToDisplay(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const minutes = Math.floor(totalCentiseconds / 6000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((totalCentiseconds % 6000) / 100)
    .toString()
    .padStart(2, "0");
  const centiseconds = Math.floor(totalCentiseconds % 100)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}:${centiseconds}`;
}

function isSameTeam(value, teamName) {
  const a = normalizeText(value);
  const b = normalizeText(teamName);

  if (!a || !b) return false;

  if (a === b) return true;
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 8) return true;

  const aTokens = getTeamTokens(a);
  const bTokens = getTeamTokens(b);

  if (!aTokens.length || !bTokens.length) return false;

  const intersection = aTokens.filter((token) => bTokens.includes(token));
  return intersection.length >= 2;
}

function getTeamTokens(normalizedTeam) {
  const stopWords = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "a",
    "o",
    "prefeitura",
    "municipal",
    "clube",
    "natacao",
    "natação",
    "associacao",
    "associação",
    "equipe",
    "time",
    "cidade",
    "projeto",
    "esporte",
    "esportes",
  ]);

  return normalizedTeam
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
}

function slugify(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
