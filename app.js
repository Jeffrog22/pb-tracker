import { exportResults } from "./exporter.js";
import {
  attachTimeMask,
  digitsToTimeMask,
  normalizeTime,
  parseTimeToMs,
  msToDisplay,
  maskTimeHTML,
  normalizeText,
  toTitleCase,
  slugify,
  escapeHtml,
} from "./utils.js";
import { initSwimBase, renderSwimBaseScreen, reloadSwimBase, listAtletasForExport, exportSwimBaseFiltered } from "./swimbase.js";

const APP_VERSION = "0.39.1";

const state = {
  teamName: "",
  competitionDate: "",
  importedAt: null,
  importedRows: [],
  groupedEvents: new Map(),
  selectedProofs: new Set(),
  activityLog: [],
  profiles: [],
  activeProfile: null,
  appMode: "balizamento",
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
    continuousStartedAt: 0,
    seriesStartedAt: 0,
    blinkTimeout: null,
  },
};

let swRegistration = null;
let swUpdateAvailable = false;
let refreshingPage = false;
let lastSwUpdateCheck = 0;

const SCREEN_SESSION_KEY = "pbtracker_session";
const RESTORABLE_SCREENS = ["sb-home", "sb-atletas", "sb-treino", "sb-analise"];

function saveScreenSession() {
  try {
    window.sessionStorage.setItem(
      SCREEN_SESSION_KEY,
      JSON.stringify({ appMode: state.appMode, screen: state.screen })
    );
  } catch {
    // storage indisponível
  }
}

function restoreScreenSession() {
  let saved = null;
  try {
    saved = JSON.parse(window.sessionStorage.getItem(SCREEN_SESSION_KEY) || "null");
  } catch {
    saved = null;
  }
  const mode = saved?.appMode === "swimbase" ? "swimbase" : "balizamento";
  const screen = RESTORABLE_SCREENS.includes(saved?.screen) ? saved.screen : "mode";
  state.appMode = mode;
  if (el.exportBtn) el.exportBtn.hidden = mode !== "balizamento";
  renderNav();
  applyDeviceGuard();
  showScreen(screen);
}

const el = {
  screenLogin: document.getElementById("screenLogin"),
  screenMode: document.getElementById("screenMode"),
  screenImport: document.getElementById("screenImport"),
  screenFilter: document.getElementById("screenFilter"),
  screenControl: document.getElementById("screenControl"),
  screenSbHome: document.getElementById("screenSbHome"),
  screenSbAtletas: document.getElementById("screenSbAtletas"),
  screenSbTreino: document.getElementById("screenSbTreino"),
  screenSbAnalise: document.getElementById("screenSbAnalise"),
  modeBalizamentoBtn: document.getElementById("modeBalizamentoBtn"),
  modeSwimBaseBtn: document.getElementById("modeSwimBaseBtn"),
  modeProfileChip: document.getElementById("modeProfileChip"),
  bottomNav: document.getElementById("bottomNav"),
  fileInput: document.getElementById("fileInput"),
  teamName: document.getElementById("teamName"),
  profileSwitchBtn: document.getElementById("profileSwitchBtn"),
  activeProfileChip: document.getElementById("activeProfileChip"),
  profileList: document.getElementById("profileList"),
  profileForm: document.getElementById("profileForm"),
  profileCoachName: document.getElementById("profileCoachName"),
  profileTeamName: document.getElementById("profileTeamName"),
  processBtn: document.getElementById("processBtn"),
  importStatus: document.getElementById("importStatus"),
  proofList: document.getElementById("proofList"),
  goControlBtnTop: document.getElementById("goControlBtnTop"),
  goControlBtnBottom: document.getElementById("goControlBtnBottom"),
  controlContainer: document.getElementById("controlContainer"),
  backToFilterBtn: document.getElementById("backToFilterBtn"),
  exportBtn: document.getElementById("exportBtn"),
  downloadLogBtn: document.getElementById("downloadLogBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsDialog: document.getElementById("settingsDialog"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  expResultadosBtn: document.getElementById("expResultadosBtn"),
  expRegistrosBtn: document.getElementById("expRegistrosBtn"),
  expPrsBtn: document.getElementById("expPrsBtn"),
  expScope: document.getElementById("expScope"),
  expPeriodo: document.getElementById("expPeriodo"),
  expPeriodoPrs: document.getElementById("expPeriodoPrs"),
  expAtleta: document.getElementById("expAtleta"),
  expAtletaPrs: document.getElementById("expAtletaPrs"),
  notifToggle: document.getElementById("notifToggle"),
  notifStatus: document.getElementById("notifStatus"),
  notifHint: document.getElementById("notifHint"),
  notifDevice: document.getElementById("notifDevice"),
  notifPrefsBtn: document.getElementById("notifPrefsBtn"),
  notifTestBtn: document.getElementById("notifTestBtn"),
  notifPrefsDialog: document.getElementById("notifPrefsDialog"),
  closeNotifPrefsBtn: document.getElementById("closeNotifPrefsBtn"),
  notifPrefsForm: document.getElementById("notifPrefsForm"),
  notifPrefsDias: document.getElementById("notifPrefsDias"),
  notifPrefsHorario: document.getElementById("notifPrefsHorario"),
  notifPrefsFrequencia: document.getElementById("notifPrefsFrequencia"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomResetBtn: document.getElementById("zoomResetBtn"),
  zoomLabel: document.getElementById("zoomLabel"),
  settingsVersion: document.getElementById("settingsVersion"),
  updateStatus: document.getElementById("updateStatus"),
  checkUpdateBtn: document.getElementById("checkUpdateBtn"),
  updateNowBtn: document.getElementById("updateNowBtn"),
  hardRefreshBtn: document.getElementById("hardRefreshBtn"),
  chronoDialog: document.getElementById("chronoDialog"),
  chronoHudLayer: document.getElementById("chronoHudLayer"),
  startLapBtn: document.getElementById("startLapBtn"),
  stopResetBtn: document.getElementById("stopResetBtn"),
  closeChronoBtn: document.getElementById("closeChronoBtn"),
  registerBtn: document.getElementById("registerBtn"),
  chronoDisplay: document.getElementById("chronoDisplay"),
  chronoTitle: document.getElementById("chronoTitle"),
  nextCapture: document.getElementById("nextCapture"),
  pendingList: document.getElementById("pendingList"),
  lanePalette: document.getElementById("lanePalette"),
  navItems: document.querySelectorAll(".nav-item"),
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

const LANE_COLORS = [
  "#ffe0e6",
  "#e0f0ff",
  "#e2f6e5",
  "#fff3d1",
  "#efe4ff",
  "#d6f6f0",
  "#fbe3f0",
  "#e8f0ff",
  "#f0f0d6",
  "#ffe9d6",
];

function init() {
  registerServiceWorker();
  bindEvents();
  bindDeviceGuard();
  applyDeviceGuard();
  loadActivityLog();
  loadProfiles();
  loadHighContrast();
  bindHighContrast();
  loadDarkMode();
  bindDarkMode();
  loadZoom();
  startNotifScheduler();
  bindOnlineStatus();
  renderVersionTags();
  renderUpdateStatus();
  renderNav();
  initSwimBase({
    state,
    showScreen,
    renderNav,
    enterMode,
    applyDeviceGuard,
    logAction,
  });
  logAction("App iniciado");
  const active = getActiveProfile();
  if (active) {
    activateProfile(active.id, { skipLog: true });
    restoreScreenSession();
  } else {
    renderProfileList();
    showScreen("login");
  }
}

function loadProfiles() {
  try {
    const stored = window.localStorage.getItem("pbtracker_profiles");
    state.profiles = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(state.profiles)) state.profiles = [];
  } catch (e) {
    state.profiles = [];
  }
}

function saveProfiles() {
  try {
    window.localStorage.setItem("pbtracker_profiles", JSON.stringify(state.profiles));
  } catch (e) {
    // ignore storage failures
  }
}

function getActiveProfile() {
  try {
    const id = window.localStorage.getItem("pbtracker_active_profile");
    return state.profiles.find((p) => p.id === id) || null;
  } catch (e) {
    return null;
  }
}

function setActiveProfileId(id) {
  try {
    if (id) window.localStorage.setItem("pbtracker_active_profile", id);
    else window.localStorage.removeItem("pbtracker_active_profile");
  } catch (e) {
    // ignore storage failures
  }
}

function activateProfile(id, options = {}) {
  const profile = state.profiles.find((p) => p.id === id);
  if (!profile) return;
  state.activeProfile = profile;
  setActiveProfileId(profile.id);
  el.teamName.value = profile.equipe || "";
  renderProfileChip();
  reloadSwimBase()
    .then(() => {
      if (state.screen && state.screen.startsWith("sb-")) renderSwimBaseScreen(state.screen);
    })
    .catch((err) => console.warn(err));
  if (!options.skipLog) logAction(`Perfil ativado: ${profile.professor} (${profile.equipe}).`);
}

function createProfile(professor, equipe) {
  const profile = {
    id: `profile-${Date.now()}`,
    professor: professor.trim(),
    equipe: equipe.trim(),
    createdAt: new Date().toISOString(),
  };
  state.profiles.push(profile);
  saveProfiles();
  activateProfile(profile.id);
  logAction(`Perfil cadastrado: ${profile.professor} (${profile.equipe}).`);
  return profile;
}

function switchProfile() {
  state.activeProfile = null;
  setActiveProfileId(null);
  reloadSwimBase().catch((err) => console.warn(err));
  renderProfileList();
  showScreen("login");
}

function renderProfileList() {
  el.profileList.innerHTML = "";
  if (!state.profiles.length) {
    el.profileList.innerHTML = '<p class="muted">Nenhum perfil cadastrado ainda.</p>';
    return;
  }
  state.profiles.forEach((profile) => {
    const item = document.createElement("div");
    item.className = "profile-item";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "profile-item-main";
    main.innerHTML = `
      <span class="profile-item-name">${escapeHtml(profile.professor)}</span>
      <span class="profile-item-team">${escapeHtml(profile.equipe)}</span>
    `;
    main.addEventListener("click", () => {
      activateProfile(profile.id);
      showScreen("mode");
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "profile-item-delete";
    del.setAttribute("aria-label", `Excluir perfil de ${profile.professor}`);
    del.title = "Excluir perfil";
    del.textContent = "×";
    del.addEventListener("click", () => deleteProfile(profile.id));

    item.appendChild(main);
    item.appendChild(del);
    el.profileList.appendChild(item);
  });
}

function deleteProfile(id) {
  const profile = state.profiles.find((p) => p.id === id);
  if (!profile) return;
  if (!window.confirm(`Excluir o perfil de ${profile.professor} (${profile.equipe})?`)) return;
  state.profiles = state.profiles.filter((p) => p.id !== id);
  saveProfiles();
  if (state.activeProfile?.id === id) {
    state.activeProfile = null;
    setActiveProfileId(null);
  }
  renderProfileList();
  logAction(`Perfil excluído: ${profile.professor} (${profile.equipe}).`);
}

function renderVersionTags() {
  const elTag = document.getElementById("appVersionTag");
  if (elTag) elTag.textContent = `v${APP_VERSION}`;
}

function renderProfileChip() {
  const profile = state.activeProfile;
  if (!profile) {
    el.activeProfileChip.hidden = true;
    if (el.modeProfileChip) el.modeProfileChip.hidden = true;
    el.profileSwitchBtn.hidden = true;
    return;
  }
  el.activeProfileChip.hidden = false;
  el.activeProfileChip.textContent = `${profile.professor} · ${profile.equipe}`;
  if (el.modeProfileChip) {
    el.modeProfileChip.hidden = false;
    el.modeProfileChip.textContent = `${profile.professor} · ${profile.equipe}`;
  }
  el.profileSwitchBtn.hidden = false;
}

function todayISO() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function loadHighContrast() {
  let enabled = false;
  try {
    enabled = window.localStorage.getItem("pbtracker_high_contrast") === "1";
  } catch (e) {
    enabled = false;
  }
  const toggle = document.getElementById("highContrastToggle");
  if (toggle) toggle.checked = enabled;
  applyHighContrast(enabled);
}

function applyHighContrast(enabled) {
  document.body.classList.toggle("high-contrast", enabled);
  try {
    window.localStorage.setItem("pbtracker_high_contrast", enabled ? "1" : "0");
  } catch (e) {
    // ignore storage failures
  }
}

function bindHighContrast() {
  const toggle = document.getElementById("highContrastToggle");
  if (!toggle) return;
  toggle.addEventListener("change", () => applyHighContrast(toggle.checked));
}

function loadDarkMode() {
  let enabled = false;
  try {
    enabled = window.localStorage.getItem("pbtracker_dark_mode") === "1";
  } catch (e) {
    enabled = false;
  }
  const toggle = document.getElementById("darkModeToggle");
  if (toggle) toggle.checked = enabled;
  applyDarkMode(enabled);
}

function applyDarkMode(enabled) {
  document.body.classList.toggle("dark", enabled);
  try {
    window.localStorage.setItem("pbtracker_dark_mode", enabled ? "1" : "0");
  } catch (e) {
    // ignore storage failures
  }
}

function bindDarkMode() {
  const toggle = document.getElementById("darkModeToggle");
  if (!toggle) return;
  toggle.addEventListener("change", () => applyDarkMode(toggle.checked));
}

/* ============================================================
   ZOOM (card Acessibilidade) — documentElement.zoom + localStorage
   ============================================================ */
const ZOOM_KEY = "pbtracker_zoom";
const ZOOM_MIN = 80;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

function readZoom() {
  try {
    const raw = Number(window.localStorage.getItem(ZOOM_KEY));
    if (Number.isFinite(raw) && raw >= ZOOM_MIN && raw <= ZOOM_MAX) return raw;
  } catch (e) {
    // storage indisponível
  }
  return 100;
}

function setZoom(pct) {
  const value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(pct)));
  try {
    window.localStorage.setItem(ZOOM_KEY, String(value));
  } catch (e) {
    // ignore storage failures
  }
  document.documentElement.style.zoom = value / 100;
  loadZoomLabel();
}

function stepZoom(delta) {
  setZoom(readZoom() + delta);
}

function loadZoom() {
  document.documentElement.style.zoom = readZoom() / 100;
  loadZoomLabel();
}

function loadZoomLabel() {
  if (el.zoomLabel) el.zoomLabel.textContent = `${readZoom()}%`;
}

/* ============================================================
   NOTIFICAÇÕES LOCAIS (card Notificações) — sem backend/push
   ============================================================ */
const NOTIF_PREFS_KEY = "pbtracker_notif_prefs";
const NOTIF_LAST_KEY = "pbtracker_notif_last_fired";
const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const defaultNotifPrefs = () => ({
  enabled: false,
  horario: "08:00",
  dias: ["seg", "ter", "qua", "qui", "sex"],
  frequencia: "diaria",
});

function loadNotifPrefs() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIF_PREFS_KEY) || "null");
    if (stored && typeof stored === "object") {
      return {
        enabled: !!stored.enabled,
        horario: /^\d{2}:\d{2}$/.test(stored.horario || "") ? stored.horario : "08:00",
        dias: Array.isArray(stored.dias) ? stored.dias.filter((d) => DAY_KEYS.includes(d)) : [],
        frequencia: ["diaria", "3h", "6h"].includes(stored.frequencia) ? stored.frequencia : "diaria",
      };
    }
  } catch (e) {
    // storage indisponível
  }
  return defaultNotifPrefs();
}

