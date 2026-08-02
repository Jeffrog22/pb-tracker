const fs = require("fs");
const path = require("path");

const LOG_FILE = path.resolve(__dirname, "project-actions.log");
const args = process.argv.slice(2);

if (!args.length) {
  console.error("Uso: node project-action-log.js \"Descrição da ação\"");
  process.exit(1);
}

const message = args.join(" ").trim();
const timestamp = new Date().toISOString();
const entry = `${timestamp} - ${message}\n`;

fs.appendFile(LOG_FILE, entry, (err) => {
  if (err) {
    console.error("Falha ao registrar a ação:", err.message);
    process.exit(1);
  }
  console.log(`Registro salvo em ${LOG_FILE}`);
});
