// ============================================================================
// Privacy Evaluation & Personal Information Gate Unit Tests
// ============================================================================

const assert = require("node:assert");
const { test, describe } = require("node:test");
const {
  evaluateDocumentPrivacy,
} = require("../src/integrations/gemini/geminiService");

describe("AI Privacy Evaluation Gate", () => {
  test("Detects personal identifiers (phone number, personal email, national ID)", async () => {
    const documentWithPii = `
      CLIENT LOAN APPLICATION FORM
      Applicant Name: Eric Mugabo
      National ID: 1199080012345678
      Personal Phone: +250 788 123 456
      Personal Email: eric.mugabo@gmail.com
      Residential Address: Gasabo, Kimironko, KG 123 St
      Requested Amount: 5,000,000 RWF
      Purpose: Working Capital
    `;

    const result = await evaluateDocumentPrivacy(documentWithPii);

    assert.strictEqual(result.contains_personal_info, true);
    assert.ok(
      result.detected_items.length >= 2,
      "Should detect at least 2 personal items",
    );

    const snippets = result.detected_items.map((i) => i.snippet);
    const hasPhone = snippets.some(
      (s) => s.includes("788 123 456") || s.includes("+250"),
    );
    const hasEmail = snippets.some((s) => s.includes("eric.mugabo@gmail.com"));

    assert.ok(
      hasPhone || hasEmail,
      "Should capture sensitive phone or email snippet",
    );
    assert.ok(result.summary.length > 0, "Should provide summary explanation");
  });

  test("Approves sanitized corporate financial document with no personal identifiers", async () => {
    const cleanEnterpriseDocument = `
      ANNUAL ENTERPRISE FINANCIAL AUDIT REPORT
      Organization: Apex Horizon Global Enterprises
      Industry: Financial & Enterprise Services
      Fiscal Year: 2025

      BALANCE SHEET SUMMARY:
      Total Assets: 850,000,000 RWF
      Current Assets: 320,000,000 RWF
      Total Liabilities: 240,000,000 RWF
      Current Liabilities: 150,000,000 RWF
      Debt-to-Equity Ratio: 1.25
      Operating Cash Flow: 45,000,000 RWF
      Liquidity Ratio: 2.13

      OPERATIONAL RISKS:
      Primary Supplier Concentration: 28%
      Secondary Supplier Buffer: Verified
      Disaster Recovery RTO: 12 hours
      IT Security: Multi Factor Authentication enforced company wide on all accounts.
    `;

    const result = await evaluateDocumentPrivacy(cleanEnterpriseDocument);

    assert.strictEqual(result.contains_personal_info, false);
    assert.strictEqual(result.detected_items.length, 0);
    assert.ok(
      typeof result.summary === "string" && result.summary.length > 0,
      "Summary should be provided",
    );
  });
});
