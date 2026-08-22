// swimbase.js — SwimBase (Tier 2): treino, atletas, turmas, PRs e análise.
// MVP = Fase 1 do PDR-SwimBase.md. Cresce por slices (B1 → B5).
import { STORES, getAll, get, put, remove } from "./db.js";
import {
  attachClockMask,
  escapeHtml,
  maskTimeHTML,
  msToDisplay,
  normalizeText,
  parseTimeToMs,
  toTitleCase,
  uid,
} from "./utils.js";
import { drawProgressChart } from "./charts.js";
import { exportSwimBaseRegistros, exportSwimBasePRs } from "./exporter.js";

let api = null;

const CATEGORIAS = [
  [0, "Pré-Mirim"],
  [9, "Mirim I"],
  [10, "Mirim II"],
  [11, "Petiz I"],
  [12, "Petiz II"],
  [13, "Infantil I"],
  [14, "Infantil II"],
  [15, "Juvenil I"],
  [16, "Juvenil II"],
  [17, "Júnior I"],
  [18, "Júnior II/Sênior"],
  [20, "A20+"],
  [25, "B25+"],
  [30, "C30+"],
  [35, "D35+"],
  [40, "E40+"],
  [45, "F45+"],
  [50, "G50+"],
  [55, "H55+"],
  [60, "I60+"],
  [65, "J65+"],
  [70, "K70+"],
  [75, "L75+"],
  [80, "M80+"],
];

function categoriaPorIdade(idade) {
  let nome = CATEGORIAS[0][1];
  for (const [min, categoria] of CATEGORIAS) {
    if (idade >= min) nome = categoria;
  }
  return nome;
}

function calcularCategoria(dataNascimento) {
  if (!dataNascimento) return "";
  const nasc = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nasc.getTime())) return "";
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aniversarioEsteAno = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
  if (hoje < aniversarioEsteAno) idade -= 1;
  return categoriaPorIdade(idade);
}

const sw = {
  turmas: [],
  atletas: [],
  registros: [],
  prs: [],
  loaded: false,
  selectedTurmaId: "",
};

let editingAtletaId = null;
let editingTurmaId = null;

const an = {
  atletaId: "",
  estilo: "",
  distancia: "",
  periodo: "all",
};

export function initSwimBase(appApi) {
  api = appApi;
  document
    .getElementById("sbBackToModeBtn")
    ?.addEventListener("click", () => api.showScreen("mode"));
  document
    .getElementById("sbAddAtletaBtn")
    ?.addEventListener("click", () => openAtletaDialog(null));
  document
    .getElementById("sbAddTurmaBtn")
    ?.addEventListener("click", () => openTurmaDialog());
  document
    .getElementById("sbCloseAtletaDialog")
    ?.addEventListener("click", () => document.getElementById("sbAtletaDialog").close());
  document
    .getElementById("sbCloseTurmaDialog")
    ?.addEventListener("click", () => document.getElementById("sbTurmaDialog").close());
  document
    .getElementById("sbTurmaForm")
    ?.addEventListener("submit", saveTurma);
  document
    .getElementById("sbTurmaDias")
    ?.addEventListener("click", (event) => {
      const chip = event.target.closest(".sb-day-chip");
      if (chip) chip.classList.toggle("active");
    });
  const horarioInput = document.getElementById("sbTurmaHorario");
  if (horarioInput) attachClockMask(horarioInput);
  document
    .getElementById("sbAtletaForm")
    ?.addEventListener("submit", saveAtleta);
  document
    .getElementById("sbDeleteAtletaBtn")
    ?.addEventListener("click", () => {
      if (editingAtletaId) deleteAtleta(editingAtletaId);
    });
  document
    .getElementById("sbTurmaSelect")
    ?.addEventListener("change", (event) => {
      sw.selectedTurmaId = event.target.value;
      renderAtletasList();
    });
  document
    .getElementById("sbAtletaSearch")
    ?.addEventListener("input", () => renderAtletasList());
  document
    .getElementById("sbAtletaNasc")
    ?.addEventListener("change", updateCategoriaHint);
  bindDialogBackdrop("sbAtletaDialog");
  bindDialogBackdrop("sbTurmaDialog");
  document
    .getElementById("sbMasterStartBtn")
    ?.addEventListener("click", startMaster);
  document
    .getElementById("sbMasterStopBtn")
    ?.addEventListener("click", stopMaster);
  document
    .getElementById("sbChronoFinishBtn")
    ?.addEventListener("click", finalizeTreino);
  document
    .getElementById("sbChronoCloseBtn")
    ?.addEventListener("click", closeTreino);
  const chronoDialog = document.getElementById("sbChronoDialog");
  if (chronoDialog) {
    chronoDialog.addEventListener("click", (event) => {
      const rect = chronoDialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) closeTreino();
    });
  }
}

function bindDialogBackdrop(id) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
}

export function renderSwimBaseScreen(screen) {
  if (screen === "sb-home") return renderSbHome();
  if (screen === "sb-atletas") return renderSbAtletas();
  if (screen === "sb-treino") return renderSbTreino();
  if (screen === "sb-analise") return renderSbAnalise();
}

async function ensureLoaded() {
  if (sw.loaded) return;
  const [turmas, atletas, registros, prs] = await Promise.all([
    getAll(STORES.GROUPS),
    getAll(STORES.ATHLETES),
    getAll(STORES.RECORDS),
    getAll(STORES.PRS),
  ]);
  sw.turmas = turmas || [];
  sw.atletas = atletas || [];
  sw.registros = registros || [];
  sw.prs = prs || [];
  sw.loaded = true;
}

/* ---- Home ---- */

function renderSbHome() {
  const container = document.getElementById("sbHomeContent");
  if (!container) return;
  container.innerHTML = `
    <p class="muted">O SwimBase organiza seus treinos e o acompanhamento dos atletas
    (Modos: Saída a Cada, Tempo/Parcial e Largada em Ondas).</p>
    <div class="actions-row">
      <button id="sbHomeAtletasBtn" class="ghost" type="button">Gerenciar atletas</button>
      <button id="sbHomeTreinoBtn" class="primary" type="button">Iniciar treino</button>
    </div>
  `;
  document
    .getElementById("sbHomeAtletasBtn")
    ?.addEventListener("click", () => api.showScreen("sb-atletas"));
  document
    .getElementById("sbHomeTreinoBtn")
    ?.addEventListener("click", () => api.showScreen("sb-treino"));
}

/* ---- Atletas e Turmas ---- */

function nomeDaTurma(turmaId) {
  const turma = sw.turmas.find((t) => t.id === turmaId);
  return turma ? turma.nome : "";
}

async function renderSbAtletas() {
  await ensureLoaded();
  renderTurmaSelects();
  renderAtletasList();
}

