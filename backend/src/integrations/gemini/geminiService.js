// ============================================================================
// Gemini AI Integration Service
// Orchestrates AI document extraction, intelligence generation, and grounded Q&A
// ============================================================================

const { ai, DEFAULT_MODEL } = require("./geminiClient");
const {
  buildDocumentExtractionPrompt,
  buildPostCalculationIntelligencePrompt,
  buildAdvisorGroundedPrompt,
} = require("./prompts/riskPrompts");

/**
 * Helper to safely extract JSON from Gemini text response
 */
function parseGeminiJson(rawText) {
  if (!rawText) throw new Error("Empty response received from Gemini AI");
  let cleanText = rawText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return JSON.parse(cleanText);
}

/**
 * Step 1: AI Document Understanding & Fact Extraction
 * @param {string} documentText
 * @param {object} targetProfile
 * @param {Array} activeCategories
 * @param {Array} activeRules
 * @returns {Promise<{ document_summary: string, extracted_facts: Array, candidate_risks: Array }>}
 */
async function extractDocumentFactsAndRisks(
  documentText,
  targetProfile,
  activeCategories = [],
  activeRules = [],
) {
  const prompt = buildDocumentExtractionPrompt(
    documentText,
    targetProfile,
    activeCategories,
    activeRules,
  );

  let attempts = 0;
  const maxAttempts = 2;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = parseGeminiJson(response.text);

      if (!parsed.extracted_facts || !Array.isArray(parsed.extracted_facts)) {
        parsed.extracted_facts = [];
      }
      if (!parsed.candidate_risks || !Array.isArray(parsed.candidate_risks)) {
        parsed.candidate_risks = [];
      }

      return {
        document_summary:
          parsed.document_summary || "Document extracted successfully.",
        extracted_facts: parsed.extracted_facts,
        candidate_risks: parsed.candidate_risks,
      };
    } catch (err) {
      lastError = err;
      console.warn(
        `Gemini extraction attempt ${attempts} failed:`,
        err.message,
      );
      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw new Error(
    `Gemini Document Extraction failed after ${maxAttempts} attempts: ${lastError?.message}`,
  );
}

/**
 * Step 2: AI Post-Calculation Intelligence, Executive Summary & Mitigation Prioritization
 * @param {object} assessmentContext
 * @returns {Promise<{ executive_summary: string, risk_position_overview: string, top_risk_drivers: Array, strategic_implications: string, recommendations: Array }>}
 */
async function generatePostCalculationIntelligence(assessmentContext) {
  const prompt = buildPostCalculationIntelligencePrompt(assessmentContext);

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = parseGeminiJson(response.text);

    return {
      executive_summary:
        parsed.executive_summary ||
        "Executive summary generated based on deterministic risk scores.",
      risk_position_overview: parsed.risk_position_overview || "",
      top_risk_drivers: Array.isArray(parsed.top_risk_drivers)
        ? parsed.top_risk_drivers
        : [],
      strategic_implications: parsed.strategic_implications || "",
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
    };
  } catch (err) {
    console.error("Gemini Intelligence Analysis error:", err.message);
    // Provide deterministic fallback structure so assessment never fails completely
    return {
      executive_summary: `The enterprise assessment yielded an overall Enterprise Risk Index (ERI) of ${assessmentContext.eriResult?.eriScore} (${assessmentContext.eriResult?.classification}). Active mitigation is recommended for elevated category exposures.`,
      risk_position_overview:
        "Risk evaluation generated via deterministic calculations.",
      top_risk_drivers:
        assessmentContext.calculatedRisks?.slice(0, 3).map((r) => ({
          driver_title: r.risk_name,
          category: r.category_code,
          impact_summary: `High residual risk of ${r.residual_risk}`,
          supporting_evidence: r.evidence_quote || "",
        })) || [],
      strategic_implications:
        "Review identified high and critical risks to implement targeted controls.",
      recommendations:
        assessmentContext.calculatedRisks?.slice(0, 4).map((r, idx) => ({
          title: `Mitigate ${r.risk_name}`,
          risk_name: r.risk_name,
          recommendation_text: `Implement enhanced controls and continuous monitoring for ${r.risk_name}.`,
          priority: idx === 0 ? "IMMEDIATE" : "SHORT_TERM",
          suggested_timeframe: idx === 0 ? "30 days" : "60 days",
          expected_outcome: "Reduce category residual risk.",
        })) || [],
    };
  }
}

function sanitizeAdvisorResponse(text) {
  if (!text)
    return "This information is not available in the uploaded assessment document.";

  let cleaned = text
    .replace(
      /^.*?(?:Verify Constraints|Verification|Thinking Process|Chain of Thought|Constraints Checklist).*?\n/gis,
      "",
    )
    .replace(/#{1,6}\s*/g, "") // remove markdown headings #
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove **bold**
    .replace(/\*(.*?)\*/g, "$1") // remove *italic*
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1") // remove _underline_
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // remove `code`
    .trim();

  // If text starts with leaked constraint check like "• Direct professional...", clean it
  if (
    cleaned.toLowerCase().includes("direct professional") &&
    cleaned.toLowerCase().includes("markdown")
  ) {
    cleaned = cleaned
      .replace(/^.*?(?:no asterisks|check carefully|yes\.)\s*/gis, "")
      .trim();
  }

  return (
    cleaned ||
    "This information is not available in the uploaded assessment document."
  );
}

/**
 * Step 3: Grounded Contextual AI Risk Advisor
 * @param {string} question
 * @param {object} assessmentSummary
 * @param {Array} chatHistory
 * @returns {Promise<{ answer: string }>}
 */
async function queryContextualAdvisor(
  question,
  assessmentSummary,
  chatHistory = [],
) {
  const prompt = buildAdvisorGroundedPrompt(
    question,
    assessmentSummary,
    chatHistory,
  );

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          "You are the executive Contextual AI Risk Advisor for ERIDSS, conversing directly with the Chief Risk Officer. Provide comprehensive, professional risk advice and strategic recommendations grounded in the assessment data. Do not give superficial single-line answers; provide rich, professional paragraphs and, when applicable, list actionable steps or bullet points. Maintain a clean, human chat tone without markdown header hashtags (#) or asterisks (**) bold wrappers. Never output internal thinking notes or constraint checklists.",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    const rawText =
      response.text ||
      "This information is not available in the uploaded assessment document.";
    return {
      answer: sanitizeAdvisorResponse(rawText),
    };
  } catch (err) {
    console.error("Gemini Advisor Error:", err);
    throw new Error(`AI Advisor error: ${err.message}`);
  }
}

module.exports = {
  extractDocumentFactsAndRisks,
  generatePostCalculationIntelligence,
  queryContextualAdvisor,
};
