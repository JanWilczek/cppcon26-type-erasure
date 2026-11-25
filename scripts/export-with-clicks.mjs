// Export the Slidev deck to PDF with one page per click step.
//
// Works around Slidev 53.1 not supporting `withClicks` in PDF export:
// the default mode shrinks and truncates the slides, and `perSlide` mode
// only exports click step 0 because arrow keys do nothing in print view.
//
// The script starts its own Slidev dev server, walks the deck in the normal
// presentation view to collect every (slide, clicks) state, renders each
// state through Slidev's print route, and merges the pages into one PDF.
//
// Usage: node scripts/export-with-clicks.mjs [output.pdf] [entry.md]

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-chromium';
import { PDFDocument } from 'pdf-lib';

const output = process.argv[2] ?? 'slides-export-clicks.pdf';
const entry = process.argv[3] ?? 'slides.md';
const port = Number(process.env.SLIDEV_EXPORT_PORT ?? 3031);
const baseUrl = `http://localhost:${port}`;

// Matches Slidev's default canvas (canvasWidth 980, aspect ratio 16:9).
const width = 980;
const height = 552;

function startServer() {
  const server = spawn('npx', ['slidev', entry, '--port', String(port), '--open', 'false'], {
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });
  server.on('exit', (code) => {
    if (code) console.error(`Slidev server exited with code ${code}`);
  });
  return server;
}

function stopServer(server) {
  try {
    process.kill(-server.pid, 'SIGTERM'); // kill the whole process group (npx + slidev)
  } catch {
    // already stopped
  }
}

async function waitForServer(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`Slidev server did not start on ${baseUrl}`);
}

function parseState(url) {
  const u = new URL(url);
  return {
    no: Number(u.pathname.replace(/^\//, '')) || 1,
    clicks: Number(u.searchParams.get('clicks') ?? 0),
  };
}

async function waitForSlide(page, no) {
  const slide = page.locator(`[data-slidev-no="${no}"]`);
  await slide.waitFor({ timeout: 60000 });
  for (let t = 0; t < 120 && (await slide.locator('.slidev-slide-loading').count()) > 0; t++) {
    await sleep(500);
  }
  // Best effort: the dev server can keep a request open (e.g., HMR), so do not fail on it.
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

async function collectStates(page) {
  await page.goto(`${baseUrl}/1`, { waitUntil: 'load', timeout: 120000 });
  await waitForSlide(page, 1);
  const states = [parseState(page.url())];
  for (;;) {
    await page.keyboard.press('ArrowRight', { delay: 50 });
    await sleep(300);
    const state = parseState(page.url());
    const last = states.at(-1);
    if (state.no === last.no && state.clicks === last.clicks) return states; // end of deck
    // A slide registers its click steps only once loaded; pressing on too early
    // (e.g., on a cold server) would skip straight to the next slide.
    if (state.no !== last.no) await waitForSlide(page, state.no);
    states.push(state);
  }
}

async function renderState(page, no, clicks) {
  await page.goto(`${baseUrl}/${no}?print=clicks&clicks=${clicks}`, {
    waitUntil: 'load',
    timeout: 60000,
  });
  await page.emulateMedia({ colorScheme: 'light', media: 'screen' });
  await waitForSlide(page, no);
  return page.pdf({
    width,
    height,
    pageRanges: '1',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { left: 0, top: 0, right: 0, bottom: 0 },
  });
}

async function renderStates(page, states) {
  const merged = await PDFDocument.create();
  for (const [i, { no, clicks }] of states.entries()) {
    let bytes;
    try {
      bytes = await renderState(page, no, clicks);
    } catch (error) {
      console.warn(`\nretrying slide ${no}, clicks ${clicks}: ${error.message.split('\n')[0]}`);
      bytes = await renderState(page, no, clicks);
    }
    const doc = await PDFDocument.load(bytes);
    for (const p of await merged.copyPages(doc, doc.getPageIndices())) merged.addPage(p);
    process.stdout.write(`\rrendered ${i + 1}/${states.length}`);
  }
  process.stdout.write('\n');
  return merged;
}

const server = startServer();
const cleanup = () => stopServer(server);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const states = await collectStates(page);
  console.log(`collected ${states.length} click states`);

  const pdf = await renderStates(page, states);
  pdf.setTitle('(Im)Perfect Forwarding: A Practical Guide to Value Categories in C++');
  pdf.setAuthor('Jan Wilczek');
  await writeFile(output, await pdf.save());
  console.log(`wrote ${pdf.getPageCount()} pages to ${output}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  cleanup();
}
