import type { Translate } from "./labels"

// Things a customer should not type into a chat. Checked in the browser before anything is sent, so the text never reaches the backend or its logs.

function luhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** Returns a short sentence to show instead of sending, or undefined when the text is fine. */
export function sensitiveProblem(text: string, t: Translate): string | undefined {
  // Bangla digits count too.
  const latin = text.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
  for (const run of latin.match(/\d(?:[ -]?\d){12,18}/g) ?? []) {
    if (luhn(run.replace(/\D/g, ""))) return t("cardNumber")
  }
  if (/\b(password|passcode|pin|otp|verification code)\s*(?:is|:|=)\s*\S+/i.test(latin) || /\b(otp|pin)\s+\d{4,8}\b/i.test(latin) || /(পাসওয়ার্ড|ওটিপি|পিন)\s*(হলো|হল|:|=)\s*\S+/.test(text)) {
    return t("secretCode")
  }
  return undefined
}
