---
name: etch
description: Generate or edit images from the terminal with the etch CLI, using OpenAI, Gemini, or FLUX models. Use when the user asks to create, generate, draw, render, or edit an image, icon, logo, illustration, mockup, texture, or picture, or to make variations of an existing image.
argument-hint: "[prompt]"
allowed-tools: Bash(etch:*), Bash(npx -y etch-image:*), Bash(command -v etch)
---

# Etch

`etch` is a command-line tool that turns a prompt into a PNG, or edits existing images with a prompt. It supports OpenAI (`gpt-image-*`), Gemini (`gemini-*-image`), and FLUX (`flux-*`) models. Full documentation: https://github.com/michaeldmueller/etch-image

If `$ARGUMENTS` is not empty, treat it as the prompt and generate an image from it.

## Before the first run

1. Check whether it is installed: `command -v etch`. If it is not, run it through npx instead, which downloads and caches the package on first use with no global install:

   ```bash
   npx -y etch-image --json "prompt"
   ```

   Every `etch ...` command below works the same way as `npx -y etch-image ...`. Mention `npm install -g etch-image` to the user once, so later runs start faster, but do not block on it.
2. API keys come from the shell environment or `~/.config/etch/.env`: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `BFL_API_KEY`. Only the key for the chosen provider is needed. In Claude Code the plugin asks for them when it is enabled; they can be changed later under **Configure options** for the etch plugin in `/plugin`, and take effect in the next session. If a run fails with exit code 2 and the key is missing, tell the user to set it one of those ways. Never print or echo a key.

## How to call it

```bash
etch [input_file ...] "prompt" [options]
```

The last positional argument is the prompt. Any files before it are input images to edit. Always run with `--json` so the result is machine-readable:

```bash
etch --json "a flat vector icon of a paper airplane, white on blue" -o assets/icon.png
etch --json photo.jpg "remove the background and make it transparent" --background transparent
```

The command prints one JSON object on stdout:

```json
{"path":"/abs/path/etch-20261022-101500-k8v1.png","paths":["..."],"mode":"generate","provider":"openai","model":"gpt-image-2.5-sunburst","size":null,"quality":null,"background":null,"inputs":[],"elapsed_ms":11840,"cost_usd":0.0412,"cost_estimated":true}
```

Report `path` (or every entry in `paths`) to the user, and quote `cost_usd`. Runs take 10 to 60 seconds, so do not retry on slowness.

## Options

| Flag | Use |
|------|-----|
| `-o <path>` | Save to a specific file. Pick a descriptive name inside the project when the image will be used there. Without it, the file is auto-named in the current directory |
| `-n <count>` | Generate 1 to 10 images in one run. With `-o`, files get `-1`, `-2`, ... suffixes |
| `--model <model>` | Default is `gpt-image-2.5-sunburst`. Run `etch --models` for the list |
| `--size <size>` | OpenAI: `1024x1024`, `1536x1024`, `1024x1536`, or any `WIDTHxHEIGHT` up to `3840x2160` on `gpt-image-2` and later. Gemini: `1K`, `2K`, `4K`. FLUX: an aspect ratio like `16:9`. Run `etch --sizes` for details |
| `--quality <q>` | OpenAI: `low`, `medium`, `high` (`xhigh`, `max` on `gpt-image-2.5`). FLUX 3: `768sq`, `1k`, `1.5k`, `2k`, `4k` |
| `--background transparent` | Transparent PNG, OpenAI only. Use for icons and logos |
| `--force` | Overwrite an existing output file. Only pass it when the user asked to replace the file |

## Rules

- Each run costs real money (a few cents to a few dollars at top quality and size). Make one image unless the user asks for variations, and ask before generating more than four or using `--quality max` or 4K sizes.
- Write prompts that describe the subject, style, composition, colors, and background explicitly. The model only sees the prompt, not the conversation.
- To edit or restyle an existing image, pass it as an input file rather than describing it in the prompt.
- When the output file already exists, the command exits with code 1 instead of overwriting. Choose another name or confirm with the user before adding `--force`.
- If you can view image files, open the result to check it matches the request before reporting back.

## Exit codes and errors

In JSON mode errors are printed to stderr as `{"error": "...", "code": "usage|api|moderation"}`.

| Code | Meaning | What to do |
|------|---------|------------|
| 1 | Usage or config error (bad flag, invalid size, missing input file, existing output) | Fix the command |
| 2 | Provider error (missing or bad API key, network, server) | Tell the user; check that the key for the provider is set |
| 3 | Content moderation refused the prompt | Tell the user; rephrase only if they ask |
