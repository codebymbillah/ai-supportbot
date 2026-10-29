// The support-chat add-on. Mount <SupportChat config={...} context={...} /> once in a layout.
// How to reuse it in another project: see README.md in this folder.
export { SupportChat, OPEN_EVENT } from "./chat-widget"
export { createHttpTransport } from "./http-transport"
export { ChatError, EMPTY_STATE } from "./types"
export type * from "./types"
export { createDemoTransport, detectLang } from "./demo"
export type { DemoLang, DemoOptions, DemoScript } from "./demo"
export { DEFAULT_LABELS, makeTranslate } from "./labels"
export type { ChatLabels, LabelKey, Translate } from "./labels"
export { BANGLA_LABELS } from "./labels-bn"