function renderTurmaSelects() {
  const sel = document.getElementById("sbTurmaSelect");
  const selAtleta = document.getElementById("sbAtletaTurma");
  if (!sel) return;
  const options = sw.turmas
    .map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.nome)}</option>`)
    .join("");
  sel.innerHTML = sw.turmas.length
    ? `<option value="">Todas as turmas</option>${options}`
    : '<option value="">Nenhuma turma</option>';
  if (sw.selectedTurmaId) sel.value = sw.selectedTurmaId;
  if (selAtleta) {
    selAtleta.innerHTML = sw.turmas.length
      ? options
      : '<option value="">Crie uma turma primeiro</option>';
  }
}

function renderAtletasList() {
  const list = document.getElementById("sbAtletasList");
  if (!list) return;
  const search = normalizeText(document.getElementById("sbAtletaSearch").value);
  const turmaId = document.getElementById("sbTurmaSelect").value;
  let atletas = sw.atletas.filter((a) => !turmaId || a.turmaId === turmaId);
  if (search) {
    atletas = atletas.filter(
      (a) =>
        normalizeText(a.nome).includes(search) ||
        normalizeText(categoriaDoAtleta(a)).includes(search)
    );
  }
  atletas.sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome)));

  if (!atletas.length) {
    list.innerHTML = `<p class="muted">${
      sw.turmas.length
        ? "Nenhum atleta cadastrado nesta turma."
        : "Cadastre uma turma e depois os atletas."
    }</p>`;
    return;
  }

  list.innerHTML = atletas
    .map(
      (a) => `
    <div class="sb-athlete-row" data-id="${escapeHtml(a.id)}">
      <button type="button" class="sb-athlete-main" data-id="${escapeHtml(a.id)}">
        <span class="sb-athlete-name">${escapeHtml(a.nome)}</span>
        <span class="sb-athlete-meta">${escapeHtml(categoriaDoAtleta(a))}${
          a.sexo ? ` · ${escapeHtml(a.sexo)}` : ""
        }${a.turmaId ? ` · ${escapeHtml(nomeDaTurma(a.turmaId))}` : ""}</span>
      </button>
      <button type="button" class="sb-athlete-delete" data-id="${escapeHtml(
        a.id
      )}" aria-label="Excluir ${escapeHtml(a.nome)}">×</button>
    </div>`
    )
    .join("");

  list.querySelectorAll(".sb-athlete-main").forEach((btn) =>
    btn.addEventListener("click", () =>
      openAtletaDialog(sw.atletas.find((x) => x.id === btn.dataset.id))
    )
  );
  list.querySelectorAll(".sb-athlete-delete").forEach((btn) =>
    btn.addEventListener("click", () => {
      const atleta = sw.atletas.find((x) => x.id === btn.dataset.id);
      if (atleta && window.confirm(`Excluir o atleta ${atleta.nome}?`)) {
        deleteAtleta(atleta.id);
      }
    })
  );
}

function categoriaDoAtleta(atleta) {
  return atleta?.categoria || calcularCategoria(atleta?.dataNascimento) || "—";
}

function updateCategoriaHint() {
  const elCategoria = document.getElementById("sbAtletaCategoria");
  if (!elCategoria) return;
  const categoria = calcularCategoria(document.getElementById("sbAtletaNasc").value);
  elCategoria.textContent = categoria || "—";
}

function openAtletaDialog(atleta) {
  editingAtletaId = atleta?.id || null;
  document.getElementById("sbAtletaDialogTitle").textContent = atleta
    ? "Editar atleta"
    : "Novo atleta";
  document.getElementById("sbAtletaNome").value = atleta?.nome || "";
  document.getElementById("sbAtletaNasc").value = atleta?.dataNascimento || "";
  document.getElementById("sbAtletaSexo").value = atleta?.sexo || "";
  document.getElementById("sbAtletaObs").value = atleta?.observacoes || "";
  const turmaSel = document.getElementById("sbAtletaTurma");
  if (turmaSel) {
    turmaSel.value = atleta?.turmaId || sw.selectedTurmaId || turmaSel.value || "";
  }
  document.getElementById("sbDeleteAtletaBtn").hidden = !atleta;
  updateCategoriaHint();
  document.getElementById("sbAtletaDialog").showModal();
}

async function saveAtleta(event) {
  event.preventDefault();
  const nome = document.getElementById("sbAtletaNome").value.trim();
  if (!nome) {
    alert("Informe o nome do atleta.");
    return;
  }
  const turmaId = document.getElementById("sbAtletaTurma").value;
  if (!turmaId) {
    alert("Cadastre e selecione uma turma antes de salvar o atleta.");
    return;
  }
  const existing = editingAtletaId
    ? sw.atletas.find((a) => a.id === editingAtletaId)
    : null;
  const now = new Date().toISOString();
  const dataNascimento = document.getElementById("sbAtletaNasc").value;
  const atleta = {
    id: existing?.id || uid("atleta"),
    nome,
    nomeNormalized: normalizeText(nome),
    dataNascimento,
    categoria: calcularCategoria(dataNascimento),
    sexo: document.getElementById("sbAtletaSexo").value,
    turmaId,
    observacoes: document.getElementById("sbAtletaObs").value.trim(),
    status: existing?.status || "ativo",
    professorId: api.state.activeProfile?.id || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await put(STORES.ATHLETES, atleta);
  sw.atletas = await getAll(STORES.ATHLETES);
  document.getElementById("sbAtletaDialog").close();
  renderTurmaSelects();
  renderAtletasList();
  api.logAction(`Atleta salvo: ${nome}.`);
}

async function deleteAtleta(id) {
  await remove(STORES.ATHLETES, id);
  sw.atletas = sw.atletas.filter((a) => a.id !== id);
  document.getElementById("sbAtletaDialog").close();
  renderAtletasList();
  api.logAction("Atleta excluído do SwimBase.");
}

function openTurmaDialog(turma = null) {
  editingTurmaId = turma?.id || null;
  document.getElementById("sbTurmaNome").value = turma?.nome || "";
  document.querySelectorAll("#sbTurmaDias .sb-day-chip").forEach((chip) => {
    chip.classList.toggle(
      "active",
      Array.isArray(turma?.dias) && turma.dias.includes(chip.dataset.day)
    );
  });
  const structured =
    Array.isArray(turma?.dias) &&
    (typeof turma.horario === "string" && /^\d{2}:\d{2}$/.test(turma.horario)) &&
    typeof turma.duracao === "number";
  document.getElementById("sbTurmaHorario").value = structured ? turma.horario : "";
  document.getElementById("sbTurmaDuracao").value = structured ? turma.duracao : "";
  document.getElementById("sbTurmaDialog").showModal();
}

async function saveTurma(event) {
  event.preventDefault();
  const nome = document.getElementById("sbTurmaNome").value.trim();
  if (!nome) {
    alert("Informe o nome da turma.");
    return;
  }
  const dias = [...document.querySelectorAll("#sbTurmaDias .sb-day-chip.active")].map(
    (chip) => chip.dataset.day
  );
  const horario = document.getElementById("sbTurmaHorario").value.trim();
  if (horario && !/^\d{2}:\d{2}$/.test(horario)) {
    alert("Horário inválido. Use o formato HH:MM (ex.: 16:00).");
    return;
  }
  if (horario) {
    const [hh, mm] = horario.split(":").map(Number);
    if (hh > 23 || mm > 59) {
      alert("Horário inválido. Hora entre 00–23 e minutos entre 00–59.");
      return;
    }
  }
  const duracao = document.getElementById("sbTurmaDuracao").value;
  if (duracao !== "" && !(Number.isInteger(Number(duracao)) && Number(duracao) >= 1)) {
    alert("Duração inválida. Informe os minutos da sessão (mínimo 1).");
    return;
  }
  const existing = editingTurmaId
    ? sw.turmas.find((t) => t.id === editingTurmaId)
    : null;
  const now = new Date().toISOString();
  const turma = {
    id: existing?.id || uid("turma"),
    nome,
    dias,
    horario: horario || "",
    duracao: duracao === "" ? null : Number(duracao),
    professorId: api.state.activeProfile?.id || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await put(STORES.GROUPS, turma);
  sw.turmas = await getAll(STORES.GROUPS);
  if (!editingTurmaId) sw.selectedTurmaId = turma.id;
  document.getElementById("sbTurmaDialog").close();
  renderTurmaSelects();
  renderAtletasList();
  api.logAction(`Turma salva: ${nome}.`);
}

/* ---- Placeholders (B3/B5 preenchem) ---- */

/* ---- Modo Treino (Saída a Cada / Tempo-Parcial / Largada em Ondas) ---- */

const ESTILOS = ["Crawl", "Costas", "Peito", "Borboleta", "Medley"];

const MODOS = {
  1: "Saída a Cada",
  2: "Tempo/Parcial",
  3: "Largada em Ondas",
};

const tr = {
  step: 1,
  turmaId: "",
  atletas: [],
  config: {
    modo: 2,
    estilo: "Crawl",
    distancia: 50,
    repeticoes: 4,
    descanso: 30,
    series: 1,
    intervaloSeries: 60,
    tempoSaida: 60,
    ondas: 3,
    descansoOndas: 20,
  },
  ondaAtiva: 1,
  waveAssigned: {},
  waves: [],
  group: null,
  modo3Serie: 1,
  raias: new Map(),
  masterTimerId: null,
  masterRunning: false,
  masterStartedAt: 0,
  masterElapsedMs: 0,
  sessionStartedAt: null,
};

async function renderSbTreino() {
  await ensureLoaded();
  const container = document.getElementById("sbTreinoContent");
  if (!container) return;
  container.innerHTML = buildTreinoSteps();
  bindTreinoStep();
}

function buildTreinoSteps() {
  const steps = ["Turma", "Atletas", "Modo", "Config"];
  return `
    <div class="sb-steps">
      ${steps
        .map(
          (s, i) =>
            `<span class="sb-step ${tr.step === i + 1 ? "active" : ""}">${i + 1} · ${s}</span>`
        )
        .join("")}
    </div>
    <div id="sbStepBody" class="sb-step-body">
      ${
        tr.step === 1
          ? stepTurma()
          : tr.step === 2
            ? stepAtletas()
            : tr.step === 3
              ? stepModo()
              : stepConfig()
      }
    </div>
    <div class="actions-row sb-step-nav">
      ${tr.step > 1 ? '<button id="sbStepBackBtn" class="ghost" type="button">Voltar</button>' : ""}
      ${
        tr.step < 4
          ? '<button id="sbStepNextBtn" class="primary" type="button">Próximo</button>'
          : '<button id="sbStartTreinoBtn" class="primary" type="button">Iniciar treino</button>'
      }
    </div>
  `;
}

function stepModo() {
  const modos = [
    [1, "Saída a Cada", "Relógio regressivo com avanço automático a cada saída."],
    [2, "Tempo/Parcial", "Cronômetro individual por raia; toque registra o parcial."],
    [3, "Largada em Ondas", "Atletas divididos em ondas com saídas escalonadas."],
  ];
  return `
    <p class="muted">Passo 3 — Como o cronômetro vai funcionar?</p>
    <div class="sb-modo-grid">
      ${modos
        .map(
          ([id, nome, desc]) => `
        <button type="button" class="sb-modo-card ${tr.config.modo === id ? "active" : ""}" data-modo="${id}">
          <strong>Modo ${id} · ${nome}</strong>
          <span>${desc}</span>
        </button>`
        )
        .join("")}
    </div>
  `;
}

function stepTurma() {
  if (!sw.turmas.length) {
    return '<p class="muted">Cadastre uma turma primeiro (aba Atletas).</p>';
  }
  const options = sw.turmas
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}" ${
          t.id === tr.turmaId ? "selected" : ""
        }>${escapeHtml(t.nome)}</option>`
    )
    .join("");
  return `
    <label>
      Passo 1 — Selecionar turma
      <select id="sbTreinoTurma" aria-label="Turma do treino">${options}</select>
    </label>
    <p class="muted">Professor já vem do perfil ativo.</p>
  `;
}

