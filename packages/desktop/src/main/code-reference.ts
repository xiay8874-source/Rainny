import { execFile, spawn } from "node:child_process"
import { access, realpath, stat } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"
import util from "node:util"
import type { CodeReferenceRequest } from "@opencode-ai/app"

const execFilePromise = util.promisify(execFile)

export async function openCodeReference(request: CodeReferenceRequest) {
  const path = await resolveCodeReferencePath(request)
  const command = await resolveIntellijCommand()
  const args = request.line === undefined ? [] : ["--line", String(request.line)]
  if (request.column !== undefined) args.push("--column", String(request.column))
  args.push(path)
  await spawnDetached(command, args)
}

export async function resolveCodeReferencePath(request: CodeReferenceRequest) {
  const root = await realpath(request.root)
  const target = await realpath(resolve(root, request.path))
  const roots = await Promise.all(
    [root, ...(request.roots ?? [])].map((candidate) => realpath(candidate)),
  )
  const inside = roots.some((candidate) => {
    const outside = relative(candidate, target)
    return outside !== ".." && !outside.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(outside)
  })
  if (!inside) {
    throw new Error("Code reference is outside the allowed project workspaces")
  }
  if (!(await stat(target)).isFile()) throw new Error("Code reference is not a file")
  return target
}

async function resolveIntellijCommand() {
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/IntelliJ IDEA.app/Contents/MacOS/idea",
          `${process.env.HOME ?? ""}/Applications/IntelliJ IDEA.app/Contents/MacOS/idea`,
        ]
      : process.platform === "win32"
        ? ["idea64.exe", "idea.exe"]
        : ["idea", "idea.sh"]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (await access(candidate).then(() => true, () => false)) return candidate
      continue
    }
    if (await commandExists(candidate)) return candidate
  }

  throw new Error("IntelliJ IDEA command-line launcher was not found")
}

function commandExists(command: string) {
  return execFilePromise(process.platform === "win32" ? "where" : "which", [command]).then(
    () => true,
    () => false,
  )
}

function spawnDetached(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: "ignore" })
    child.once("error", reject)
    child.once("spawn", () => {
      child.unref()
      resolve()
    })
  })
}
