import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "electron", "vault-ingestion-skills");
const dest = path.join(root, "..", "dist-electron", "vault-ingestion-skills");
const consumptionSrc = path.join(root, "..", "electron", "vault-consumption-skills");
const consumptionDest = path.join(root, "..", "dist-electron", "vault-consumption-skills");

fs.cpSync(src, dest, { recursive: true });
fs.cpSync(consumptionSrc, consumptionDest, { recursive: true });
console.log(`Copied vault-ingestion-skills -> ${dest}`);
console.log(`Copied vault-consumption-skills -> ${consumptionDest}`);
