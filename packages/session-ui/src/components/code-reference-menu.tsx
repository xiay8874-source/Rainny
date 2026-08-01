import { createSignal, For, onCleanup, onMount, Show, type ParentProps } from "solid-js"
import { ContextMenu } from "@opencode-ai/ui/context-menu"
import type { CodeReference } from "./code-reference"
import { parseCodeFileReference, parseCodeReference } from "./code-reference"
import { useCodeReference, type CodeReferenceMenu } from "../context/code-reference"

type CodeReferenceMenuSurfaceProps = ParentProps<{
  menu?: CodeReferenceMenu
}>

export function CodeReferenceMenuSurface(props: CodeReferenceMenuSurfaceProps) {
  const [reference, setReference] = createSignal<CodeReference>()
  const [defaultApp, setDefaultApp] = createSignal("Default app")
  let surface: HTMLDivElement | undefined

  const onContextMenu = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const link = target.closest("a.code-reference")
    if (!(link instanceof HTMLAnchorElement)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.ctrlKey) return
    const next = parseCodeReferenceFromLink(link)
    if (!next) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    setReference(next)
    setDefaultApp("Default app")
    void Promise.resolve(props.menu?.getDefaultApp?.(next)).then((app) => {
      if (reference() !== next) return
      if (app) setDefaultApp(app)
    })
  }

  if (!props.menu) return props.children

  onMount(() => surface?.addEventListener("contextmenu", onContextMenu, true))
  onCleanup(() => surface?.removeEventListener("contextmenu", onContextMenu, true))

  return (
    <div ref={surface}>
      <ContextMenu
        modal={false}
        onOpenChange={(open) => {
          if (!open) setReference(undefined)
        }}
      >
        <ContextMenu.Trigger as="div">{props.children}</ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content class="code-reference-context-menu">
            <Show when={reference()}>
              {(current) => (
                <>
                  <Show when={props.menu?.openDefault}>
                    {(action) => (
                      <ContextMenu.Item onSelect={() => void action()(current())}>
                        <ContextMenu.ItemLabel>{props.menu?.labels.openDefault(defaultApp())}</ContextMenu.ItemLabel>
                      </ContextMenu.Item>
                    )}
                  </Show>
                  <Show when={props.menu?.openWith && props.menu.apps?.length}>
                    <ContextMenu.Sub>
                      <ContextMenu.SubTrigger>
                        <span>{props.menu?.labels.openWith}</span>
                      </ContextMenu.SubTrigger>
                      <ContextMenu.Portal>
                        <ContextMenu.SubContent class="code-reference-context-menu">
                          <For each={props.menu?.apps ?? []}>
                            {(app) => (
                              <ContextMenu.Item onSelect={() => void props.menu?.openWith?.(current(), app.id)}>
                                <ContextMenu.ItemLabel>{app.label}</ContextMenu.ItemLabel>
                              </ContextMenu.Item>
                            )}
                          </For>
                        </ContextMenu.SubContent>
                      </ContextMenu.Portal>
                    </ContextMenu.Sub>
                  </Show>
                  <Show when={props.menu?.copyPath || props.menu?.copyContent || props.menu?.reveal}>
                    <ContextMenu.Separator />
                  </Show>
                  <Show when={props.menu?.copyPath}>
                    {(action) => (
                      <ContextMenu.Item onSelect={() => void action()(current())}>
                        <ContextMenu.ItemLabel>{props.menu?.labels.copyPath}</ContextMenu.ItemLabel>
                      </ContextMenu.Item>
                    )}
                  </Show>
                  <Show when={props.menu?.copyContent}>
                    {(action) => (
                      <ContextMenu.Item onSelect={() => void action()(current())}>
                        <ContextMenu.ItemLabel>{props.menu?.labels.copyContent}</ContextMenu.ItemLabel>
                      </ContextMenu.Item>
                    )}
                  </Show>
                  <Show when={props.menu?.reveal}>
                    {(action) => (
                      <ContextMenu.Item onSelect={() => void action()(current())}>
                        <ContextMenu.ItemLabel>{props.menu?.labels.reveal}</ContextMenu.ItemLabel>
                      </ContextMenu.Item>
                    )}
                  </Show>
                </>
              )}
            </Show>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>
    </div>
  )
}

function parseCodeReferenceFromLink(link: HTMLAnchorElement) {
  const path = link.dataset.codeReferencePath
  const line = link.dataset.codeReferenceLine ? Number(link.dataset.codeReferenceLine) : undefined
  const column = link.dataset.codeReferenceColumn ? Number(link.dataset.codeReferenceColumn) : undefined
  if (path && (line === undefined || (Number.isSafeInteger(line) && line > 0))) {
    if (column === undefined || (Number.isSafeInteger(column) && column > 0)) {
      return { path, ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) }
    }
  }
  return parseCodeReference(link.textContent ?? "") ?? parseCodeFileReference(link.textContent ?? "")
}