function persistNotifPrefs(prefs) {
  try {
    window.localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    // ignore storage failures
  }
}

function notifSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

function renderNotifStatus() {
  if (!el.notifStatus) return;
  const prefs = loadNotifPrefs();

  if (!notifSupported()) {
    el.notifStatus.textContent = "Indisponível";
    el.notifStatus.className = "settings-badge";
    if (el.notifToggle) el.notifToggle.checked = false;
    if (el.notifToggle) el.notifToggle.disabled = true;
    setNotifHint("Este navegador não suporta notificações locais.");
    return;
  }

  const permission = Notification.permission;
  const labels = { default: "Não solicitado", granted: "Permitido", denied: "Bloqueado" };
  el.notifStatus.textContent = labels[permission] || permission;
  el.notifStatus.className = "settings-badge";

  if (el.notifToggle) {
    el.notifToggle.disabled = permission !== "granted";
    el.notifToggle.checked = permission === "granted" && prefs.enabled;
  }

  if (permission === "denied") {
    setNotifHint("Notificações bloqueadas. Reative em Configurações do navegador/site para usar lembretes.");
  } else if (permission === "granted" && prefs.enabled) {
    setNotifHint(describeNotifSchedule(prefs));
  } else if (permission === "granted") {
    setNotifHint("Permissão concedida. Ative o interruptor para agendar lembretes.");
  } else {
    setNotifHint("");
  }

  if (el.notifDevice && navigator.userAgent) {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Navegador";
    el.notifDevice.textContent = `Este dispositivo · ${browser}`;
  }
}

function setNotifHint(text) {
  if (!el.notifHint) return;
  el.notifHint.textContent = text;
  el.notifHint.hidden = !text;
}

function describeNotifSchedule(prefs) {
  const dias = prefs.dias.length ? prefs.dias.join(", ") : "nenhum dia";
  const freq =
    prefs.frequencia === "diaria" ? `às ${prefs.horario}` : `a partir de ${prefs.horario}, ${prefs.frequencia === "3h" ? "a cada 3h" : "a cada 6h"}`;
  return `Lembretes agendados (${freq}) em: ${dias}. Dispara com o app aberto.`;
}

async function handleNotifToggle() {
  if (!el.notifToggle) return;
  if (el.notifToggle.checked) {
    if (!notifSupported()) {
      el.notifToggle.checked = false;
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      el.notifToggle.checked = false;
      renderNotifStatus();
      return;
    }
    const prefs = loadNotifPrefs();
    prefs.enabled = true;
    persistNotifPrefs(prefs);
    logAction("Notificações locais ativadas.");
  } else {
    const prefs = loadNotifPrefs();
    prefs.enabled = false;
    persistNotifPrefs(prefs);
    logAction("Notificações locais desativadas.");
  }
  renderNotifStatus();
}

function openNotifPrefs() {
  const prefs = loadNotifPrefs();
  if (el.notifPrefsHorario) el.notifPrefsHorario.value = prefs.horario;
  if (el.notifPrefsFrequencia) el.notifPrefsFrequencia.value = prefs.frequencia;
  if (el.notifPrefsDias) {
    el.notifPrefsDias.querySelectorAll(".sb-day-chip").forEach((chip) => {
      chip.classList.toggle("active", prefs.dias.includes(chip.dataset.day));
    });
  }
  el.notifPrefsDialog.showModal();
}

async function saveNotifPrefs(event) {
  event.preventDefault();
  const dias = [...(el.notifPrefsDias?.querySelectorAll(".sb-day-chip.active") || [])]
    .map((chip) => chip.dataset.day);
  const prefs = {
    enabled: loadNotifPrefs().enabled,
    horario: el.notifPrefsHorario?.value || "08:00",
    dias,
    frequencia: el.notifPrefsFrequencia?.value || "diaria",
  };
  if (!dias.length) {
    window.alert("Selecione ao menos um dia da semana.");
    return;
  }
  persistNotifPrefs(prefs);
  // Um novo horário invalida a última disparada para não perder o lembrete de hoje.
  try {
    window.localStorage.removeItem(NOTIF_LAST_KEY);
  } catch (e) {
    // ignore
  }
  logAction(`Lembretes salvos: ${prefs.horario} (${prefs.frequencia}) em ${dias.join(", ")}.`);
  el.notifPrefsDialog.close();
  renderNotifStatus();
}

