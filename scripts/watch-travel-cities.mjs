#!/usr/bin/env node

import { watchFile, unwatchFile, unlinkSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const travelFile = path.join(projectRoot, "static/data/travel-cities.json");
const resolverFile = path.join(projectRoot, "scripts/resolve-travel-cities.mjs");
const projectId = createHash("sha256").update(projectRoot).digest("hex").slice(0, 12);
const lockFile = path.join(os.tmpdir(), `biodong-travel-map-${projectId}.pid`);
const parentPid = process.ppid;
let running = false;
let pending = false;
let debounceTimer = null;

async function removeStaleLock() {
  try {
    const pid = Number((await readFile(lockFile, "utf8")).trim());
    if (Number.isInteger(pid) && pid > 0) {
      process.kill(pid, 0);
      return false;
    }
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
  }

  await unlink(lockFile).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  return true;
}

async function acquireLock() {
  if (!(await removeStaleLock())) return false;
  try {
    await writeFile(lockFile, String(process.pid), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

function cleanup() {
  unwatchFile(travelFile);
  try {
    unlinkSync(lockFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function runResolver() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  const child = spawn(process.execPath, [resolverFile], {
    cwd: projectRoot,
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      console.error("[travel-map] Coordinate lookup failed; check the city and country spelling.");
    }
    if (pending) {
      pending = false;
      runResolver();
    }
  });
}

function scheduleResolver() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runResolver, 700);
}

if (!(await acquireLock())) {
  console.log("[travel-map] Coordinate watcher is already running.");
  process.exit(0);
}

process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

watchFile(travelFile, { interval: 600 }, (current, previous) => {
  if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) {
    scheduleResolver();
  }
});

if (process.env.TRAVEL_WATCH_SKIP_INITIAL !== "1") runResolver();

setInterval(() => {
  try {
    process.kill(parentPid, 0);
  } catch (error) {
    if (error.code === "ESRCH") process.exit(0);
  }
}, 5000);

console.log("[travel-map] Watching travel-cities.json for new cities.");
