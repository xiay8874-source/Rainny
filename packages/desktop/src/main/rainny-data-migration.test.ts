import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mergeStrandedSidecarData, migrateRainnyData, migrateRainnyXdgData } from "./rainny-data-migration"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

test("migrates Rainny runtime paths without touching unrelated OpenCodex data", () => {
  const root = mkdtempSync(join(tmpdir(), "rainny-data-migration-"))
  roots.push(root)
  mkdirSync(join(root, "data", "opencode", "log"), { recursive: true })
  mkdirSync(join(root, "config", "opencode"), { recursive: true })
  mkdirSync(join(root, "state", "opencode"), { recursive: true })
  writeFileSync(join(root, "data", "opencode", "opencode-local.db"), "db")
  writeFileSync(join(root, "data", "opencode", "log", "opencode.log"), "log")
  writeFileSync(join(root, "config", "opencode", "opencode.jsonc"), "{}")
  writeFileSync(join(root, "opencode.global.dat"), "{}")

  migrateRainnyData(root)

  expect(Bun.file(join(root, "data", "rainny", "rainny-local.db")).size).toBe(2)
  expect(Bun.file(join(root, "data", "rainny", "log", "rainny.log")).size).toBe(3)
  expect(Bun.file(join(root, "config", "rainny", "rainny.jsonc")).size).toBe(2)
  expect(Bun.file(join(root, "rainny.global.dat")).size).toBe(2)
  expect(existsSync(join(root, "state", "rainny"))).toBe(true)
})

test("does not overwrite an existing Rainny target", () => {
  const root = mkdtempSync(join(tmpdir(), "rainny-data-migration-"))
  roots.push(root)
  mkdirSync(join(root, "data", "opencode"), { recursive: true })
  mkdirSync(join(root, "data", "rainny"), { recursive: true })
  writeFileSync(join(root, "data", "opencode", "opencode.db"), "legacy")
  writeFileSync(join(root, "data", "rainny", "rainny.db"), "current")

  migrateRainnyData(root)

  expect(Bun.file(join(root, "data", "rainny", "rainny.db")).text()).resolves.toBe("current")
  expect(Bun.file(join(root, "data", "opencode", "opencode.db")).text()).resolves.toBe("legacy")
})

test("migrateRainnyXdgData renames opencode -> rainny in XDG dirs and prefixes DBs", () => {
  const root = mkdtempSync(join(tmpdir(), "rainny-xdg-"))
  roots.push(root)
  const xdgData = join(root, "share")
  const xdgConfig = join(root, "config")
  const xdgCache = join(root, "cache")
  mkdirSync(join(xdgData, "opencode", "log"), { recursive: true })
  mkdirSync(join(xdgConfig, "opencode"), { recursive: true })
  writeFileSync(join(xdgData, "opencode", "opencode.db"), "db")
  writeFileSync(join(xdgData, "opencode", "opencode-dev.db"), "dev")
  writeFileSync(join(xdgData, "opencode", "log", "opencode.log"), "log")
  writeFileSync(join(xdgConfig, "opencode", "opencode.jsonc"), "{}")

  const migrated = migrateRainnyXdgData(xdgData, xdgConfig, xdgCache)

  expect(migrated.length).toBeGreaterThan(0)
  expect(existsSync(join(xdgData, "opencode"))).toBe(false)
  expect(Bun.file(join(xdgData, "rainny", "rainny.db")).size).toBe(2)
  expect(Bun.file(join(xdgData, "rainny", "rainny-dev.db")).size).toBe(3)
  expect(Bun.file(join(xdgData, "rainny", "log", "rainny.log")).size).toBe(3)
  expect(Bun.file(join(xdgConfig, "rainny", "rainny.jsonc")).size).toBe(2)
})

test("migrateRainnyXdgData merges when rainny already exists and never overwrites", () => {
  const root = mkdtempSync(join(tmpdir(), "rainny-xdg-merge-"))
  roots.push(root)
  const xdgData = join(root, "share")
  mkdirSync(join(xdgData, "opencode"), { recursive: true })
  mkdirSync(join(xdgData, "rainny"), { recursive: true })
  writeFileSync(join(xdgData, "opencode", "opencode.db"), "legacy")
  writeFileSync(join(xdgData, "opencode", "opencode-dev.db"), "legacy-dev")
  writeFileSync(join(xdgData, "rainny", "rainny.db"), "current")

  migrateRainnyXdgData(xdgData, xdgData, xdgData)

  expect(Bun.file(join(xdgData, "rainny", "rainny.db")).text()).resolves.toBe("current")
  expect(Bun.file(join(xdgData, "rainny", "rainny-dev.db")).text()).resolves.toBe("legacy-dev")
})

test("mergeStrandedSidecarData copies stranded userData/data/rainny into XDG without overwriting", () => {
  const root = mkdtempSync(join(tmpdir(), "rainny-stranded-"))
  roots.push(root)
  const userData = join(root, "userData")
  const xdgData = join(root, "share")
  mkdirSync(join(userData, "data", "rainny"), { recursive: true })
  mkdirSync(join(xdgData, "rainny"), { recursive: true })
  writeFileSync(join(userData, "data", "rainny", "rainny.db"), "stranded")
  writeFileSync(join(userData, "data", "rainny", "rainny-dev.db"), "stranded-dev")
  writeFileSync(join(xdgData, "rainny", "rainny.db"), "current")

  const migrated = mergeStrandedSidecarData(userData, xdgData)

  expect(migrated.length).toBe(1)
  expect(Bun.file(join(xdgData, "rainny", "rainny.db")).text()).resolves.toBe("current")
  expect(Bun.file(join(xdgData, "rainny", "rainny-dev.db")).text()).resolves.toBe("stranded-dev")
})
