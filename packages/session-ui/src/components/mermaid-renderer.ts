import type { MermaidConfig } from "mermaid"

export type MermaidTheme = "default" | "dark"

export type MermaidRenderResult = {
  svg: string
  repaired: boolean
}

function mermaidRenderAbortError() {
  return new DOMException("Mermaid render superseded", "AbortError")
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw mermaidRenderAbortError()
}

export function createMermaidRenderQueue() {
  let queue = Promise.resolve()

  return function enqueue<T>(task: () => Promise<T>, signal?: AbortSignal) {
    const next = queue.then(async () => {
      throwIfAborted(signal)
      const result = await task()
      throwIfAborted(signal)
      return result
    })
    queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
}

const enqueueMermaidRender = createMermaidRenderQueue()

const baseConfig = (theme: MermaidTheme): MermaidConfig => ({
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true,
  theme,
  fontFamily: "var(--font-family-sans)",
  flowchart: {
    useMaxWidth: false,
    nodeSpacing: 56,
    rankSpacing: 64,
    curve: "basis",
  },
  state: {
    useMaxWidth: false,
    nodeSpacing: 120,
    rankSpacing: 120,
    edgeLengthFactor: "1.5",
    defaultRenderer: "elk",
  },
})

export function repairCommonMermaidSyntax(source: string) {
  let subgraphIndex = 0
  return source
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)subgraph\s+(.+?)\s*$/)
      if (!match) return line
      const [, indent, rawTitle] = match
      const title = rawTitle.trim()
      if (/^(?:[A-Za-z_][\w-]*\s*)?\[/.test(title) || /^".*"$/.test(title) || /^[A-Za-z_][\w-]*$/.test(title)) {
        return line
      }
      subgraphIndex += 1
      const escaped = title.replace(/"/g, "&quot;")
      return `${indent}subgraph rainny_subgraph_${subgraphIndex}["${escaped}"]`
    })
    .join("\n")
}

export function mermaidErrorSummary(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const line = message.match(/line\s+(\d+)/i)?.[1]
  if (line) return `第 ${line} 行附近存在无法识别的语法`
  return "存在 Mermaid 无法识别的语法"
}

export function renderMermaidDiagram(input: {
  id: string
  source: string
  theme: MermaidTheme
  signal?: AbortSignal
}) {
  return enqueueMermaidRender(async (): Promise<MermaidRenderResult> => {
    const { default: mermaid } = await import("mermaid")
    throwIfAborted(input.signal)
    mermaid.initialize(baseConfig(input.theme))

    try {
      await mermaid.parse(input.source)
      throwIfAborted(input.signal)
      const { svg } = await mermaid.render(input.id, input.source)
      return { svg, repaired: false }
    } catch (originalError) {
      const repairedSource = repairCommonMermaidSyntax(input.source)
      if (repairedSource === input.source) throw originalError
      try {
        await mermaid.parse(repairedSource)
        throwIfAborted(input.signal)
        const { svg } = await mermaid.render(`${input.id}-compat`, repairedSource)
        return { svg, repaired: true }
      } catch {
        throw originalError
      }
    }
  }, input.signal)
}
