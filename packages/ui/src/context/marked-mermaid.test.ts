import { expect, test } from "bun:test"
import { highlightCodeBlocks, renderMermaidCodeBlock } from "./marked"

test("preserves mermaid language through the native markdown highlighting path", async () => {
  const html = '<p>Diagram:</p>\n<pre><code class="language-mermaid">flowchart TD\n  A --&gt; B\n</code></pre>\n'

  expect(await highlightCodeBlocks(html)).toBe(html)
})

test("renders an escaped mermaid block for the browser markdown path", () => {
  expect(renderMermaidCodeBlock('flowchart TD\n  A["<start>"] --> B & C')).toBe(
    '<pre><code class="language-mermaid">flowchart TD\n  A[&quot;&lt;start&gt;&quot;] --&gt; B &amp; C</code></pre>',
  )
})
