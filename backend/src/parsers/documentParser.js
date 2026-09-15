// ============================================================================
// Multi-Format Document Parser (PDF, DOCX, XLSX, CSV, TXT)
// ============================================================================

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Optional lazy require for pdf-parse and mammoth
let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse package not loaded yet:', e.message);
}

let mammoth = null;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.warn('mammoth package not loaded yet:', e.message);
}

/**
 * Extracts text and metadata from an uploaded file
 * @param {string} filePath Absolute or relative path to file
 * @param {string} originalName Original filename
 * @param {string} mimeType File mime type
 * @returns {Promise<{ text: string, metadata: object, preview: string }>}
 */
async function parseDocument(filePath, originalName, mimeType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document file not found at path: ${filePath}`);
  }

  const fileExt = path.extname(originalName || filePath).toLowerCase();
  const fileStats = fs.statSync(filePath);
  const metadata = {
    fileExt,
    fileSizeBytes: fileStats.size,
    originalName: originalName || path.basename(filePath),
    parsedAt: new Date().toISOString(),
  };

  let extractedText = '';

  if (fileExt === '.pdf') {
    if (!pdfParse) {
      pdfParse = require('pdf-parse');
    }
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    extractedText = pdfData.text || '';
    metadata.pageCount = pdfData.numpages || 1;
    metadata.info = pdfData.info || {};
  } else if (fileExt === '.docx') {
    if (!mammoth) {
      mammoth = require('mammoth');
    }
    const result = await mammoth.extractRawText({ path: filePath });
    extractedText = result.value || '';
    metadata.warnings = result.messages || [];
  } else if (fileExt === '.xlsx' || fileExt === '.xls') {
    const workbook = xlsx.readFile(filePath);
    metadata.sheetNames = workbook.SheetNames;
    const textChunks = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csvContent = xlsx.utils.sheet_to_csv(sheet);
      textChunks.push(`=== Sheet: ${sheetName} ===\n${csvContent}`);
    }
    extractedText = textChunks.join('\n\n');
  } else if (fileExt === '.csv') {
    extractedText = fs.readFileSync(filePath, 'utf-8');
    const lines = extractedText.split('\n').filter(Boolean);
    metadata.rowCount = lines.length;
  } else {
    // Default text reading
    extractedText = fs.readFileSync(filePath, 'utf-8');
  }

  // Sanitized preview
  const preview = extractedText.slice(0, 1500).trim();

  return {
    text: extractedText,
    metadata,
    preview,
  };
}

module.exports = {
  parseDocument,
};
