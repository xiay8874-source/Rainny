import { ServerConnection } from "@/context/server"
import type { Platform } from "@/context/platform"

export function directoryPickerKind(platform: Platform["platform"], server: ServerConnection.Any) {
  if (platform === "desktop" && ServerConnection.local(server)) return "native" as const
  return "server" as const
}

export function serverDirectoryPickerVariant(platform: Platform["platform"], newLayoutDesigns: boolean) {
  if (platform === "web" || newLayoutDesigns) return "v2" as const
  return "legacy" as const
}
