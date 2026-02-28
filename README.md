# Picasso

CLI tool for generating and editing images using OpenAI and Google Gemini models.

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
node picasso.js <output_path> "prompt" [source_image] [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--model <model>` | Model to use (default: `gpt-image-1.5`) |
| `--size <size>` | Image dimensions |
| `--background <background>` | Background style (OpenAI only) |
| `--open` | Open the image after generation |

### Available Models

**OpenAI:** `gpt-image-1`, `gpt-image-1.5`

**Gemini:** `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`

### Examples

Generate an image:

```bash
node picasso.js output/cat.png "a cat sitting on a windowsill" --open
```

Use a specific model:

```bash
node picasso.js output/cat.png "a cat sitting on a windowsill" --model gemini-2.5-flash-image
```

Edit an existing image:

```bash
node picasso.js output/edited.png "make the sky purple" source.png
```
