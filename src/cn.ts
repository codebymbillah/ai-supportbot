// Joins class names, skipping the empty ones. Kept here so the add-on needs nothing from the project.
export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ")
