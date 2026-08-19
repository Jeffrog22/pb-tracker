const SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
import { slugify, msToDisplay, parseTimeToMs, todayStamp } from "./utils.js";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildResultsRows(state, getSplitsForEvent, includeSexo = true, splitLabels = false) {
  const events = [...state.groupedEvents.values()];

  const splitSet = new Set();
  events.forEach((event) => {
    event.series.forEach((athletes) => {
      athletes.forEach((athlete) => {
        getSplitsForEvent(event.eventName).forEach((split) => splitSet.add(split));
      });
    });
  });

  const orderedSplits = [...splitSet].sort((a, b) => a - b);
  const headers = ["Prova", "Série", "Baliza", "Nome"];
  if (includeSexo) headers.push("Sexo");
  headers.push("Tempo Balizado");
  orderedSplits.forEach((split) => {
    if (splitLabels && split === orderedSplits[orderedSplits.length - 1]) {
      headers.push(`Tempo Final ${split}m`);
    } else if (splitLabels) {
      headers.push(`Volta ${split}m`);
    } else {
      headers.push(`Prova ${split}m`);
    }
  });

  const rows = [];
  events.forEach((event) => {
    [...event.series.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([seriesKey, athletes]) => {
        const sorted = [...athletes].sort((a, b) => Number(a.baliza) - Number(b.baliza));
        sorted.forEach((athlete) => {
          const row = [
            event.eventName,
            seriesKey,
            athlete.baliza,
            athlete.nome,
          ];
          if (includeSexo) row.push(athlete.sexo || "");
          row.push(athlete.tempoBalizado || "00:00:00");
          orderedSplits.forEach((split) => {
            const t = athlete.current?.[split];
            row.push(t && t !== "00:00:00" ? t : "--");
          });
          rows.push(row);
        });
      });
  });

  return { headers, rows };
}

export function buildActivityLogRows(activityLog) {
  return {
    headers: ["Timestamp", "Mensagem"],
    rows: (activityLog || []).map((entry) => [entry.timestamp, entry.message]),
  };
}

function exportCsv({ headers, rows }, filename) {
  const escapeCell = (value) => {
    const text = String(value ?? "");
    if (text.includes(";") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const content =
    "\uFEFF" +
    [headers, ...rows]
      .map((line) => line.map(escapeCell).join(";"))
      .join("\r\n");

  triggerDownload(new Blob([content], { type: "text/csv;charset=utf-8" }), filename);
}

function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.reject(new Error("offline"));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SHEETJS_CDN;
    script.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error("SheetJS indisponivel")));
    script.onerror = () => reject(new Error("Falha ao carregar SheetJS"));
    document.head.appendChild(script);
  });
}

function exportXlsx(XLSX, sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, headers, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 2, 12) }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

export async function exportResults({
  teamName,
  competitionDate,
  groupedEvents,
  getSplitsForEvent,
  activityLog,
}) {
  const state = { groupedEvents };
  const results = buildResultsRows(state, getSplitsForEvent);

  if (!results.rows.length) {
    return { ok: false, reason: "Nenhum resultado disponível para exportar." };
  }

  const logData = buildActivityLogRows(activityLog);
  const base = `pbtracker-${slugify(teamName)}`;
  const datePart = (competitionDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");

  let XLSX = null;
  try {
    XLSX = await loadSheetJs();
  } catch {
    XLSX = null;
  }

  if (XLSX) {
    const xlsxResults = buildResultsRows(state, getSplitsForEvent, false, true);
    exportXlsx(
      XLSX,
      [
        { name: "Resultados", headers: xlsxResults.headers, rows: xlsxResults.rows },
        { name: "Log de Atividades", headers: logData.headers, rows: logData.rows },
      ],
      `${base}-${datePart}.xlsx`
    );
    return { ok: true, format: "xlsx" };
  }

  exportCsv(results, `${base}-${datePart}.csv`);
  return { ok: true, format: "csv", fallback: true };
}

/* --- SwimBase: exportação de registros e PRs (Fase B / Tier 2) --- */

export async function exportSpreadsheet({ sheets, filename }) {
  let XLSX = null;
  try {
    XLSX = await loadSheetJs();
  } catch {
    XLSX = null;
  }
  if (XLSX && sheets.length) {
    exportXlsx(XLSX, sheets, filename);
    return { ok: true, format: "xlsx" };
  }
  if (sheets.length) {
    exportCsv(sheets[0], filename.replace(/\.xlsx$/i, ".csv"));
    return { ok: true, format: "csv", fallback: true };
  }
  return { ok: false, reason: "Nada para exportar." };
}

export async function exportSwimBaseRegistros({ registros, getAtletaName }) {
  const headers = ["Data", "Atleta", "Estilo", "Distância (m)", "Série", "Repetição", "Tempo", "PR"];
  const rows = [];
  (registros || []).forEach((registro) => {
    const tempos = registro.tempos || [];
    let bestIdx = -1;
    if (registro.flagPr && tempos.length) {
      bestIdx = tempos.reduce((best, t, idx, arr) => {
        const bt = parseTimeToMs(t);
        const bb = parseTimeToMs(arr[best]);
        return bt != null && (bb == null || bt < bb) ? idx : best;
      }, 0);
    }
    tempos.forEach((tempo, idx) => {
      rows.push([
        new Date(registro.dataHora).toLocaleString("pt-BR"),
        getAtletaName(registro.atletaId),
        registro.estilo || "",
        registro.distancia || "",
        registro.serie || "",
        idx + 1,
        tempo,
        idx === bestIdx ? "PR" : "",
      ]);
    });
  });
  return exportSpreadsheet({
    sheets: [{ name: "Registros", headers, rows }],
    filename: `swimbase-registros-${todayStamp()}.xlsx`,
  });
}

export async function exportSwimBasePRs({ prs, getAtletaName }) {
  const headers = ["Atleta", "Estilo", "Distância (m)", "Melhor tempo", "Tempo anterior", "Melhoria (%)", "Data"];
  const rows = (prs || []).map((p) => [
    getAtletaName(p.atletaId),
    p.estilo || "",
    p.distancia || "",
    msToDisplay(p.melhorTempo),
    p.tempoAnterior != null ? msToDisplay(p.tempoAnterior) : "",
    p.melhoria ? p.melhoria.toFixed(1) : "",
    new Date(p.data).toLocaleString("pt-BR"),
  ]);
  return exportSpreadsheet({
    sheets: [{ name: "PRs", headers, rows }],
    filename: `swimbase-prs-${todayStamp()}.xlsx`,
  });
}
