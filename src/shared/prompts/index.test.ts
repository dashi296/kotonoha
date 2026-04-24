import { describe, it, expect } from "vitest"
import { buildPrompt } from "./index"

describe("buildPrompt", () => {
  it("ja: です・ます中心の丁寧語変換ルールを含むプロンプトを返す", () => {
    const prompt = buildPrompt("了解です", "ja")
    expect(prompt).toContain("了解です")
    expect(prompt).toContain("自然な丁寧語")
    expect(prompt).toContain("です・ます")
    expect(prompt).toContain("意味")
    expect(prompt).toContain("変換後のテキストのみ")
  })

  it("en: polite rewrite の指示を含むプロンプトを返す", () => {
    const prompt = buildPrompt("got it", "en")
    expect(prompt).toContain("got it")
    expect(prompt).toMatch(/polite|formal/i)
  })
})
