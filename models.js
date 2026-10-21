export const MODELS = {
  "gpt-image-2.5-sunburst": "openai",
  "gpt-image-2.5-flare": "openai",
  "gpt-image-2": "openai",
  "gpt-image-1.5": "openai",
  "gpt-image-1": "openai",
  "gpt-image-1-mini": "openai",
  "gemini-2.5-flash-image": "gemini",
  "gemini-3-pro-image-preview": "gemini",
  "gemini-3.1-flash-image-preview": "gemini",
  "flux-kontext-pro": "flux",
  "flux-kontext-max": "flux",
  "flux-2-pro": "flux",
  "flux-2-pro-preview": "flux",
  "flux-2-flex": "flux",
};

export const DEFAULT_MODEL = "gpt-image-2.5-sunburst";

// OpenAI models that accept arbitrary WIDTHxHEIGHT sizes (gpt-image-2 and later).
const OPENAI_CUSTOM_SIZE_MODELS = new Set([
  "gpt-image-2",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
]);

// OpenAI models that accept the "xhigh" and "max" quality levels.
const OPENAI_EXTENDED_QUALITY_MODELS = new Set([
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
]);

export const SIZES = {
  openai: ["auto", "1024x1024", "1536x1024", "1024x1536"],
  gemini: ["512px", "1K", "2K", "4K"],
  flux: ["aspect ratios: 21:9 to 9:21 (via --size)"],
};

export const SIZE_NOTES = {
  openai: "gpt-image-2 and later also accept any WIDTHxHEIGHT (multiples of 16, aspect ratio 1:3 to 3:1, up to 3840x2160)",
};

export const QUALITIES = {
  openai: ["auto", "low", "medium", "high"],
};

export const QUALITY_NOTES = {
  openai: "gpt-image-2.5 models also accept xhigh and max",
};

const OPENAI_MAX_WIDTH = 3840;
const OPENAI_MAX_HEIGHT = 2160;

function isValidOpenAICustomSize(size) {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width % 16 !== 0 || height % 16 !== 0) return false;
  if (width > OPENAI_MAX_WIDTH || height > OPENAI_MAX_HEIGHT) return false;
  const ratio = width / height;
  return ratio >= 1 / 3 && ratio <= 3;
}

// Returns an error message, or null if the size is valid for the model.
export function validateSize(model, size) {
  const provider = MODELS[model];
  const sizes = SIZES[provider];
  if (!sizes || sizes.includes(size)) return null;
  if (provider === "openai" && OPENAI_CUSTOM_SIZE_MODELS.has(model) && isValidOpenAICustomSize(size)) {
    return null;
  }

  const lines = [`Invalid size "${size}" for ${model}.`, `Valid sizes: ${sizes.join(", ")}`];
  if (provider === "openai" && OPENAI_CUSTOM_SIZE_MODELS.has(model)) {
    lines.push(`Custom sizes: ${SIZE_NOTES.openai}`);
  }
  return lines.join("\n");
}

// Returns an error message, or null if the quality is valid for the model.
export function validateQuality(model, quality) {
  const provider = MODELS[model];
  const qualities = QUALITIES[provider];
  if (!qualities) return null;
  const allowed = OPENAI_EXTENDED_QUALITY_MODELS.has(model)
    ? [...qualities, "xhigh", "max"]
    : qualities;
  if (allowed.includes(quality)) return null;
  return `Invalid quality "${quality}" for ${model}.\nValid qualities: ${allowed.join(", ")}`;
}

export function printModels() {
  console.log("Available models:\n");
  for (const [name, provider] of Object.entries(MODELS)) {
    const tag = name === DEFAULT_MODEL ? " (default)" : "";
    console.log(`  ${name} [${provider}]${tag}`);
  }
}

export function printSizes() {
  console.log("Available sizes by provider:\n");
  for (const [provider, sizes] of Object.entries(SIZES)) {
    console.log(`  ${provider}: ${sizes.join(", ")}`);
    if (SIZE_NOTES[provider]) {
      console.log(`    ${SIZE_NOTES[provider]}`);
    }
  }
}
