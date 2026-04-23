import { describe, it, expect } from "vitest"
import { getI18n } from "./index"

describe("getI18n", () => {
  it("ja: 日本語辞書を返す", () => {
    const dict = getI18n("ja")
    expect(dict.refineButton).toBe("変換")
    expect(dict.copyButton).toBe("コピー")
  })

  it("en: 英語辞書を返す", () => {
    const dict = getI18n("en")
    expect(dict.refineButton).toBe("Refine")
    expect(dict.copyButton).toBe("Copy")
  })

  it("全キーがすべてのロケールで定義されている", () => {
    for (const lang of ["ja", "en"] as const) {
      const dict = getI18n(lang)
      for (const key of Object.keys(dict) as (keyof typeof dict)[]) {
        expect(dict[key]).toBeTruthy()
      }
    }
  })
})
