#!/usr/bin/env bun

import { Script } from "@opencode-ai/script"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const generated = await import("./generate.ts")

await Bun.build({
  target: "node",
  entrypoints: ["./src/node.ts"],
  outdir: "./dist/node",
  format: "esm",
  sourcemap: "linked",
  external: ["jsonc-parser", "@lydell/node-pty"],
  define: {
    OPENCODE_MODELS_DEV: generated.modelsData,
    OPENCODE_CHANNEL: `'${Script.channel}'`,
    OPENCODE_CLI_NAME: `'rainny'`,
    RAINNY_UPDATE_REPOSITORY: JSON.stringify(
      process.env.RAINNY_UPDATE_REPOSITORY || "xiay8874-source/Rainny",
    ),
  },
  files: {
    "opencode-web-ui.gen.ts": "",
  },
})

console.log("Build complete")
