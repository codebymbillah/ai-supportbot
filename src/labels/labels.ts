// Every sentence the widget writes by itself. A project changes any of them through `SupportChatConfig.labels` (for a Bangla-only
// site, or its own tone). `{brand}`, `{assistant}`, `{agent}` and the other `{…}` words are filled in when the text is shown.
// Texts that come from the backend or from the project's config (greeting, tagline, chips, the assistant's answers) are not here.

export const DEFAULT_LABELS = {
  // launcher and header
  launcher: "Chat with us",
  launcherAria: "Open chat with {assistant}",
  launcherAriaOnline: "Open chat with {assistant} (our team is online)",
  teamOnline: "Our team is online",
  chattingWithPerson: "You are chatting with a person",
  agentFromTeam: "{agent} from the team",
  teamMember: "A team member",
  demoBadge: "Demo",
  talkToPerson: "Talk to a person",
  /** What the header's person button sends as the customer's message. */
  talkToPersonMessage: "I want to talk to a person",
  newChat: "New chat",
  newChatAria: "Start a new chat",
  closeChat: "Close chat",
  conversation: "Conversation",
  // under the box
  personNotice: "You are talking to a person from the {brand} team.",
  privacy: "Privacy",
  // waiting
  slowShort: "Still working on it…",
  slowLong: "This is taking longer than usual. You can keep waiting, start a new chat, or reach our team directly.",
  typing: "The assistant is typing",
  // hand-over to a person
  waitingTitle: "A team member will join shortly",
  waitingText: "You can keep writing here. We will answer in this chat.",
  contactTitle: "Talk to our team",
  contactText: "Nobody is free to answer in the chat right now. Reach us here, or ask for a call. You can also keep writing: we will see it.",
  whatsapp: "WhatsApp",
  callMeBack: "Call me back",
  cancel: "Cancel",
  sending: "Sending…",
  callPrompt: "Prefer a call? Leave your number.",
  yourName: "Your name",
  phoneNumber: "Phone number",
  helpPlaceholder: "What do you need help with? (optional)",
  helpLabel: "What do you need help with",
  nameError: "Please tell us your name.",
  phoneError: "Please enter a phone number we can call, for example 01712345678.",
  callbackFailed: "We could not send your details. Please call us instead.",
  callbackThanks: "Thank you, {name}. A person from our team will call you on {phone}.",
  // messages and cards
  agentTag: "{agent} · {brand} team",
  goodAnswer: "Good answer",
  poorAnswer: "Poor answer",
  notSent: "Not sent. Try again",
  from: "From {price}",
  moq: "MOQ {moq}",
  freeDelivery: "Free delivery",
  view: "View",
  addToCart: "Add to cart",
  added: "Added",
  pickOnPage: "Pick size or colour on the page",
  requestNotSent: "Request not sent. Tell me what to change and I will prepare a new one.",
  requestSent: "Request sent",
  nothingSentUntil: "Nothing is sent until you press the button.",
  sendRequest: "Send request",
  notNow: "Not now",
  alreadySent: "This request was already sent.",
  // composer
  yourMessage: "Your message",
  send: "Send",
  attachPhoto: "Attach a photo",
  removePhoto: "Remove photo",
  photoAlt: "Photo you sent",
  tooManyPhotos: "You can send up to {max} photos in one message.",
  photoTooBig: "A photo is larger than {mb} MB.",
  notAPhoto: "Only JPEG, PNG or WebP photos can be sent.",
  photoUnreadable: "That photo could not be read. Try another one.",
  // safety checks before sending
  cardNumber: "That looks like a card number. Please don't send card numbers in the chat. Payments are made on the secure checkout page.",
  secretCode: "Please don't send passwords, PINs or one-time codes in the chat. Our team will never ask for them.",
  // errors
  unreachable: "Can't reach {brand} right now. Check your connection and try again.",
  failed: "That did not go through. Please try again.",
  rateLimited: "You are sending messages quickly. Please wait a moment and try again.",
  unavailable: "The chat assistant is not available right now. Please call us.",
} as const

export type ChatLabels = { [K in keyof typeof DEFAULT_LABELS]: string }
export type LabelKey = keyof ChatLabels

export type Translate = (key: LabelKey, vars?: Record<string, string | number>) => string

/** Builds the function that writes a label: the project's text, else the default, with the `{words}` filled in. */
export function makeTranslate(brandName: string, assistantName: string, labels?: Partial<ChatLabels>): Translate {
  return (key, vars = {}) => {
    const all: Record<string, string | number> = { brand: brandName, assistant: assistantName, ...vars }
    const text = labels?.[key] ?? DEFAULT_LABELS[key]
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in all ? String(all[name]) : whole))
  }
}
