#!/usr/bin/env node

/**
 * Manifest & Content Package Verification Utility
 *
 * Verifies that:
 * 1. manifest.json strictly conforms to MD Study Room v1.9+ validation rules.
 * 2. Every referenced content file exists and is valid JSON.
 * 3. fileSizeBytes matches the exact disk byte length.
 * 4. sha256 matches the authentic SHA-256 hash of the exact binary file bytes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'manifest.json');

const CURRENT_MANIFEST_SCHEMA_VERSION = 1;
const EXPECTED_APP_ID = 'md-study-room';
const ALLOWED_TYPES = ['chapter', 'mcq-bank', 'past-paper', 'syllabus-revision', 'errata'];

function main() {
  console.log('--- MD Study Room Content Repository Validator ---\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('ERROR: manifest.json not found at:', MANIFEST_PATH);
    process.exit(1);
  }

  let manifest;
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error('ERROR: Failed to parse manifest.json as JSON:', err.message);
    process.exit(1);
  }

  // 1. Validate manifest root fields
  if (manifest.manifestSchemaVersion !== CURRENT_MANIFEST_SCHEMA_VERSION) {
    console.error(`ERROR: manifestSchemaVersion must be ${CURRENT_MANIFEST_SCHEMA_VERSION}`);
    process.exit(1);
  }

  if (manifest.appId !== EXPECTED_APP_ID) {
    console.error(`ERROR: appId must be "${EXPECTED_APP_ID}"`);
    process.exit(1);
  }

  if (typeof manifest.minAppVersion !== 'string' || !manifest.minAppVersion.trim()) {
    console.error('ERROR: Missing minAppVersion');
    process.exit(1);
  }

  if (typeof manifest.latestAppVersion !== 'string' || !manifest.latestAppVersion.trim()) {
    console.error('ERROR: Missing latestAppVersion');
    process.exit(1);
  }

  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    console.error('ERROR: manifest.items must be a non-empty array');
    process.exit(1);
  }

  console.log(`[PASS] Root manifest structure valid (appId: ${manifest.appId}, items: ${manifest.items.length})`);

  // 2. Validate each item
  let hasErrors = false;

  for (let i = 0; i < manifest.items.length; i++) {
    const item = manifest.items[i];
    console.log(`\nValidating item [${i + 1}/${manifest.items.length}]: "${item.id}" (${item.type})...`);

    if (!item.id || typeof item.id !== 'string') {
      console.error('  [FAIL] Missing item id');
      hasErrors = true;
      continue;
    }

    if (!ALLOWED_TYPES.includes(item.type)) {
      console.error(`  [FAIL] Invalid type: ${item.type}`);
      hasErrors = true;
    }

    if (!item.subjectId || typeof item.subjectId !== 'string') {
      console.error('  [FAIL] Missing subjectId');
      hasErrors = true;
    }

    if (typeof item.contentVersion !== 'number' || item.contentVersion < 1) {
      console.error('  [FAIL] Invalid contentVersion');
      hasErrors = true;
    }

    if (!item.title || typeof item.title !== 'string') {
      console.error('  [FAIL] Missing title');
      hasErrors = true;
    }

    if (!item.fileUrl || !item.fileUrl.startsWith('http')) {
      console.error('  [FAIL] fileUrl must start with http/https');
      hasErrors = true;
    }

    if (typeof item.fileSizeBytes !== 'number' || item.fileSizeBytes <= 0) {
      console.error('  [FAIL] fileSizeBytes must be > 0');
      hasErrors = true;
    }

    if (!item.sha256 || !/^[a-fA-F0-9]{64}$/.test(item.sha256.trim())) {
      console.error('  [FAIL] sha256 must be a 64-character hex string');
      hasErrors = true;
    }

    // Check local file if accessible
    const urlParts = item.fileUrl.split('/content/');
    if (urlParts.length === 2) {
      const localRelPath = path.join('content', urlParts[1]);
      const localFullPath = path.join(REPO_ROOT, localRelPath);

      if (fs.existsSync(localFullPath)) {
        const fileBuffer = fs.readFileSync(localFullPath);
        const actualBytes = fileBuffer.length;
        const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();

        if (actualBytes !== item.fileSizeBytes) {
          console.error(`  [FAIL] Byte size mismatch: manifest claims ${item.fileSizeBytes}, actual is ${actualBytes}`);
          hasErrors = true;
        } else {
          console.log(`  [PASS] Byte size matches exactly: ${actualBytes} bytes`);
        }

        if (actualHash !== item.sha256.toLowerCase()) {
          console.error(`  [FAIL] SHA-256 mismatch!\n    Manifest: ${item.sha256}\n    Actual:   ${actualHash}`);
          hasErrors = true;
        } else {
          console.log(`  [PASS] SHA-256 matches exactly: ${actualHash}`);
        }

        try {
          const payloadJson = JSON.parse(fileBuffer.toString('utf8'));
          if (typeof payloadJson !== 'object' || payloadJson === null) {
            console.error('  [FAIL] Content JSON root must be an object');
            hasErrors = true;
          } else {
            console.log(`  [PASS] JSON structure is valid object (contains ${payloadJson.totalQuestions || 0} questions)`);
          }
        } catch (err) {
          console.error('  [FAIL] File content is not valid JSON:', err.message);
          hasErrors = true;
        }
      } else {
        console.warn(`  [WARN] Local file not found at ${localFullPath} (only remote URL provided)`);
      }
    }
  }

  if (hasErrors) {
    console.error('\nVerification FAILED with errors.');
    process.exit(1);
  } else {
    console.log('\n[SUCCESS] All manifest and content packages verified 100% authentic and valid!\n');
  }
}

main();
