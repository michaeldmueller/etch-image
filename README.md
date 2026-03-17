# Picasso

CLI tool for editing images using OpenAI, Google Gemini, and FLUX (Black Forest Labs) models.

## Setup

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

```bash
node edit.js <input_file> [input_file2 ...] <output_file> "prompt" [options]
```

You can provide multiple input images. The last two positional arguments are always the output file and prompt, and everything before them is treated as source images.

### Options

| Flag | Description |
|------|-------------|
| `--model <model>` | Model to use (default: `gpt-image-1.5`) |
| `--size <size>` | Image dimensions (aspect ratio for FLUX, e.g. `16:9`) |
| `--quality <quality>` | Image quality (OpenAI only) |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after generation |
| `--models` | List available models and exit |
| `--sizes` | List available sizes by provider and exit |

### Available Models

**OpenAI:** `gpt-image-1`, `gpt-image-1.5`

**Gemini:** `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`

**FLUX (Black Forest Labs):** `flux-kontext-pro`, `flux-kontext-max`, `flux-2-pro`, `flux-2-pro-preview`, `flux-2-flex`

### Examples

Edit an image:

```bash
node edit.js source.png output/edited.png "make the sky purple" --open
```

Use a specific model:

```bash
node edit.js source.png output/edited.png "make the sky purple" --model gemini-2.5-flash-image
```

Specify size and quality:

```bash
node edit.js source.png output/edited.png "add a sunset" --size 1536x1024 --quality high
```

Use a FLUX model:

```bash
node edit.js source.jpg output/edited.png "make it cyberpunk" --model flux-kontext-pro --size 16:9
```

Use multiple input images:

```bash
node edit.js room.jpg reference.jpg output/restyled.png "restyle the first room to match the second"
```
