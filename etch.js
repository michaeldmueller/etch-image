#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import os from "os";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { MODELS, DEFAULT_MODEL, validateSize, validateQuality, printModels, printSizes } from "./models.js";
import { generateOpenAI } from "./providers/openai.js";
import { generateGemini } from "./providers/gemini.js";
import { generateFlux } from "./providers/flux.js";

// User config lives in $XDG_CONFIG_HOME/etch, or ~/.config/etch when that is unset.
const CONFIG_DIR = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "etch");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

// API keys come from the shell environment, then the project's .env, then the config dir's .env.
// dotenv never overrides a variable that is already set, so earlier sources win.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dotenv.config({ path: path.join(CONFIG_DIR, ".env") });

const USAGE = 'Usage: etch [input_file ...] "prompt" [-o <output_file>] [-n <count>] [--model <model>] [--size <size>] [--quality <quality>] [--background <background>] [--open | --dont-open] [--json] [--force]';

// Exit codes: 1 usage or config error, 2 provider/API error, 3 request refused by content moderation.
const EXIT = { usage: 1, api: 2, moderation: 3 };

const MAX_COUNT = 10;

let jsonMode = false;

// Prints an error (as JSON when --json is set) and exits with the matching code.
function fail(message, code = "usage") {
  if (jsonMode) {
    console.error(JSON.stringify({ error: message, code }));
  } else {
    console.error(message);
  }
  process.exit(EXIT[code]);
}

function classifyError(err) {
  const text = `${err?.code ?? ""} ${err?.message ?? ""}`;
  return /moderat|safety|blocked|prohibited/i.test(text) ? "moderation" : "api";
}

// Built-in defaults. Any of these can be overridden in config.json,
// and a CLI flag overrides both.
const DEFAULTS = {
  model: DEFAULT_MODEL,
  size: null,
  quality: null,
  background: null,
  count: 1,
  open: true,
  output_dir: null,
};

function isValidCount(value) {
  return Number.isInteger(value) && value >= 1 && value <= MAX_COUNT;
}

function loadConfig() {
  let raw;
  try {
    raw = fs.readFileSync(CONFIG_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    fail(`Invalid JSON in ${CONFIG_PATH}: ${err.message}`);
  }

  const unknown = Object.keys(config).filter((key) => !(key in DEFAULTS));
  if (unknown.length > 0) {
    fail(`Unknown setting${unknown.length > 1 ? "s" : ""} in ${CONFIG_PATH}: ${unknown.join(", ")}\nValid settings: ${Object.keys(DEFAULTS).join(", ")}`);
  }
  if ("open" in config && typeof config.open !== "boolean") {
    fail(`Invalid value for "open" in ${CONFIG_PATH}: expected true or false`);
  }
  if ("count" in config && !isValidCount(config.count)) {
    fail(`Invalid value for "count" in ${CONFIG_PATH}: expected a whole number from 1 to ${MAX_COUNT}`);
  }
  return config;
}

function expandHome(p) {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}

// Auto-generated names sort chronologically; the random suffix avoids collisions within a second.
function defaultOutputPath(outputDir) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const id = Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return path.join(outputDir ? expandHome(outputDir) : process.cwd(), `etch-${stamp}-${id}.png`);
}

// One path per image. An explicit -o gets a -1, -2, ... suffix before the extension when
// more than one image is requested; auto-named files each get their own name.
function outputPaths(output, count, outputDir) {
  if (!output) {
    const paths = new Set();
    while (paths.size < count) paths.add(defaultOutputPath(outputDir));
    return [...paths];
  }
  if (count === 1) return [output];
  const ext = path.extname(output);
  const base = output.slice(0, output.length - ext.length);
  return Array.from({ length: count }, (_, i) => `${base}-${i + 1}${ext}`);
}

function printConfig(settings) {
  console.log(`Config file: ${CONFIG_PATH}${fs.existsSync(CONFIG_PATH) ? "" : " (not found)"}\n`);
  console.log("Effective defaults:\n");
  for (const [key, value] of Object.entries(settings)) {
    const shown = value !== null ? value : key === "output_dir" ? "(current directory)" : "(provider default)";
    console.log(`  ${key}: ${shown}`);
  }
}

