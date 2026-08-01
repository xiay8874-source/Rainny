import { createContext, useContext, type ParentProps } from "solid-js"
import type { CodeReference } from "../components/code-reference"
export type { CodeReference } from "../components/code-reference"

export type CodeReferenceRequest = CodeReference & {
  root: string
  roots?: string[]
}

export type CodeReferenceHandler = (reference: CodeReference) => void | Promise<void>

export type CodeReferenceMenuLabels = {
  openDefault: (app: string) => string
  openWith: string
  copyPath: string
  copyContent: string
  reveal: string
}

export type CodeReferenceMenuApp = {
  id: string
  label: string
}

export type CodeReferenceMenu = {
  labels: CodeReferenceMenuLabels
  getDefaultApp?: (reference: CodeReference) => string | undefined | Promise<string | undefined>
  openDefault?: CodeReferenceHandler
  openWith?: (reference: CodeReference, app: string) => void | Promise<void>
  copyPath?: CodeReferenceHandler
  copyContent?: CodeReferenceHandler
  reveal?: CodeReferenceHandler
  apps?: CodeReferenceMenuApp[]
}

export type CodeReferenceContextValue = {
  open?: CodeReferenceHandler
  openExternal?: CodeReferenceHandler
  resolvePath?: (reference: CodeReference) => string | undefined
  menu?: CodeReferenceMenu
}

const context = createContext<CodeReferenceContextValue>({})

export function CodeReferenceProvider(props: ParentProps<CodeReferenceContextValue>) {
  const parent = useContext(context)
  return (
    <context.Provider
      value={{
        get open() {
          return props.open ?? parent.open
        },
        get openExternal() {
          return props.openExternal ?? parent.openExternal
        },
        get resolvePath() {
          return props.resolvePath ?? parent.resolvePath
        },
        get menu() {
          return props.menu ?? parent.menu
        },
      }}
    >
      {props.children}
    </context.Provider>
  )
}

export function useCodeReference() {
  return useContext(context)
}
