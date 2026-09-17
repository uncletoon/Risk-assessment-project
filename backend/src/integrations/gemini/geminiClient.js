// ============================================================================
// Google Gemini Client Configuration
// Uses the official @google/genai SDK
// ============================================================================

const { GoogleGenAI } = require("@google/genai");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "WARNING: GEMINI_API_KEY is not defined in the environment variables.",
  );
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash-lite"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean)
  .filter(
    (model, index, models) =>
      model !== DEFAULT_MODEL && models.indexOf(model) === index,
  );

async function generateContentWithFallback(request) {
  const models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await ai.models.generateContent({ ...request, model });
      } catch (error) {
        lastError = error;
        console.warn(
          `Gemini model ${model} attempt ${attempt} failed:`,
          error.message,
        );
        const isPermanentModelError = /404|NOT_FOUND|no longer available/i.test(
          error.message || "",
        );
        if (attempt < 2 && !isPermanentModelError) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else if (isPermanentModelError) {
          break;
        }
      }
    }
  }

  throw new Error(
    `Gemini request failed for models ${models.join(", ")}: ${lastError?.message}`,
  );
}

module.exports = {
  ai,
  DEFAULT_MODEL,
  generateContentWithFallback,
};
