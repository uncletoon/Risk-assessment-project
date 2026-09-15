// ============================================================================
// Google Gemini Client Configuration
// Uses the official @google/genai SDK
// ============================================================================

const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not defined in the environment variables.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });
const DEFAULT_MODEL = 'gemini-3.6-flash';

module.exports = {
  ai,
  DEFAULT_MODEL,
};
