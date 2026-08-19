// charts.js — Gráficos Canvas nativos (MVP: progressão temporal + evolução de PR).

function fmtMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function drawProgressChart(canvas, points, options = {}) {
  const highContrast = !!options.highContrast;
  const container = canvas.parentElement;
  const width = Math.max((container?.clientWidth || 320) - 0, 200);
  const height = 260;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const grid = highContrast ? "#3a3a3a" : "#e5e5e5";
  const axis = highContrast ? "#666" : "#bbb";
  const label = highContrast ? "#ffd700" : "#666";
  const line = highContrast ? "#00ffd1" : "#0f9d58";
  const prLine = highContrast ? "#ffff00" : "#ffb400";
  const empty = highContrast ? "#aaa" : "#888";

  if (!points.length) {
    ctx.fillStyle = empty;
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sem dados para exibir", width / 2, height / 2);
    return;
  }

  const margin = { top: 14, right: 12, bottom: 28, left: 48 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padY = Math.max((maxY - minY) * 0.15, 500);
  const lo = minY - padY;
  const hi = maxY + padY;

  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;

  const px = (x) => margin.left + ((x - xMin) / xSpan) * plotW;
  const py = (y) => margin.top + (1 - (y - lo) / (hi - lo)) * plotH;

  ctx.font = "10px ui-monospace, 'Cascadia Mono', Consolas, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  const steps = 4;
  for (let i = 0; i <= steps; i += 1) {
    const y = margin.top + (i / steps) * plotH;
    const value = hi - (i / steps) * (hi - lo);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = label;
    ctx.fillText(fmtMs(value), margin.left - 5, y);
  }

  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = px(p.x);
    const y = py(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(px(p.x), py(p.y), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = line;
    ctx.fill();
  });

  let best = Infinity;
  const prPoints = points.map((p) => {
    best = Math.min(best, p.y);
    return { x: p.x, y: best };
  });
  ctx.strokeStyle = prLine;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  prPoints.forEach((p, i) => {
    const x = px(p.x);
    const y = py(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = label;
  const labelEvery = Math.max(1, Math.ceil(points.length / 4));
  points.forEach((p, i) => {
    if (i % labelEvery !== 0 && i !== points.length - 1) return;
    const d = new Date(p.x);
    ctx.fillText(
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      px(p.x),
      height - 20
    );
  });

  ctx.strokeStyle = axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();
}