function notifTriggerKeys(prefs) {
  // Gera os horários de disparo de hoje a partir do horário base e da frequência.
  const [h, m] = prefs.horario.split(":").map(Number);
  const base = new Date();
  base.setHours(h || 0, m || 0, 0, 0);
  const keys = [];
  const push = (date) => keys.push(date.getTime());
  push(base);
  if (prefs.frequencia !== "diaria") {
    const stepMs = (prefs.frequencia === "3h" ? 3 : 6) * 3600000;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    for (let t = base.getTime() + stepMs; t <= end.getTime(); t += stepMs) push(new Date(t));
  }
  return keys;
}

async function tickNotifScheduler() {
  const prefs = loadNotifPrefs();
  if (!prefs.enabled || !prefs.dias.length) return;
  if (!notifSupported() || Notification.permission !== "granted") return;

  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  if (!prefs.dias.includes(todayKey)) return;

  const due = notifTriggerKeys(prefs).filter((t) => t <= now.getTime());
  if (!due.length) return;
  const latest = due[due.length - 1];

  let last = 0;
  try {
    last = Number(window.localStorage.getItem(NOTIF_LAST_KEY)) || 0;
  } catch (e) {
    last = 0;
  }
  if (latest <= last) return;
  try {
    window.localStorage.setItem(NOTIF_LAST_KEY, String(latest));
  } catch (e) {
    // ignore
  }
  showLocalNotification("Lembrete PBTracker", "Hora do treino! Abra o app para começar.");
}

async function showLocalNotification(title, body) {
  try {
    if (swRegistration?.showNotification) {
      await swRegistration.showNotification(title, { body, icon: "icons/icon-192.svg", badge: "icons/icon-192.svg" });
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch (e) {
    // notificação indisponível
  }
}

async function sendTestNotification() {
  if (!notifSupported()) {
    window.alert("Este navegador não suporta notificações locais.");
    return;
  }
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    renderNotifStatus();
    window.alert("Permissão de notificação não concedida.");
    return;
  }
  await showLocalNotification("Teste PBTracker", "Notificações locais funcionando neste dispositivo.");
  renderNotifStatus();
}

function startNotifScheduler() {
  window.setInterval(tickNotifScheduler, 60 * 1000);
  tickNotifScheduler();
}

/* ============================================================
   EXPORTAÇÃO VIA CARD (Configurações)
   ============================================================ */
async function populateExportAtletas() {
  try {
    const atletas = await listAtletasForExport();
    const options =
      '<option value="">Todos os atletas</option>' +
      atletas.map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join("");
    [el.expAtleta, el.expAtletaPrs].forEach((select) => {
      if (!select) return;
      const current = select.value;
      select.innerHTML = options;
      if ([...select.options].some((o) => o.value === current)) select.value = current;
    });
  } catch (e) {
    // SwimBase indisponível: select fica só com "Todos"
  }
}

async function handleExportFromSettings() {
  let groupedEvents = state.groupedEvents;
  if (el.expScope?.value === "selected") {
    groupedEvents = new Map(
      [...state.selectedProofs]
        .map((key) => [key, state.groupedEvents.get(key)])
        .filter(([, event]) => Boolean(event))
    );
    if (!groupedEvents.size) {
      window.alert("Nenhuma prova selecionada no filtro. Marque provas ou exporte todas.");
      return;
    }
  }

  const result = await exportResults({
    teamName: state.teamName,
    competitionDate: state.competitionDate,
    groupedEvents,
    getSplitsForEvent,
    activityLog: state.activityLog,
  });

  if (result.ok) {
    const formatLabel = result.format === "xlsx" ? "Excel (XLSX)" : "CSV";
    logAction(`Exportação ${formatLabel} dos resultados realizada (Configurações).`);
    alert(
      result.fallback
        ? "Sem internet: exportado em CSV (abre no Excel com acentos corretos)."
        : `Exportado em ${formatLabel}.`
    );
  } else {
    alert(result.reason || "Nada a exportar.");
  }
}

async function handleExportSwimBaseFromSettings(tipo) {
  const isRegistros = tipo === "registros";
  try {
    const res = await exportSwimBaseFiltered({
      tipo,
      periodo: (isRegistros ? el.expPeriodo?.value : el.expPeriodoPrs?.value) || "all",
      atletaId: (isRegistros ? el.expAtleta?.value : el.expAtletaPrs?.value) || "",
    });
    if (!res.ok) window.alert(res.reason || "Não foi possível exportar.");
    else if (res.fallback) window.alert("Sem internet: exportado em CSV.");
  } catch (e) {
    window.alert("Não foi possível exportar agora. Tente novamente.");
  }
}

function bindOnlineStatus() {
  const badge = document.getElementById("offlineBadge");
  if (!badge) return;
  const update = () => {
    badge.hidden = navigator.onLine;
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
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
      .register(`./sw.js?v=${APP_VERSION}`)
      .then((registration) => {
        swRegistration = registration;
        lastSwUpdateCheck = Date.now();
        setupServiceWorkerUpdateFlow(registration);
      })
      .catch(() => {
        // Falha silenciosa para não impactar a operação de prova.
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!swUpdateAvailable || refreshingPage) return;
    refreshingPage = true;
    window.location.reload();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (!swRegistration || swUpdateAvailable) return;
    if (Date.now() - lastSwUpdateCheck < 30 * 60 * 1000) return;
    lastSwUpdateCheck = Date.now();
    swRegistration.update().catch(() => {});
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
  renderUpdateStatus();
}

function renderUpdateStatus() {
  if (el.settingsVersion) el.settingsVersion.textContent = `v${APP_VERSION}`;
  if (!el.updateStatus) return;
  if (swUpdateAvailable) {
    el.updateStatus.textContent = "Atualização disponível";
    el.updateStatus.className = "settings-update-status available";
  } else {
    el.updateStatus.textContent = "Você está na última versão";
    el.updateStatus.className = "settings-update-status ok";
  }
  if (el.updateNowBtn) el.updateNowBtn.disabled = !swUpdateAvailable;
}

async function checkForUpdate() {
  if (!swRegistration) {
    if (el.updateStatus) {
      el.updateStatus.textContent = "Service worker indisponível";
      el.updateStatus.className = "settings-update-status warn";
    }
    if (el.updateNowBtn) el.updateNowBtn.disabled = true;
    return;
  }
  if (el.updateStatus) {
    el.updateStatus.textContent = "Verificando…";
    el.updateStatus.className = "settings-update-status";
  }
  lastSwUpdateCheck = Date.now();
  try {
    await swRegistration.update();
  } catch {
    // offline: mantém o estado conhecido
  }
  // O worker novo pode levar alguns ms para chegar em "waiting".
  if (!swUpdateAvailable && swRegistration.waiting) markUpdateAvailable();
  if (!swUpdateAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (swRegistration.waiting) markUpdateAvailable();
  }
  renderUpdateStatus();
}

function applyUpdate() {
  if (swRegistration?.waiting && swUpdateAvailable) {
    swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  checkForUpdate();
}

async function hardRefresh() {
  const confirmed = window.confirm(
    "Limpar todos os caches e recarregar o app? Você precisará de internet no próximo carregamento."
  );
  if (!confirmed) return;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
}

function bindEvents() {
  el.processBtn.addEventListener("click", handleImport);
  el.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const professor = el.profileCoachName.value.trim();
    const equipe = el.profileTeamName.value.trim();
    if (!professor || !equipe) {
      alert("Preencha o nome do professor e o nome da equipe.");
      return;
    }
    createProfile(professor, equipe);
    el.profileForm.reset();
    showScreen("mode");
  });
  el.profileSwitchBtn.addEventListener("click", switchProfile);
  bindSettingsEvents();
  el.goControlBtnTop.addEventListener("click", goToControl);
  el.goControlBtnBottom.addEventListener("click", goToControl);
  el.backToFilterBtn.addEventListener("click", () => showScreen("filter"));
  if (el.exportBtn) {
    el.exportBtn.addEventListener("click", handleExportResults);
  }

  el.startLapBtn.addEventListener("click", handleChronoStartLap);
  el.stopResetBtn.addEventListener("click", handleChronoStopReset);
  el.closeChronoBtn.addEventListener("click", closeChrono);
  el.registerBtn.addEventListener("click", registerPendingTimes);
  el.lanePalette.addEventListener("pointerdown", handleLanePointerDown);
  el.pendingList.addEventListener("click", handleLaneCellClick);
  el.chronoDialog.addEventListener("click", (event) => {
    const rect = el.chronoDialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (isOutside) closeChrono();
  });

  el.modeBalizamentoBtn.addEventListener("click", () => enterMode("balizamento"));
  el.modeSwimBaseBtn.addEventListener("click", () => enterMode("swimbase"));
}

function openSettingsDialog() {
  renderUpdateStatus();
  renderNotifStatus();
  loadZoomLabel();
  populateExportAtletas();
  checkForUpdate();
  el.settingsDialog.showModal();
}

function bindSettingsEvents() {
  el.settingsBtn.addEventListener("click", openSettingsDialog);
  el.closeSettingsBtn.addEventListener("click", () => el.settingsDialog.close());
  el.settingsDialog.addEventListener("click", (event) => {
    // target === dialog significa clique no ::backdrop (independe de zoom/coordenadas).
    if (event.target === el.settingsDialog) {
      el.settingsDialog.close();
      return;
    }
    // cliques sintéticos (isTrusted false) vêm com clientX/Y = 0 e fechariam o dialog.
    if (!event.isTrusted) return;
    const rect = el.settingsDialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (isOutside) el.settingsDialog.close();
  });

  // Card Exportar — sub-abas
  document.querySelectorAll(".settings-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.expTab;
      document.querySelectorAll(".settings-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".settings-panel").forEach((panel) => {
        panel.hidden = panel.dataset.expPanel !== target;
      });
    });
  });
  if (el.expResultadosBtn) el.expResultadosBtn.addEventListener("click", handleExportFromSettings);
  if (el.expRegistrosBtn) el.expRegistrosBtn.addEventListener("click", () => handleExportSwimBaseFromSettings("registros"));
  if (el.expPrsBtn) el.expPrsBtn.addEventListener("click", () => handleExportSwimBaseFromSettings("prs"));
  if (el.downloadLogBtn) {
    el.downloadLogBtn.addEventListener("click", () => {
      downloadActivityLog();
      logAction("Exportação do log de atividade requisitada pelo usuário.");
    });
  }

  // Card Notificações
  if (el.notifToggle) el.notifToggle.addEventListener("change", handleNotifToggle);
  if (el.notifPrefsBtn) el.notifPrefsBtn.addEventListener("click", openNotifPrefs);
  if (el.notifTestBtn) el.notifTestBtn.addEventListener("click", sendTestNotification);
  if (el.closeNotifPrefsBtn) el.closeNotifPrefsBtn.addEventListener("click", () => el.notifPrefsDialog.close());
  if (el.notifPrefsDialog) {
    el.notifPrefsDialog.addEventListener("click", (event) => {
      if (event.target === el.notifPrefsDialog) {
        el.notifPrefsDialog.close();
        return;
      }
      if (!event.isTrusted) return;
      const rect = el.notifPrefsDialog.getBoundingClientRect();
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) el.notifPrefsDialog.close();
    });
  }
  if (el.notifPrefsForm) el.notifPrefsForm.addEventListener("submit", saveNotifPrefs);
  if (el.notifPrefsDias) {
    el.notifPrefsDias.addEventListener("click", (event) => {
      const chip = event.target.closest(".sb-day-chip");
      if (chip) chip.classList.toggle("active");
    });
  }

  // Card Acessibilidade — zoom
  if (el.zoomOutBtn) el.zoomOutBtn.addEventListener("click", () => stepZoom(-10));
  if (el.zoomInBtn) el.zoomInBtn.addEventListener("click", () => stepZoom(10));
  if (el.zoomResetBtn) el.zoomResetBtn.addEventListener("click", () => setZoom(100));

  // Card Atualizações
  if (el.checkUpdateBtn) el.checkUpdateBtn.addEventListener("click", checkForUpdate);
  if (el.updateNowBtn) el.updateNowBtn.addEventListener("click", applyUpdate);
  if (el.hardRefreshBtn) el.hardRefreshBtn.addEventListener("click", hardRefresh);
}

