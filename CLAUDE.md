# CLAUDE.md

## Project Overview

Kotonoha is a desktop app that refines text into polite expressions using a local LLM. Initially supports Japanese and English.

## Tech Stack

- Tauri
- TypeScript
- Ollama

## Architecture

```
UI → Core → Adapter → Ollama
```

UI never calls Ollama directly. All LLM access goes through `ModelAdapter`.

## Rules

- Do not call LLM directly from UI
- Use ModelAdapter abstraction
- Keep prompts centralized

## Model Adapter

```ts
interface ModelAdapter {
  generate(prompt: string, lang: SupportedLanguage): Promise<string>
}

type SupportedLanguage = "ja" | "en"
```

## Prompt Rules

- Language is passed as a parameter — never hardcoded in prompts
- Each language has its own prompt template (e.g., keigo for Japanese, formal register for English)
- Clear instructions
- Deterministic output

## Development Principles

- Keep it simple
- Avoid over-engineering
- Focus on UX

## Architecture

@docs/architecture.md

## Feature Roadmap

1. Text transform
2. Multi-language support (ja / en)
3. Shortcut
4. Clipboard
5. Model switching
