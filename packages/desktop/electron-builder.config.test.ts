import { expect, test } from "bun:test"
import type { Configuration } from "electron-builder"

const channels = [
  { channel: "dev", appId: "com.xiay8874.rainny.desktop.dev", productName: "Rainny Dev" },
  { channel: "beta", appId: "com.xiay8874.rainny.desktop.beta", productName: "Rainny Beta" },
  { channel: "prod", appId: "com.xiay8874.rainny.desktop", productName: "Rainny" },
] as const

for (const channel of channels) {
  test(`uses one Linux desktop identity for ${channel.channel}`, async () => {
    const previous = process.env.RAINNY_CHANNEL
    process.env.RAINNY_CHANNEL = channel.channel

    const module = await import(`./electron-builder.config.ts?channel=${channel.channel}`)
    const config = module.default as Configuration

    if (previous === undefined) delete process.env.RAINNY_CHANNEL
    else process.env.RAINNY_CHANNEL = previous

    expect(config.appId).toBe(channel.appId)
    expect(config.extraMetadata?.desktopName).toBe(`${channel.appId}.desktop`)
    expect(config.linux?.executableName).toBe(channel.appId)
    expect(config.linux?.desktop?.entry?.StartupWMClass).toBe(channel.appId)
    expect(config.productName).toBe(channel.productName)
    expect(config.artifactName).toBe("rainny-desktop-${os}-${arch}.${ext}")
    if (channel.channel === "dev") {
      expect(config.publish).toBeUndefined()
    } else {
      expect(config.publish).toEqual({
        provider: "github",
        owner: "xiay8874-source",
        repo: "Rainny",
        channel: channel.channel === "beta" ? "beta" : "latest",
      })
    }
    expect(config.deb?.fpm).toContainEqual(expect.stringContaining(`/usr/share/metainfo/${channel.appId}.metainfo.xml`))
    expect(config.rpm?.fpm).toContainEqual(expect.stringContaining(`/usr/share/metainfo/${channel.appId}.metainfo.xml`))
  })
}

test("does not package the upstream Linux launcher", async () => {
  const previous = process.env.RAINNY_CHANNEL
  process.env.RAINNY_CHANNEL = "prod"

  const module = await import("./electron-builder.config.ts?compat=prod")
  const config = module.default as Configuration

  if (previous === undefined) delete process.env.RAINNY_CHANNEL
  else process.env.RAINNY_CHANNEL = previous

  expect(
    config.deb?.fpm?.some((entry) =>
      entry.endsWith("opencode-desktop.desktop=/usr/share/applications/opencode-desktop.desktop"),
    ),
  ).toBe(false)
  expect(
    config.rpm?.fpm?.some((entry) =>
      entry.endsWith("opencode-desktop.desktop=/usr/share/applications/opencode-desktop.desktop"),
    ),
  ).toBe(false)
})

test("bundles the CLI outside the dev app archive", async () => {
  const previous = process.env.RAINNY_CHANNEL
  process.env.RAINNY_CHANNEL = "dev"
  const module = await import("./electron-builder.config.ts?cli-resource")
  const config = module.default as Configuration
  if (previous === undefined) delete process.env.RAINNY_CHANNEL
  else process.env.RAINNY_CHANNEL = previous

  expect(config.files).toContain("!resources/rainny-cli*")
  expect(config.extraResources).toContainEqual({
    from: "resources/",
    to: "",
    filter: ["rainny-cli*"],
  })
})

for (const channel of ["beta", "prod"] as const) {
  test(`does not bundle the CLI in ${channel} builds`, async () => {
    const previous = process.env.RAINNY_CHANNEL
    process.env.RAINNY_CHANNEL = channel
    const module = await import(`./electron-builder.config.ts?no-cli-resource=${channel}`)
    const config = module.default as Configuration
    if (previous === undefined) delete process.env.RAINNY_CHANNEL
    else process.env.RAINNY_CHANNEL = previous

    expect(config.extraResources).not.toContainEqual({
      from: "resources/",
      to: "",
      filter: ["rainny-cli*"],
    })
  })
}
