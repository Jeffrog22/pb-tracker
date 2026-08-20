// utils.js — Helpers compartilhados (tempo, texto, segurança) para todos os módulos.

export function uid(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function todayStamp() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${mm}${dd}`;
}

export function digitsToTimeMask(digits) {
  const padded = digits.padEnd(6, "0");
  const mm = padded.slice(0, 2);
  const ss = padded.slice(2, 4);
  const cc = padded.slice(4, 6);
  return `${mm}:${ss}:${cc}`;
}

export function digitsToClockMask(digits) {
  const padded = digits.padEnd(4, "0");
  const hh = padded.slice(0, 2);
  const mm = padded.slice(2, 4);
  return `${hh}:${mm}`;
}

export function attachClockMask(input) {
  input.addEventListener("beforeinput", (event) => {
    const type = event.inputType;
    if (type === "deleteContentBackward" || type === "deleteContentForward") {
      event.preventDefault();
      const buffer = (input.dataset.digits || "").replace(/\D/g, "");
      const next = type === "deleteContentBackward" ? buffer.slice(0, -1) : buffer.slice(1);
      input.dataset.digits = next;
      input.value = digitsToClockMask(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (!event.data) return;
    event.preventDefault();
    const digits = String(event.data).replace(/\D/g, "");
    if (!digits.length) return;
    const buffer = ((input.dataset.digits || "") + digits).slice(-4);
    input.dataset.digits = buffer;
    input.value = digitsToClockMask(buffer);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  input.addEventListener("focus", () => {
    if (input.dataset.digits === undefined) {
      const digits = input.value.replace(/\D/g, "");
      input.dataset.digits = digits === "0000" ? "" : digits;
    }
    if (!input.value.replace(/\D/g, "")) input.value = "00:00";
    input.select();
  });
}

export function attachTimeMask(input) {
  input.addEventListener("beforeinput", (event) => {
    const type = event.inputType;
    if (type === "deleteContentBackward" || type === "deleteContentForward") {
      event.preventDefault();
      const buffer = (input.dataset.digits || "").replace(/\D/g, "");
      const next = type === "deleteContentBackward" ? buffer.slice(0, -1) : buffer.slice(1);
      input.dataset.digits = next;
      input.value = digitsToTimeMask(next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    if (!event.data) return;
    event.preventDefault();
    const digits = String(event.data).replace(/\D/g, "");
    if (!digits.length) return;
    const buffer = ((input.dataset.digits || "") + digits).slice(-6);
    input.dataset.digits = buffer;
    input.value = digitsToTimeMask(buffer);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  input.addEventListener("focus", () => {
    if (input.dataset.digits === undefined) {
      const digits = input.value.replace(/\D/g, "");
      input.dataset.digits = digits === "000000" ? "" : digits;
    }
    if (!input.value.replace(/\D/g, "")) input.value = "00:00:00";
    input.select();
  });
}

export function normalizeTime(value) {
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

export function parseTimeToMs(display) {
  if (!display) return null;
  const match = String(display).match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const mm = Number(match[1]);
  const ss = Number(match[2]);
  const cc = Number(match[3]);
  return ((mm * 60) + ss) * 1000 + (cc * 10);
}

export function msToDisplay(ms) {
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

export function maskTimeHTML(value) {
  const m = String(value || "00:00:00").match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return escapeHtml(String(value || "00:00:00"));
  return `${m[1]}'${m[2]}"<span class="cc-mini">${m[3]}</span>`;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
}

export function slugify(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}