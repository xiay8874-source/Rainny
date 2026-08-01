import { describe, expect, test } from "bun:test"
import { fileViewScrollKey, supportsFilePreview } from "./file-view-mode"

describe("supportsFilePreview", () => {
  test("recognizes Markdown file extensions", () => {
    expect(supportsFilePreview("docs/README.md")).toBe(true)
    expect(supportsFilePreview("docs/guide.MARKDOWN")).toBe(true)
    expect(supportsFilePreview("notes/design.mdown")).toBe(true)
    expect(supportsFilePreview("notes/design.mkd")).toBe(true)
  })

  test("rejects non-Markdown paths", () => {
    expect(supportsFilePreview("src/index.ts")).toBe(false)
    expect(supportsFilePreview("docs/README.md.bak")).toBe(false)
    expect(supportsFilePreview(undefined)).toBe(false)
  })
})

describe("fileViewScrollKey", () => {
  test("keeps source and preview scroll positions separate", () => {
    expect(fileViewScrollKey("file://README.md", "source")).toBe("file://README.md")
    expect(fileViewScrollKey("file://README.md", "preview")).toBe("file://README.md:preview")
  })
})
