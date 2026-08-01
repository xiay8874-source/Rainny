import { describe, expect, test } from "bun:test"
import { parseCodeFileReference, parseCodeReference } from "./code-reference"

describe("parseCodeReference", () => {
  test("parses relative paths with line and column", () => {
    expect(parseCodeReference("src/CallLabelCommand.java:287:8")).toEqual({
      path: "src/CallLabelCommand.java",
      line: 287,
      column: 8,
    })
  })

  test("parses hash line references and trims punctuation", () => {
    expect(parseCodeReference("CallLabelCommand.java#L42-L46)")).toEqual({
      path: "CallLabelCommand.java",
      line: 42,
    })
  })

  test("keeps Windows drive letters intact", () => {
    expect(parseCodeReference("C:\\work\\CallLabelCommand.java:42")).toEqual({
      path: "C:\\work\\CallLabelCommand.java",
      line: 42,
    })
  })

  test("rejects URLs and invalid locations", () => {
    expect(parseCodeReference("https://example.com/Foo.java:42")).toBeUndefined()
    expect(parseCodeReference("Foo.java:0")).toBeUndefined()
    expect(parseCodeReference("method:42")).toBeUndefined()
  })

  test("parses file-only Markdown targets", () => {
    expect(parseCodeFileReference("bg-sheep-service/src/main/java/CallLabelHelper.java")).toEqual({
      path: "bg-sheep-service/src/main/java/CallLabelHelper.java",
    })
    expect(parseCodeFileReference("https://example.com/CallLabelHelper.java")).toBeUndefined()
  })
})
