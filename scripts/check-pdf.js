/*
 * Checks a downloaded EAS guidelines PDF against the last recorded scan (feature 6, Decision D).
 * Usage: node scripts/check-pdf.js <path to EAS.pdf> [<path for the markdown report>]
 * Needs the `pdftotext` program (package poppler-utils). Run by .github/workflows/pdf-check.yml.
 * When the export date or any guideline's newest version entry differs, it rewrites
 * content/pdf-status.json and writes the report. With no earlier scan it records a baseline.
 * Never changes the guideline content itself.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { guidelineData } from '../content/guidelines.js';
import { compareScans, differenceReport, hasDifferences, scanPdfText } from './pdfScan.js';

const STATUS_FILE = 'content/pdf-status.json';
const SOURCE_URL = 'https://cpg.stjohn.org.nz/assets/pdf/EAS.pdf';
// A real EAS PDF has 180 guidelines; far fewer means the download or text extraction failed.
const MINIMUM_GUIDELINE_COUNT = 100;
const MAX_PDFTOTEXT_OUTPUT_BYTES = 200 * 1024 * 1024;

/** Text of the PDF as printed by `pdftotext -layout`. */
function pdfText(pdfPath) {
  return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: MAX_PDFTOTEXT_OUTPUT_BYTES,
  });
}

/** Scan of the PDF file with its fingerprint added. Throws if the scan looks wrong. */
function scanPdfFile(pdfPath) {
  const fileBytes = readFileSync(pdfPath);
  const scan = scanPdfText(pdfText(pdfPath));
  const guidelineCount = Object.keys(scan.guidelines).length;
  if (!scan.exportedOn || guidelineCount < MINIMUM_GUIDELINE_COUNT) {
    throw new Error(`Not a usable EAS PDF: ${guidelineCount} guidelines, date ${scan.exportedOn}`);
  }
  return {
    sourceUrl: SOURCE_URL,
    sha256: createHash('sha256').update(fileBytes).digest('hex'),
    sizeBytes: fileBytes.length,
    ...scan,
  };
}

/** Guideline titles by number, taken from the published content. */
function titlesByNumber() {
  const titles = {};
  guidelineData.sections.forEach((section) => {
    section.items.forEach((guideline) => {
      titles[guideline.n] = guideline.t;
    });
  });
  return titles;
}

/** Passes a value to later GitHub workflow steps; does nothing outside GitHub. */
function setWorkflowOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

/** Saves a scan in the status file (two-space JSON, ending with a new line). */
function saveScan(scan) {
  writeFileSync(STATUS_FILE, `${JSON.stringify(scan, null, 2)}\n`);
}

/** Runs the check from the command line arguments. */
function main() {
  const [pdfPath, reportPath] = process.argv.slice(2);
  if (!pdfPath) throw new Error('Usage: node scripts/check-pdf.js <pdf> [<report.md>]');
  const later = scanPdfFile(pdfPath);
  if (!existsSync(STATUS_FILE)) {
    saveScan(later);
    console.log(`Baseline recorded: export ${later.exportedOn}.`);
    setWorkflowOutput('changed', 'false');
    return;
  }
  const earlier = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
  const difference = compareScans(earlier, later);
  const changed = hasDifferences(difference);
  setWorkflowOutput('changed', String(changed));
  setWorkflowOutput('exported_on', later.exportedOn);
  if (!changed) {
    console.log(`No change: export ${later.exportedOn}.`);
    return;
  }
  const report = differenceReport(earlier, later, difference, titlesByNumber());
  saveScan(later);
  if (reportPath) writeFileSync(reportPath, report);
  console.log(report);
}

main();