function bindDeviceGuard() {
  window.addEventListener("resize", applyDeviceGuard);
}

function applyDeviceGuard() {
  const desktopNotice = document.getElementById("desktopNotice");
  const shouldBlock = state.appMode === "balizamento" && window.innerWidth > 1024;
  document.body.classList.toggle("desktop-blocked", shouldBlock);
  if (desktopNotice) {
    desktopNotice.setAttribute("aria-hidden", shouldBlock ? "false" : "true");
  }
}

function showScreen(screen) {
  if (screen === "mode" && !state.activeProfile) screen = "login";
  state.screen = screen;
  saveScreenSession();

  el.screenLogin.classList.toggle("active", screen === "login");
  el.screenMode.classList.toggle("active", screen === "mode");
  el.screenImport.classList.toggle("active", screen === "import");
  el.screenFilter.classList.toggle("active", screen === "filter");
  el.screenControl.classList.toggle("active", screen === "control");
  el.screenSbHome.classList.toggle("active", screen === "sb-home");
  el.screenSbAtletas.classList.toggle("active", screen === "sb-atletas");
  el.screenSbTreino.classList.toggle("active", screen === "sb-treino");
  el.screenSbAnalise.classList.toggle("active", screen === "sb-analise");

  el.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.screen === screen);
  });

  if (screen === "filter") {
    el.screenFilter.querySelectorAll(".proof-details.open").forEach((details) => {
      details.innerHTML = "";
      details.appendChild(buildEventDetailsTable(details._event));
    });
  }

  if (screen.startsWith("sb-")) {
    renderSwimBaseScreen(screen);
  }
}

const NAV_ICONS = {
  mode: '<path d="M4 11l8-8 8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6 10v10h12V10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>',
  filter: '<path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
  control: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"></circle><path d="M12 9v4l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
  "sb-atletas": '<circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2"></circle><path d="M3 20v-1a6 6 0 0 1 12 0v1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path><path d="M17 9a2.5 2.5 0 1 0-1 4.8M17 14a6 6 0 0 1 4 6v1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
  "sb-treino": '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"></circle><path d="M12 9v4l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path>',
  "sb-analise": '<path d="M3 3v18h18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path><path d="M8 15l3-4 3 2 5-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>',
};

function navConfig() {
  if (state.appMode === "swimbase") {
    return [
      { screen: "mode", label: "Modo", icon: NAV_ICONS.mode },
      { screen: "sb-atletas", label: "Atletas", icon: NAV_ICONS["sb-atletas"] },
      { screen: "sb-treino", label: "Treino", icon: NAV_ICONS["sb-treino"] },
      { screen: "sb-analise", label: "Análise", icon: NAV_ICONS["sb-analise"] },
    ];
  }
  return [
    { screen: "mode", label: "Modo", icon: NAV_ICONS.mode },
    { screen: "filter", label: "Provas", icon: NAV_ICONS.filter },
    { screen: "control", label: "Controle", icon: NAV_ICONS.control },
  ];
}

function renderNav() {
  const container = el.bottomNav;
  if (!container) return;
  container.innerHTML = "";
  navConfig().forEach(({ screen, label, icon }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-item";
    btn.dataset.screen = screen;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg><span>${label}</span>`;
    btn.addEventListener("click", () => {
      if (screen === "import" && !state.activeProfile) {
        showScreen("login");
        return;
      }
      showScreen(screen);
    });
    container.appendChild(btn);
  });
  el.navItems = container.querySelectorAll(".nav-item");
}

function enterMode(mode) {
  state.appMode = mode;
  if (el.exportBtn) el.exportBtn.hidden = mode !== "balizamento";
  renderNav();
  applyDeviceGuard();
  showScreen(mode === "swimbase" ? "sb-home" : "import");
}

function setStatus(message, tone = "neutral") {
  const elStatus = document.getElementById("importStatus");
  elStatus.hidden = false;
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
  const file = el.fileInput.files?.[0];

  if (!teamName || !file) {
    setStatus("Preencha a equipe e selecione um arquivo antes de processar.", "error");
    return;
  }

  state.teamName = teamName;
  state.competitionDate = todayISO();

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
    details._event = event;

    toggleBtn.addEventListener("click", () => {
      const isOpen = details.classList.toggle("open");
      toggleBtn.textContent = isOpen ? "Ocultar detalhes" : "Ver séries e atletas";
      if (isOpen) {
        details.innerHTML = "";
        details.appendChild(buildEventDetailsTable(event));
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

function hasRegisteredTimes(athlete) {
  return Object.values(athlete.current || {}).some((t) => t && t !== "00:00:00");
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
        <th>ver</th>
        <th>Tempo da prova</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const athleteById = new Map();
  const tbody = table.querySelector("tbody");
  [...event.series.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([seriesKey, athletes]) => {
      athletes
        .sort((a, b) => Number(a.baliza) - Number(b.baliza))
        .forEach((athlete) => {
          athleteById.set(athlete.id, athlete);
          const tr = document.createElement("tr");
          if (hasRegisteredTimes(athlete)) tr.classList.add("timed-row");
          tr.innerHTML = `
            <td>${escapeHtml(seriesKey)}</td>
            <td>${escapeHtml(athlete.baliza)}</td>
            <td>${escapeHtml(athlete.nome)}</td>
            <td>${maskTimeHTML(athlete.tempoBalizado)}</td>
            <td class="eye-cell" data-athlete-id="${escapeHtml(athlete.id)}">
              <button type="button" class="eye-btn" aria-label="Ver parciais de ${escapeHtml(athlete.nome)}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </td>
            <td class="race-time">${maskTimeHTML(getFinalRaceTime(athlete, event.eventName))}</td>
          `;
          tbody.appendChild(tr);
        });
    });

  tbody.addEventListener("click", (e) => {
    const cell = e.target.closest(".eye-cell");
    if (!cell) return;
    const athlete = athleteById.get(cell.dataset.athleteId);
    if (!athlete) return;
    if (cell.querySelector(".eye-btn")) {
      cell.innerHTML = `<span class="partials-inline" role="button" tabindex="0">${buildPartialsInline(athlete, event.eventName)}</span>`;
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "eye-btn";
      btn.setAttribute("aria-label", `Ver parciais de ${athlete.nome}`);
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
      cell.innerHTML = "";
      cell.appendChild(btn);
    }
  });

  return table;
}

function getFinalRaceTime(athlete, eventName) {
  const splits = getSplitsForEvent(eventName);
  const lastSplit = splits[splits.length - 1];
  return athlete.current?.[lastSplit] || "00:00:00";
}

function buildPartialsInline(athlete, eventName) {
  return getSplitsForEvent(eventName)
    .map((split) => maskTimeHTML(athlete.current?.[split] || "00:00:00"))
    .join("/");
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

  if (!selectedEvents.length) {
    el.controlContainer.innerHTML = `
      <div class="panel">
        <p class="muted">Selecione provas no filtro para ir ao controle operacional.</p>
        <button class="btn-pill btn-start" data-goto-filter type="button">Escolher provas</button>
      </div>
    `;
    el.controlContainer.querySelector("[data-goto-filter]").addEventListener("click", () => showScreen("filter"));
    return;
  }

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
            <button class="btn-pill btn-start">Abrir Cronômetro</button>
          </div>
          <div class="athletes-card"></div>
        `;

        const openBtn = seriesBlock.querySelector("button");
        openBtn.addEventListener("click", () => openChrono(event.eventName, seriesKey, sortedAthletes));

        const card = seriesBlock.querySelector(".athletes-card");
        sortedAthletes.forEach((athlete) => {
          card.appendChild(renderAthleteCard(event.eventName, seriesKey, athlete));
        });

        eventBlock.appendChild(seriesBlock);
      });

    el.controlContainer.appendChild(eventBlock);
  });
}

