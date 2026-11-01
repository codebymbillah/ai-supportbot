// A scripted stand-in for review before the backend is ready: replies after a short wait, sends nothing, the header says Demo.
// Use it as `transport: createDemoTransport({ scripts, fallback })` with `demo: true` in the config.
import { createDemoTransport, type DemoScript } from "dotbyte-chat"

const scripts: DemoScript[] = [
  { match: /price|cost|দাম/i, text: { en: "Prices depend on quantity. (sample)", bn: "দাম পরিমাণের উপর নির্ভর করে। (নমুনা)", bl: "Dam poriman er upor nirbhor kore. (sample)" } },
  { match: /human|person|agent|মানুষ/i, text: { en: "I will bring in a person.", bn: "আমি একজন মানুষকে ডাকছি।", bl: "Ami ekjon manush ke dakchi." }, human: true },
]

export const demoTransport = createDemoTransport({
  scripts,
  fallback: { match: /./, text: { en: "Thanks. Tell me what you need.", bn: "ধন্যবাদ। কী দরকার বলুন।", bl: "Dhonnobad. Ki dorkar bolun." } },
})
