import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"
import { openCodeReference, resolveCodeReferencePath } from "./code-reference"

describe("openCodeReference", () => {
  test("rejects files outside the workspace before launching an editor", async () => {
    await expect(
      openCodeReference({
        root: process.cwd(),
        path: "../../package.json",
        line: 1,
      }),
    ).rejects.toThrow("outside the allowed project workspaces")
  })

  test("accepts a file in an explicitly allowed sibling workspace", async () => {
    const path = await resolveCodeReferencePath({
      root: process.cwd(),
      roots: [resolve(process.cwd(), "../session-ui")],
      path: "../session-ui/src/components/code-reference.ts",
      line: 1,
    })
    expect(path).toEndWith("/packages/session-ui/src/components/code-reference.ts")
  })
})