function renderAthleteCard(eventName, seriesKey, athlete) {
  const card = document.createElement("article");
  card.className = "athlete-row";

  const splits = getSplitsForEvent(eventName);
  let partialCells = "";
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
    partialCells += `
      <div class="partial-cell">
        <div class="split-title">PR Parcial ${splitA}m</div>
        <input class="partial-input" data-role="history" data-split="${splitA}" value="${histA}" maxlength="8" />
      </div>
      <div class="partial-cell">
        <div class="split-title">${splitLabel(splitA, splits)}</div>
        <div class="current-value" data-split="${splitA}">${maskTimeHTML(currA)}${diffA}</div>
      </div>
      ${splitB !== undefined ? `
      <div class="partial-cell">
        <div class="split-title">PR Parcial ${splitB}m</div>
        <input class="partial-input" data-role="history" data-split="${splitB}" value="${histB}" maxlength="8" />
      </div>
      <div class="partial-cell">
        <div class="split-title">${splitLabel(splitB, splits)}</div>
        <div class="current-value" data-split="${splitB}">${maskTimeHTML(currB)}${diffB}</div>
      </div>` : ""}
    `;
  }

  card.innerHTML = `
    <div class="athlete-main">
      <div class="athlete-head">
        <div class="athlete-name">${escapeHtml(athlete.nome)}</div>
        <div class="tagline">
          <span class="tag">Baliza ${escapeHtml(athlete.baliza)}</span>
          <span class="tag">Balizado ${escapeHtml(athlete.tempoBalizado)}</span>
          ${athlete.categoria ? `<span class="tag">${escapeHtml(athlete.categoria)}</span>` : ""}
        </div>
      </div>
      <div class="athlete-meta">
        <div>
          <div class="split-title">Equipe</div>
          <strong>${escapeHtml(athlete.equipe)}</strong>
        </div>
        <div>
          <div class="split-title">Série</div>
          <strong>${escapeHtml(seriesKey)}</strong>
        </div>
      </div>
    </div>
    <div class="partials-grid">${partialCells}</div>
  `;

  card.querySelectorAll("input[data-role='history']").forEach((input) => {
    attachTimeMask(input);
    input.addEventListener("input", () => {
      const split = Number(input.dataset.split);
      athlete.history[split] = input.value;
      const valueEl = card.querySelector(`.current-value[data-split="${split}"]`);
      if (valueEl) {
        valueEl.innerHTML =
          `${maskTimeHTML(athlete.current[split] || "00:00:00")}${buildDiffLabel(athlete.current[split] || "00:00:00", input.value)}`;
      }
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
  const diffStr = maskTimeHTML(msToDisplay(Math.abs(diff)));

  if (diff < 0) {
    return ` <span class="improved">(${sign}${diffStr})</span>`;
  }
  if (diff > 0) {
    return ` <span class="worse">(${sign}${diffStr})</span>`;
  }
  return ` <span class="neutral-diff">(${maskTimeHTML("00:00:00")})</span>`;
}

function splitLabel(split, splits) {
  if (split === splits[splits.length - 1]) {
    return `Tempo Final ${split}m`;
  }
  return `Volta ${split}m`;
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

/* --- HUD drag (Balizamento) --- */
const CHRONO_HUD_KEY = "pbtracker_chrono_hud";
const CHRONO_HUD_DEFAULTS = {
  start: { left: "14px", top: "14px" },
  stop: { right: "14px", top: "14px" },
};

function loadChronoHudPositions() {
  try { return JSON.parse(localStorage.getItem(CHRONO_HUD_KEY)) || null; } catch { return null; }
}

function saveChronoHudPositions() {
  const layer = el.chronoHudLayer;
  if (!layer) return;
  const pos = {};
  layer.querySelectorAll(".hud-btn").forEach((btn) => {
    const id = btn.id === "startLapBtn" ? "start" : "stop";
    pos[id] = { left: btn.style.left, top: btn.style.top, right: btn.style.right };
  });
  localStorage.setItem(CHRONO_HUD_KEY, JSON.stringify(pos));
}

function resetChronoHudPositions() {
  localStorage.removeItem(CHRONO_HUD_KEY);
  const s = el.startLapBtn, r = el.stopResetBtn;
  if (s) { s.style.left = CHRONO_HUD_DEFAULTS.start.left; s.style.top = CHRONO_HUD_DEFAULTS.start.top; s.style.right = "auto"; }
  if (r) { r.style.right = CHRONO_HUD_DEFAULTS.stop.right; r.style.top = CHRONO_HUD_DEFAULTS.stop.top; r.style.left = "auto"; }
}

function applyChronoHudPositions(pos) {
  const s = el.startLapBtn, r = el.stopResetBtn;
  if (pos?.start) {
    if (s) { s.style.left = pos.start.left || ""; s.style.top = pos.start.top || ""; s.style.right = pos.start.right || "auto"; }
  } else if (s) {
    s.style.left = CHRONO_HUD_DEFAULTS.start.left; s.style.top = CHRONO_HUD_DEFAULTS.start.top; s.style.right = "auto";
  }
  if (pos?.stop) {
    if (r) { r.style.left = pos.stop.left || "auto"; r.style.top = pos.stop.top || ""; r.style.right = pos.stop.right || ""; }
  } else if (r) {
    r.style.right = CHRONO_HUD_DEFAULTS.stop.right; r.style.top = CHRONO_HUD_DEFAULTS.stop.top; r.style.left = "auto";
  }
}

let chronoHudDragging = null;
let chronoHudStartX = 0, chronoHudStartY = 0;
let chronoHudOrigLeft = 0, chronoHudOrigTop = 0;

function initChronoHudDrag() {
  const layer = el.chronoHudLayer;
  if (!layer) return;
  applyChronoHudPositions(loadChronoHudPositions());
  layer.querySelectorAll(".hud-btn").forEach((btn) => {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add("dragging");
      chronoHudDragging = btn;
      chronoHudStartX = e.clientX; chronoHudStartY = e.clientY;
      const rect = btn.getBoundingClientRect(), lRect = layer.getBoundingClientRect();
      chronoHudOrigLeft = rect.left - lRect.left; chronoHudOrigTop = rect.top - lRect.top;
    });
    btn.addEventListener("pointermove", (e) => {
      if (chronoHudDragging !== btn) return;
      btn.style.left = (chronoHudOrigLeft + e.clientX - chronoHudStartX) + "px";
      btn.style.top = (chronoHudOrigTop + e.clientY - chronoHudStartY) + "px";
      btn.style.right = "auto";
    });
    btn.addEventListener("pointerup", () => {
      if (chronoHudDragging !== btn) return;
      btn.classList.remove("dragging");
      chronoHudDragging = null;
      saveChronoHudPositions();
    });
    btn.addEventListener("pointercancel", () => {
      if (chronoHudDragging !== btn) return;
      btn.classList.remove("dragging");
      chronoHudDragging = null;
    });
  });
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
    laneColors: {},
    continuousStartedAt: 0,
    seriesStartedAt: 0,
    blinkTimeout: null,
  };

  el.chronoTitle.textContent = `${eventKey} | Série ${seriesKey}`;
  el.chronoDisplay.innerHTML = maskTimeHTML("00:00:00");
  const contEl = document.getElementById("chronoContinuousDisplay");
  if (contEl) contEl.innerHTML = maskTimeHTML(msToDisplay(0));
  syncChronoStateBadge(false);
  renderPending();
  refreshNextCapture();
  el.chronoDialog.showModal();
  initChronoHudDrag();
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
    if (state.activeChrono.seriesStartedAt === 0) state.activeChrono.seriesStartedAt = Date.now();
    if (state.activeChrono.continuousStartedAt === 0) state.activeChrono.continuousStartedAt = Date.now();
    state.activeChrono.timerId = window.setInterval(updateChronoDisplay, 30);
    updateChronoDisplay();
    syncChronoStateBadge(true);
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
    blinkChronoDisplay(state.activeChrono.elapsedMs);
    syncChronoStateBadge(false);
    setStatus("Cronômetro parado e último clique registrado.", "neutral");
    return;
  }

  state.activeChrono.elapsedMs = 0;
  state.activeChrono.pendingCaptures = [];
  state.activeChrono.currentSplitIndex = 0;
  state.activeChrono.clickInSplit = 0;
  state.activeChrono.lastStopCaptured = false;
  state.activeChrono.continuousStartedAt = 0;
  state.activeChrono.seriesStartedAt = 0;
  clearTimeout(state.activeChrono.blinkTimeout);
  state.activeChrono.blinkTimeout = null;
  el.chronoDisplay.innerHTML = maskTimeHTML("00:00:00");
  const contEl = document.getElementById("chronoContinuousDisplay");
  if (contEl) contEl.innerHTML = maskTimeHTML(msToDisplay(0));
  syncChronoStateBadge(false);
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
  if (!state.activeChrono.blinkTimeout) {
    el.chronoDisplay.innerHTML = maskTimeHTML(msToDisplay(state.activeChrono.elapsedMs));
  }
  if (state.activeChrono.continuousStartedAt > 0) {
    const contMs = Date.now() - state.activeChrono.continuousStartedAt;
    const contEl = document.getElementById("chronoContinuousDisplay");
    if (contEl) contEl.innerHTML = maskTimeHTML(msToDisplay(contMs));
  }
}

