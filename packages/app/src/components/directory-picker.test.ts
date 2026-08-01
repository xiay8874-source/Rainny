import { describe, expect, test } from "bun:test"
import { directoryPickerKind, serverDirectoryPickerVariant } from "./directory-picker-policy"

const local = {
  type: "sidecar",
  variant: "base",
  http: { url: "http://localhost:4096" },
} as const
const remote = {
  type: "ssh",
  host: "example.test",
  http: { url: "http://localhost:4096" },
} as const

describe("directoryPickerKind", () => {
  test("uses the native picker only for local desktop projects", () => {
    expect(directoryPickerKind("desktop", local)).toBe("native")
    expect(directoryPickerKind("desktop", remote)).toBe("server")
    expect(directoryPickerKind("web", local)).toBe("server")
  })
})

describe("serverDirectoryPickerVariant", () => {
  test("keeps server browsing available in web clients", () => {
    expect(serverDirectoryPickerVariant("web", false)).toBe("v2")
    expect(serverDirectoryPickerVariant("web", true)).toBe("v2")
  })

  test("respects the desktop layout preference", () => {
    expect(serverDirectoryPickerVariant("desktop", false)).toBe("legacy")
    expect(serverDirectoryPickerVariant("desktop", true)).toBe("v2")
  })
})