function openFile(file) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? 'start ""' : "xdg-open";
  try {
    execSync(`${cmd} "${file}"`, { stdio: "ignore" });
  } catch {
    console.error(`Warning: could not open ${file} with ${cmd.split(" ")[0]}. Use --dont-open or set "open": false in ${CONFIG_PATH} to skip this.`);
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  jsonMode = args.includes("--json");
  const settings = { ...DEFAULTS, ...loadConfig() };
  let { model, size, background, quality, count, output_dir: outputDir } = settings;
  let open = null; // null until a flag sets it; resolved below
  let output = null;
  let force = false;
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--output" || args[i] === "-o") && i + 1 < args.length) {
      output = args[++i];
    } else if ((args[i] === "--count" || args[i] === "-n") && i + 1 < args.length) {
      const raw = args[++i];
      count = /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!isValidCount(count)) fail(`Invalid count "${raw}": expected a whole number from 1 to ${MAX_COUNT}`);
    } else if (args[i] === "--model" && i + 1 < args.length) {
      model = args[++i];
    } else if (args[i] === "--size" && i + 1 < args.length) {
      size = args[++i];
    } else if (args[i] === "--background" && i + 1 < args.length) {
      background = args[++i];
    } else if (args[i] === "--quality" && i + 1 < args.length) {
      quality = args[++i];
    } else if (args[i] === "--models") {
      printModels();
      process.exit(0);
    } else if (args[i] === "--sizes") {
      printSizes();
      process.exit(0);
    } else if (args[i] === "--open") {
      open = true;
    } else if (args[i] === "--dont-open") {
      open = false;
    } else if (args[i] === "--json") {
      // handled above
    } else if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--config") {
      printConfig(settings);
      process.exit(0);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (args[i].startsWith("-") && args[i].length > 1) {
      fail(`Unknown option: ${args[i]}\n${USAGE}`);
    } else {
      positional.push(args[i]);
    }
  }

  if (positional.length < 1) {
    fail(`${USAGE}\n\nAvailable models: ${Object.keys(MODELS).join(", ")}`);
  }

  const prompt = positional[positional.length - 1];
  const sourceImages = positional.slice(0, -1);

  if (output) {
    const ext = path.extname(output).toLowerCase();
    if (ext && ext !== ".png") {
      console.error(`Warning: images are saved as PNG regardless of the extension (${output}).`);
    }
  }
  const outputs = outputPaths(output, count, outputDir);
  const existing = outputs.filter((file) => fs.existsSync(file));
  if (existing.length > 0 && !force) {
    fail(`Output file${existing.length > 1 ? "s" : ""} already exist${existing.length > 1 ? "" : "s"}: ${existing.join(", ")}\nPass --force to overwrite.`);
  }

  for (const src of sourceImages) {
    if (!fs.existsSync(src)) {
      fail(`Input file not found: ${src}`);
    }
  }

  model = model || DEFAULT_MODEL;
  const provider = MODELS[model];
  if (!provider) {
    fail(`Unknown model: ${model}\nAvailable models: ${Object.keys(MODELS).join(", ")}`);
  }

  const sizeError = size && validateSize(model, size);
  if (sizeError) fail(sizeError);

  const qualityError = quality && validateQuality(model, quality);
  if (qualityError) fail(qualityError);

  // Without an explicit flag, open only when the configured default says so and a person is watching.
  if (open === null) open = settings.open && Boolean(process.stdout.isTTY) && !jsonMode;

  return { outputs, prompt, sourceImages, provider, model, size, background, quality, count, open };
}

const GENERATORS = {
  openai: generateOpenAI,
  gemini: generateGemini,
  flux: generateFlux,
};

async function main() {
  const { outputs, prompt, sourceImages, provider, model, size, background, quality, count, open } = parseArgs(process.argv);

  for (const dir of new Set(outputs.map((file) => path.dirname(path.resolve(file))))) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Progress and details go to stderr so stdout carries only the saved paths.
  // The spinner is skipped when stderr is not a terminal (logs, pipes).
  const isEdit = sourceImages.length > 0;
  const verb = `${isEdit ? "Editing" : "Generating"}${count > 1 ? ` ${count} images` : ""}`;
  const frames = [`${verb}.`, `${verb}..`, `${verb}...`];
  let i = 0;
  const spinner = process.stderr.isTTY && !jsonMode
    ? setInterval(() => process.stderr.write(`\r${frames[i++ % frames.length]}`), 400)
    : null;
  const clearSpinner = () => {
    if (spinner) {
      clearInterval(spinner);
      process.stderr.write("\r\x1b[K");
    }
  };

  const started = Date.now();
  let buffers;
  let cost = null;
  let errors = [];
  try {
    ({ buffers, cost, errors } = await GENERATORS[provider]({ prompt, sourceImages, model, size, background, quality, count }));
  } catch (err) {
    clearSpinner();
    fail(err?.message ?? String(err), classifyError(err));
  }
  const elapsedMs = Date.now() - started;

  // When some images failed, the ones that succeeded still take the first output names.
  const saved = outputs.slice(0, buffers.length);
  saved.forEach((file, idx) => fs.writeFileSync(file, buffers[idx]));
  clearSpinner();

  if (jsonMode) {
    const paths = saved.map((file) => path.resolve(file));
    console.log(JSON.stringify({
      path: paths[0],
      paths,
      mode: isEdit ? "edit" : "generate",
      provider,
      model,
      size,
      quality,
      background,
      inputs: sourceImages.map((src) => path.resolve(src)),
      elapsed_ms: elapsedMs,
      cost_usd: cost ? Number(cost.usd.toFixed(4)) : null,
      cost_estimated: cost ? cost.estimated : null,
    }));
  } else {
    for (const file of saved) {
      console.log(process.stdout.isTTY ? `Saved: ${file}` : file);
    }
    const details = [
      ["Provider", provider],
      ["Model", model],
      ["Size", size],
      ["Quality", quality],
      ["Background", background],
      ["Inputs", sourceImages.length > 0 ? sourceImages.join(", ") : null],
      [cost?.estimated ? "Estimated cost" : "Cost", cost ? `$${cost.usd.toFixed(3)}` : null],
    ];
    for (const [label, value] of details) {
      if (value) console.error(`  ${label}: ${value}`);
    }
  }

  if (open) {
    for (const file of saved) openFile(path.resolve(file));
  }

  if (errors.length > 0) {
    const message = `${errors.length} of ${count} images failed: ${errors[0]?.message ?? String(errors[0])}`;
    fail(message, classifyError(errors[0]));
  }
}

main();
