export type FileViewMode = "source" | "preview"

export function supportsFilePreview(path: string | undefined) {
  if (!path) return false
  return /\.(?:md|markdown|mdown|mkd)$/i.test(path)
}

export function fileViewScrollKey(tab: string, mode: FileViewMode) {
  if (mode === "source") return tab
  return `${tab}:preview`
}
