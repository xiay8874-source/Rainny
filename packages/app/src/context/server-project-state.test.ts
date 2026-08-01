import { describe, expect, test } from "bun:test"
import { normalizeSharedProjects } from "./server-project-state"

describe("normalizeSharedProjects", () => {
  test("keeps explicit projects in order while dropping global and duplicate paths", () => {
    expect(
      normalizeSharedProjects([
        { worktree: "/repo/one", expanded: true },
        { worktree: "/", expanded: true },
        { worktree: "/repo/one/", expanded: false },
        { worktree: " /repo/two ", expanded: false },
      ]),
    ).toEqual([
      { worktree: "/repo/one", expanded: true },
      { worktree: "/repo/two", expanded: false },
    ])
  })
})
