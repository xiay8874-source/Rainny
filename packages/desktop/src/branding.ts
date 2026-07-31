export type Channel = "dev" | "beta" | "prod"

export const PRODUCT = {
  id: "rainny",
  name: "Rainny",
  protocol: "rainny",
  repository: {
    owner: "xiay8874-source",
    name: "Rainny",
    url: "https://github.com/xiay8874-source/Rainny",
  },
  cli: process.platform === "win32" ? "rainny-cli.exe" : "rainny-cli",
} as const

export const APP_IDS: Record<Channel, string> = {
  dev: "com.xiay8874.rainny.desktop.dev",
  beta: "com.xiay8874.rainny.desktop.beta",
  prod: "com.xiay8874.rainny.desktop",
}

export const APP_NAMES: Record<Channel, string> = {
  dev: "Rainny Dev",
  beta: "Rainny Beta",
  prod: "Rainny",
}

export function resolveChannel(raw: string | undefined): Channel {
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  if (raw === "latest") return "prod"
  return "prod"
}
