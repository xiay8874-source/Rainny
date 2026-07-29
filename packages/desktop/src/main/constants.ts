import { app } from "electron"
import { resolveChannel } from "../branding"

export const CHANNEL = resolveChannel(import.meta.env.RAINNY_CHANNEL ?? import.meta.env.OPENCODE_CHANNEL)

export const UPDATER_ENABLED = app.isPackaged && CHANNEL !== "dev"
