export type CodeReference = {
  path: string
  line?: number
  column?: number
}

const trailingPunctuation = /[),.;!?，。；！？、]+$/u

export function parseCodeReference(value: string): CodeReference | undefined {
  const text = decodeReference(value.trim().replace(trailingPunctuation, ""))
  if (!text || /^(?:https?|mailto|file|idea):/i.test(text)) return

  const hash = text.match(/^(.*?)#L(\d+)(?:-L\d+)?(?::(\d+))?$/i)
  if (hash) return createReference(hash[1], hash[2], hash[3])

  const colon = text.match(/^(.*?):(\d+)(?::(\d+))?$/)
  if (colon) return createReference(colon[1], colon[2], colon[3])
}

/** Parse a Markdown link that points at a source file but does not include a line. */
export function parseCodeFileReference(value: string): CodeReference | undefined {
  const text = decodeReference(value.trim().replace(trailingPunctuation, ""))
  if (!text || /^(?:https?|mailto|file|idea):/i.test(text) || !looksLikePath(text)) return
  return { path: text }
}

function decodeReference(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function createReference(path: string | undefined, line: string | undefined, column: string | undefined) {
  if (!path || !line || !looksLikePath(path)) return

  const lineNumber = Number(line)
  const columnNumber = column ? Number(column) : undefined
  if (!Number.isSafeInteger(lineNumber) || lineNumber < 1) return
  if (columnNumber !== undefined && (!Number.isSafeInteger(columnNumber) || columnNumber < 1)) return

  return {
    path,
    line: lineNumber,
    ...(columnNumber === undefined ? {} : { column: columnNumber }),
  }
}

function looksLikePath(value: string) {
  if (value === "." || value === "..") return false
  if (/[\\/]/.test(value)) return true
  return /^\.?[^\s/:]+\.[^\s/:]+$/.test(value)
}