function stepAtletas() {
  const atletas = sw.atletas.filter((a) => a.turmaId === tr.turmaId);
  if (!atletas.length) {
    return '<p class="muted">Nenhum atleta nesta turma. Cadastre atletas na aba Atletas.</p>';
  }
  return `
    <label>
      Passo 2 — Selecionar atletas
      <input id="sbTreinoBusca" type="search" placeholder="Buscar por nome ou categoria" />
    </label>
    <div id="sbAtletaGrid" class="sb-atleta-grid">
      ${atletas.map((a) => atletaCheckbox(a)).join("")}
    </div>
    <button id="sbSelectAllBtn" class="ghost" type="button">Selecionar todos</button>
  `;
}

function atletaCheckbox(atleta) {
  const checked = tr.atletas.includes(atleta.id) ? "checked" : "";
  return `
    <label class="sb-atleta-check">
      <input type="checkbox" value="${escapeHtml(atleta.id)}" ${checked} />
      <span>
        <strong>${escapeHtml(atleta.nome)}</strong>
        <small>${escapeHtml(categoriaDoAtleta(atleta))}${
          atleta.sexo ? ` · ${escapeHtml(atleta.sexo)}` : ""
        }</small>
      </span>
    </label>
  `;
}

function stepConfig() {
  const c = tr.config;
  const estiloOptions = ESTILOS.map(
    (e) =>
      `<option value="${escapeHtml(e)}" ${e === c.estilo ? "selected" : ""}>${escapeHtml(e)}</option>`
  ).join("");
  const distOptions = [25, 50, 75, 100, 150, 200, 400]
    .map(
      (d) =>
        `<option value="${d}" ${d === c.distancia ? "selected" : ""}>${d} m</option>`
    )
    .join("");
  const base = `
    <div class="sb-grid-2">
      <label>Passo 4 — Estilo/Prova
        <select id="sbTreinoEstilo">${estiloOptions}</select>
      </label>
      <label>Distância (m)
        <select id="sbTreinoDistancia">${distOptions}</select>
      </label>
    </div>`;

  if (c.modo === 1) {
    return (
      base +
      `
    <div class="sb-grid-2">
      <label>Saída a cada (s)
        <input id="sbTreinoTempoSaida" type="number" min="5" max="3600" value="${c.tempoSaida}" />
      </label>
      <label>Repetições
        <input id="sbTreinoRepeticoes" type="number" min="1" max="30" value="${c.repeticoes}" />
      </label>
    </div>
    <div class="sb-grid-2">
      <label>Séries
        <input id="sbTreinoSeries" type="number" min="1" max="10" value="${c.series}" />
      </label>
      <label>Intervalo entre séries (s)
        <input id="sbTreinoIntervalo" type="number" min="0" max="1800" value="${c.intervaloSeries}" />
      </label>
    </div>`
    );
  }

  if (c.modo === 2) {
    return (
      base +
      `
    <div class="sb-grid-2">
      <label>Repetições
        <input id="sbTreinoRepeticoes" type="number" min="1" max="20" value="${c.repeticoes}" />
      </label>
      <label>Descanso (s)
        <input id="sbTreinoDescanso" type="number" min="0" max="600" value="${c.descanso}" />
      </label>
    </div>
    <div class="sb-grid-2">
      <label>Séries
        <input id="sbTreinoSeries" type="number" min="1" max="10" value="${c.series}" />
      </label>
      <label>Intervalo entre séries (s)
        <input id="sbTreinoIntervalo" type="number" min="0" max="1800" value="${c.intervaloSeries}" />
      </label>
    </div>`
    );
  }

  return (
    base +
    `
    <div class="sb-grid-2">
      <label>Nº de ondas (2–6)
        <input id="sbTreinoOndas" type="number" min="2" max="6" value="${c.ondas}" />
      </label>
      <label>Descanso entre ondas (s)
        <input id="sbTreinoDescansoOndas" type="number" min="0" max="600" value="${c.descansoOndas}" />
      </label>
    </div>
    <label>Séries
      <input id="sbTreinoSeries" type="number" min="1" max="10" value="${c.series}" />
    </label>
    <p class="muted">Dica: para uma única onda, use o Modo 2 (Tempo/Parcial).</p>
    <div id="sbOndaDist"></div>`
  );
}

