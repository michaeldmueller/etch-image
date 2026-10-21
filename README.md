# Picasso

CLI tool for generating and editing images using popular AI models.

## Supported Providers

**OpenAI:** `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare`, `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`

**Gemini:** `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`

**FLUX (Black Forest Labs):** `flux-kontext-pro`, `flux-kontext-max`, `flux-2-pro`, `flux-2-pro-preview`, `flux-2-flex`

## Setup

Picasso is bring-your-own-token — you provide API keys for the providers you want to use. You only need keys for the providers you plan to use.

```bash
npm install
cp .env.example .env
```

Add your API keys to `.env`:

```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
BFL_API_KEY=your_key_here
```

## Usage

### Text to Image

Generate an image from a text prompt:

```bash
node textToImage.js <output_file> "prompt" [options]
```

### Edit Image

Edit one or more existing images using a text prompt:

```bash
node editImage.js <input_file> [input_file2 ...] <output_file> "prompt" [options]
```

You can provide multiple input images. The last two positional arguments are always the output file and prompt, and everything before them is treated as source images.

### Options

| Flag | Description |
|------|-------------|
| `--model <model>` | Model to use (default: `gpt-image-2.5-sunburst`) |
| `--size <size>` | Image dimensions (aspect ratio for FLUX, e.g. `16:9`). OpenAI: `auto`, `1024x1024`, `1536x1024`, `1024x1536`; `gpt-image-2` and later also accept any `WIDTHxHEIGHT` (multiples of 16, aspect ratio 1:3 to 3:1, up to `3840x2160`) |
| `--quality <quality>` | Image quality (OpenAI only): `auto`, `low`, `medium`, `high`; `gpt-image-2.5` models also accept `xhigh` and `max` |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after generation |
| `--models` | List available models and exit |
| `--sizes` | List available sizes by provider and exit |

### Examples

Generate an image from a prompt:

```bash
node textToImage.js output/sunset.png "a dramatic sunset over the ocean" --open
```

Edit an image:

```bash
node editImage.js source.png output/edited.png "make the sky purple" --open
```

Use a specific model:

```bash
node editImage.js source.png output/edited.png "make the sky purple" --model gemini-2.5-flash-image
```

Specify size and quality:

```bash
node editImage.js source.png output/edited.png "add a sunset" --size 1536x1024 --quality high
```

Generate a 4K widescreen image with the top quality setting (`gpt-image-2.5` models only):

```bash
node textToImage.js output/skyline.png "a city skyline at dusk" --size 3840x2160 --quality max
```

Use a FLUX model:

```bash
node textToImage.js output/city.png "cyberpunk cityscape at night" --model flux-2-pro --size 16:9
```

Use multiple input images:

```bash
node editImage.js room.jpg reference.jpg output/restyled.png "restyle the first room to match the second"
```
