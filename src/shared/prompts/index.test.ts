import { describe, it, expect } from "vitest"
import { buildSystemPrompt } from "./index"

describe("buildSystemPrompt", () => {
  it("ja: です・ます中心の丁寧語変換ルールを含むシステムプロンプトを返す", () => {
    const prompt = buildSystemPrompt("ja")
    expect(prompt).toContain("自然な丁寧語")
    expect(prompt).toContain("です・ます")
    expect(prompt).toContain("意味")
    expect(prompt).toContain("変換後のテキストのみ")
  })

  it("en: polite rewrite の指示を含むシステムプロンプトを返す", () => {
    const prompt = buildSystemPrompt("en")
    expect(prompt).toMatch(/polite|formal/i)
  })
})