function renderOndaDist() {
  const wrap = document.getElementById("sbOndaDist");
  if (!wrap) return;
  const n = tr.config.ondas;
  const atletas = sw.atletas.filter((a) => tr.atletas.includes(a.id));
  const counts = {};
  atletas.forEach((a) => {
    const o = tr.waveAssigned[a.id] || 0;
    counts[o] = (counts[o] || 0) + 1;
  });
  const chips = Array.from({ length: n }, (_, i) => i + 1)
    .map(
      (i) => `
      <button type="button" class="sb-wave-chip ${tr.ondaAtiva === i ? "active" : ""}" data-onda="${i}">
        Onda ${i} <small>${counts[i] || 0}</small>
      </button>`
    )
    .join("");
  const rows = atletas
    .map((a) => {
      const o = tr.waveAssigned[a.id] || 0;
      return `
      <button type="button" class="sb-onda-athlete ${o ? "" : "unassigned"}" data-id="${escapeHtml(a.id)}">
        <span class="sb-onda-name">${escapeHtml(a.nome)}</span>
        <span class="sb-onda-badge">${o ? `Onda ${o}` : "sem onda"}</span>
      </button>`;
    })
    .join("");
  wrap.innerHTML = `
    <div class="sb-dist-head">
      <strong>Distribuir atletas</strong>
      <span class="muted">Onda ativa → toque nos atletas</span>
    </div>
    <div id="sbOndaChips" class="sb-wave-chips">${chips}</div>
    <div id="sbOndaList" class="sb-onda-list">${
      rows || '<p class="muted">Nenhum atleta selecionado.</p>'
    }</div>
  `;
  wrap.querySelector("#sbOndaChips").addEventListener("click", (event) => {
    const chip = event.target.closest(".sb-wave-chip");
    if (!chip) return;
    tr.ondaAtiva = Number(chip.dataset.onda);
    renderOndaDist();
  });
  wrap.querySelector("#sbOndaList").addEventListener("click", (event) => {
    const row = event.target.closest(".sb-onda-athlete");
    if (!row) return;
    const id = row.dataset.id;
    const current = tr.waveAssigned[id] || 0;
    tr.waveAssigned[id] = current === tr.ondaAtiva ? 0 : tr.ondaAtiva;
    renderOndaDist();
  });
}

function bindTreinoStep() {
  document.querySelectorAll(".sb-modo-card").forEach((btn) =>
    btn.addEventListener("click", () => {
      tr.config.modo = Number(btn.dataset.modo);
      document.querySelectorAll(".sb-modo-card").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
    })
  );

  document.getElementById("sbStepNextBtn")?.addEventListener("click", () => {
    if (tr.step === 1) {
      const sel = document.getElementById("sbTreinoTurma");
      if (!sel || !sel.value) {
        alert("Selecione uma turma.");
        return;
      }
      tr.turmaId = sel.value;
      tr.atletas = [];
    }
    if (tr.step === 2) {
      tr.atletas = [...document.querySelectorAll("#sbAtletaGrid input:checked")].map(
        (i) => i.value
      );
      if (!tr.atletas.length) {
        alert("Selecione ao menos um atleta.");
        return;
      }
    }
    if (tr.step === 3 && ![1, 2, 3].includes(tr.config.modo)) {
      alert("Selecione o modo do cronômetro.");
      return;
    }
    tr.step += 1;
    renderSbTreino();
  });

  document.getElementById("sbStepBackBtn")?.addEventListener("click", () => {
    tr.step -= 1;
    renderSbTreino();
  });

  document.getElementById("sbTreinoTurma")?.addEventListener("change", (e) => {
    tr.turmaId = e.target.value;
  });

  document.getElementById("sbTreinoBusca")?.addEventListener("input", (e) => {
    const q = normalizeText(e.target.value);
    document.querySelectorAll("#sbAtletaGrid .sb-atleta-check").forEach((label) => {
      label.style.display = !q || normalizeText(label.textContent).includes(q) ? "" : "none";
    });
  });

  document.getElementById("sbSelectAllBtn")?.addEventListener("click", () => {
    document
      .querySelectorAll("#sbAtletaGrid input[type=checkbox]")
      .forEach((i) => {
        i.checked = true;
      });
  });

  document.getElementById("sbStartTreinoBtn")?.addEventListener("click", readTreinoConfig);
  if (tr.step === 4 && tr.config.modo === 3) renderOndaDist();
}

function readTreinoConfig() {
  const num = (id, fallback) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const v = Number(el.value);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  tr.config.estilo = document.getElementById("sbTreinoEstilo").value;
  tr.config.distancia = Number(document.getElementById("sbTreinoDistancia").value) || 50;
  tr.config.repeticoes = num("sbTreinoRepeticoes", 4);
  tr.config.series = num("sbTreinoSeries", 1);

  if (tr.config.modo === 1) {
    tr.config.tempoSaida = num("sbTreinoTempoSaida", 60);
    tr.config.intervaloSeries =
      Number(document.getElementById("sbTreinoIntervalo").value) || 0;
  } else if (tr.config.modo === 2) {
    tr.config.descanso = Number(document.getElementById("sbTreinoDescanso").value) || 0;
    tr.config.intervaloSeries =
      Number(document.getElementById("sbTreinoIntervalo").value) || 0;
  } else {
    tr.config.ondas = num("sbTreinoOndas", 3);
    tr.config.descansoOndas =
      Number(document.getElementById("sbTreinoDescansoOndas").value) || 0;
    if (tr.config.ondas < 2 || tr.config.ondas > 6) {
      alert("Número de ondas deve estar entre 2 e 6. Para uma onda, use o Modo 2.");
      return;
    }
    const unassigned = tr.atletas.filter((id) => !tr.waveAssigned[id]);
    if (unassigned.length) {
      alert("Distribua todos os atletas nas ondas antes de iniciar.");
      return;
    }
  }
  startTreino();
}

function turmaNome() {
  const turma = sw.turmas.find((t) => t.id === tr.turmaId);
  return turma ? turma.nome : "";
}

function startTreino() {
  buildRaias();
  const modoTag = document.getElementById("sbTreinoModeTag");
  if (modoTag) {
    modoTag.hidden = false;
    modoTag.textContent = `Modo ${tr.config.modo} · ${MODOS[tr.config.modo] || ""}`;
  }
  const chronoNext = document.getElementById("sbChronoNext");
  if (chronoNext) {
    chronoNext.textContent =
      tr.config.modo === 1
        ? "Toque na raia para registrar · avanço automático"
        : tr.config.modo === 3
          ? "Toque na linha do atleta para registrar"
          : "Toque na raia para registrar";
  }
  if (tr.config.modo === 1) initGroupTimer();
  if (tr.config.modo === 3) initWaves();
  renderChronoList();
  document.getElementById("sbChronoTitle").textContent =
    `${tr.config.estilo} ${tr.config.distancia}m · ${turmaNome()}`;
  document.getElementById("sbChronoDialog").showModal();
  requestWakeLock();
  const startBtn = document.getElementById("sbMasterStartBtn");
  const stopBtn = document.getElementById("sbMasterStopBtn");
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
}

function initGroupTimer() {
  tr.group = {
    rep: 1,
    serie: 1,
    phase: "rep",
    remainingMs: tr.config.tempoSaida * 1000,
    countUpMs: 0,
    repStartMs: 0,
  };
}

function initWaves() {
  tr.modo3Serie = 1;
  tr.waves = [];
  const raias = [...tr.raias.values()];
  for (let i = 1; i <= tr.config.ondas; i++) {
    tr.waves.push({
      index: i,
      atletas: raias.filter((r) => r.onda === i).map((r) => r.atletaId),
      startedAt: 0,
      started: false,
      done: false,
      elapsedMs: 0,
      countdownMs: 0,
    });
  }
}

