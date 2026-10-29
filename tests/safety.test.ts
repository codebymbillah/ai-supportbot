import { describe, expect, it } from "vitest"
import { makeTranslate } from "../src/labels/labels"
import { sensitiveProblem } from "../src/state/safety"

const t = makeTranslate("Acme", "Acme Bot")

describe("sensitiveProblem", () => {
  it("stops a card number, with spaces, dashes or Bangla digits", () => {
    expect(sensitiveProblem("my card is 4111 1111 1111 1111", t)).toBeTruthy()
    expect(sensitiveProblem("4111-1111-1111-1111", t)).toBeTruthy()
    expect(sensitiveProblem("৪১১১ ১১১১ ১১১১ ১১১১", t)).toBeTruthy()
  })
  it("lets ordinary long numbers through", () => {
    expect(sensitiveProblem("order 1234567890123 qty 5", t)).toBeUndefined()
    expect(sensitiveProblem("phone 01712345678", t)).toBeUndefined()
    expect(sensitiveProblem("hs code 8517", t)).toBeUndefined()
  })
  it("stops passwords, pins and one-time codes", () => {
    expect(sensitiveProblem("otp is 482913", t)).toBeTruthy()
    expect(sensitiveProblem("password: hunter2", t)).toBeTruthy()
    expect(sensitiveProblem("আমার পাসওয়ার্ড: abc12", t)).toBeTruthy()
  })
  it("does not stop the word pin or code on its own", () => {
    expect(sensitiveProblem("pin code for Dhaka", t)).toBeUndefined()
    expect(sensitiveProblem("code 482913", t)).toBeUndefined()
  })
})
