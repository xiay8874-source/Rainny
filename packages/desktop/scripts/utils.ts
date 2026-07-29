import { $ } from "bun"
import { chmod, copyFile } from "node:fs/promises"
import { join } from "node:path"
import { PRODUCT, resolveChannel as resolveProductChannel, type Channel } from "../src/branding"

export function resolveChannel(): Channel {
  return resolveProductChannel(Bun.env.RAINNY_CHANNEL ?? Bun.env.OPENCODE_CHANNEL)
}

export async function buildCliToResources() {
  const os = process.platform === "win32" ? "windows" : process.platform
  const source = join(
    "../cli/dist",
    `cli-${os}-${process.arch}`,
    "bin",
    process.platform === "win32" ? "rainny.exe" : "rainny",
  )
  const dest = windowsify(`resources/${PRODUCT.cli}`)
  await $`bun run --cwd ../cli script/build.ts --single --skip-install`
  await copyFile(source, dest)
  if (process.platform !== "win32") await chmod(dest, 0o755)
  if (process.platform === "win32" && process.env.GITHUB_ACTIONS === "true") {
    await $`pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File ../../script/sign-windows.ps1 ${dest}`
  }
  if (process.platform === "darwin") await $`codesign --force --sign - ${dest}`

  console.log(`Built Rainny CLI at ${dest}`)
}

export function windowsify(path: string) {
  if (path.endsWith(".exe")) return path
  return `${path}${process.platform === "win32" ? ".exe" : ""}`
}
