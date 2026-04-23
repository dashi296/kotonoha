# Kotonoha

> Refine your words instantly.

Kotonoha is a lightweight desktop app that transforms your text into polite, natural Japanese using a local LLM — 100% local processing, no data leaves your machine.

## Features

- Convert casual or rough text into polite Japanese
- One-click copy of refined text
- Global shortcut to open input window (`Cmd + Shift + T`)
- Clipboard auto-import (optional)
- Model switching (via Ollama)

## Requirements

- macOS / Windows / Linux
- [Ollama](https://ollama.com)
- Node.js / pnpm

## Setup

### 1. Install Ollama

[https://ollama.com](https://ollama.com)

### 2. Pull a model

```bash
ollama pull llama3
```

### 3. Run Kotonoha

```bash
npm install
npm run dev
```

## Usage

1. Open Kotonoha
2. Paste or type your text
3. Click "Refine"
4. Copy the result

Global shortcut: `Cmd + Shift + T`

## License

MIT
