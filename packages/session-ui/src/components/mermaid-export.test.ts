import { describe, expect, test } from "bun:test"
import { getMermaidSvgSize } from "./mermaid-export"

describe("Mermaid export", () => {
  test("uses the SVG viewBox dimensions", () => {
    expect(
      getMermaidSvgSize({
        getAttribute: (name) => (name === "viewBox" ? "0 0 640 360" : null),
      }),
    ).toEqual({ width: 640, height: 360 })
  })

  test("falls back to explicit width and height", () => {
    expect(
      getMermaidSvgSize({
        getAttribute: (name) => ({ width: "800", height: "450" })[name] ?? null,
      }),
    ).toEqual({ width: 800, height: 450 })
  })

  test("uses safe defaults for missing dimensions", () => {
    expect(getMermaidSvgSize({ getAttribute: () => null })).toEqual({ width: 1200, height: 800 })
  })
})
