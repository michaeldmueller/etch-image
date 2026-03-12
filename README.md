# Picasso

CLI tool for editing images using OpenAI and Google Gemini models.

## Setup

```bash
npm install
cp .env.example .env
```

Add your API keys to `.env`:

```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

## Usage

```bash
node edit.js <input_file> <output_file> "prompt" [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--model <model>` | Model to use (default: `gpt-image-1.5`) |
| `--size <size>` | Image dimensions |
| `--quality <quality>` | Image quality (OpenAI only) |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after generation |
| `--models` | List available models and exit |
| `--sizes` | List available sizes by provider and exit |

### Available Models

**OpenAI:** `gpt-image-1`, `gpt-image-1.5`

**Gemini:** `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`

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
