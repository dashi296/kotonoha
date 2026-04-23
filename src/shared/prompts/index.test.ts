import { describe, it, expect } from "vitest"
import { buildPrompt } from "./index"

describe("buildPrompt", () => {
  it("ja: 敬語変換の指示を含むプロンプトを返す", () => {
    const prompt = buildPrompt("了解です", "ja")
    expect(prompt).toContain("了解です")
    expect(prompt).toContain("敬語")
  })

  it("en: polite rewrite の指示を含むプロンプトを返す", () => {
    const prompt = buildPrompt("got it", "en")
    expect(prompt).toContain("got it")
    expect(prompt).toMatch(/polite|formal/i)
  })
})