function buildRaias() {
  tr.raias.clear();
  const atletas = sw.atletas.filter((a) => tr.atletas.includes(a.id));
  atletas.forEach((atleta, idx) => {
    tr.raias.set(atleta.id, {
      atletaId: atleta.id,
      nome: atleta.nome,
      lane: idx + 1,
      onda: tr.waveAssigned[atleta.id] || 0,
      serie: 1,
      rep: 1,
      running: false,
      startedAt: 0,
      elapsedMs: 0,
      waiting: false,
      waitMs: 0,
      waitLabel: "",
      lastSplitMs: null,
      lastIsPr: false,
      done: false,
      tempos: [],
      registroId: null,
    });
  });
}

function startMaster() {
  tr.masterRunning = true;
  tr.masterStartedAt = Date.now() - tr.masterElapsedMs;
  if (!tr.sessionStartedAt) tr.sessionStartedAt = new Date().toISOString();
  if (tr.config.modo === 2) {
    tr.raias.forEach((raia) => {
      if (!raia.done && !raia.running && !raia.waiting) {
        raia.running = true;
        raia.startedAt = Date.now() - raia.elapsedMs;
      }
    });
  }
  if (tr.config.modo === 3) {
    tr.waves.forEach((w) => {
      w.startedAt = tr.masterStartedAt + (w.index - 1) * tr.config.descansoOndas * 1000;
    });
  }
  const startBtn = document.getElementById("sbMasterStartBtn");
  const stopBtn = document.getElementById("sbMasterStopBtn");
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  startMasterTicker();
  api.logAction("Treino iniciado no SwimBase.");
}

function stopMaster() {
  tr.masterRunning = false;
  if (tr.config.modo === 2) {
    tr.raias.forEach((raia) => {
      raia.running = false;
      raia.waiting = false;
      raia.waitLabel = "";
    });
  }
  stopMasterTicker();
  const startBtn = document.getElementById("sbMasterStartBtn");
  const stopBtn = document.getElementById("sbMasterStopBtn");
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  api.logAction("Treino pausado no SwimBase.");
}

function startMasterTicker() {
  stopMasterTicker();
  tr.masterTimerId = setInterval(() => {
    const now = Date.now();
    if (tr.masterRunning) {
      tr.masterElapsedMs = now - tr.masterStartedAt;
      const masterDisplay = document.getElementById("sbMasterDisplay");
      if (masterDisplay) masterDisplay.innerHTML = maskTimeHTML(msToDisplay(tr.masterElapsedMs));
    }
    if (tr.config.modo === 1) tickModo1();
    else if (tr.config.modo === 3) tickModo3(now);
    else tickModo2(now);
  }, 30);
}

function tickModo2(now) {
  tr.raias.forEach((raia) => {
    if (raia.done) return;
    if (raia.running) {
      raia.elapsedMs = now - raia.startedAt;
    } else if (raia.waiting) {
      raia.waitMs -= 30;
      if (raia.waitMs <= 0) {
        raia.waiting = false;
        raia.waitLabel = "";
        raia.running = true;
        raia.startedAt = now;
        raia.elapsedMs = 0;
      } else {
        raia.waitLabel = `Próxima em ${Math.ceil(raia.waitMs / 1000)}s`;
      }
    }
    updateRaiaRow(raia);
  });
}

function tickModo1() {
  if (!tr.masterRunning) return;
  const g = tr.group;
  if (!g || g.phase === "done") return;
  g.remainingMs -= 30;
  if (g.remainingMs <= 0) {
    g.remainingMs = 0;
    if (g.phase === "serieInt") {
      g.phase = "rep";
      g.rep = 1;
      g.remainingMs = tr.config.tempoSaida * 1000;
      g.countUpMs = 0;
      g.repStartMs = tr.masterElapsedMs;
    } else if (g.rep < tr.config.repeticoes) {
      g.rep += 1;
      g.remainingMs = tr.config.tempoSaida * 1000;
      g.countUpMs = 0;
      g.repStartMs = tr.masterElapsedMs;
    } else if (g.serie < tr.config.series) {
      g.serie += 1;
      g.rep = 1;
      g.phase = "serieInt";
      g.remainingMs = tr.config.intervaloSeries * 1000;
      g.countUpMs = 0;
    } else {
      g.phase = "done";
    }
    hapticFeedback(60);
    flashGroupAdvance();
  } else if (g.phase === "rep") {
    g.countUpMs += 30;
  }
  updateModo1Ui();
}

function flashGroupAdvance() {
  const el = document.getElementById("sbCountdown");
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 400);
}

function updateModo1Ui() {
  const g = tr.group;
  if (!g) return;
  const countdown = document.getElementById("sbCountdown");
  const counter = document.getElementById("sbGroupCounter");
  if (countdown) {
    if (g.phase === "done") {
      countdown.innerHTML = "Concluído";
    } else if (g.phase === "serieInt") {
      countdown.innerHTML = maskTimeHTML(msToDisplay(Math.max(g.remainingMs, 0)));
    } else {
      countdown.innerHTML = maskTimeHTML(msToDisplay(g.countUpMs));
    }
    countdown.classList.toggle("done", g.phase === "done");
  }
  if (counter) {
    counter.textContent =
      g.phase === "done"
        ? "Concluído"
        : g.phase === "serieInt"
          ? `Intervalo entre séries · Série ${g.serie}/${tr.config.series}`
          : `Série ${g.serie}/${tr.config.series} · Rep ${g.rep}/${tr.config.repeticoes}`;
  }
}

function tickModo3(now) {
  tr.waves.forEach((wave) => {
    if (!wave.started) {
      wave.countdownMs = Math.max(wave.startedAt - now, 0);
      if (now >= wave.startedAt) {
        wave.started = true;
        wave.elapsedMs = 0;
        hapticFeedback(80);
        flashGroupAdvance();
      }
    } else {
      wave.elapsedMs = now - wave.startedAt;
    }
    wave.done = wave.atletas.every((id) => {
      const r = tr.raias.get(id);
      return r && r.done;
    });
    wave.atletas.forEach((id) => {
      const r = tr.raias.get(id);
      if (!r) return;
      if (!wave.started) {
        r.waiting = true;
        r.waitMs = wave.countdownMs;
        r.waitLabel = `Onda ${wave.index} em ${Math.ceil(wave.countdownMs / 1000)}s`;
      } else if (!r.done) {
        r.running = true;
        r.waiting = false;
        r.waitLabel = "";
        r.elapsedMs = wave.elapsedMs;
      }
      r.serie = tr.modo3Serie;
      updateRaiaRow(r);
    });
  });
  if (
    tr.config.series > 1 &&
    tr.modo3Serie < tr.config.series &&
    tr.waves.every((w) => w.done)
  ) {
    tr.modo3Serie += 1;
    tr.raias.forEach((r) => {
      r.done = false;
      r.running = false;
      r.waiting = false;
      r.waitLabel = "";
      r.lastSplitMs = null;
      r.lastIsPr = false;
    });
    tr.waves.forEach((w) => {
      w.started = false;
      w.done = false;
      w.startedAt = tr.masterStartedAt + (w.index - 1) * tr.config.descansoOndas * 1000;
      w.countdownMs = (w.index - 1) * tr.config.descansoOndas * 1000;
    });
    hapticFeedback([80, 60, 160]);
    api.logAction(`SwimBase: série ${tr.modo3Serie}/${tr.config.series} das ondas iniciada.`);
  }
  updateModo3Status();
}

function stopMasterTicker() {
  if (tr.masterTimerId) {
    clearInterval(tr.masterTimerId);
    tr.masterTimerId = null;
  }
}

function renderChronoList() {
  const list = document.getElementById("sbChronoList");
  if (!list) return;
  if (!tr.raias.size) {
    list.innerHTML = '<p class="muted">Nenhum atleta selecionado.</p>';
    return;
  }
  if (tr.config.modo === 1) return renderChronoModo1(list);
  if (tr.config.modo === 3) return renderChronoModo3(list);
  renderChronoModo2(list);
}

