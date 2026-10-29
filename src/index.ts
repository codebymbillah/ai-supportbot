// The support-chat add-on. Mount <SupportChat config={...} context={...} /> once in a layout.
// How to reuse it in another project: see README.md in this folder.
export { SupportChat, OPEN_EVENT } from "./widget/chat-widget"
export { createHttpTransport } from "./transport/http-transport"
export { ChatError, EMPTY_STATE } from "./types"
export type * from "./types"
export { createDemoTransport, detectLang } from "./transport/demo"
export type { DemoLang, DemoOptions, DemoScript } from "./transport/demo"
export { DEFAULT_LABELS, makeTranslate } from "./labels/labels"
export type { ChatLabels, LabelKey, Translate } from "./labels/labels"
export { BANGLA_LABELS } from "./labels/labels-bn"