function blinkChronoDisplay(recordedTime) {
  clearTimeout(state.activeChrono.blinkTimeout);
  el.chronoDisplay.innerHTML = maskTimeHTML(msToDisplay(recordedTime));
  el.chronoDisplay.classList.add("blink");
  state.activeChrono.blinkTimeout = setTimeout(() => {
    el.chronoDisplay.classList.remove("blink");
    state.activeChrono.blinkTimeout = null;
  }, 2000);
}

function syncChronoStateBadge(running) {
  const badge = document.getElementById("chronoStateBadge");
  if (!badge) return;
  badge.textContent = running ? "Rodando" : "Parado";
  badge.classList.toggle("running", running);
  badge.classList.toggle("stopped", !running);
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
    lane: draftLaneForOrder(ac, ac.clickInSplit),
    laneAssigned: false,
    isStopCapture: isStop,
  });

  if (isStop) {
    ac.lastStopCaptured = true;
    logAction(`Clique de parar registrado no cronômetro: parcial ${split}m, ordem ${ac.clickInSplit}, tempo ${msToDisplay(ac.elapsedMs)}.`);
  } else {
    blinkChronoDisplay(ac.elapsedMs);
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

function draftLaneForOrder(ac, order) {
  const split = ac.splitPlan[ac.currentSplitIndex];
  for (let i = ac.pendingCaptures.length - 1; i >= 0; i--) {
    const c = ac.pendingCaptures[i];
    if (String(c.order) !== String(order)) continue;
    if (!c.lane) return "";
    const taken = ac.pendingCaptures.some(
      (x) => String(x.split) === String(split) && String(x.lane) === String(c.lane)
    );
    return taken ? "" : c.lane;
  }
  return "";
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
    el.lanePalette.innerHTML = "";
    return;
  }

  buildLanePalette(ac);
  el.pendingList.innerHTML = "";
  el.pendingList.appendChild(buildPendingTable(ac));
}

function getSeriesBalizas(ac) {
  return [...new Set(ac.athletes.map((a) => String(a.baliza)).filter(Boolean))].sort(
    (a, b) => Number(a) - Number(b)
  );
}

function getUsedBalizasForSplit(ac, split) {
  if (!split) return new Set();
  const used = new Set();
  ac.pendingCaptures.forEach((capture) => {
    if (capture.split === split && capture.lane) used.add(String(capture.lane));
  });
  return used;
}

function buildLanePalette(ac) {
  const split = ac.splitPlan[ac.currentSplitIndex];
  const used = getUsedBalizasForSplit(ac, split);
  el.lanePalette.innerHTML = "";
  getSeriesBalizas(ac).forEach((baliza) => {
    el.lanePalette.appendChild(buildBalizaToggle(baliza, used.has(baliza)));
  });
}

function getBalizaColor(baliza) {
  const ac = state.activeChrono;
  const key = String(baliza);
  if (ac.laneColors[key]) return ac.laneColors[key];
  const used = new Set(Object.values(ac.laneColors));
  const available = LANE_COLORS.filter((c) => !used.has(c));
  const pool = available.length ? available : LANE_COLORS;
  ac.laneColors[key] = pool[Math.floor(Math.random() * pool.length)];
  return ac.laneColors[key];
}

function buildBalizaToggle(baliza, used) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "baliza-toggle" + (used ? " used" : "");
  btn.dataset.baliza = String(baliza);
  btn.style.setProperty("--lane-color", getBalizaColor(baliza));
  btn.textContent = String(baliza);
  btn.title = used ? `Baliza ${baliza} — arraste para trocar` : `Baliza ${baliza} — arraste para atribuir`;
  return btn;
}

function autoFillTwoAthletes(ac, split) {
  const balizas = getSeriesBalizas(ac);
  if (balizas.length !== 2) return;
  const used = getUsedBalizasForSplit(ac, split);
  const available = balizas.filter((b) => !used.has(b));
  if (available.length !== 1) return;
  const missing = ac.pendingCaptures.filter(
    (c) => c.split === split && !c.lane
  );
  if (missing.length !== 1) return;
  assignLaneToRow(split, missing[0].order, available[0]);
}

function buildPendingTable(ac) {
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
    if (capture.isStopCapture) tr.className = "stop-capture-row";
    const draftClass = capture.lane && !capture.laneAssigned ? " lane-draft" : "";
    tr.innerHTML = `
      <td>${capture.split}m</td>
      <td>${capture.order}</td>
      <td>${maskTimeHTML(msToDisplay(capture.ms))}</td>
      <td class="lane-cell">
        <button type="button" class="lane-dropzone${capture.lane ? " filled" : ""}${draftClass}"
          data-split="${capture.split}" data-order="${capture.order}"
          data-lane="${capture.lane || ""}" title="${capture.lane ? "Toque para limpar a baliza" : "Arraste uma baliza da paleta"}">${capture.lane || "—"}</button>
      </td>
    `;
    if (capture.lane) {
      tr.querySelector(".lane-dropzone").style.setProperty("--lane-color", getBalizaColor(capture.lane));
    }
    tbody.appendChild(tr);
  });

  return table;
}

const laneDrag = {
  active: false,
  pointerId: null,
  baliza: null,
  ghost: null,
  originRect: null,
  startX: 0,
  startY: 0,
  dropZone: null,
  pairZone: null,
};

function handleLanePointerDown(event) {
  const toggle = event.target.closest(".baliza-toggle");
  if (!toggle) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  event.preventDefault();
  laneDrag.pointerId = event.pointerId;
  laneDrag.baliza = toggle.dataset.baliza;
  laneDrag.startX = event.clientX;
  laneDrag.startY = event.clientY;
  laneDrag.active = false;
  laneDrag.originRect = toggle.getBoundingClientRect();

  document.addEventListener("pointermove", handleLanePointerMove);
  document.addEventListener("pointerup", handleLanePointerUp);
  document.addEventListener("pointercancel", handleLanePointerCancel);
}

function handleLanePointerMove(event) {
  if (event.pointerId !== laneDrag.pointerId) return;

  if (!laneDrag.active) {
    const moved = Math.hypot(event.clientX - laneDrag.startX, event.clientY - laneDrag.startY);
    if (moved < 6) return;
    spawnLaneGhost(event.clientX, event.clientY);
  }

  laneDrag.ghost.style.left = `${event.clientX}px`;
  laneDrag.ghost.style.top = `${event.clientY}px`;
  highlightLaneDropzone(event.clientX, event.clientY);
}

function spawnLaneGhost(x, y) {
  const source = el.lanePalette.querySelector(`.baliza-toggle[data-baliza="${laneDrag.baliza}"]`);
  if (!source) return;
  const ghost = source.cloneNode(true);
  ghost.classList.add("ghost");
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
  el.chronoDialog.appendChild(ghost);
  laneDrag.ghost = ghost;
  laneDrag.active = true;
  source.classList.add("dragging");
}

function highlightLaneDropzone(x, y) {
  const target = document.elementFromPoint(x, y);
  const dz = target ? target.closest(".lane-dropzone") : null;
  if (dz === laneDrag.dropZone) return;
  clearLanePairHighlight();
  if (laneDrag.dropZone) laneDrag.dropZone.classList.remove("drop-active");
  laneDrag.dropZone = dz || null;
  if (!laneDrag.dropZone) return;
  laneDrag.dropZone.classList.add("drop-active");
  const ac = state.activeChrono;
  const split = laneDrag.dropZone.dataset.split;
  const occupant = ac.pendingCaptures.find(
    (c) => String(c.split) === String(split)
      && String(c.lane) === String(laneDrag.baliza)
      && String(c.order) !== String(laneDrag.dropZone.dataset.order)
  );
  if (!occupant) return;
  const pair = el.pendingList.querySelector(
    `.lane-dropzone[data-split="${split}"][data-order="${occupant.order}"]`
  );
  if (!pair) return;
  pair.classList.add("drop-pair");
  laneDrag.pairZone = pair;
}

function clearLanePairHighlight() {
  if (laneDrag.pairZone) {
    laneDrag.pairZone.classList.remove("drop-pair");
    laneDrag.pairZone = null;
  }
}

function handleLanePointerUp(event) {
  if (event.pointerId !== laneDrag.pointerId) return;
  finishLaneDrag();
}

function handleLanePointerCancel(event) {
  if (event.pointerId !== laneDrag.pointerId) return;
  document.removeEventListener("pointermove", handleLanePointerMove);
  document.removeEventListener("pointerup", handleLanePointerUp);
  document.removeEventListener("pointercancel", handleLanePointerCancel);
  cleanupLaneDrag();
  renderPending();
}

function finishLaneDrag() {
  document.removeEventListener("pointermove", handleLanePointerMove);
  document.removeEventListener("pointerup", handleLanePointerUp);
  document.removeEventListener("pointercancel", handleLanePointerCancel);

  if (!laneDrag.active) {
    cleanupLaneDrag();
    return;
  }

  const target = laneDrag.dropZone;
  clearLanePairHighlight();
  if (target) target.classList.remove("drop-active");

  const baliza = laneDrag.baliza;
  const order = target ? String(target.dataset.order) : "";
  const split = target ? String(target.dataset.split) : "";

  if (order && split && baliza) {
    animateLaneGhostToDrop(target, () => {
      dropLaneOnRow(split, order, baliza);
      autoFillTwoAthletes(state.activeChrono, split);
      cleanupLaneDrag();
      renderPending();
    });
    return;
  }

  animateLaneGhostToOrigin(() => {
    cleanupLaneDrag();
    renderPending();
  });
}

function animateLaneGhostToDrop(dropzone, onDone) {
  const rect = dropzone.getBoundingClientRect();
  animateLaneGhostTo(rect.left + rect.width / 2, rect.top + rect.height / 2, onDone);
}

function animateLaneGhostToOrigin(onDone) {
  const rect = laneDrag.originRect;
  animateLaneGhostTo(rect.left + rect.width / 2, rect.top + rect.height / 2, onDone);
}

