import { describe, expect, it } from "vitest"
import { BANGLA_LABELS } from "../src/labels-bn"
import { DEFAULT_LABELS, makeTranslate } from "../src/labels"

describe("labels", () => {
  it("fills the brand, assistant and other words", () => {
    const t = makeTranslate("Acme", "Acme Bot")
    expect(t("personNotice")).toBe("You are talking to a person from the Acme team.")
    expect(t("agentTag", { agent: "Rina" })).toBe("Rina · Acme team")
    expect(t("tooManyPhotos", { max: 3 })).toBe("You can send up to 3 photos in one message.")
  })
  it("uses the project's own text first, and leaves an unknown word as it is", () => {
    const t = makeTranslate("Acme", "Bot", { launcher: "Help {nobody}" })
    expect(t("launcher")).toBe("Help {nobody}")
    expect(t("send")).toBe("Send")
  })
  it("has a Bangla text for every label, with the same {words} in each", () => {
    const words = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",")
    for (const key of Object.keys(DEFAULT_LABELS) as (keyof typeof DEFAULT_LABELS)[]) {
      expect(BANGLA_LABELS[key], key).toBeTruthy()
      expect(words(BANGLA_LABELS[key]), key).toBe(words(DEFAULT_LABELS[key]))
    }
  })
})