function renderChronoModo1(list) {
  list.innerHTML = `
    <div class="sb-countdown" id="sbCountdown">00:00:00</div>
    <div class="sb-group-counter" id="sbGroupCounter">Série 1/${tr.config.series} · Rep 1/${tr.config.repeticoes}</div>
    <div class="sb-modo1-raias">
      ${[...tr.raias.values()]
        .map(
          (raia) => `
        <button type="button" class="sb-raia" data-id="${escapeHtml(raia.atletaId)}">
          <span class="sb-raia-lane">${raia.lane}</span>
          <span class="sb-raia-body">
            <span class="sb-raia-name">${escapeHtml(raia.nome)}</span>
            <span class="sb-raia-splits"></span>
            <span class="sb-raia-last">Toque para registrar</span>
          </span>
          <span class="sb-raia-time">—</span>
        </button>`
        )
        .join("")}
    </div>
  `;
  list.querySelectorAll(".sb-raia").forEach((btn) =>
    btn.addEventListener("click", () => recordSplit(btn.dataset.id))
  );
  updateModo1Ui();
}

function renderChronoModo2(list) {
  list.innerHTML = [...tr.raias.values()]
    .map(
      (raia) => `
    <button type="button" class="sb-raia" data-id="${escapeHtml(raia.atletaId)}">
      <span class="sb-raia-lane">${raia.lane}</span>
      <span class="sb-raia-body">
        <span class="sb-raia-name">${escapeHtml(raia.nome)}</span>
        <span class="sb-raia-splits"></span>
        <span class="sb-raia-meta">Rep ${raia.rep}/${tr.config.repeticoes} · Série ${raia.serie}/${tr.config.series}</span>
        <span class="sb-raia-last">Toque para registrar</span>
      </span>
      <span class="sb-raia-time">00:00:00</span>
    </button>`
    )
    .join("");
  list.querySelectorAll(".sb-raia").forEach((btn) =>
    btn.addEventListener("click", () => recordSplit(btn.dataset.id))
  );
  tr.raias.forEach(updateRaiaRow);
}

function renderChronoModo3(list) {
  list.innerHTML = `
    <div class="sb-wave-status" id="sbWaveStatus"></div>
    <div class="sb-modo3-raias">
      ${[...tr.raias.values()]
        .sort((a, b) => a.onda - b.onda || a.lane - b.lane)
        .map(
          (raia) => `
        <button type="button" class="sb-raia" data-id="${escapeHtml(raia.atletaId)}">
          <span class="sb-raia-lane">${raia.onda}</span>
          <span class="sb-raia-body">
            <span class="sb-raia-name">${escapeHtml(raia.nome)}</span>
            <span class="sb-raia-meta">Onda ${raia.onda}</span>
            <span class="sb-raia-last">Toque para registrar</span>
          </span>
          <span class="sb-raia-time">—</span>
        </button>`
        )
        .join("")}
    </div>
  `;
  list.querySelectorAll(".sb-raia").forEach((btn) =>
    btn.addEventListener("click", () => recordSplit(btn.dataset.id))
  );
  tr.raias.forEach(updateRaiaRow);
  updateModo3Status();
}

function updateModo3Status() {
  const el = document.getElementById("sbWaveStatus");
  if (!el) return;
  el.innerHTML = tr.waves
    .map((w) => {
      const label = w.done
        ? "concluída"
        : w.started
          ? "em andamento"
          : `inicia em ${Math.ceil(w.countdownMs / 1000)}s`;
      return `<span class="sb-wave-pill ${w.done ? "done" : w.started ? "running" : ""}">Onda ${w.index} · ${label}</span>`;
    })
    .join("");
}

function updateRaiaRow(raia) {
  const row = document.querySelector(`.sb-raia[data-id="${raia.atletaId}"]`);
  if (!row) return;
  row.classList.toggle("done", raia.done);
  const timeEl = row.querySelector(".sb-raia-time");
  const metaEl = row.querySelector(".sb-raia-meta");
  const lastEl = row.querySelector(".sb-raia-last");

  if (tr.config.modo === 1) {
    if (timeEl)
      timeEl.innerHTML =
        raia.lastSplitMs != null ? maskTimeHTML(msToDisplay(raia.lastSplitMs)) : "—";
    const splitsEl = row.querySelector(".sb-raia-splits");
    if (splitsEl) {
      if (raia.tempos.length > 0) {
        splitsEl.innerHTML = raia.tempos.map((t) => maskTimeHTML(t)).join("/");
        splitsEl.hidden = false;
      } else {
        splitsEl.hidden = true;
      }
    }
    if (lastEl)
      lastEl.innerHTML =
        raia.lastSplitMs != null
          ? `${raia.lastIsPr ? '<span class="pr-badge">PR!</span> ' : ""}Último ${msToDisplay(
              raia.lastSplitMs
            )}`
          : "Toque para registrar";
    return;
  }

  if (tr.config.modo === 3) {
    if (timeEl) {
      if (raia.done) timeEl.textContent = "✓";
      else if (raia.waiting) timeEl.innerHTML = maskTimeHTML(msToDisplay(raia.waitMs));
      else timeEl.innerHTML = maskTimeHTML(msToDisplay(raia.elapsedMs));
    }
    if (metaEl) metaEl.textContent = raia.waiting ? raia.waitLabel : `Onda ${raia.onda}`;
    if (lastEl)
      lastEl.innerHTML =
        raia.lastSplitMs != null
          ? `${raia.lastIsPr ? '<span class="pr-badge">PR!</span> ' : ""}Último ${msToDisplay(
              raia.lastSplitMs
            )}`
          : "Toque para registrar";
    return;
  }

  if (timeEl) {
    if (raia.done) timeEl.textContent = "✓";
    else if (raia.waiting) timeEl.innerHTML = maskTimeHTML(msToDisplay(raia.waitMs));
    else timeEl.innerHTML = maskTimeHTML(msToDisplay(raia.elapsedMs));
  }
  const splitsEl = row.querySelector(".sb-raia-splits");
  if (splitsEl) {
    if (raia.tempos.length > 0) {
      splitsEl.innerHTML = raia.tempos.map((t) => maskTimeHTML(t)).join("/");
      splitsEl.hidden = false;
    } else {
      splitsEl.hidden = true;
    }
  }
  if (metaEl) {
    metaEl.textContent = raia.waiting
      ? raia.waitLabel
      : `Rep ${raia.rep}/${tr.config.repeticoes} · Série ${raia.serie}/${tr.config.series}`;
  }
  if (lastEl) {
    lastEl.innerHTML =
      raia.lastSplitMs != null
        ? `${raia.lastIsPr ? '<span class="pr-badge">PR!</span> ' : ""}Último ${msToDisplay(
            raia.lastSplitMs
          )}`
        : "Toque para registrar";
  }
}

