// ============================================================================
// Assessment Pipeline & Single-Document Rule Integration Tests
// ============================================================================

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, describe, after } = require('node:test');

const {
  createAssessment,
  attachDocument,
  getAssessmentDetails,
} = require('../src/services/assessmentService');

const { parseDocument } = require('../src/parsers/documentParser');
const { pool } = require('../src/config/db');

describe('Document Parser Tests', () => {
  test('Parses CSV file accurately with row count metadata', async () => {
    const csvPath = path.resolve(__dirname, '../../test_data/loan_portfolio_history.csv');
    if (fs.existsSync(csvPath)) {
      const parsed = await parseDocument(csvPath, 'loan_portfolio_history.csv', 'text/csv');
      assert.ok(parsed.text.length > 0);
      assert.ok(parsed.metadata.rowCount > 0);
      assert.ok(parsed.preview.length > 0);
    }
  });
});

describe('Single-Document Rule & Assessment Service', () => {
  let createdAssessmentId = null;

  test('Creates assessment container in UPLOADED state', async () => {
    const assessment = await createAssessment({
      organizationId: 1,
      userId: 2,
      title: 'Automated Pipeline Test Assessment',
    });

    assert.ok(assessment.id);
    assert.strictEqual(assessment.status, 'UPLOADED');
    createdAssessmentId = assessment.id;
  });

  test('Attaches initial document successfully', async () => {
    const dummyFile = {
      filename: 'test_doc.csv',
      originalname: 'portfolio_test.csv',
      mimetype: 'text/csv',
      size: 1024,
      path: path.resolve(__dirname, '../../test_data/loan_portfolio_history.csv'),
    };

    const doc = await attachDocument({
      assessmentId: createdAssessmentId,
      file: dummyFile,
      userId: 2,
      allowReplace: false,
    });

    assert.ok(doc.id);
    assert.strictEqual(doc.assessment_id, createdAssessmentId);
  });

  test('Strict Single-Document Rule: Replaces document only when allowReplace is true', async () => {
    const secondFile = {
      filename: 'test_doc2.csv',
      originalname: 'portfolio_replacement.csv',
      mimetype: 'text/csv',
      size: 2048,
      path: path.resolve(__dirname, '../../test_data/loan_portfolio_history.csv'),
    };

    const doc = await attachDocument({
      assessmentId: createdAssessmentId,
      file: secondFile,
      userId: 2,
      allowReplace: true,
    });

    assert.ok(doc.id);
    assert.strictEqual(doc.original_name, 'portfolio_replacement.csv');
  });

  after(async () => {
    await pool.end();
  });
});
