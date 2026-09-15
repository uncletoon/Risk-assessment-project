const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const MODEL_NAME = 'gemini-3.6-flash';

/**
 * Validates document content for sensitive PII (Phone numbers and Emails).
 * Common names, transaction IDs, and monetary amounts are permitted.
 * @param {string} textContent Extracted text or CSV content from the file
 */
async function validateDocumentPII(textContent) {
  const prompt = `
You are a Data Privacy and Compliance Auditor.
Your task is to inspect the provided document data strictly for confidential contact PII (Personal Identifiable Information):
1. FORBIDDEN: Contact phone numbers (e.g. +250 788 ..., 0788..., (555) 123-4567) and Email addresses (e.g. user@domain.com).
2. PERMITTED: Client names, Client IDs (e.g. CL-1001), loan amounts, financial figures in Rwf (e.g. 1763845, 2081337.1, 5336865.06), interest rates (0.18), dates (2024-01-01), and status codes (0 or 1).

CRITICAL: DO NOT mistake financial amounts, decimal numbers, or ID codes for phone numbers.

Analyze this content snippet:
"""
${textContent.slice(0, 8000)}
"""

Respond ONLY in valid JSON with this exact schema:
{
  "has_pii": boolean,
  "detected_emails": string[],
  "detected_phone_numbers": string[],
  "reason": "Brief summary of privacy scan findings",
  "sanitization_advice": "Advice if PII was found, or null if clean"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text);
    return {
      success: true,
      hasPII: result.has_pii,
      detectedEmails: result.detected_emails || [],
      detectedPhoneNumbers: result.detected_phone_numbers || [],
      reason: result.reason,
      advice: result.sanitization_advice,
    };
  } catch (error) {
    console.error('Gemini PII Validation Error:', error);

    // Fallback: Strict Regex that does NOT match plain currency / decimal numbers
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
    // Phone numbers must have country code prefix (+), or parentheses, or standard mobile prefixes (07) with separators
    const phoneRegex = /(?:\+250\s?7\d{2}\s?\d{3}\s?\d{3}|(?:\+?\d{1,3}[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}|\b07[2389]\d{7}\b)/g;

    const emails = (textContent.match(emailRegex) || []);
    const phones = (textContent.match(phoneRegex) || []);
    const hasPII = emails.length > 0 || phones.length > 0;

    return {
      success: true,
      hasPII,
      detectedEmails: emails,
      detectedPhoneNumbers: phones,
      reason: hasPII ? 'Detected contact phone numbers or email addresses in document.' : 'Passed privacy scan (no contact PII found).',
      advice: hasPII ? 'Please remove email addresses and phone numbers before submitting.' : null,
    };
  }
}

/**
 * Predicts risk based on uploaded dataset, employee context, and risk officer's custom rules.
 * @param {Array|string} dataset Sample rows or aggregate of the data
 * @param {string} customRules Rules provided by the Risk Officer
 * @param {string} employeeContext Description/concern submitted by employee
 */
async function predictRiskWithCustomRules(dataset, customRules, employeeContext) {
  const prompt = `
You are a Senior Risk Intelligence Engine.
Currency is strictly Rwandan Francs (Rwf).

The Risk Officer has established specific CUSTOM RISK RULES & THRESHOLDS:
"""
${customRules}
"""

The Frontline Officer reported the following concern:
"""
${employeeContext}
"""

Attached Data Sample:
"""
${typeof dataset === 'string' ? dataset.slice(0, 10000) : JSON.stringify(dataset).slice(0, 10000)}
"""

TASK:
1. Evaluate whether the data breaches or approaches the Risk Officer's Custom Rules.
2. Predict future risk over the next 12 months based on the actual figures in the data.
3. Calculate a concrete ERI Risk Score (0 - 100) and assign a Risk Level (Low, Moderate, High, Critical).
4. Provide actionable decision support recommendations with figures in Rwf where relevant.

Respond ONLY in valid JSON matching this exact structure:
{
  "eri_score": number, // between 0 and 100
  "risk_level": "Low" | "Moderate" | "High" | "Critical",
  "one_year_projection": "Detailed explanation of what will happen in the next 12 months if activity continues at this rate",
  "rule_compliance_summary": "How the data compares against each custom rule provided by the Risk Officer",
  "recommendations": [
    "Actionable point 1 (with specific figures)",
    "Actionable point 2",
    "Actionable point 3"
  ],
  "decision": "Approve with Conditions" | "Reject" | "Standard Approval" | "Escalate"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    return {
      success: true,
      analysis: JSON.parse(response.text),
    };
  } catch (error) {
    console.error('Gemini Custom Prediction Error:', error);
    throw new Error(`Gemini AI prediction service error: ${error.message}`);
  }
}

module.exports = {
  validateDocumentPII,
  predictRiskWithCustomRules,
};
