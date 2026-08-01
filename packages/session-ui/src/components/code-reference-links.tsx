import { parseCodeFileReference, parseCodeReference, type CodeReference } from "./code-reference"
import type { CodeReferenceHandler } from "../context/code-reference"

export function markCodeReferences(
  root: HTMLDivElement,
  resolvePath?: (reference: CodeReference) => string | undefined,
) {
  const codeNodes = Array.from(root.querySelectorAll(":not(pre) > code"))
  for (const code of codeNodes) {
    const parent = code.parentElement instanceof HTMLAnchorElement ? code.parentElement : undefined
    const reference = parent
      ? (parseCodeReference(parent.getAttribute("href") ?? "") ??
        parseCodeFileReference(parent.getAttribute("href") ?? ""))
      : parseCodeReference(code.textContent ?? "")
    if (!reference) continue
    const link = parent ?? document.createElement("a")
    if (!link.parentElement) code.parentNode?.replaceChild(link, code)
    link.appendChild(code)
    decorateCodeReferenceLink(link, reference, resolvePath?.(reference))
  }

  root.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
    if (link.closest("pre")) return
    const reference =
      parseCodeReference(link.getAttribute("href") ?? "") ?? parseCodeFileReference(link.getAttribute("href") ?? "")
    if (!reference) return
    decorateCodeReferenceLink(link, reference, resolvePath?.(reference))
  })

  markPlainTextCodeReferences(root, resolvePath)
}

const plainCodeReferencePattern =
  /(?:[A-Za-z]:)?[\\/]?(?:[^\s()[\]{}<>`"'，。；！？、:：\\/]+[\\/])*[^\s()[\]{}<>`"'，。；！？、:：\\/]+\.[A-Za-z][A-Za-z0-9._-]*:\d+(?::\d+)?/g

function markPlainTextCodeReferences(
  root: HTMLDivElement,
  resolvePath?: (reference: CodeReference) => string | undefined,
) {
  const walker = root.ownerDocument.createTreeWalker(root, 4)
  const nodes: Text[] = []
  while (walker.nextNode()) {
    if (walker.currentNode instanceof Text) nodes.push(walker.currentNode)
  }

  for (const node of nodes) {
    if (node.parentElement?.closest("a, code, pre, script, style")) continue
    const value = node.textContent ?? ""
    const matches = Array.from(value.matchAll(plainCodeReferencePattern)).flatMap((match) => {
      const index = match.index
      const text = match[0]
      const reference = parseCodeReference(text)
      if (index === undefined || !reference || tokenAt(value, index, index + text.length).includes("://")) return []
      return [{ index, text, reference }]
    })
    if (matches.length === 0) continue

    const fragment = root.ownerDocument.createDocumentFragment()
    let offset = 0
    for (const match of matches) {
      fragment.append(value.slice(offset, match.index))
      const link = root.ownerDocument.createElement("a")
      link.textContent = match.text
      decorateCodeReferenceLink(link, match.reference, resolvePath?.(match.reference))
      fragment.append(link)
      offset = match.index + match.text.length
    }
    fragment.append(value.slice(offset))
    node.replaceWith(fragment)
  }
}

function tokenAt(value: string, start: number, end: number) {
  const before = value.slice(0, start).search(/\S+$/)
  const after = value.slice(end).search(/\s/)
  return value.slice(before === -1 ? start : before, after === -1 ? value.length : end + after)
}

function decorateCodeReferenceLink(link: HTMLAnchorElement, reference: CodeReference, resolvedPath?: string) {
  const label = codeReferenceLabel(link.textContent?.trim(), reference)
  link.classList.remove("external-link")
  link.classList.add("code-reference")
  link.href = "#rainny-code-reference"
  link.removeAttribute("target")
  link.removeAttribute("rel")
  link.dataset.codeReferencePath = reference.path
  if (reference.line === undefined) link.removeAttribute("data-code-reference-line")
  else link.dataset.codeReferenceLine = String(reference.line)
  if (reference.column === undefined) link.removeAttribute("data-code-reference-column")
  else link.dataset.codeReferenceColumn = String(reference.column)
  link.title = `${resolvedPath ?? reference.path}${reference.line === undefined ? "" : `:${reference.line}${reference.column === undefined ? "" : `:${reference.column}`}`}`
  link.textContent = label
}

function codeReferenceLabel(current: string | undefined, reference: CodeReference) {
  const file = reference.path.replaceAll("\\", "/").split("/").at(-1) ?? reference.path
  const fallback = reference.line === undefined ? file : `${file} (line ${reference.line})`
  if (!current || isFileLocationLabel(current, reference, file)) return fallback
  if (reference.line === undefined || hasLineSuffix(current, reference.line)) return current
  return `${current} (line ${reference.line})`
}

function isFileLocationLabel(label: string, reference: CodeReference, file: string) {
  const paths = [reference.path, reference.path.replaceAll("\\", "/"), file]
  return paths.some((path) => {
    if (label === path) return true
    if (reference.line === undefined) return false
    return [
      `${path}:${reference.line}`,
      `${path}:${reference.line}:${reference.column}`,
      `${path}#L${reference.line}`,
      `${path} (line ${reference.line})`,
    ].includes(label)
  })
}

function hasLineSuffix(label: string, line: number) {
  const value = label.toLowerCase()
  return value.endsWith(`(line ${line})`) || value.endsWith(`:${line}`) || value.endsWith(`#l${line}`)
}

function codeReferenceFromLink(link: HTMLAnchorElement): CodeReference | undefined {
  const path = link.dataset.codeReferencePath
  const line = link.dataset.codeReferenceLine ? Number(link.dataset.codeReferenceLine) : undefined
  const column = link.dataset.codeReferenceColumn ? Number(link.dataset.codeReferenceColumn) : undefined
  if (!path) return
  if (line !== undefined && (!Number.isSafeInteger(line) || line < 1)) return
  if (column !== undefined && (!Number.isSafeInteger(column) || column < 1)) return
  return { path, ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) }
}

export function setupCodeReferenceLinks(
  root: HTMLDivElement,
  onOpen: CodeReferenceHandler | undefined,
  onOpenExternal?: CodeReferenceHandler,
) {
  if (!onOpen && !onOpenExternal) return
  const run = (event: MouseEvent, action: CodeReferenceHandler | undefined) => {
    const target = event.target
    if (!(target instanceof Element)) return false
    const link = target.closest("a.code-reference")
    if (!(link instanceof HTMLAnchorElement)) return false
    const reference = codeReferenceFromLink(link)
    if (!reference) return false
    event.preventDefault()
    if (!action) return true
    Promise.resolve(action(reference)).catch((error: unknown) => {
      console.error("Failed to open code reference", error)
    })
    return true
  }
  const handleClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return
    run(event, event.metaKey || event.ctrlKey ? (onOpenExternal ?? onOpen) : onOpen)
  }
  const handleContextMenu = (event: MouseEvent) => {
    if (!event.ctrlKey) return
    if (!run(event, onOpenExternal ?? onOpen)) return
    event.stopPropagation()
  }
  root.addEventListener("click", handleClick)
  root.addEventListener("contextmenu", handleContextMenu)
  return () => {
    root.removeEventListener("click", handleClick)
    root.removeEventListener("contextmenu", handleContextMenu)
  }
}
