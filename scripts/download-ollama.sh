#!/usr/bin/env bash
set -euo pipefail

OLLAMA_VERSION=$(curl -s https://api.github.com/repos/ollama/ollama/releases/latest \
  | grep '"tag_name"' | head -1 | cut -d'"' -f4)
BINARIES_DIR="$(dirname "$0")/../src-tauri/binaries"

mkdir -p "$BINARIES_DIR"

TARGET=$(rustc -vV | grep '^host:' | cut -d' ' -f2)
DEST="$BINARIES_DIR/ollama-$TARGET"

if [[ -f "$DEST" ]]; then
  echo "ollama-$TARGET already exists, skipping download."
  echo "To upgrade, delete $DEST and re-run this script."
  exit 0
fi

case "$TARGET" in
  *apple-darwin*)
    URL="https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz"
    TMP=$(mktemp -d)
    curl -fL "$URL" -o "$TMP/ollama.tgz"
    tar -xzf "$TMP/ollama.tgz" -C "$TMP" ollama
    cp "$TMP/ollama" "$DEST"
    rm -rf "$TMP"
    ;;
  *windows*)
    echo "Windows: download ollama-windows-amd64.zip and extract ollama.exe manually."
    exit 1
    ;;
  *linux*)
    ARCH=$(echo "$TARGET" | cut -d'-' -f1)
    [[ "$ARCH" == "x86_64" ]] && ARCH="amd64"
    [[ "$ARCH" == "aarch64" ]] && ARCH="arm64"
    curl -fL "https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-${ARCH}" \
      -o "$DEST"
    ;;
  *)
    echo "Unsupported target: $TARGET"
    exit 1
    ;;
esac

chmod +x "$DEST"
echo "Downloaded: $DEST"
