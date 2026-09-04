const { chromium, devices } = require('playwright-core');
const path = require('path');

const [,, url, outName, widthArg, heightArg] = process.argv;
const width = Number(widthArg) || 1440;
const height = Number(heightArg) || 900;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1800); // let data fetch + entrance motion settle
  const outDir = path.join(__dirname, '..', '..', '.impeccable', 'review');
  require('fs').mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: path.join(outDir, outName), fullPage: true });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
