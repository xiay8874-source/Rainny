import { app } from "electron"
import log from "electron-log/main.js"
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { CHANNEL } from "./constants"
import { getStore } from "./store"
import { migrateRainnyData, migrateRainnyXdgData, mergeStrandedSidecarData } from "./rainny-data-migration"

const TAURI_MIGRATED_KEY = "tauriMigrated"

// Resolve the directory where Tauri stored its .dat files for the given app identifier.
// Mirrors Tauri's AppLocalData / AppData resolution per OS.
function tauriDir(id: string) {
  switch (process.platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", id)
    case "win32":
      return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), id)
    default:
      return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), id)
  }
}

// The Tauri app identifier changes between dev/beta/prod builds.
const TAURI_APP_IDS: Record<string, string> = {
  dev: "com.xiay8874.rainny.desktop.dev",
  beta: "com.xiay8874.rainny.desktop.beta",
  prod: "com.xiay8874.rainny.desktop",
}
function tauriAppId() {
  return app.isPackaged ? TAURI_APP_IDS[CHANNEL] : "com.xiay8874.rainny.desktop.dev"
}

// Migrate a single Tauri .dat file into the corresponding electron-store.
// `rainny.settings.dat` is special: it maps to the `rainny.settings` store
// (the electron-store name without the `.dat` extension). All other .dat files
// keep their full filename as the electron-store name so they match what the
// renderer already passes via IPC (e.g. `"default.dat"`, `"rainny.global.dat"`).
function migrateFile(datPath: string, filename: string) {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(readFileSync(datPath, "utf-8"))
  } catch (err) {
    log.warn("tauri migration: failed to parse", filename, err)
    return
  }

  // rainny.settings.dat → the electron settings store ("rainny.settings").
  // All other .dat files keep their full filename as the store name so they match
  // what the renderer passes via IPC (e.g. "default.dat", "opencode.global.dat").
  const rainnyFilename = filename.replace(/^opencode/, "rainny")
  const storeName = rainnyFilename === "rainny.settings.dat" ? "rainny.settings" : rainnyFilename
  const target = getStore(storeName)
  const migrated: string[] = []
  const skipped: string[] = []

  for (const [key, value] of Object.entries(data)) {
    // Don't overwrite values the user has already set in the Electron app.
    if (target.has(key)) {
      skipped.push(key)
      continue
    }
    target.set(key, value)
    migrated.push(key)
  }

  log.log("tauri migration: migrated", filename, "→", storeName, { migrated, skipped })
}

export function migrate() {
  const rainny = migrateRainnyData(app.getPath("userData"))
  if (rainny.length) log.log("rainny migration: renamed runtime data", { migrated: rainny })

  const xdgData = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  const xdgCache = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache")
  const xdg = migrateRainnyXdgData(xdgData, xdgConfig, xdgCache)
  if (xdg.length) log.log("rainny migration: migrated global XDG opencode -> rainny", { migrated: xdg })

  const stranded = mergeStrandedSidecarData(app.getPath("userData"), xdgData)
  if (stranded.length) log.log("rainny migration: merged stranded sidecar data into XDG", { migrated: stranded })

  migrateElectronFiles()
  if (getStore().get(TAURI_MIGRATED_KEY)) {
    log.log("tauri migration: already done, skipping")
    return
  }

  const dir = tauriDir(tauriAppId())
  log.log("tauri migration: starting", { dir })

  if (!existsSync(dir)) {
    log.log("tauri migration: no tauri data directory found, nothing to migrate")
    getStore().set(TAURI_MIGRATED_KEY, true)
    return
  }

  for (const filename of readdirSync(dir)) {
    if (!filename.endsWith(".dat")) continue
    migrateFile(join(dir, filename), filename)
  }

  log.log("tauri migration: complete")
  getStore().set(TAURI_MIGRATED_KEY, true)
}

function migrateElectronFiles() {
  const source = join(app.getPath("appData"), tauriAppId())
  const target = app.getPath("userData")
  if (source === target || !existsSync(source)) return

  const migrated: string[] = []
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    if (
      entry.name !== "opencode.settings" &&
      !entry.name.endsWith(".dat") &&
      !/^window-state-.+\.json$/.test(entry.name)
    )
      continue
    const destination = join(target, entry.name.replace(/^opencode/, "rainny"))
    if (existsSync(destination)) continue
    copyFileSync(join(source, entry.name), destination)
    migrated.push(entry.name)
  }
  log.log("electron migration: copied compatible OpenCode state", { source, target, migrated })
}