async function recordSplit(atletaId) {
  const raia = tr.raias.get(atletaId);
  if (!raia) return;
  const now = Date.now();
  let splitMs;

  if (tr.config.modo === 1) {
    const g = tr.group;
    if (!g || g.phase !== "rep") return;
    splitMs = tr.masterElapsedMs - g.repStartMs;
    raia.serie = g.serie;
    raia.rep = g.rep;
  } else if (tr.config.modo === 3) {
    const wave = tr.waves.find((w) => w.index === raia.onda);
    if (!wave || !wave.started || raia.done) return;
    splitMs = now - wave.startedAt;
    raia.serie = tr.modo3Serie;
    raia.rep = 1;
  } else {
    if (!raia.running) return;
    raia.elapsedMs = now - raia.startedAt;
    splitMs = raia.elapsedMs;
  }

  raia.tempos.push(msToDisplay(splitMs));
  raia.lastSplitMs = splitMs;
  raia.lastIsPr = false;
  if (tr.config.modo !== 1) raia.running = false;
  hapticFeedback(60);
  api.logAction(
    tr.config.modo === 3
      ? `SwimBase: ${raia.nome} — onda ${raia.onda} série ${raia.serie}/${tr.config.series}: ${msToDisplay(splitMs)}.`
      : tr.config.modo === 1
        ? `SwimBase: ${raia.nome} — rep ${raia.rep}/${tr.config.repeticoes} série ${raia.serie}/${tr.config.series}: ${msToDisplay(splitMs)}.`
        : `SwimBase: ${raia.nome} — rep ${raia.rep}/${tr.config.repeticoes} série ${raia.serie}/${tr.config.series}: ${msToDisplay(splitMs)}.`
  );
  await persistRegistro(raia);
  const isPr = await checkPrAndFlag(raia, splitMs);
  if (isPr) {
    raia.lastIsPr = true;
    hapticFeedback([80, 60, 160]);
  }

  if (tr.config.modo === 3) {
    raia.done = true;
    updateRaiaRow(raia);
    updateModo3Status();
    return;
  }

  if (tr.config.modo === 1) {
    updateRaiaRow(raia);
    return;
  }

  if (raia.rep < tr.config.repeticoes) {
    raia.rep += 1;
    raia.waiting = true;
    raia.waitMs = tr.config.descanso * 1000;
    raia.waitLabel = `Descanso ${Math.ceil(raia.waitMs / 1000)}s`;
  } else if (raia.serie < tr.config.series) {
    raia.serie += 1;
    raia.rep = 1;
    raia.tempos = [];
    raia.registroId = null;
    raia.waiting = true;
    raia.waitMs = tr.config.intervaloSeries * 1000;
    raia.waitLabel = `Intervalo ${Math.ceil(raia.waitMs / 1000)}s`;
  } else {
    raia.done = true;
    raia.waitLabel = "Concluído";
  }
  updateRaiaRow(raia);
}

async function checkPrAndFlag(raia, splitMs) {
  const existing = sw.prs.find(
    (p) =>
      p.atletaId === raia.atletaId &&
      p.estilo === tr.config.estilo &&
      p.distancia === tr.config.distancia
  );
  const isPr = !existing || splitMs < existing.melhorTempo;
  if (!isPr) return false;

  const registro = await get(STORES.RECORDS, raia.registroId);
  if (registro) {
    registro.flagPr = true;
    await put(STORES.RECORDS, registro);
  }

  const now = new Date().toISOString();
  const pr = {
    id: existing?.id || uid("pr"),
    atletaId: raia.atletaId,
    professorId: api.state.activeProfile?.id || null,
    estilo: tr.config.estilo,
    distancia: tr.config.distancia,
    melhorTempo: splitMs,
    tempoAnterior: existing?.melhorTempo ?? null,
    melhoria: existing ? ((existing.melhorTempo - splitMs) / existing.melhorTempo) * 100 : 0,
    data: now,
    local: "treino",
    registroId: raia.registroId,
  };
  await put(STORES.PRS, pr);
  if (existing) {
    Object.assign(existing, pr);
  } else {
    sw.prs.push(pr);
  }
  return true;
}

async function persistRegistro(raia) {
  if (!raia.registroId) {
    const id = uid("registro");
    raia.registroId = id;
    const registro = {
      id,
      atletaId: raia.atletaId,
      professorId: api.state.activeProfile?.id || null,
      dataHora: new Date().toISOString(),
      modo: "treino",
      tipoTreino: tr.config.modo,
      estilo: tr.config.estilo,
      distancia: tr.config.distancia,
      serie: raia.serie,
      onda: tr.config.modo === 3 ? raia.onda : null,
      tempos: [...raia.tempos],
      series: tr.config.series,
      repeticoes: tr.config.repeticoes,
      descanso: tr.config.descanso,
      intervaloSeries: tr.config.intervaloSeries,
      tempoSaida: tr.config.tempoSaida ?? null,
      descansoOndas: tr.config.descansoOndas ?? null,
      flagPr: false,
      observacoes: "",
      syncStatus: "pending",
      createdAt: tr.sessionStartedAt || new Date().toISOString(),
    };
    await put(STORES.RECORDS, registro);
    sw.registros.push(registro);
  } else {
    const registro = await get(STORES.RECORDS, raia.registroId);
    if (registro) {
      registro.tempos = [...raia.tempos];
      await put(STORES.RECORDS, registro);
      const cached = sw.registros.find((r) => r.id === registro.id);
      if (cached) cached.tempos = [...raia.tempos];
    }
  }
}

function hapticFeedback(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* ---- Wake Lock (tela não apaga durante a cronometragem) ---- */

let wakeLockRef = null;

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLockRef) {
      wakeLockRef = await navigator.wakeLock.request("screen");
    }
  } catch {
    wakeLockRef = null;
  }
}

function releaseWakeLock() {
  if (wakeLockRef) {
    try {
      wakeLockRef.release();
    } catch {
      // ignore
    }
    wakeLockRef = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && tr.raias.size) {
    requestWakeLock();
  }
});

function finalizeTreino() {
  if (!window.confirm("Finalizar o treino? Raias não concluídas terão os tempos já registrados mantidos.")) {
    return;
  }
  stopMasterTicker();
  releaseWakeLock();
  resetTreinoSession();
  document.getElementById("sbChronoDialog").close();
  api.logAction("Treino finalizado no SwimBase.");
  api.showScreen("sb-analise");
}

function closeTreino() {
  const hasData = [...tr.raias.values()].some((r) => r.tempos.length);
  if (hasData && !window.confirm("Fechar o cronômetro? Os tempos registrados ficam salvos.")) {
    return;
  }
  stopMasterTicker();
  releaseWakeLock();
  resetTreinoSession();
  document.getElementById("sbChronoDialog").close();
}

function resetTreinoSession() {
  tr.step = 1;
  tr.turmaId = "";
  tr.atletas = [];
  tr.waveAssigned = {};
  tr.ondaAtiva = 1;
  tr.waves = [];
  tr.group = null;
  tr.modo3Serie = 1;
  tr.raias.clear();
  tr.masterElapsedMs = 0;
  tr.masterRunning = false;
  tr.masterStartedAt = 0;
  tr.sessionStartedAt = null;
}

/* ---- Análise (gráficos + PRs + registros + export) ---- */

async function renderSbAnalise() {
  await ensureLoaded();
  const container = document.getElementById("sbAnaliseContent");
  if (!container) return;
  container.innerHTML = `
    <div class="sb-grid-2">
      <label>Atleta
        <select id="sbAnaliseAtleta"></select>
      </label>
      <label>Estilo
        <select id="sbAnaliseEstilo"></select>
      </label>
    </div>
    <div class="sb-grid-2">
      <label>Distância
        <select id="sbAnaliseDistancia"></select>
      </label>
      <label>Período
        <select id="sbAnalisePeriodo">
          <option value="all">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="1a">Último ano</option>
        </select>
      </label>
    </div>
    <canvas id="sbChartCanvas" class="sb-chart"></canvas>
    <div class="section-head"><h4>PRs</h4></div>
    <div id="sbPrsTable" class="sb-table-wrap"></div>
    <div class="section-head"><h4>Registros recentes</h4></div>
    <div id="sbRegistrosTable" class="sb-table-wrap"></div>
    <div class="actions-row">
      <button id="sbExportRegistrosBtn" class="primary" type="button">Exportar registros</button>
      <button id="sbExportPrsBtn" class="ghost" type="button">Exportar PRs</button>
    </div>
  `;

  if (!sw.atletas.length) {
    container.insertAdjacentHTML(
      "beforeend",
      '<p class="muted">Cadastre atletas e registre treinos para ver a análise.</p>'
    );
    return;
  }

  populateAnaliseAtletas();
  bindAnaliseEvents();
  updateAnaliseChart();
}

