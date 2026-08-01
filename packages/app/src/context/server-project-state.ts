import { batch, createEffect, onCleanup } from "solid-js"
import { pathKey } from "@/utils/path-key"

export type SharedProject = { worktree: string; expanded: boolean }

type ProjectStore = {
  list: () => SharedProject[]
  open: (directory: string) => void
  remove: (directory: string) => void
  expand: (directory: string) => void
  collapse: (directory: string) => void
  move: (directory: string, index: number) => void
}

type ProjectStateClient = {
  get: () => Promise<{ data?: { initialized: boolean; projects: SharedProject[] } }>
  update: (input: { projects: SharedProject[] }) => Promise<{ data?: { projects: SharedProject[] } }>
}

export function normalizeSharedProjects(projects: SharedProject[]) {
  const seen = new Set<string>()
  return projects.flatMap((project) => {
    const worktree = project.worktree.trim()
    const key = pathKey(worktree)
    if (!worktree || worktree === "/" || seen.has(key)) return []
    seen.add(key)
    return [{ worktree, expanded: project.expanded }]
  })
}

export function createServerProjectState(input: {
  platform: "desktop" | "web"
  projects: ProjectStore
  client: ProjectStateClient
  ready: Promise<unknown>
}) {
  const state = {
    hydrated: false,
    applying: false,
    publishing: false,
    refreshing: false,
    last: "",
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  }

  const key = (projects: SharedProject[]) => JSON.stringify(normalizeSharedProjects(projects))

  const apply = (projects: SharedProject[]) => {
    const desired = normalizeSharedProjects(projects)
    const desiredKeys = new Set(desired.map((project) => pathKey(project.worktree)))
    state.applying = true
    batch(() => {
      input.projects
        .list()
        .filter((project) => !desiredKeys.has(pathKey(project.worktree)))
        .forEach((project) => input.projects.remove(project.worktree))
      desired.toReversed().forEach((project) => {
        if (input.projects.list().some((item) => pathKey(item.worktree) === pathKey(project.worktree))) return
        input.projects.open(project.worktree)
      })
      desired.forEach((project, index) => {
        input.projects.move(project.worktree, index)
        if (project.expanded) input.projects.expand(project.worktree)
        if (!project.expanded) input.projects.collapse(project.worktree)
      })
    })
    state.last = key(desired)
    state.applying = false
  }

  const publish = async (projects: SharedProject[]) => {
    const normalized = normalizeSharedProjects(projects)
    state.publishing = true
    const result = await input.client.update({ projects: normalized }).catch(() => undefined)
    state.publishing = false
    if (!result?.data) return
    state.last = key(result.data.projects)
  }

  const refresh = async () => {
    if (state.refreshing || state.publishing) return
    state.refreshing = true
    const result = await input.client.get().catch(() => undefined)
    state.refreshing = false
    if (!result?.data?.initialized) return
    if (key(result.data.projects) === state.last) return
    apply(result.data.projects)
  }

  void input.ready.then(async () => {
    const result = await input.client.get().catch(() => undefined)
    if (!result?.data) return
    state.hydrated = true
    if (result.data.initialized) {
      apply(result.data.projects)
      return
    }
    if (input.platform === "desktop") {
      await publish(input.projects.list())
      return
    }
    apply([])
  })

  createEffect(() => {
    const projects = normalizeSharedProjects(input.projects.list())
    const current = key(projects)
    if (!state.hydrated || state.applying || current === state.last) return
    if (state.timer) clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      state.timer = undefined
      void publish(projects)
    }, 100)
  })

  const interval = setInterval(() => void refresh(), 2_000)
  onCleanup(() => {
    clearInterval(interval)
    if (state.timer) clearTimeout(state.timer)
  })
}
