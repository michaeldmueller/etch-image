<p align="center">
  <img src="https://raw.githubusercontent.com/michaeldmueller/etch-image/main/assets/etch.png" alt="Etch" width="200">
</p>

<h1 align="center">Etch</h1>

<p align="center">Scriptable CLI tool for generating and editing images with OpenAI, Gemini, and FLUX.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/etch-image"><img alt="npm version" src="https://img.shields.io/npm/v/etch-image"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="package.json"><img alt="Node 18+" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white"></a>
  <a href="#supported-providers"><img alt="OpenAI, Gemini, FLUX" src="https://img.shields.io/badge/providers-OpenAI%20%7C%20Gemini%20%7C%20FLUX-8a2be2"></a>
  <img alt="macOS, Linux, Windows" src="https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey">
</p>

## Supported Providers

| Provider | Models |
|----------|--------|
| OpenAI | <ul><li>gpt-image-2.5-sunburst</li><li>gpt-image-2.5-flare</li><li>gpt-image-2</li><li>gpt-image-1.5</li><li>gpt-image-1</li><li>gpt-image-1-mini</li></ul> |
| Gemini | <ul><li>gemini-nano-banana-2.1</li><li>gemini-3.1-flash-image</li><li>gemini-3.1-flash-lite-image</li><li>gemini-3-pro-image</li><li>gemini-2.5-flash-image</li></ul> |
| FLUX (Black Forest Labs) | <ul><li>flux-3-image</li><li>flux-3-image-klein</li><li>flux-2-pro</li><li>flux-2-max</li><li>flux-2-flex</li><li>flux-2-klein-9b</li><li>flux-2-klein-4b</li><li>flux-2-pro-preview</li><li>flux-kontext-pro</li><li>flux-kontext-max</li><li>flux-pro-1.1</li><li>flux-pro-1.1-ultra</li><li>flux-dev</li></ul> |

## Setup

```bash
npm install -g etch-image
```

Etch is bring-your-own-token. You provide API keys for the providers you want to use. Put them in `~/.config/etch/.env`:

```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
BFL_API_KEY=your_key_here
```

You only need keys for the providers you plan to use. Keys are read from the shell environment first, then `~/.config/etch/.env`.

### Running from a clone

```bash
git clone https://github.com/michaeldmueller/etch-image.git
cd etch-image
npm install
npm link
cp .env.example .env
```

`npm link` puts the `etch` command on your PATH. A `.env` in the project directory is read before `~/.config/etch/.env`.

## Usage

```bash
etch [input_file ...] "prompt" [options]
```

The last positional argument is always the prompt. Anything before it is treated as an input image:

- **No input files** → generate a new image from the prompt.
- **One or more input files** → edit those images using the prompt.

The result is saved as a PNG. Pass `-o <path>` to choose the file, or leave it out and Etch generates a name and outputs it in the current directory (or in `output_dir` from your config).

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Where to save the image (default: auto-named PNG in the current directory). An existing file is never overwritten unless `--force` is given |
| `--model <model>` | Model to use (default: `gpt-image-2.5-sunburst`) |
| `--size <size>` | OpenAI: `auto`, `1024x1024`, `1536x1024`, `1024x1536`; `gpt-image-2` and later also accept any `WIDTHxHEIGHT` (multiples of 16, aspect ratio 1:3 to 3:1, up to `3840x2160`). Gemini: `1K`, `2K`, `4K` (`gemini-3.1-flash-image` also `512px`; `gemini-3.1-flash-lite-image` only `1K`). FLUX: an aspect ratio like `16:9` (21:9 to 9:21; `flux-3` models take a fixed list, see `--sizes`), or `WIDTHxHEIGHT` for FLUX 2, 1.1 and dev. A ratio is converted to about 1 megapixel for models that take dimensions |
| `--quality <quality>` | OpenAI: `auto`, `low`, `medium`, `high`; `gpt-image-2.5` models also accept `xhigh` and `max`. FLUX 3: resolution tier `768sq`, `1k`, `1.5k`, `2k`, `4k` |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after it is saved (default when run from a terminal) |
| `--dont-open` | Don't open the image after it is saved |
| `--json` | Print the result as a JSON object instead of text |
| `--force` | Overwrite the output file if it already exists |
| `--models` | List available models and exit |
| `--sizes` | List available sizes by provider and exit |
| `--config` | Show the config file path and effective defaults, then exit |

### Configuration

Any option's default can be changed in `~/.config/etch/config.json` (or `$XDG_CONFIG_HOME/etch/config.json` if that variable is set). A flag on the command line always wins over the config file.

```json
{
  "open": false,
  "model": "gpt-image-2.5-flare",
  "quality": "high",
  "output_dir": "~/Pictures/etch"
}
```

Supported settings: `model`, `size`, `quality`, `background`, `open`, `output_dir`. The `output_dir` setting only applies when `-o` is not given. Run `etch --config` to see the effective defaults.

### Scripting

Only the saved path is written to stdout. Progress and the model details go to stderr, and when stdout is not a terminal the spinner and auto-open are skipped. So the output can be captured or piped directly:

```bash
file=$(etch "a red cube")
etch "a red cube" | xargs open
```

Pass `--open` to open the image anyway.

With `--json`, stdout is a single JSON object and errors on stderr are JSON too:

```bash
etch --json "a red cube" | jq -r .path
```

```json
{"path":"/Users/you/etch-20261021-143210-k8v1.png","mode":"generate","provider":"openai","model":"gpt-image-2.5-sunburst","size":null,"quality":null,"background":null,"inputs":[],"elapsed_ms":11840,"cost_usd":0.0412,"cost_estimated":true}
```

### Cost

After each run Etch prints what the image cost. FLUX reports the exact charge from the API. For OpenAI and Gemini the figure is computed from the token usage the API returns and the providers' published per-token prices, so it is labelled **Estimated cost** and can drift if a provider changes pricing.

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | Image saved |
| `1` | Usage or config error (bad flag, invalid size, missing input file) |
| `2` | Provider error (bad API key, network, server error) |
| `3` | Request refused by the provider's content moderation |

### Examples

Generate an image from a prompt:

```bash
etch "a dramatic sunset over the ocean"
```

Save to a specific file:

```bash
etch "a dramatic sunset over the ocean" -o output/sunset.png
```

Edit an image:

```bash
etch source.png "make the sky purple"
```

Use a specific model:

```bash
etch source.png "make the sky purple" --model gemini-nano-banana-2.1
```

Specify size and quality:

```bash
etch source.png "add a sunset" --size 1536x1024 --quality high
```

Generate a 4K widescreen image with the top quality setting (`gpt-image-2.5` models only):

```bash
etch "a city skyline at dusk" --size 3840x2160 --quality max -o output/skyline.png
```

Use a FLUX model:

```bash
etch "cyberpunk cityscape at night" --model flux-2-pro --size 16:9
```

Generate a 4K image with FLUX 3:

```bash
etch "cyberpunk cityscape at night" --model flux-3-image --size 21:9 --quality 4k
```

Use multiple input images:

```bash
etch room.jpg reference.jpg "restyle the first room to match the second" -o output/restyled.png
```

Save without opening the result:

```bash
etch "a minimal app icon" --dont-open
```
