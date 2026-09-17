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
const { buildPrivacyEvaluationPrompt } = require("./prompts/privacyPrompts");

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
      const causeInfo = err.cause
        ? ` (${err.cause.code || err.cause.message || err.cause})`
        : "";
      console.warn(
        `Gemini extraction attempt ${attempts} failed:`,
        err.message + causeInfo,
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
      executive_summary: `The single client credit assessment yielded a normalized Client Risk Index of ${assessmentContext.eriResult?.eriScore} (${assessmentContext.eriResult?.classification}). Further review is recommended for elevated repayment, debt, income, collateral, or data quality risks.`,
      risk_position_overview:
        "Client credit risk evaluation generated via deterministic calculations from the extracted borrower evidence.",
      top_risk_drivers:
        assessmentContext.calculatedRisks?.slice(0, 3).map((r) => ({
          driver_title: r.risk_name,
          category: r.category_code,
          impact_summary: `High residual client risk of ${r.residual_risk}`,
          supporting_evidence: r.evidence_quote || "",
        })) || [],
      strategic_implications:
        "Review high and critical client risks and resolve the identified repayment, evidence, or collateral gaps before making a final credit decision.",
      recommendations:
        assessmentContext.calculatedRisks?.slice(0, 4).map((r, idx) => ({
          title: `Mitigate ${r.risk_name}`,
          risk_name: r.risk_name,
          recommendation_text: `Obtain the missing evidence and implement targeted repayment risk mitigation for ${r.risk_name}.`,
          priority: idx === 0 ? "IMMEDIATE" : "SHORT_TERM",
          suggested_timeframe: idx === 0 ? "30 days" : "60 days",
          expected_outcome:
            "Reduce the identified client residual risk or resolve the manual review condition.",
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

/**
 * Helper to perform deterministic regex privacy pattern screening
 */
function scanDeterministicPersonalInfo(text) {
  if (!text) return [];
  const findings = [];

  // Personal Email Provider detection
  const personalEmailRegex =
    /\b[A-Za-z0-9._%+-]+@(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|icloud\.com)\b/gi;
  let match;
  while ((match = personalEmailRegex.exec(text)) !== null) {
    findings.push({
      type: "Email Address",
      snippet: match[0],
      recommendation: "Remove or mask individual personal email address.",
    });
  }

  // Phone number detection
  const phoneRegex = /(?:\+?250|0)\s?[7][2389]\d{1}[\s.-]?\d{3}[\s.-]?\d{3}\b/g;
  while ((match = phoneRegex.exec(text)) !== null) {
    findings.push({
      type: "Phone Number",
      snippet: match[0],
      recommendation:
        "Remove personal phone number or replace with sanitized placeholder.",
    });
  }

  // National ID 16 digits pattern (common format in East Africa / Rwanda)
  const idRegex = /\b1\s?19\d{2}\s?[78]\s?\d{7}\s?\d{1}\s?\d{2}\b/g;
  while ((match = idRegex.exec(text)) !== null) {
    findings.push({
      type: "National ID",
      snippet: match[0],
      recommendation: "Remove citizen national identity number.",
    });
  }

  return findings;
}

/**
 * Evaluates document text for personal identifiers using Gemini AI and pattern heuristics
 * @param {string} documentText
 * @returns {Promise<{ contains_personal_info: boolean, summary: string, detected_items: Array }>}
 */
async function evaluateDocumentPrivacy(documentText) {
  const deterministicItems = scanDeterministicPersonalInfo(documentText || "");

  try {
    const prompt = buildPrivacyEvaluationPrompt(documentText || "");
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = parseGeminiJson(response.text);
    const aiItems = Array.isArray(parsed.detected_items)
      ? parsed.detected_items
      : [];

    // Merge deterministic and AI findings, deduplicating by snippet
    const seen = new Set();
    const mergedItems = [];

    for (const item of [...aiItems, ...deterministicItems]) {
      const key = (item.snippet || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        mergedItems.push(item);
      }
    }

    const hasPersonalInfo =
      mergedItems.length > 0 || Boolean(parsed.contains_personal_info);

    return {
      contains_personal_info: hasPersonalInfo,
      summary:
        parsed.summary ||
        (hasPersonalInfo
          ? `Personal information detected (${mergedItems.length} items). Please sanitize before assessment.`
          : "Privacy verification passed: No personal information detected."),
      detected_items: mergedItems,
    };
  } catch (err) {
    console.warn(
      "AI Privacy Evaluation fallback to deterministic screening:",
      err.message,
    );

    const hasPersonalInfo = deterministicItems.length > 0;
    return {
      contains_personal_info: hasPersonalInfo,
      summary: hasPersonalInfo
        ? `Personal information detected (${deterministicItems.length} items via pattern screening). Please sanitize.`
        : "Privacy verification passed via standard pattern screening.",
      detected_items: deterministicItems,
    };
  }
}

module.exports = {
  extractDocumentFactsAndRisks,
  generatePostCalculationIntelligence,
  queryContextualAdvisor,
  evaluateDocumentPrivacy,
};
