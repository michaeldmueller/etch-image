#!/bin/bash
# Exports the API keys entered in the plugin's options into the environment of the
# shell commands Claude runs this session, so `etch` finds them without a .env file.
# A key already present in the environment is left alone.
[ -n "$CLAUDE_ENV_FILE" ] || exit 0

export_key() {
  local name="$1" value="$2"
  if [ -n "$value" ] && [ -z "${!name}" ]; then
    printf 'export %s=%q\n' "$name" "$value" >> "$CLAUDE_ENV_FILE"
  fi
}

export_key OPENAI_API_KEY "$CLAUDE_PLUGIN_OPTION_OPENAI_API_KEY"
export_key GEMINI_API_KEY "$CLAUDE_PLUGIN_OPTION_GEMINI_API_KEY"
export_key BFL_API_KEY "$CLAUDE_PLUGIN_OPTION_BFL_API_KEY"
exit 0
