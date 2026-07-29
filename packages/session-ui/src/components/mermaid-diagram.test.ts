import { describe, expect, test } from "bun:test"
import { mermaidErrorSummary, repairCommonMermaidSyntax } from "./mermaid-renderer"
import { clampMermaidScale, mermaidFitSize, mermaidViewportHeight } from "./mermaid-scale"

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
})
