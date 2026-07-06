import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFile = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "astrum-drift",
  "public",
  "version.json",
);

function getUtcDateStamp(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function parseVersionString(value) {
  const match = /^Version (\d{4}\.\d{2}\.\d{2})\.(\d{3})$/.exec(value.trim());
  if (!match) return null;
  return { datePart: match[1], seq: Number(match[2]) };
}

async function main() {
  const forceReset = process.argv.includes("--reset");
  const raw = await readFile(versionFile, "utf8");
  const parsedJson = JSON.parse(raw);
  const current = typeof parsedJson.version === "string" ? parsedJson.version : "";
  const parsedVersion = parseVersionString(current);

  const utcDate = getUtcDateStamp();
  let nextSeq = 1;

  if (!forceReset && parsedVersion && parsedVersion.datePart === utcDate) {
    nextSeq = parsedVersion.seq + 1;
  }

  const nextVersion = `Version ${utcDate}.${String(nextSeq).padStart(3, "0")}`;
  parsedJson.version = nextVersion;

  await writeFile(versionFile, `${JSON.stringify(parsedJson, null, 2)}\n`, "utf8");
  console.log(nextVersion);
}

main().catch((error) => {
  console.error("Failed to bump version:", error);
  process.exit(1);
});
