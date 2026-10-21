export const MODELS = {
  "gpt-image-2.5-sunburst": "openai",
  "gpt-image-2.5-flare": "openai",
  "gpt-image-2": "openai",
  "gpt-image-1.5": "openai",
  "gpt-image-1": "openai",
  "gpt-image-1-mini": "openai",
  "gemini-nano-banana-2.1": "gemini",
  "gemini-3.1-flash-image": "gemini",
  "gemini-3.1-flash-lite-image": "gemini",
  "gemini-3-pro-image": "gemini",
  "gemini-2.5-flash-image": "gemini",
  "flux-3-image": "flux",
  "flux-3-image-klein": "flux",
  "flux-2-pro": "flux",
  "flux-2-max": "flux",
  "flux-2-flex": "flux",
  "flux-2-klein-9b": "flux",
  "flux-2-klein-4b": "flux",
  "flux-2-pro-preview": "flux",
  "flux-kontext-pro": "flux",
  "flux-kontext-max": "flux",
  "flux-pro-1.1": "flux",
  "flux-pro-1.1-ultra": "flux",
  "flux-dev": "flux",
};

// FLUX endpoints differ in request shape. Each family: how size is expressed and how many input images it takes.
//   flux3:   aspect_ratio (fixed list) + resolution tier via --quality, up to 10 reference images
//   flux2:   width/height, up to 8 input images (4 for klein)
//   kontext: aspect_ratio (21:9 to 9:21), up to 4 input images
//   ultra:   aspect_ratio (21:9 to 9:21), 1 reference image
//   flux1:   width/height (multiples of 32, 256 to 1440), 1 reference image
export const FLUX_FAMILIES = {
  "flux-3-image": { family: "flux3", maxImages: 10 },
  "flux-3-image-klein": { family: "flux3", maxImages: 10 },
  "flux-2-pro": { family: "flux2", maxImages: 8 },
  "flux-2-max": { family: "flux2", maxImages: 8 },
  "flux-2-flex": { family: "flux2", maxImages: 8 },
  "flux-2-klein-9b": { family: "flux2", maxImages: 4 },
  "flux-2-klein-4b": { family: "flux2", maxImages: 4 },
  "flux-2-pro-preview": { family: "flux2", maxImages: 8 },
  "flux-kontext-pro": { family: "kontext", maxImages: 4 },
  "flux-kontext-max": { family: "kontext", maxImages: 4 },
  "flux-pro-1.1": { family: "flux1", maxImages: 1 },
  "flux-pro-1.1-ultra": { family: "ultra", maxImages: 1 },
  "flux-dev": { family: "flux1", maxImages: 1 },
};

export const FLUX3_ASPECT_RATIOS = ["21:9", "2:1", "16:9", "3:2", "7:5", "4:3", "5:4", "1:1", "4:5", "3:4", "5:7", "2:3", "9:16", "1:2", "9:21"];
export const FLUX3_RESOLUTIONS = ["768sq", "1k", "1.5k", "2k", "4k"];

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
  flux: ["aspect ratio W:H (e.g. 16:9)", "WIDTHxHEIGHT (FLUX 2, 1.1 and dev)"],
};

// Gemini models differ in which sizes they accept. Models not listed here take no size.
const GEMINI_SIZES = {
  "gemini-nano-banana-2.1": ["1K", "2K", "4K"],
  "gemini-3.1-flash-image": ["512px", "1K", "2K", "4K"],
  "gemini-3.1-flash-lite-image": ["1K"],
  "gemini-3-pro-image": ["1K", "2K", "4K"],
};

export const SIZE_NOTES = {
  openai: "gpt-image-2 and later also accept any WIDTHxHEIGHT (multiples of 16, aspect ratio 1:3 to 3:1, up to 3840x2160)",
  gemini: "varies by model; gemini-2.5-flash-image takes no size",
  flux: `ratios 21:9 to 9:21; flux-3 models accept only ${FLUX3_ASPECT_RATIOS.join(", ")}`,
};

export const QUALITIES = {
  openai: ["auto", "low", "medium", "high"],
  flux: FLUX3_RESOLUTIONS,
};

export const QUALITY_NOTES = {
  openai: "gpt-image-2.5 models also accept xhigh and max",
  flux: "resolution tier, flux-3 models only",
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

function isValidFluxAspectRatio(size) {
  const match = /^(\d+):(\d+)$/.exec(size);
  if (!match) return false;
  const ratio = Number(match[1]) / Number(match[2]);
  return ratio >= 9 / 21 && ratio <= 21 / 9;
}

function isValidFluxDimensions(size, family) {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (family === "flux1") {
    return [width, height].every((n) => n % 32 === 0 && n >= 256 && n <= 1440);
  }
  return width >= 64 && height >= 64;
}

// Returns an error message, or null if the size is valid for the FLUX model.
function validateFluxSize(model, size) {
  const { family } = FLUX_FAMILIES[model];
  if (family === "flux3") {
    if (FLUX3_ASPECT_RATIOS.includes(size)) return null;
    return `Invalid size "${size}" for ${model}.\nValid aspect ratios: ${FLUX3_ASPECT_RATIOS.join(", ")}`;
  }
  if (family === "kontext" || family === "ultra") {
    if (isValidFluxAspectRatio(size)) return null;
    return `Invalid size "${size}" for ${model}.\nValid aspect ratios: W:H between 21:9 and 9:21`;
  }
  if (isValidFluxAspectRatio(size) || isValidFluxDimensions(size, family)) return null;
  const dims = family === "flux1" ? "WIDTHxHEIGHT (multiples of 32, 256 to 1440)" : "WIDTHxHEIGHT (at least 64)";
  return `Invalid size "${size}" for ${model}.\nValid sizes: aspect ratio W:H between 21:9 and 9:21, or ${dims}`;
}

// Returns an error message, or null if the size is valid for the model.
export function validateSize(model, size) {
  const provider = MODELS[model];
  if (provider === "flux") return validateFluxSize(model, size);

  const sizes = provider === "gemini" ? GEMINI_SIZES[model] || [] : SIZES[provider];
  if (!sizes) return null;

  if (provider === "gemini" && sizes.length === 0) {
    return `${model} does not accept a size.`;
  }

  if (sizes.includes(size)) {
    return null;
  } else if (provider === "openai" && OPENAI_CUSTOM_SIZE_MODELS.has(model) && isValidOpenAICustomSize(size)) {
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
  if (provider === "flux" && FLUX_FAMILIES[model].family !== "flux3") {
    return `${model} does not accept a quality. Only flux-3 models do (${FLUX3_RESOLUTIONS.join(", ")}).`;
  }
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
