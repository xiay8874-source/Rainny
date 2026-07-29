import Panzoom, { type PanzoomObject } from "@panzoom/panzoom"
import { Icon } from "@opencode-ai/ui/icon"
import { Icon as IconV2 } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { createEffect, createSignal, createUniqueId, onCleanup, onMount, Show, type JSX } from "solid-js"
import { Portal, render } from "solid-js/web"
import { downloadMermaidPng, downloadMermaidSource, downloadMermaidSvg } from "./mermaid-export"
import { mermaidErrorSummary, renderMermaidDiagram, type MermaidTheme } from "./mermaid-renderer"
import {
  clampMermaidScale,
  DEFAULT_MERMAID_SCALE,
  MAX_MERMAID_SCALE,
  mermaidFitSize,
  MERMAID_SCALE_STEP,
  MIN_MERMAID_SCALE,
  mermaidViewportHeight,
} from "./mermaid-scale"

type RenderedDiagram =
  | { svg: string; repaired: boolean; error: "" }
  | { svg: ""; repaired: false; error: string }

function getMermaidTheme(): MermaidTheme {
  return document.documentElement.dataset.colorScheme === "dark" ? "dark" : "default"
}

function diagramTitle(source: string) {
  const kind = source.trimStart().split(/\s/, 1)[0]?.toLowerCase()
  if (kind === "flowchart" || kind === "graph") return "流程图"
  if (kind === "sequencediagram") return "时序图"
  if (kind === "statediagram" || kind === "statediagram-v2") return "状态图"
  if (kind === "classdiagram") return "类图"
  if (kind === "erdiagram") return "关系图"
  if (kind === "gantt") return "甘特图"
  return "图表"
}

function ToolButton(props: {
  label: string
  title: string
  disabled?: boolean
  pressed?: boolean
  onClick: () => void
  children: JSX.Element
}) {
  return (
    <TooltipV2 placement="top" value={props.title}>
      <IconButtonV2
        type="button"
        size="small"
        variant="ghost-muted"
        aria-label={props.label}
        aria-pressed={props.pressed}
        disabled={props.disabled}
        onClick={props.onClick}
        icon={props.children}
      />
    </TooltipV2>
  )
}

