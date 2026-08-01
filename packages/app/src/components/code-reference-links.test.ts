import { describe, expect, test } from "bun:test"
import { markCodeReferences, setupCodeReferenceLinks } from "@opencode-ai/session-ui/code-reference-links"

describe("markCodeReferences", () => {
  test("turns inline paths and explicit markdown targets into internal links", () => {
    const root = document.createElement("div")
    root.innerHTML = `<p><code>src/Foo.java:42</code> and <a href="src/Bar.java#L8">Bar</a> and <a href="https://example.com"><code>Foo.java:9</code></a></p>`

    markCodeReferences(root)

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.code-reference"))
    expect(links).toHaveLength(2)
    expect(links[0]?.dataset.codeReferencePath).toBe("src/Foo.java")
    expect(links[0]?.dataset.codeReferenceLine).toBe("42")
    expect(links[0]?.textContent).toBe("Foo.java (line 42)")
    expect(links[1]?.dataset.codeReferencePath).toBe("src/Bar.java")
    expect(links[1]?.dataset.codeReferenceLine).toBe("8")
    expect(links[1]?.getAttribute("target")).toBeNull()
    expect(links[1]?.textContent).toBe("Bar (line 8)")
    expect(root.querySelector('a[href="https://example.com"]')).toBeInstanceOf(HTMLAnchorElement)
  })

  test("preserves a source symbol instead of replacing it with the file name", () => {
    const root = document.createElement("div")
    root.innerHTML = `<p><a href="src/CallLabelHelper.java#L1200"><code>CallLabelHelper.batchCallShippingLabel</code></a></p>`

    markCodeReferences(root)

    const link = root.querySelector<HTMLAnchorElement>("a.code-reference")
    expect(link?.textContent).toBe("CallLabelHelper.batchCallShippingLabel (line 1200)")
    expect(link?.dataset.codeReferencePath).toBe("src/CallLabelHelper.java")
    expect(link?.dataset.codeReferenceLine).toBe("1200")
  })

  test("turns verified plain-text source locations into internal links", () => {
    const root = document.createElement("div")
    root.innerHTML = `<p>入口：PackageOperateServiceImpl.createPackage (bg-sheep-api/src/main/java/PackageOperateServiceImpl.java:135)，保留 https://example.com/src/Foo.java:9、method:42 和 12.34:56。</p>`

    markCodeReferences(root)

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.code-reference"))
    expect(links).toHaveLength(1)
    expect(links[0]?.dataset.codeReferencePath).toBe("bg-sheep-api/src/main/java/PackageOperateServiceImpl.java")
    expect(links[0]?.dataset.codeReferenceLine).toBe("135")
    expect(links[0]?.textContent).toBe("PackageOperateServiceImpl.java (line 135)")
    expect(root.textContent).toContain("https://example.com/src/Foo.java:9")
    expect(root.textContent).toContain("12.34:56")
  })

  test("dispatches a structured reference and prevents navigation", async () => {
    const root = document.createElement("div")
    root.innerHTML = `<p><code>src/Foo.java:42:8</code></p>`
    markCodeReferences(root)
    const opened: unknown[] = []
    const cleanup = setupCodeReferenceLinks(root, (reference) => {
      opened.push(reference)
    })
    const link = root.querySelector<HTMLAnchorElement>("a.code-reference")
    expect(link).toBeInstanceOf(HTMLAnchorElement)
    if (!link) return

    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    link.dispatchEvent(event)
    await Promise.resolve()

    expect(event.defaultPrevented).toBe(true)
    expect(opened).toEqual([{ path: "src/Foo.java", line: 42, column: 8 }])
    cleanup?.()
  })

  test("turns file-only Markdown targets into openable references", () => {
    const root = document.createElement("div")
    root.innerHTML = `<p><a href="bg-sheep-service/src/main/java/CallLabelHelper.java">CallLabelHelper.java</a></p>`

    markCodeReferences(root)

    const link = root.querySelector<HTMLAnchorElement>("a.code-reference")
    expect(link).toBeInstanceOf(HTMLAnchorElement)
    expect(link?.dataset.codeReferencePath).toBe("bg-sheep-service/src/main/java/CallLabelHelper.java")
    expect(link?.dataset.codeReferenceLine).toBeUndefined()
    expect(link?.title).toBe("bg-sheep-service/src/main/java/CallLabelHelper.java")
    expect(link?.textContent).toBe("CallLabelHelper.java")
  })

  test("opens modified clicks in the system default application", async () => {
    const root = document.createElement("div")
    root.innerHTML = `<p><a href="src/Foo.java#L42">Foo</a></p>`
    markCodeReferences(root)
    const opened: string[] = []
    const cleanup = setupCodeReferenceLinks(
      root,
      () => {
        opened.push("rainny")
      },
      () => {
        opened.push("default")
      },
    )
    const link = root.querySelector<HTMLAnchorElement>("a.code-reference")
    expect(link).toBeInstanceOf(HTMLAnchorElement)
    if (!link) return

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true }))
    link.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ctrlKey: true }))
    await Promise.resolve()

    expect(opened).toEqual(["default", "default"])
    cleanup?.()
  })
})
