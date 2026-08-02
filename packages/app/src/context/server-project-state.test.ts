import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { ServerScope } from "@/utils/server-scope"
import { createServerProjects } from "./server"
import { createServerProjectState, normalizeSharedProjects } from "./server-project-state"

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

  test("replaces a polluted web list with the shared explicit projects", async () => {
    await createRoot(async (dispose) => {
      const [store, setStore] = createStore({ projects: {}, lastProject: {}, recentlyClosed: {} })
      const projects = createServerProjects({ scope: () => ServerScope.local, store, setStore })
      projects.open("/history/one")
      projects.open("/history/two")

      createServerProjectState({
        platform: "web",
        projects,
        ready: Promise.resolve(),
        client: {
          get: async () => ({
            data: { initialized: true, projects: [{ worktree: "/explicit/project", expanded: true }] },
          }),
          update: async (input) => ({ data: { initialized: true, projects: input.projects } }),
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(projects.list()).toEqual([{ worktree: "/explicit/project", expanded: true }])
      dispose()
    })
  })
})
