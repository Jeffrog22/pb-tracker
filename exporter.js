const SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

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

function slugify(value) {
  return String(value || "equipe")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^$/, "equipe");
}

export function buildResultsRows(state, getSplitsForEvent) {
  const events = [...state.selectedProofs]
    .map((key) => state.groupedEvents.get(key))
    .filter(Boolean);

  const splitSet = new Set();
  events.forEach((event) => {
    event.series.forEach((athletes) => {
      athletes.forEach((athlete) => {
        getSplitsForEvent(event.eventName).forEach((split) => splitSet.add(split));
      });
    });
  });

  const orderedSplits = [...splitSet].sort((a, b) => a - b);
  const headers = ["Prova", "Série", "Baliza", "Nome", "Equipe", "Sexo", "Tempo Balizado"];
  orderedSplits.forEach((split) => {
    headers.push(`PR Parcial ${split}m`, `Prova ${split}m`);
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
            athlete.equipe,
            athlete.sexo || "",
            athlete.tempoBalizado || "00:00:00",
          ];
          orderedSplits.forEach((split) => {
            row.push(athlete.history?.[split] || "00:00:00");
            row.push(athlete.current?.[split] || "00:00:00");
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
  selectedProofs,
  groupedEvents,
  getSplitsForEvent,
  activityLog,
}) {
  const state = { selectedProofs, groupedEvents };
  const results = buildResultsRows(state, getSplitsForEvent);

  if (!results.rows.length) {
    return { ok: false, reason: "Nenhuma prova selecionada para exportar." };
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
    exportXlsx(
      XLSX,
      [
        { name: "Resultados", headers: results.headers, rows: results.rows },
        { name: "Log de Atividades", headers: logData.headers, rows: logData.rows },
      ],
      `${base}-${datePart}.xlsx`
    );
    return { ok: true, format: "xlsx" };
  }

  exportCsv(results, `${base}-${datePart}.csv`);
  return { ok: true, format: "csv", fallback: true };
}
