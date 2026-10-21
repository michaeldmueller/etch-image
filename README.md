# Etch

CLI tool for generating and editing images using popular AI models.

## Supported Providers

| Provider | Models |
|----------|--------|
| OpenAI | <ul><li>gpt-image-2.5-sunburst</li><li>gpt-image-2.5-flare</li><li>gpt-image-2</li><li>gpt-image-1.5</li><li>gpt-image-1</li><li>gpt-image-1-mini</li></ul> |
| Gemini | <ul><li>gemini-2.5-flash-image</li><li>gemini-3-pro-image-preview</li><li>gemini-3.1-flash-image-preview</li></ul> |
| FLUX (Black Forest Labs) | <ul><li>flux-kontext-pro</li><li>flux-kontext-max</li><li>flux-2-pro</li><li>flux-2-pro-preview</li><li>flux-2-flex</li></ul> |

## Setup

Etch is bring-your-own-token — you provide API keys for the providers you want to use. You only need keys for the providers you plan to use.

```bash
npm install
npm link
cp .env.example .env
```

`npm link` puts the `etch` command on your PATH so you can run it from any directory. (You can also run it in place with `node etch.js`.)

Add your API keys to `.env`:

```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
BFL_API_KEY=your_key_here
```

Keys are read from the shell environment first, then the project's `.env`, then `~/.etch/.env`. The last option is handy for a global install (`npm install -g etch-cli`) where there is no project directory to keep a `.env` in.

## Usage

```bash
etch [input_file ...] <output_file> "prompt" [options]
```

The last two positional arguments are always the output file and the prompt. Anything before them is treated as an input image:

- **No input files** → generate a new image from the prompt.
- **One or more input files** → edit those images using the prompt.

### Options

| Flag | Description |
|------|-------------|
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

Any option's default can be changed in `~/.etch/config.json`. A flag on the command line always wins over the config file.

```json
{
  "open": false,
  "model": "gpt-image-2.5-flare",
  "quality": "high"
}
```

Supported settings: `model`, `size`, `quality`, `background`, `open`. Run `etch --config` to see the effective defaults.

### Examples

Generate an image from a prompt:

```bash
etch output/sunset.png "a dramatic sunset over the ocean"
```

Edit an image:

```bash
etch source.png output/edited.png "make the sky purple"
```

Use a specific model:

```bash
etch source.png output/edited.png "make the sky purple" --model gemini-2.5-flash-image
```

Specify size and quality:

```bash
etch source.png output/edited.png "add a sunset" --size 1536x1024 --quality high
```

Generate a 4K widescreen image with the top quality setting (`gpt-image-2.5` models only):

```bash
etch output/skyline.png "a city skyline at dusk" --size 3840x2160 --quality max
```

Use a FLUX model:

```bash
etch output/city.png "cyberpunk cityscape at night" --model flux-2-pro --size 16:9
```

Use multiple input images:

```bash
etch room.jpg reference.jpg output/restyled.png "restyle the first room to match the second"
```

Save without opening the result:

```bash
etch output/icon.png "a minimal app icon" --dont-open
```
