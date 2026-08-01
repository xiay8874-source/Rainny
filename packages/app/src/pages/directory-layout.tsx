import {
  CodeReferenceProvider,
  DataProvider,
  type CodeReference,
  type CodeReferenceMenu,
} from "@opencode-ai/session-ui/context"
import { showToast } from "@/utils/toast"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { useLocation, useNavigate, useParams } from "@solidjs/router"
import { type Accessor, createEffect, createMemo, createResource, onCleanup, type ParentProps, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { LocalProvider } from "@/context/local"
import { SDKProvider } from "@/context/sdk"
import { useSync } from "@/context/sync"
import { decode64 } from "@/utils/base64"
import { Schema } from "effect"
import type { ServerConnection } from "@/context/server"
import { sessionHref } from "@/utils/session-route"
import { useServerSync } from "@/context/server-sync"
import { usePlatform } from "@/context/platform"
import { useLayout } from "@/context/layout"
import { detectOpenAppOS, openAppsForOS } from "@/components/session/open-in-app"

const DEFAULT_APP = "__default__"
const FILE_MANAGER = "__file_manager__"
const INTELLIJ_IDEA = "__intellij_idea__"

export function DirectoryDataProvider(
  props: ParentProps<{
    directory: string | Accessor<string>
    draftID?: string
    server?: Accessor<ServerConnection.Key | undefined>
  }>,
) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const sync = useSync()
  const serverSync = useServerSync()
  const platform = usePlatform()
  const language = useLanguage()
  const layout = useLayout()
  const directory = () => (typeof props.directory === "function" ? props.directory() : props.directory)
  const slug = createMemo(() => base64Encode(directory()))
  const href = (sessionID: string) => {
    const server = props.server?.()
    if (server) return sessionHref(server, sessionID)
    return `/${slug()}/session/${sessionID}`
  }
  const resolveCodeReference = (reference: CodeReference) => {
    const path = reference.path.replaceAll("\\", "/")
    if (/^(?:[A-Za-z]:\/|\/)/.test(path)) return path
    return `${directory().replace(/[\\/]+$/, "")}/${path}`
  }

  const resolveCodeReferencePath = (reference: CodeReference) => {
    const request = createCodeReferenceRequest(reference)
    return platform.resolveCodeReference?.(request) ?? Promise.resolve(resolveCodeReference(reference))
  }

  const openApps = createMemo(() => [
    ...openAppsForOS(detectOpenAppOS(platform)).map((item) => ({
      id: item.id,
      label: language.t(item.label),
      openWith: item.openWith,
    })),
  ])
  const [availableOpenApps] = createResource(openApps, async (apps) => {
    if (!platform.checkAppExists) return apps
    const entries = await Promise.all(
      apps.map(async (app) => {
        const exists = await platform.checkAppExists?.(app.openWith).catch(() => false)
        return exists ? app : undefined
      }),
    )
    return entries.filter((app): app is (typeof apps)[number] => !!app)
  })

  const runCodeReferenceAction =
    (action: (path: string) => Promise<unknown> | unknown) =>
    async (reference: CodeReference): Promise<void> => {
      const path = await resolveCodeReferencePath(reference)
      await Promise.resolve(action(path)).catch((error: unknown) => {
        showToast({
          variant: "error",
          title: language.t("common.requestFailed"),
          description: error instanceof Error ? error.message : String(error),
        })
        throw error
      })
    }

  const getDefaultApplication = (reference: CodeReference) =>
    platform.getDefaultApplication?.(createCodeReferenceRequest(reference)).catch(() => undefined)

  const openCodeReferenceDefault = async (reference: CodeReference) => {
    const app = await getDefaultApplication(reference)
    if (app?.toLowerCase().includes("intellij") && platform.openCodeReference) {
      return platform.openCodeReference(createCodeReferenceRequest(reference))
    }
    return runCodeReferenceAction((path) => platform.openPath?.(path))(reference)
  }

  const codeReferenceApps = createMemo(() => {
    const apps = (availableOpenApps() ?? []).map((app) => ({ id: app.openWith, label: app.label }))
    const take = (name: string) => apps.find((app) => app.id === name)
    const preferred = [
      take("Visual Studio Code"),
      take("Sublime Text"),
      { id: DEFAULT_APP, label: "Default app" },
      { id: FILE_MANAGER, label: language.t("session.header.open.finder") },
      take("Terminal"),
      take("IntelliJ IDEA") ? { id: INTELLIJ_IDEA, label: "IntelliJ IDEA" } : undefined,
    ].filter((app): app is { id: string; label: string } => !!app)
    const seen = new Set(preferred.map((app) => app.label))
    return [...preferred, ...apps.filter((app) => !seen.has(app.label))]
  })

  const codeReferenceMenu = createMemo<CodeReferenceMenu>(() => ({
    labels: {
      openDefault: (app) => language.t("session.header.open.action", { app }),
      openWith: language.t("session.header.openIn"),
      copyPath: language.t("session.header.open.copyPath"),
      copyContent: language.t("session.header.open.copyContent"),
      reveal: language.t("session.header.open.finder"),
    },
    getDefaultApp: getDefaultApplication,
    openDefault: platform.openPath ? openCodeReferenceDefault : undefined,
    openWith: platform.openPath
      ? (reference, app) => {
          if (app === DEFAULT_APP) return openCodeReferenceDefault(reference)
          if (app === FILE_MANAGER) return runCodeReferenceAction((path) => platform.revealPath?.(path))(reference)
          if (app === INTELLIJ_IDEA && platform.openCodeReference) {
            return platform.openCodeReference(createCodeReferenceRequest(reference))
          }
          return runCodeReferenceAction((path) => platform.openPath?.(path, app))(reference)
        }
      : undefined,
    copyPath: runCodeReferenceAction((path) => navigator.clipboard.writeText(path)),
    copyContent: platform.readLocalFile
      ? async (reference) => {
          const content = await platform.readLocalFile?.(createCodeReferenceRequest(reference))
          if (content !== undefined) await navigator.clipboard.writeText(content)
        }
      : undefined,
    reveal: platform.revealPath ? runCodeReferenceAction((path) => platform.revealPath?.(path)) : undefined,
    apps: codeReferenceApps(),
  }))

  function createCodeReferenceRequest(reference: CodeReference) {
    const roots = [
      directory(),
      ...layout.projects.list().flatMap((project) => [project.worktree, ...(project.sandboxes ?? [])]),
    ]
    return { root: directory(), roots, ...reference }
  }

  createEffect(() => {
    // A draft lives at /new-session?draftId=… and has no directory segment to normalize.
    if (props.draftID || props.server?.()) return
    const next = sync().data.path.directory
    if (!next || next === directory()) return
    const path = location.pathname.slice(slug().length + 1)
    navigate(`/${base64Encode(next)}${path}${location.search}${location.hash}`, { replace: true })
  })

  createResource(
    () => params.id,
    (id) =>
      sync()
        .session.sync(id)
        .catch(() => {}),
  )

  createEffect(() => {
    const sessionID = params.id
    if (!sessionID) return
    serverSync().session.pin(sessionID)
    onCleanup(() => serverSync().session.unpin(sessionID))
  })

  return (
    <Show when={directory()} keyed>
      {(directory) => (
        <DataProvider
          data={sync().data}
          directory={directory}
          sessionID={params.id}
          onNavigateToSession={(sessionID: string) => navigate(href(sessionID))}
          onSessionHref={href}
        >
          <CodeReferenceProvider
            openExternal={platform.openPath ? openCodeReferenceDefault : undefined}
            resolvePath={resolveCodeReference}
            menu={platform.platform === "desktop" ? codeReferenceMenu() : undefined}
          >
            <LocalProvider>{props.children}</LocalProvider>
          </CodeReferenceProvider>
        </DataProvider>
      )}
    </Show>
  )
}

export const ProjectDirString = Schema.String.pipe(Schema.brand("ProjectDirString"))
export type ProjectDirString = Schema.Schema.Type<typeof ProjectDirString>

export function decodeDirectory(dir: string): ProjectDirString | undefined {
  const decoded = decode64(dir)
  if (!decoded) return
  return ProjectDirString.make(decoded)
}

export default function Layout(props: ParentProps) {
  const params = useParams()
  const language = useLanguage()
  const navigate = useNavigate()
  let invalid = ""

  const resolved = createMemo(() => {
    if (!params.dir) return ""
    return decodeDirectory(params.dir) ?? ""
  })

  createEffect(() => {
    const dir = params.dir
    if (!dir) return
    if (resolved()) {
      invalid = ""
      return
    }
    if (invalid === dir) return
    invalid = dir
    showToast({
      variant: "error",
      title: language.t("common.requestFailed"),
      description: language.t("directory.error.invalidUrl"),
    })
    navigate("/", { replace: true })
  })

  return (
    <Show when={resolved()} keyed>
      {(resolved) => (
        <SDKProvider directory={resolved}>
          <DirectoryDataProvider directory={resolved}>{props.children}</DirectoryDataProvider>
        </SDKProvider>
      )}
    </Show>
  )
}
