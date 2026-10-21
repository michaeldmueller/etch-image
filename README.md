# Etch

CLI tool for generating and editing images using popular AI models.

## Supported Providers

| Provider | Models |
|----------|--------|
| OpenAI | <ul><li>gpt-image-2.5-sunburst</li><li>gpt-image-2.5-flare</li><li>gpt-image-2</li><li>gpt-image-1.5</li><li>gpt-image-1</li><li>gpt-image-1-mini</li></ul> |
| Gemini | <ul><li>gemini-2.5-flash-image</li><li>gemini-3-pro-image-preview</li><li>gemini-3.1-flash-image-preview</li></ul> |
| FLUX (Black Forest Labs) | <ul><li>flux-kontext-pro</li><li>flux-kontext-max</li><li>flux-2-pro</li><li>flux-2-pro-preview</li><li>flux-2-flex</li></ul> |

## Setup

```bash
npm install -g etch-cli
```

Etch is bring-your-own-token — you provide API keys for the providers you want to use. Put them in `~/.config/etch/.env`:

```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
BFL_API_KEY=your_key_here
```

You only need keys for the providers you plan to use. Keys are read from the shell environment first, then `~/.config/etch/.env`.

### Running from a clone

```bash
git clone https://github.com/michaeldmueller/etch-cli.git
cd etch-cli
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

The result is saved as a PNG. Pass `-o <path>` to choose the file, or leave it out and Etch names it `etch-YYYYMMDD-HHMMSS-xxxx.png` in the current directory (or in `output_dir` from your config).

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Where to save the image (default: auto-named PNG in the current directory) |
| `--model <model>` | Model to use (default: `gpt-image-2.5-sunburst`) |
| `--size <size>` | Image dimensions (aspect ratio for FLUX, e.g. `16:9`). OpenAI: `auto`, `1024x1024`, `1536x1024`, `1024x1536`; `gpt-image-2` and later also accept any `WIDTHxHEIGHT` (multiples of 16, aspect ratio 1:3 to 3:1, up to `3840x2160`) |
| `--quality <quality>` | Image quality (OpenAI only): `auto`, `low`, `medium`, `high`; `gpt-image-2.5` models also accept `xhigh` and `max` |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after it is saved (default) |
| `--dont-open` | Don't open the image after it is saved |
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
etch source.png "make the sky purple" --model gemini-2.5-flash-image
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

Use multiple input images:

```bash
etch room.jpg reference.jpg "restyle the first room to match the second" -o output/restyled.png
```

Save without opening the result:

```bash
etch "a minimal app icon" --dont-open
```