function populateAnaliseAtletas() {
  const select = document.getElementById("sbAnaliseAtleta");
  if (!select) return;
  if (!an.atletaId || !sw.atletas.some((a) => a.id === an.atletaId)) {
    an.atletaId = sw.atletas[0]?.id || "";
  }
  select.innerHTML = sw.atletas
    .map((a) => {
      const turma = sw.turmas.find((t) => t.id === a.turmaId);
      return `<option value="${a.id}" ${a.id === an.atletaId ? "selected" : ""}>${escapeHtml(a.nome)}${
        turma ? ` · ${escapeHtml(turma.nome)}` : ""
      }</option>`;
    })
    .join("");
  populateAnaliseEstilos();
}

function populateAnaliseEstilos() {
  const select = document.getElementById("sbAnaliseEstilo");
  if (!select) return;
  const estilos = [...new Set(analiseRegistros(false, false).map((r) => r.estilo).filter(Boolean))].sort();
  if (!an.estilo || !estilos.includes(an.estilo)) an.estilo = estilos[0] || "";
  select.innerHTML =
    estilos.map((e) => `<option value="${e}" ${e === an.estilo ? "selected" : ""}>${e}</option>`).join("") ||
    '<option value="">—</option>';
  populateAnaliseDistancias();
}

function populateAnaliseDistancias() {
  const select = document.getElementById("sbAnaliseDistancia");
  if (!select) return;
  const dists = [...new Set(analiseRegistros(true, false).map((r) => r.distancia).filter((d) => d != null))].sort(
    (a, b) => a - b
  );
  if (an.distancia === "" || !dists.includes(an.distancia)) an.distancia = dists[0] ?? "";
  select.innerHTML =
    dists.map((d) => `<option value="${d}" ${String(d) === String(an.distancia) ? "selected" : ""}>${d} m</option>`).join("") ||
    '<option value="">—</option>';
}

function periodoCutoff(periodo) {
  const days = { "7d": 7, "30d": 30, "3m": 90, "6m": 180, "1a": 365 }[periodo];
  return days ? Date.now() - days * 86400000 : 0;
}

function analiseRegistros(useEstilo = true, useDistancia = true) {
  const cutoff = periodoCutoff(an.periodo);
  return sw.registros
    .filter((r) => r.atletaId === an.atletaId)
    .filter((r) => (useEstilo && an.estilo ? r.estilo === an.estilo : true))
    .filter((r) => (useDistancia && an.distancia !== "" ? String(r.distancia) === String(an.distancia) : true))
    .filter((r) => (cutoff ? new Date(r.dataHora).getTime() >= cutoff : true))
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
}

function updateAnaliseChart() {
  const canvas = document.getElementById("sbChartCanvas");
  if (!canvas) return;
  const registros = analiseRegistros();
  const points = [];
  registros.forEach((r) => {
    (r.tempos || []).forEach((t) => {
      const ms = parseTimeToMs(t);
      if (ms != null) points.push({ x: new Date(r.dataHora).getTime(), y: ms });
    });
  });
  points.sort((a, b) => a.x - b.x);
  const highContrast = document.body.classList.contains("high-contrast");
  drawProgressChart(canvas, points, { highContrast });
  renderPrsTable();
  renderRegistrosTable();
}

function renderPrsTable() {
  const wrap = document.getElementById("sbPrsTable");
  if (!wrap) return;
  const prs = sw.prs
    .filter((p) => p.atletaId === an.atletaId)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  if (!prs.length) {
    wrap.innerHTML = '<p class="muted">Nenhum PR registrado ainda.</p>';
    return;
  }
  const rows = prs
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.estilo || "")}</td>
        <td>${p.distancia != null ? `${p.distancia}m` : ""}</td>
        <td class="mono">${maskTimeHTML(msToDisplay(p.melhorTempo))}</td>
        <td class="mono">${p.tempoAnterior != null ? maskTimeHTML(msToDisplay(p.tempoAnterior)) : "—"}</td>
        <td>${p.melhoria ? `${p.melhoria.toFixed(1)}%` : "—"}</td>
        <td>${new Date(p.data).toLocaleDateString("pt-BR")}</td>
      </tr>`
    )
    .join("");
  wrap.innerHTML = `<table class="sb-table"><thead><tr>
    <th>Estilo</th><th>Dist.</th><th>Melhor tempo</th><th>Anterior</th><th>Melhoria</th><th>Data</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRegistrosTable() {
  const wrap = document.getElementById("sbRegistrosTable");
  if (!wrap) return;
  const recent = [...analiseRegistros()].reverse().slice(0, 20);
  if (!recent.length) {
    wrap.innerHTML = '<p class="muted">Nenhum registro no período.</p>';
    return;
  }
  const rows = recent
    .map(
      (r) => `<tr>
        <td>${new Date(r.dataHora).toLocaleDateString("pt-BR")}</td>
        <td>${escapeHtml(r.estilo || "")}</td>
        <td>${r.distancia != null ? `${r.distancia}m` : ""}</td>
        <td>${r.serie || ""}</td>
        <td class="mono">${(r.tempos || []).map((t) => maskTimeHTML(t)).join(" / ") || "—"}</td>
        <td>${r.flagPr ? '<span class="pr-badge">PR</span>' : ""}</td>
      </tr>`
    )
    .join("");
  wrap.innerHTML = `<table class="sb-table"><thead><tr>
    <th>Data</th><th>Estilo</th><th>Dist.</th><th>Série</th><th>Tempos</th><th></th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function bindAnaliseEvents() {
  document.getElementById("sbAnaliseAtleta")?.addEventListener("change", (event) => {
    an.atletaId = event.target.value;
    populateAnaliseEstilos();
    updateAnaliseChart();
  });
  document.getElementById("sbAnaliseEstilo")?.addEventListener("change", (event) => {
    an.estilo = event.target.value;
    populateAnaliseDistancias();
    updateAnaliseChart();
  });
  document.getElementById("sbAnaliseDistancia")?.addEventListener("change", (event) => {
    an.distancia = event.target.value === "" ? "" : Number(event.target.value);
    updateAnaliseChart();
  });
  document.getElementById("sbAnalisePeriodo")?.addEventListener("change", (event) => {
    an.periodo = event.target.value;
    updateAnaliseChart();
  });
  document.getElementById("sbExportRegistrosBtn")?.addEventListener("click", handleExportRegistros);
  document.getElementById("sbExportPrsBtn")?.addEventListener("click", handleExportPrs);
}

function getAtletaName(atletaId) {
  return sw.atletas.find((a) => a.id === atletaId)?.nome || atletaId;
}

async function handleExportRegistros() {
  const registros = an.atletaId ? sw.registros.filter((r) => r.atletaId === an.atletaId) : sw.registros;
  if (!registros.length) {
    window.alert("Nenhum registro para exportar.");
    return;
  }
  const res = await exportSwimBaseRegistros({ registros, getAtletaName });
  api.logAction(res.ok ? `Exportou registros SwimBase (${res.format}).` : "Falha ao exportar registros SwimBase.");
  if (!res.ok) window.alert(res.reason || "Não foi possível exportar.");
}

async function handleExportPrs() {
  const prs = an.atletaId ? sw.prs.filter((p) => p.atletaId === an.atletaId) : sw.prs;
  if (!prs.length) {
    window.alert("Nenhum PR para exportar.");
    return;
  }
  const res = await exportSwimBasePRs({ prs, getAtletaName });
  api.logAction(res.ok ? `Exportou PRs SwimBase (${res.format}).` : "Falha ao exportar PRs SwimBase.");
  if (!res.ok) window.alert(res.reason || "Não foi possível exportar.");
}