function animateLaneGhostTo(targetX, targetY, onDone) {
  const ghost = laneDrag.ghost;
  if (!ghost) {
    onDone();
    return;
  }
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    ghost.removeEventListener("transitionend", done);
    onDone();
  };
  ghost.classList.add("snapping");
  requestAnimationFrame(() => {
    ghost.style.left = `${targetX}px`;
    ghost.style.top = `${targetY}px`;
  });
  ghost.addEventListener("transitionend", done);
  window.setTimeout(done, 240);
}

function assignLaneToRow(split, order, baliza) {
  const ac = state.activeChrono;
  ac.pendingCaptures.forEach((capture) => {
    if (String(capture.split) === String(split) && String(capture.order) === String(order)) {
      capture.lane = String(baliza);
      capture.laneAssigned = true;
    }
  });
}

function dropLaneOnRow(split, order, baliza) {
  const ac = state.activeChrono;
  const row = ac.pendingCaptures.find(
    (c) => String(c.split) === String(split) && String(c.order) === String(order)
  );
  if (!row) return;
  if (String(row.lane) === String(baliza)) return;
  const occupant = ac.pendingCaptures.find(
    (c) => c !== row && String(c.split) === String(split) && String(c.lane) === String(baliza)
  );
  if (occupant) {
    const previous = row.lane || "";
    row.lane = String(baliza);
    occupant.lane = previous;
    row.laneAssigned = true;
    occupant.laneAssigned = true;
  } else {
    row.lane = String(baliza);
    row.laneAssigned = true;
  }
}

function cleanupLaneDrag() {
  if (laneDrag.ghost) {
    laneDrag.ghost.remove();
    laneDrag.ghost = null;
  }
  if (laneDrag.baliza) {
const source = el.lanePalette.querySelector(`.baliza-toggle[data-baliza="${laneDrag.baliza}"]`);
    if (source) source.classList.remove("dragging");
  }
  if (laneDrag.dropZone) laneDrag.dropZone.classList.remove("drop-active");
  clearLanePairHighlight();
  Object.assign(laneDrag, {
    active: false,
    pointerId: null,
    baliza: null,
    ghost: null,
    originRect: null,
    startX: 0,
    startY: 0,
    dropZone: null,
    pairZone: null,
  });
}

function handleLaneCellClick(event) {
  const cell = event.target.closest(".lane-dropzone");
  if (!cell) return;
  if (!cell.dataset.lane) return;
  clearCaptureLane(cell.dataset.split, cell.dataset.order);
}

function clearCaptureLane(split, order) {
  const ac = state.activeChrono;
  ac.pendingCaptures.forEach((capture) => {
    if (String(capture.split) === String(split) && String(capture.order) === String(order)) {
      capture.lane = "";
      capture.laneAssigned = false;
    }
  });
  renderPending();
}

function registerPendingTimes() {
  const ac = state.activeChrono;
  if (!ac.pendingCaptures.length) {
    alert("Não há registros pendentes para salvar.");
    return;
  }

  const hasMissingLane = ac.pendingCaptures.some((c) => !c.lane);
  if (hasMissingLane) {
    alert("Atribua todos os toggles de baliza antes de registrar.");
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

init();

/* =====================================================================
   GameSir X5 Lite → controle físico do PBTracker (Gamepad API)
   ---------------------------------------------------------------------------
   Bloco isolado no fim de app.js — NENHUMA função existente é alterada.
   Usa apenas navigator.getGamepads() + requestAnimationFrame (sem libs).
   Sem controle conectado, o comportamento do app não muda em nada.

   D-Pad/LS/RS = cursor de foco (Tab) · L3/R3 = Enter
   A = fecha dialog · X = primário (Registrar/Salvar) · Y = Análise (SwimBase)
   B = Controle (Balizamento) · Menu = Configurações · Home = tela de modo
   M = passo Modo 1/2/3 do treino (SwimBase) · View = history.back()
   LB/RB = tela anterior/próxima · LT/RT = Iniciar/Parar do cronômetro
   ===================================================================== */

/* ===== AJUSTE AQUI: índices dos botões =====
   Padrão Gamepad API (mapping "standard"):
     0=A 1=B 2=X 3=Y · 4=LB 5=RB 6=LT 7=RT · 8=View 9=Menu
     10=L3 11=R3 · 12=↑ 13=↓ 14=← 15=→ · 16=Home/Guide
   Para descobrir o índice real de um botão (ex.: o M Button, que é de
   firmware e pode nem aparecer): ligue window.gamepadDebug = true e
   aperte o botão — o console loga "[gamepad/debug] index=N".
   Use null para DESATIVAR um botão. */
const GP = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4, // ombro esquerdo = tela anterior
  rb: 5, // ombro direito = tela próxima
  lt: 6, // gatilho esquerdo = Iniciar/Voltas
  rt: 7, // gatilho direito = Parar/Reiniciar
  view: 8,
  menu: 9,
  l3: 10,
  r3: 11,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  home: 16, // só existe se o controle reportar o Guide/Home
  m: null, // M Button: rode o debug, aperte o M e preencha o número aqui
};

const GP_DEBOUNCE_MS = 200; // debounce por ação (bounce do hardware)
const GP_NAV_DELAY_MS = 400; // espera antes de repetir navegação segurada
const GP_NAV_REPEAT_MS = 180; // ritmo da repetição (0 = só 1 passo por pressão)
const GP_STICK_DEADZONE = 0.5; // zona morta dos analógicos

/* Ordem de navegação das telas (apague uma entrada para desabilitar). */
const GP_TELAS = {
  balizamento: ["mode", "import", "filter", "control"],
  swimbase: ["mode", "sb-home", "sb-atletas", "sb-treino", "sb-analise"],
};

let gpRafId = null;
let gpPressionado = new Map(); // índice → estado anterior (edge trigger)
let gpDebounce = {}; // ação → timestamp do último disparo
let gpNav = { dir: 0, proximo: 0 }; // repetição da navegação
let gpFocoEl = null; // elemento focado pelo cursor
let gpFocoOutline = ""; // outline anterior (para restaurar)
let gpPresente = false; // há controle respondendo
let gpPriming = true; // primeiro frame só sincroniza, não dispara
let gpUltimaBusca = 0; // varredura throttlada quando não há controle
let gpLogadoId = null; // id já logado (evita diagnóstico duplicado)
let gpMExecutando = false; // evita reentrar no avanço do wizard
let gpSbDialog = null; // #sbChronoDialog

function initGamepadControle() {
  // Navegador sem Gamepad API → nada muda no app.
  if (typeof navigator.getGamepads !== "function") {
    console.log("[gamepad] Gamepad API indisponível — recurso ignorado.");
    return;
  }

  gpSbDialog = document.getElementById("sbChronoDialog");

  // TEMPORÁRIO (debug) — pode apagar depois de calibrar os índices:
  window.gamepadAtivo = null; // id do controle conectado
  window.gamepadDebug = false; // true → loga TODA pressão de botão

  // Diagnóstico exigido: id + quantidade de botões ao reconhecer.
  window.addEventListener("gamepadconnected", (e) => {
    logarConexao(e.gamepad);
    gpPresente = true;
    gpPriming = true; // segurar um botão ao conectar não pode disparar
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    console.log(`[gamepad] Desconectado ✘ id="${e.gamepad.id}"`);
    window.gamepadAtivo = null;
    gpLogadoId = null;
    gpPresente = false;
    gpPressionado.clear();
    limparFoco();
  });

  // Toque real na tela → o jogador assumiu o controle: solta o cursor.
  window.addEventListener("pointerdown", limparFoco, { capture: true });

  iniciarLoopGamepad();
}

function logarConexao(gp) {
  window.gamepadAtivo = gp.id;
  gpLogadoId = gp.id;
  console.log(
    `[gamepad] Conectado ✔ id="${gp.id}" | botões=${gp.buttons.length}` +
      ` | eixos=${gp.axes.length} | mapping=${gp.mapping || "(custom)"}`
  );
}

function obterGamepad() {
  if (gpPresente) {
    const gp = primeiroGamepad();
    if (!gp) gpPresente = false; // desconectou sem evento
    return gp;
  }
  // Sem controle: varre ~2x/s (evita getGamepads() 60x/s no celular).
  if (performance.now() - gpUltimaBusca < 500) return null;
  gpUltimaBusca = performance.now();
  const gp = primeiroGamepad();
  if (gp) {
    gpPresente = true;
    gpPriming = true;
    if (gp.id !== gpLogadoId) logarConexao(gp); // cobre navegador sem evento
  }
  return gp;
}

function primeiroGamepad() {
  const pads = navigator.getGamepads();
  for (const gp of pads) if (gp) return gp;
  return null;
}

function iniciarLoopGamepad() {
  if (gpRafId !== null) return;
  gpRafId = requestAnimationFrame(loopGamepad);
}

function loopGamepad() {
  gpRafId = requestAnimationFrame(loopGamepad);

  const gp = obterGamepad();
  if (!gp) return;

  // 1) Estado (edge) + debug — SEMPRE para todos os botões, mesmo com o
  //    gate fechado, para não criar bordas fantasma quando o gate abrir.
  const novos = new Set();
  for (let i = 0; i < gp.buttons.length; i++) {
    const b = gp.buttons[i];
    const pressionado = b.pressed || b.value > 0.5; // gatilhos analógicos
    const antes = gpPressionado.get(i) === true;
    gpPressionado.set(i, pressionado);
    if (pressionado && !antes) {
      novos.add(i);
      if (window.gamepadDebug) {
        console.log(`[gamepad/debug] index=${i} pressionado (value=${b.value.toFixed(2)})`);
      }
    }
  }
  if (gpPriming) {
    gpPriming = false;
    novos.clear(); // primeiro frame com o controle só sincroniza
  }

  const agora = performance.now();
  const dialog = document.querySelector("dialog[open]");
  const modo = cronometroVisivel();

  // 2) Navegação do cursor de foco (D-Pad + analógicos, com repetição)
  moverFocoSePreciso(gp, agora);

  // 3) Ações (edge trigger + debounce de 200 ms por ação)
  if (novos.has(GP.l3) || novos.has(GP.r3)) acionar("enter", ativarFoco);
  if (novos.has(GP.a) && dialog) acionar("a", () => fecharDialog(dialog));
  if (novos.has(GP.x) && dialog) acionar("x", () => acaoPrimaria(dialog));
  if (novos.has(GP.y) && !dialog && state.appMode === "swimbase") {
    acionar("y", () => showScreen("sb-analise"));
  }
  if (novos.has(GP.b) && !dialog && state.appMode === "balizamento") {
    acionar("b", goToControl); // mesma função do botão "Ir para controle"
  }
  if (novos.has(GP.menu) && !dialog) acionar("menu", openSettingsDialog);
  if (novos.has(GP.home) && !dialog) acionar("home", () => showScreen("mode"));
  if (novos.has(GP.m) && !dialog && state.appMode === "swimbase") {
    acionar("m", irParaModoCronometro);
  }
  if (novos.has(GP.view)) {
    acionar("view", () => {
      if (history.length > 1) history.back(); // "voltar página vista"
    });
  }

  // 4) LB/RB navegam fora do cronômetro; LT/RT só dentro dele
  if (modo) {
    if (novos.has(GP.lt)) acionar("iniciar", () => acionarIniciar(modo));
    if (novos.has(GP.rt)) acionar("parar", () => acionarParar(modo));
  } else {
    if (novos.has(GP.lb)) acionar("voltar", () => navegarTela(-1));
    if (novos.has(GP.rb)) acionar("avancar", () => navegarTela(1));
  }
}

function acionar(chave, fn) {
  const agora = performance.now();
  if (agora - (gpDebounce[chave] || 0) < GP_DEBOUNCE_MS) return; // bounce
  gpDebounce[chave] = agora;
  fn();
}

function botaoPressionado(gp, idx) {
  if (idx == null) return false;
  const b = gp.buttons[idx];
  return !!b && (b.pressed || b.value > 0.5);
}

/* ---------------- Cursor de foco (D-Pad / LS / RS) ---------------- */

function direcaoNavegacao(gp) {
  if (botaoPressionado(gp, GP.up) || botaoPressionado(gp, GP.left)) return -1;
  if (botaoPressionado(gp, GP.down) || botaoPressionado(gp, GP.right)) return 1;
  const eixos = gp.axes || [];
  for (const base of [0, 2]) {
    const y = eixos[base + 1];
    if (typeof y === "number" && Math.abs(y) >= GP_STICK_DEADZONE) return y < 0 ? -1 : 1;
    const x = eixos[base];
    if (typeof x === "number" && Math.abs(x) >= GP_STICK_DEADZONE) return x < 0 ? -1 : 1;
  }
  return 0;
}

function moverFocoSePreciso(gp, agora) {
  const dir = direcaoNavegacao(gp);
  if (dir === 0) {
    gpNav.dir = 0;
    return;
  }
  if (dir !== gpNav.dir) {
    moverFoco(dir); // borda: solto → pressionado
    gpNav.dir = dir;
    gpNav.proximo = agora + GP_NAV_DELAY_MS;
    return;
  }
  if (GP_NAV_REPEAT_MS > 0 && agora >= gpNav.proximo) {
    moverFoco(dir); // mantido: repetição
    gpNav.proximo = agora + GP_NAV_REPEAT_MS;
  }
}

function elementosFocaveis() {
  const raiz = document.querySelector("dialog[open]") || document;
  return Array.from(
    raiz.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]),' +
        ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((e) => e.getClientRects().length > 0); // só elementos visíveis
}

