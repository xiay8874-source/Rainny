export const MIN_MERMAID_SCALE = 0.25
export const MAX_MERMAID_SCALE = 8
export const MERMAID_SCALE_STEP = 0.2
export const DEFAULT_MERMAID_SCALE = 1

type MermaidRect = {
  left: number
  right: number
  top: number
  bottom: number
}

function wheelAxisDelta(
  viewportStart: number,
  viewportEnd: number,
  diagramStart: number,
  diagramEnd: number,
  delta: number,
) {
  if (diagramEnd - diagramStart <= viewportEnd - viewportStart + 0.5) return 0
  const desired = -delta
  const minimum = viewportEnd - diagramEnd
  const maximum = viewportStart - diagramStart
  return Math.min(maximum, Math.max(minimum, desired))
}

export function mermaidWheelPanDelta(input: {
  viewport: MermaidRect
  diagram: MermaidRect
  deltaX: number
  deltaY: number
  shiftKey: boolean
}) {
  const horizontalDelta = input.shiftKey && input.deltaX === 0 ? input.deltaY : input.deltaX
  const verticalDelta = input.shiftKey && input.deltaX === 0 ? 0 : input.deltaY
  return {
    x: wheelAxisDelta(
      input.viewport.left,
      input.viewport.right,
      input.diagram.left,
      input.diagram.right,
      horizontalDelta,
    ),
    y: wheelAxisDelta(
      input.viewport.top,
      input.viewport.bottom,
      input.diagram.top,
      input.diagram.bottom,
      verticalDelta,
    ),
  }
}

export function mermaidNeedsMacTrafficLightInset(platform: string, userAgent: string) {
  return /(Mac|iPod|iPhone|iPad)/.test(platform) && /Electron\//.test(userAgent)
}

export function clampMermaidScale(scale: number) {
  return Math.min(MAX_MERMAID_SCALE, Math.max(MIN_MERMAID_SCALE, Number(scale.toFixed(2))))
}

export function mermaidFitSize(
  diagram: { width: number; height: number },
  viewport: { width: number; height: number },
  padding = 48,
) {
  if (diagram.width <= 0 || diagram.height <= 0) return { width: 0, height: 0 }
  const availableWidth = Math.max(1, viewport.width - padding)
  const availableHeight = Math.max(1, viewport.height - padding)
  const fitWidthRatio = Math.min(availableWidth / diagram.width, 1)
  const ratio =
    diagram.height / diagram.width > 1.35
      ? fitWidthRatio
      : Math.min(fitWidthRatio, availableHeight / diagram.height, 1)
  return {
    width: Math.round(diagram.width * ratio),
    height: Math.round(diagram.height * ratio),
  }
}

export function mermaidViewportHeight(diagram: { width: number; height: number }, containerWidth: number) {
  if (diagram.width <= 0 || diagram.height <= 0 || containerWidth <= 0) return 320
  const projectedHeight = ((containerWidth - 48) * diagram.height) / diagram.width + 48
  return Math.round(Math.min(520, Math.max(280, projectedHeight)))
}
