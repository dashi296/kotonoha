export interface PullProgress {
  status: string
  digest?: string
  completed?: number
  total?: number
}

export type PullPhase =
  | { phase: "idle" }
  | { phase: "pulling"; progress: PullProgress }
  | { phase: "success" }
  | { phase: "error"; message: string }
