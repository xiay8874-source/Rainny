import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"

test("does not retain a Show-narrowed provider accessor across model control remounts", () => {
  const source = readFileSync(new URL("./prompt-input-v2.tsx", import.meta.url), "utf8")

  expect(source).not.toMatch(
    /<Show when=\{props\.providerID\}>[\s\S]*?\{\(providerID\) =>[\s\S]*?id=\{providerID\(\)\}/,
  )
})
