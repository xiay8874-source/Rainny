import { existsSync, readdirSync, renameSync } from "node:fs"
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

export function migrateRainnyData(root: string) {
  const migrated: Migration[] = []

  for (const directory of ["data", "config", "cache", "state"]) {
    move(join(root, directory, "opencode"), join(root, directory, "rainny"), migrated)
  }
  move(join(root, "opencode"), join(root, "rainny"), migrated)

  renamePrefixedEntries(root, migrated)
  renamePrefixedEntries(join(root, "data", "rainny"), migrated)
  renamePrefixedEntries(join(root, "data", "rainny", "log"), migrated)
  renamePrefixedEntries(join(root, "config", "rainny"), migrated)

  return migrated
}
