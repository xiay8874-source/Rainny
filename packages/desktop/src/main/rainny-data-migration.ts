import { copyFileSync, existsSync, readdirSync, renameSync, statSync } from "node:fs"
import { join } from "node:path"

type Migration = { source: string; target: string }

function move(source: string, target: string, migrated: Migration[]) {
  if (!existsSync(source) || existsSync(target)) return
  renameSync(source, target)
  migrated.push({ source, target })
}

function renamePrefixedEntries(directory: string, migrated: Migration[]) {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory)) {
    if (!entry.startsWith("opencode")) continue
    move(join(directory, entry), join(directory, `rainny${entry.slice("opencode".length)}`), migrated)
  }
}

function renamePrefixedRecursive(directory: string, migrated: Migration[]) {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      renamePrefixedRecursive(join(directory, entry.name), migrated)
      continue
    }
    if (!entry.name.startsWith("opencode")) continue
    move(join(directory, entry.name), join(directory, `rainny${entry.name.slice("opencode".length)}`), migrated)
  }
}

export function migrateRainnyData(root: string) {
  const migrated: Migration[] = []

  for (const directory of ["data", "config", "cache", "state"]) {
    move(join(root, directory, "opencode"), join(root, directory, "rainny"), migrated)
  }
  move(join(root, "opencode"), join(root, "rainny"), migrated)

  renamePrefixedEntries(root, migrated)
  renamePrefixedRecursive(join(root, "data", "rainny"), migrated)
  renamePrefixedRecursive(join(root, "config", "rainny"), migrated)

  return migrated
}

// Merge a stranded sidecar data directory (the old `userData/data/rainny`
// produced when the sidecar pinned XDG_DATA_HOME) back into the canonical
// XDG location `~/.local/share/rainny` so desktop and CLI share one store.
// Files are copied (not moved) and never overwrite existing targets, so the
// run is idempotent and safe to repeat.
function mergeDir(source: string, target: string, migrated: Migration[]) {
  if (!existsSync(source)) return
  for (const entry of readdirSync(source)) {
    const from = join(source, entry)
    const to = join(target, entry)
    if (existsSync(to)) continue
    if (statSync(from).isDirectory()) continue
    copyFileSync(from, to)
    migrated.push({ source: from, target: to })
  }
}

export function migrateRainnyXdgData(xdgData: string, xdgConfig: string, xdgCache: string) {
  const migrated: Migration[] = []

  for (const base of [xdgData, xdgConfig, xdgCache]) {
    const legacy = join(base, "opencode")
    const current = join(base, "rainny")
    if (!existsSync(legacy)) continue

    if (!existsSync(current)) {
      renameSync(legacy, current)
      migrated.push({ source: legacy, target: current })
    } else {
      mergeDir(legacy, current, migrated)
    }
    renamePrefixedRecursive(current, migrated)
  }

  return migrated
}

// The sidecar used to pin XDG_DATA_HOME to `userData/data`, stranding session
// DBs at `userData/data/rainny/`. Merge that subtree back into the canonical
// XDG location so desktop and CLI share one store. Files are copied and never
// overwrite existing targets; the stranded source is left in place so the run
// is safe to repeat and easy to roll back.
export function mergeStrandedSidecarData(userData: string, xdgData: string) {
  const migrated: Migration[] = []
  for (const sub of ["data", "data.empty.backup"]) {
    mergeDir(join(userData, sub, "rainny"), join(xdgData, "rainny"), migrated)
  }
  return migrated
}
