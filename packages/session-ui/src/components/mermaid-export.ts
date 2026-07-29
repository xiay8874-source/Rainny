const EXPORT_BASENAME = "rainny-mermaid"
const MAX_PNG_DIMENSION = 4096

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadMermaidSource(source: string) {
  triggerDownload(new Blob([source], { type: "text/plain;charset=utf-8" }), `${EXPORT_BASENAME}.mmd`)
}

export function downloadMermaidSvg(svg: string) {
  triggerDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${EXPORT_BASENAME}.svg`)
}

interface SvgElementLike {
  getAttribute(name: string): string | null
}

export function getMermaidSvgSize(svgElement: SvgElementLike) {
  const viewBox =
    svgElement
      .getAttribute("viewBox")
      ?.split(/[\s,]+/)
      .map(Number) ?? []
  const width = viewBox[2] || Number.parseFloat(svgElement.getAttribute("width") ?? "") || 1200
  const height = viewBox[3] || Number.parseFloat(svgElement.getAttribute("height") ?? "") || 800
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

export async function downloadMermaidPng(svg: string, darkMode: boolean) {
  const documentNode = new DOMParser().parseFromString(svg, "image/svg+xml")
  const svgElement = documentNode.documentElement
  const { width, height } = getMermaidSvgSize(svgElement)
  const pixelRatio = Math.min(2, MAX_PNG_DIMENSION / Math.max(width, height))

  svgElement.setAttribute("width", String(width))
  svgElement.setAttribute("height", String(height))

  const normalizedSvg = new XMLSerializer().serializeToString(svgElement)
  const svgUrl = URL.createObjectURL(new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Unable to load Mermaid SVG for PNG export"))
      image.src = svgUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = Math.ceil(width * pixelRatio)
    canvas.height = Math.ceil(height * pixelRatio)
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas is unavailable")

    context.scale(pixelRatio, pixelRatio)
    context.fillStyle = darkMode ? "#111827" : "#ffffff"
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Unable to encode Mermaid PNG"))
      }, "image/png")
    })
    triggerDownload(pngBlob, `${EXPORT_BASENAME}.png`)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
