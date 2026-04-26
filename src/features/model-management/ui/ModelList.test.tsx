import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModelList } from "./ModelList"

const models = [
  { name: "llama3.2", size: 2_100_000_000, modified_at: "2024-01-01T00:00:00Z", digest: "sha256:abc" },
  { name: "gemma3", size: 4_200_000_000, modified_at: "2024-01-02T00:00:00Z", digest: "sha256:def" },
]

describe("ModelList", () => {
  it("モデル一覧を表示する", () => {
    render(<ModelList models={models} onDelete={vi.fn()} />)
    expect(screen.getByText("llama3.2")).toBeInTheDocument()
    expect(screen.getByText("gemma3")).toBeInTheDocument()
    expect(screen.getByText("2.1 GB")).toBeInTheDocument()
  })

  it("モデルが空のとき空メッセージを表示する", () => {
    render(<ModelList models={[]} onDelete={vi.fn()} />)
    expect(screen.getByText(/インストール済みのモデルがありません/)).toBeInTheDocument()
  })

  it("削除ボタンをクリックすると onDelete が呼ばれる", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<ModelList models={models} onDelete={onDelete} />)
    await userEvent.click(screen.getAllByText("削除")[0])
    expect(onDelete).toHaveBeenCalledWith("llama3.2")
  })
})