function moverFoco(passo) {
  const lista = elementosFocaveis();
  if (!lista.length) return;
  let i = gpFocoEl ? lista.indexOf(gpFocoEl) : -1;
  if (i < 0) i = passo > 0 ? -1 : 0; // sem foco válido: começa na borda
  const alvo = lista[(i + passo + lista.length) % lista.length]; // cicla
  pintarFoco(alvo);
  alvo.focus();
  alvo.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function pintarFoco(el) {
  if (gpFocoEl && gpFocoEl !== el) gpFocoEl.style.outline = gpFocoOutline;
  gpFocoOutline = el.style.outline;
  gpFocoEl = el;
  // outline inline: indicador visível sem tocar no styles.css
  el.style.outline = "3px solid #3b82f6";
  el.style.outlineOffset = "2px";
}

function limparFoco() {
  if (gpFocoEl) {
    gpFocoEl.style.outline = gpFocoOutline;
    gpFocoEl.style.outlineOffset = "";
  }
  gpFocoEl = null;
}

function ativarFoco() {
  const alvo = gpFocoEl;
  if (!alvo) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(alvo.tagName)) {
    const form = alvo.closest("form");
    if (form) form.requestSubmit(); // Enter num formulário = submeter
    else if (alvo.type === "checkbox" || alvo.type === "radio") cliqueSintetico(alvo);
    return;
  }
  cliqueSintetico(alvo); // Enter = ativar o elemento focado
}

/* ---------------- Botões A (fechar) e X (primário) ---------------- */

function fecharDialog(dialog) {
  const cancelar = dialog.querySelector(".btn-cancel");
  if (cancelar) cliqueSintetico(cancelar); // usa o handler real de fechar
  else dialog.close();
}

function acaoPrimaria(dialog) {
  const form = dialog.querySelector("form");
  if (form) {
    form.requestSubmit(); // validação + listener submit nativos (Salvar)
    return;
  }
  const salvar = dialog.querySelector(".btn-save");
  if (salvar) cliqueSintetico(salvar); // Registrar (cronômetro) / Salvar treino
}

/* ---------------- Navegação de tela (LB/RB) ---------------- */

function navegarTela(passo) {
  if (document.querySelector("dialog[open]")) return; // modal aberto → não navega
  const chave = state.appMode === "swimbase" ? "swimbase" : "balizamento";
  const lista = GP_TELAS[chave];
  const atual = lista.indexOf(state.screen);
  if (atual < 0) return; // tela fora do fluxo (ex.: login) → nada
  const alvo = lista[atual + passo];
  if (!alvo) return; // sem ciclagem: para na primeira/última tela
  if (alvo === "import" && !state.activeProfile) {
    showScreen("login"); // mesma guarda do botão do menu inferior
    return;
  }
  showScreen(alvo); // mesma função chamada pelo menu inferior
}

/* ---------------- M Button: direto para o passo "Modo" ---------------- */

function irParaModoCronometro() {
  if (gpMExecutando) return;
  gpMExecutando = true;
  showScreen("sb-treino");
  avancarWizardAteModo().finally(() => {
    gpMExecutando = false;
  });
}

async function avancarWizardAteModo() {
  for (let i = 0; i < 20 && !document.querySelector("dialog[open]"); i++) {
    await dormir(50); // espera o render assíncrono do wizard
    const passo = passoDoWizard();
    if (!passo) continue;
    if (passo >= 3) return; // já está no passo "Modo" (1/2/3)
    // Só avança se a etapa anterior estiver preenchida — evita os alert()
    // de validação de swimbase.js ("Selecione uma turma/atleta").
    if (passo === 1 && !document.getElementById("sbTreinoTurma")?.value) return;
    if (passo === 2 && !document.querySelector("#sbAtletaGrid input:checked")) return;
    const proximo = document.getElementById("sbStepNextBtn");
    if (!proximo) return;
    const antes = passo;
    cliqueSintetico(proximo);
    for (let j = 0; j < 20; j++) {
      await dormir(50);
      if (passoDoWizard() !== antes) break;
    }
    if (passoDoWizard() === antes) return; // validação barrou → fica na tela
  }
}

function passoDoWizard() {
  const ativo = document.querySelector(".sb-step.active");
  if (!ativo || !ativo.parentNode) return null;
  return Array.prototype.indexOf.call(ativo.parentNode.children, ativo) + 1;
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------- Clínica geral: cliques/teclas seguros ---------------- */

// Clique sintético com coordenadas DENTRO do elemento: os guards de backdrop
// (app.js:998 e swimbase.js:203) fecham o dialog se clientX/Y = 0,0.
// detail:0 faz o guard do #sbChronoDialog retornar cedo (não fecha).
function cliqueSintetico(alvo) {
  if (!alvo) return;
  const r = alvo.getBoundingClientRect();
  alvo.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      detail: 0,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
    })
  );
}

/* ---------------- Cronômetros (LT/RT) ---------------- */

function cronometroVisivel() {
  if (el.chronoDialog.open) return "balizamento";
  if (gpSbDialog && gpSbDialog.open) return "swimbase";
  return null;
}

function acionarIniciar(modo) {
  if (modo === "balizamento") {
    handleChronoStartLap(); // mesmo listener de #startLapBtn ("Iniciar/Voltas")
    return;
  }
  // Mesmo efeito do clique em #sbMasterStartBtn ("Iniciar/Split").
  cliqueSintetico(document.getElementById("sbMasterStartBtn"));
}

function acionarParar(modo) {
  if (modo === "balizamento") {
    handleChronoStopReset(); // mesmo listener de #stopResetBtn ("Parar/Reiniciar")
    return;
  }
  // #sbMasterStopBtn usa pointerdown/pointerup (não click). Disparamos SÓ o
  // pointerup: roda a lógica rápida (para se rodando / zera se parado) e NÃO
  // inicia o arraste do HUD (que chamaria setPointerCapture e quebraria).
  const btn = document.getElementById("sbMasterStopBtn");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.dispatchEvent(
    new PointerEvent("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerId: 9001, // id sintético: não colide com drags ativos
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
    })
  );
}

initGamepadControle(); // ← última linha (após init();)
