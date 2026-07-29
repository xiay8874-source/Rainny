// @ts-nocheck
import * as mod from "./markdown"
import { create } from "@opencode-ai/ui/storybook/scaffold"
import { markdown } from "@opencode-ai/ui/storybook/fixtures"

const docs = `### Overview
Render sanitized Markdown with code blocks, inline code, and safe links.

Pair with \`Code\` for standalone code views.

### API
- Required: \`text\` Markdown string.
- Uses the Marked context provider for parsing and sanitization.

### Variants and states
- Code blocks include copy buttons when rendered.

### Behavior
- Sanitizes HTML and auto-converts inline URL code to links.
- Adds copy buttons to code blocks.

### Accessibility
- Copy buttons include aria-labels from i18n.
- TODO: confirm link target behavior in sanitized output.

### Theming/tokens
- Uses \`data-component="markdown"\` and related slots for styling.

`

const story = create({
  title: "UI/Markdown",
  mod,
  args: {
    text: markdown,
  },
})

export default {
  title: "UI/Markdown",
  id: "components-markdown",
  component: story.meta.component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: docs,
      },
    },
  },
}

export const Basic = story.Basic

export const Mermaid = {
  args: {
    text: `\`\`\`mermaid
flowchart LR
  A[Rainny Markdown] --> B[Mermaid]
  B --> C[Zoom and export]
\`\`\``,
  },
}

export const MermaidDenseFlow = {
  args: {
    text: `## 自发货核心处理流程图

\`\`\`mermaid
flowchart TD
    Start([商家在后台填写运单号发起自发货]) --> API[请求: createPackage 创建包裹]
    subgraph bg-sheep: 核心编排层 (无状态)
        API --> CB[ContextBuilder: 构建上下文]
        CB --> Cmd[BatchCreatePackageCommand 执行]
        Cmd --> Lock[1. PackageHelper: 加分布式锁 addBat2PkLock]
        Lock --> EM[2. EnricherManager: 增强订单/包裹/物流上下文]
        EM --> VM[3. ValidatorManager: 执行各维度业务校验]
        VM --> Check{校验是否通过?}
        Check -->|否| Error([释放锁并返回错误信息])
        Check -->|是| Proc[4. BatchCreatePackageProcessor 核心处理]
    end
    Proc -->|1. 生成包裹号| Eagle1[(bg-eagle: generatePackageSn)]
    Proc -->|2. 创建包裹数据| Eagle2[(bg-eagle: batchCreatePackage)]
    Proc -->|3. 建立订单包裹关联| Eagle3[(bg-eagle: initOrderPackageRecord)]
    Eagle1 & Eagle2 & Eagle3 --> Result([返回包裹创建成功结果])
\`\`\``,
  },
}

export const MermaidState = {
  args: {
    text: `## 自发货状态流转图

\`\`\`mermaid
stateDiagram-v2
    [*] --> 未发货: 商家收到订单
    未发货 --> 包裹已创建_自发货: API - createPackage
    包裹已创建_自发货 --> 包裹已创建_自发货: API - editPackage（修改运单号/物流公司）
    包裹已创建_自发货 --> 面单申请中_平台发货: 异步补偿 - 自发货转在线
    包裹已创建_自发货 --> 已发货: API - confirmShippingLabel
    已发货 --> [*]
\`\`\``,
  },
}

export const MermaidError = {
  args: {
    text: `\`\`\`mermaid
flowchart TD
  A -- broken syntax >>> B
\`\`\``,
  },
}
