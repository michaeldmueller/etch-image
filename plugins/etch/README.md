# Etch plugin

Generate and edit images from Claude Code or Codex with [Etch](https://github.com/michaeldmueller/etch-image), a command-line tool for OpenAI, Gemini, and FLUX image models.

Ask for an image in a session and the agent runs `etch` for you, saves the PNG under a sensible name, and reports what it cost.

## Requirements

- Node 18 or later. Installing the CLI with `npm install -g etch-image` is optional; without it the skill runs `npx -y etch-image`, which is slower on the first call
- An API key for at least one provider in `~/.config/etch/.env`: `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `BFL_API_KEY`

## Install

Claude Code:

```
/plugin install etch --marketplace michaeldmueller/etch-image
```

Codex:

```bash
codex plugin marketplace add michaeldmueller/etch-image
codex plugin add etch@etch-image
```

## What it does

The plugin contains one skill, `etch`, that explains the command's grammar, options, JSON output, and exit codes to the agent, and sets a few guardrails: one image unless variations are requested, confirmation before expensive settings, and never overwriting an existing file unprompted.

Type `/etch <prompt>` to generate directly, or just ask for an image and the agent picks the skill up on its own.
