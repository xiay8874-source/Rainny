import { resolveChannel } from "./utils"
import { APP_IDS, APP_NAMES, PRODUCT } from "../src/branding"

const arg = process.argv[2]
const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId = APP_IDS[channel]
const productName = APP_NAMES[channel]
const summary = `Personal AI coding agent${channel !== "prod" ? ` (${channel})` : ""}`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="com.github.xiay8874">
    <name>Rainny</name>
  </developer>

  <description>
    <p>
      Rainny is a downstream distribution of OpenCode that helps you write and run code with any AI model.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">${PRODUCT.repository.url}/issues</url>
  <url type="homepage">${PRODUCT.repository.url}</url>
  <url type="vcs-browser">${PRODUCT.repository.url}</url>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)
console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
