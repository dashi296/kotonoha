import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModelPullForm } from "./ModelPullForm"
import type { PullPhase } from "../model/types"

const idle: PullPhase = { phase: "idle" }
const pulling: PullPhase = {
  phase: "pulling",
  progress: { status: "pulling manifest", completed: 500, total: 1000 },
}
const success: PullPhase = { phase: "success" }
const error: PullPhase = { phase: "error", message: "connection refused" }

describe("ModelPullForm", () => {
  it("idle状態ではPullボタンが表示される", () => {
    render(<ModelPullForm pullPhase={idle} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("Pull")).toBeInTheDocument()
    expect(screen.queryByText("キャンセル")).not.toBeInTheDocument()
  })

  it("モデル名を入力してPullボタンを押すと onPull が呼ばれる", async () => {
    const onPull = vi.fn().mockResolvedValue(undefined)
    render(<ModelPullForm pullPhase={idle} onPull={onPull} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/例:/), "llama3.2")
    await userEvent.click(screen.getByText("Pull"))
    expect(onPull).toHaveBeenCalledWith("llama3.2")
  })

  it("pulling状態ではキャンセルボタンと進捗バーが表示される", () => {
    render(<ModelPullForm pullPhase={pulling} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("キャンセル")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("キャンセルボタンを押すと onCancel が呼ばれる", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined)
    render(<ModelPullForm pullPhase={pulling} onPull={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByText("キャンセル"))
    expect(onCancel).toHaveBeenCalled()
  })

  it("success状態では完了メッセージが表示される", () => {
    render(<ModelPullForm pullPhase={success} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/インストール完了/)).toBeInTheDocument()
  })

  it("error状態ではエラーメッセージが表示される", () => {
    render(<ModelPullForm pullPhase={error} onPull={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/connection refused/)).toBeInTheDocument()
  })
})
