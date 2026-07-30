import { describe, expect, test } from "bun:test"
import { createMermaidRenderQueue, mermaidErrorSummary, repairCommonMermaidSyntax } from "./mermaid-renderer"
import {
  clampMermaidScale,
  mermaidFitSize,
  mermaidNeedsMacTrafficLightInset,
  mermaidViewportHeight,
  mermaidWheelPanDelta,
} from "./mermaid-scale"

describe("Mermaid diagram", () => {
  test("clamps zoom between 25 and 800 percent", () => {
    expect(clampMermaidScale(0.1)).toBe(0.25)
    expect(clampMermaidScale(1.04)).toBe(1.04)
    expect(clampMermaidScale(9)).toBe(8)
  })

  test("fits large diagrams without enlarging small ones", () => {
    expect(mermaidFitSize({ width: 1000, height: 800 }, { width: 500, height: 400 })).toEqual({
      width: 440,
      height: 352,
    })
    expect(mermaidFitSize({ width: 400, height: 1200 }, { width: 1000, height: 500 })).toEqual({
      width: 400,
      height: 1200,
    })
    expect(mermaidFitSize({ width: 200, height: 100 }, { width: 800, height: 600 })).toEqual({
      width: 200,
      height: 100,
    })
  })

  test("keeps the embedded viewport compact", () => {
    expect(mermaidViewportHeight({ width: 1000, height: 800 }, 500)).toBe(410)
    expect(mermaidViewportHeight({ width: 200, height: 1000 }, 500)).toBe(520)
    expect(mermaidViewportHeight({ width: 1000, height: 100 }, 500)).toBe(280)
  })

  test("repairs descriptive subgraph titles without changing valid forms", () => {
    expect(
      repairCommonMermaidSyntax(`flowchart TD
  subgraph bg-sheep: 核心编排层 (无状态)
    A --> B
  end
  subgraph valid_id["Valid title"]
  end`),
    ).toBe(`flowchart TD
  subgraph rainny_subgraph_1["bg-sheep: 核心编排层 (无状态)"]
    A --> B
  end
  subgraph valid_id["Valid title"]
  end`)
  })

  test("summarizes parser errors without exposing the parser dump", () => {
    expect(mermaidErrorSummary(new Error("Parse error on line 12:\n..."))).toBe("第 12 行附近存在无法识别的语法")
  })

  test("pans oversized diagrams with a two-axis trackpad gesture", () => {
    expect(
      mermaidWheelPanDelta({
        viewport: { left: 0, right: 600, top: 0, bottom: 400 },
        diagram: { left: -200, right: 1000, top: -300, bottom: 900 },
        deltaX: 90,
        deltaY: 120,
        shiftKey: false,
      }),
    ).toEqual({ x: -90, y: -120 })
  })

  test("does not trap page scrolling on an axis that already fits", () => {
    expect(
      mermaidWheelPanDelta({
        viewport: { left: 0, right: 600, top: 0, bottom: 400 },
        diagram: { left: 0, right: 600, top: -300, bottom: 900 },
        deltaX: 90,
        deltaY: 120,
        shiftKey: false,
      }),
    ).toEqual({ x: 0, y: -120 })
  })

  test("keeps a diagram inside the viewport while trackpad panning", () => {
    expect(
      mermaidWheelPanDelta({
        viewport: { left: 0, right: 600, top: 0, bottom: 400 },
        diagram: { left: -600, right: 600, top: -800, bottom: 400 },
        deltaX: 90,
        deltaY: 120,
        shiftKey: false,
      }),
    ).toEqual({ x: 0, y: 0 })
  })

  test("reserves the macOS traffic-light area only in the desktop shell", () => {
    expect(mermaidNeedsMacTrafficLightInset("MacIntel", "Rainny/1.18.10 Electron/42.3.3")).toBe(true)
    expect(mermaidNeedsMacTrafficLightInset("MacIntel", "Safari/605.1.15")).toBe(false)
    expect(mermaidNeedsMacTrafficLightInset("Win32", "Rainny/1.18.10 Electron/42.3.3")).toBe(false)
  })

  test("skips obsolete work aborted while waiting in the render queue", async () => {
    const enqueue = createMermaidRenderQueue()
    let releaseFirst!: () => void
    const first = enqueue(() => new Promise<void>((resolve) => (releaseFirst = resolve)))
    const controller = new AbortController()
    let obsoleteStarted = false
    const obsolete = enqueue(async () => {
      obsoleteStarted = true
    }, controller.signal).catch((error) => error)
    let currentStarted = false
    const current = enqueue(async () => {
      currentStarted = true
      return "rendered"
    })

    await Promise.resolve()
    controller.abort()
    releaseFirst()

    await first
    expect(await obsolete).toMatchObject({ name: "AbortError" })
    expect(await current).toBe("rendered")
    expect(obsoleteStarted).toBe(false)
    expect(currentStarted).toBe(true)
  })
})