function TextButton(props: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: JSX.Element
}) {
  return (
    <button
      type="button"
      data-slot="mermaid-text-action"
      aria-label={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function MermaidDiagram(props: { source: string; complete?: boolean }) {
  const id = createUniqueId()
  let container: HTMLDivElement | undefined
  let stage: HTMLDivElement | undefined
  let panzoom: PanzoomObject | undefined
  let copyResetTimeout: ReturnType<typeof setTimeout> | undefined
  const [theme, setTheme] = createSignal<MermaidTheme>(getMermaidTheme())
  const [diagram, setDiagram] = createSignal<RenderedDiagram>()
  const [scale, setScale] = createSignal(DEFAULT_MERMAID_SCALE)
  const [showSource, setShowSource] = createSignal(false)
  const [showDownloadMenu, setShowDownloadMenu] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  const [viewportHeight, setViewportHeight] = createSignal(320)
  let renderSequence = 0

  const copySource = async () => {
    await navigator.clipboard.writeText(props.source)
    setCopied(true)
    if (copyResetTimeout) clearTimeout(copyResetTimeout)
    copyResetTimeout = setTimeout(() => setCopied(false), 1500)
  }

  const changeScale = (delta: number) => {
    if (!panzoom) return
    panzoom.zoom(clampMermaidScale(panzoom.getScale() + delta), { animate: true })
  }

  const resetView = () => {
    if (!panzoom) return
    panzoom.reset({ animate: true })
  }

  onMount(() => {
    const observer = new MutationObserver(() => setTheme(getMermaidTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-scheme"] })
    onCleanup(() => observer.disconnect())
  })

  onCleanup(() => {
    if (copyResetTimeout) clearTimeout(copyResetTimeout)
    panzoom?.destroy()
  })

  createEffect(() => {
    if (!expanded()) return
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      setExpanded(false)
    }

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    document.addEventListener("keydown", closeOnEscape, true)
    requestAnimationFrame(() => container?.focus())

    onCleanup(() => {
      document.removeEventListener("keydown", closeOnEscape, true)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
    })
  })

  createEffect(() => {
    const selectedTheme = theme()
    const source = props.source.trim()
    const complete = props.complete ?? true
    if (!complete || !source) {
      setDiagram()
      return
    }

    const diagramID = `rainny-mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${++renderSequence}`
    let active = true
    setDiagram()

    void renderMermaidDiagram({ id: diagramID, source, theme: selectedTheme })
      .then((result) => {
        if (active) setDiagram({ ...result, error: "" })
      })
      .catch((error) => {
        if (active) setDiagram({ svg: "", repaired: false, error: mermaidErrorSummary(error) })
      })

    onCleanup(() => {
      active = false
    })
  })

  createEffect(() => {
    expanded()
    const rendered = diagram()
    if (!rendered || rendered.error || showSource()) return
    let disposePanzoom = () => {}
    let frame = requestAnimationFrame(() => {
      const currentStage = stage
      if (!currentStage) return
      const svg = currentStage.querySelector("svg")
      if (!(svg instanceof SVGSVGElement)) return

      const viewBox = svg.viewBox.baseVal
      const diagramSize = {
        width: viewBox?.width || svg.getBBox().width,
        height: viewBox?.height || svg.getBBox().height,
      }
      let lastStageWidth = -1
      let fitFrame = 0
      const fit = () => {
        if (diagramSize.width <= 0 || diagramSize.height <= 0) return
        const stageWidth = Math.round(currentStage.clientWidth)
        if (stageWidth === lastStageWidth) return
        lastStageWidth = stageWidth
        const nextHeight = mermaidViewportHeight(diagramSize, stageWidth)
        setViewportHeight(nextHeight)
        cancelAnimationFrame(fitFrame)
        fitFrame = requestAnimationFrame(() => {
          const size = mermaidFitSize(diagramSize, {
            width: currentStage.clientWidth,
            height: currentStage.clientHeight,
          })
          svg.style.width = `${size.width}px`
          svg.style.height = `${size.height}px`
        })
      }

      fit()
      const instance = Panzoom(svg, {
        canvas: true,
        minScale: MIN_MERMAID_SCALE,
        maxScale: MAX_MERMAID_SCALE,
        step: MERMAID_SCALE_STEP,
        startScale: DEFAULT_MERMAID_SCALE,
        panOnlyWhenZoomed: false,
        cursor: "grab",
      })
      panzoom = instance
      const handleChange = (event: Event) => {
        const detail = (event as CustomEvent<{ scale: number }>).detail
        if (detail?.scale) setScale(clampMermaidScale(detail.scale))
      }
      const handleWheel = (event: WheelEvent) => {
        if (!event.metaKey && !event.ctrlKey) return
        event.preventDefault()
        instance.zoomWithWheel(event)
      }
      const resizeObserver = new ResizeObserver(fit)
      resizeObserver.observe(currentStage)
      svg.addEventListener("panzoomchange", handleChange)
      currentStage.addEventListener("wheel", handleWheel, { passive: false })

      disposePanzoom = () => {
        cancelAnimationFrame(fitFrame)
        resizeObserver.disconnect()
        svg.removeEventListener("panzoomchange", handleChange)
        currentStage.removeEventListener("wheel", handleWheel)
        instance.destroy()
        if (panzoom === instance) panzoom = undefined
        setScale(DEFAULT_MERMAID_SCALE)
      }
    })

    onCleanup(() => {
      cancelAnimationFrame(frame)
      disposePanzoom()
    })
  })

  const ready = () => diagram() && !diagram()!.error

  const surface = () => (
    <div
      ref={container}
      data-component="mermaid-diagram"
      data-expanded={expanded() ? "true" : undefined}
      data-state={!props.complete ? "streaming" : !diagram() ? "loading" : diagram()?.error ? "error" : "ready"}
      aria-label={!diagram() ? "Mermaid diagram loading" : "Mermaid diagram"}
      aria-modal={expanded() ? "true" : undefined}
      role={expanded() ? "dialog" : undefined}
      tabIndex={expanded() ? -1 : undefined}
    >
      <Show
        when={props.complete ?? true}
        fallback={<div data-slot="mermaid-pending">图表生成中…</div>}
      >
        <Show when={diagram()}>
          {(rendered) => (
            <>
              <div data-slot="mermaid-toolbar">
                <div data-slot="mermaid-heading">
                  <span data-slot="mermaid-title">{diagramTitle(props.source)}</span>
                  <Show when={rendered().repaired}>
                    <span data-slot="mermaid-compat" title="已自动兼容常见 Mermaid 语法">
                      兼容显示
                    </span>
                  </Show>
                </div>
                <div data-slot="mermaid-actions">
                  <Show when={!rendered().error}>
                    <div data-slot="mermaid-zoom-controls" aria-label="图表缩放">
                      <ToolButton
                        label="缩小"
                        title="缩小"
                        disabled={showSource() || scale() <= MIN_MERMAID_SCALE}
                        onClick={() => changeScale(-MERMAID_SCALE_STEP)}
                      >
                        <span aria-hidden="true">−</span>
                      </ToolButton>
                      <button
                        type="button"
                        data-slot="mermaid-scale"
                        aria-label="恢复适合窗口"
                        title="恢复适合窗口"
                        disabled={showSource()}
                        onClick={resetView}
                      >
                        {Math.round(scale() * 100)}%
                      </button>
                      <ToolButton
                        label="放大"
                        title="放大"
                        disabled={showSource() || scale() >= MAX_MERMAID_SCALE}
                        onClick={() => changeScale(MERMAID_SCALE_STEP)}
                      >
                        <span aria-hidden="true">+</span>
                      </ToolButton>
                    </div>
                  </Show>
                  <TextButton
                    label={showSource() ? "查看图形" : "查看源码"}
                    pressed={showSource()}
                    onClick={() => setShowSource((visible) => !visible)}
                  >
                    {showSource() ? "图形" : "源码"}
                  </TextButton>
                  <Show when={showSource()}>
                    <ToolButton label="复制源码" title="复制源码" onClick={() => void copySource()}>
                      <IconV2 name={copied() ? "check" : "outline-copy"} />
                    </ToolButton>
                  </Show>
                  <Show when={ready()}>
                    <div data-slot="mermaid-download">
                      <TextButton
                        label="导出图表"
                        pressed={showDownloadMenu()}
                        onClick={() => setShowDownloadMenu((visible) => !visible)}
                      >
                        导出
                      </TextButton>
                      <Show when={showDownloadMenu()}>
                        <div data-slot="mermaid-download-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setShowDownloadMenu(false)
                              void downloadMermaidPng(rendered().svg, theme() === "dark").catch((error) => {
                                console.error("Failed to export Mermaid PNG", error)
                              })
                            }}
                          >
                            PNG 图片
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDownloadMenu(false)
                              downloadMermaidSvg(rendered().svg)
                            }}
                          >
                            SVG 矢量图
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDownloadMenu(false)
                              downloadMermaidSource(props.source)
                            }}
                          >
                            Mermaid 源码 (.mmd)
                          </button>
                        </div>
                      </Show>
                    </div>
                    <ToolButton
                      label={expanded() ? "退出全屏" : "全屏查看"}
                      title={expanded() ? "退出全屏（Esc）" : "全屏查看"}
                      pressed={expanded()}
                      onClick={() => setExpanded((value) => !value)}
                    >
                      <IconV2 name={expanded() ? "collapse" : "expand"} />
                    </ToolButton>
                  </Show>
                </div>
              </div>

              <Show
                when={showSource()}
                fallback={
                  <Show
                    when={!rendered().error}
                    fallback={
                      <div data-slot="mermaid-error" role="alert">
                        <Icon name="warning" size="normal" />
                        <div>
                          <strong>图表语法有误</strong>
                          <span>{rendered().error}</span>
                        </div>
                        <TextButton label="查看 Mermaid 源码" onClick={() => setShowSource(true)}>
                          查看源码
                        </TextButton>
                      </div>
                    }
                  >
                    <div
                      ref={stage}
                      data-slot="mermaid-viewport"
                      style={{ "--mermaid-viewport-height": `${viewportHeight()}px` }}
                      innerHTML={rendered().svg}
                    />
                  </Show>
                }
              >
                <pre data-slot="mermaid-source">
                  <code>{props.source}</code>
                </pre>
              </Show>
            </>
          )}
        </Show>
      </Show>
    </div>
  )

  return (
    <Show when={expanded()} fallback={surface()}>
      <Portal>
        <div data-component="markdown" data-slot="mermaid-fullscreen-host">
          {surface()}
        </div>
      </Portal>
    </Show>
  )
}

export function mountMermaidDiagram(host: HTMLElement, source: string, complete = true) {
  return render(() => <MermaidDiagram source={source} complete={complete} />, host)
}
