import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { migrateRainnyData } from "./rainny-data-migration"

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
