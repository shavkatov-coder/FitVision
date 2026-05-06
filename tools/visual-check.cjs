const { createRequire } = require("node:module");

const runtimeModules = "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/";
const requireFromRuntime = createRequire(runtimeModules);
const { chromium } = requireFromRuntime("playwright");

const browserPath =
  process.env.PLAYWRIGHT_BROWSER_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const viewports = [
  { name: "desktop", width: 1440, height: 980 },
  { name: "mobile", width: 390, height: 844 }
];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const results = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("http://localhost:4173", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector(".product-card", { timeout: 10000 });
    await page.waitForTimeout(1400);

    const metrics = await page.evaluate(() => {
      const rect = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          top: Math.round(box.top),
          left: Math.round(box.left)
        };
      };

      const stageCanvas = document.querySelector("#tryonCanvas");
      const miniCanvas = document.querySelector("#miniScene canvas");
      const stageData = stageCanvas?.toDataURL("image/png") || "";
      const miniData = miniCanvas?.toDataURL("image/png") || "";
      const cards = [...document.querySelectorAll(".product-card")].length;
      const overflowing = [...document.querySelectorAll("button, .product-card, .panel, .tryon-stage")]
        .filter(node => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2)
        .slice(0, 8)
        .map(node => node.className || node.id || node.tagName);

      return {
        cards,
        stage: rect(".tryon-stage"),
        catalog: rect(".catalog-section"),
        miniScene: rect("#miniScene"),
        stageCanvasBytes: stageData.length,
        miniCanvasBytes: miniData.length,
        overflowing
      };
    });

    if (viewport.name === "desktop") {
      const syntheticPhoto = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="360" height="900" viewBox="0 0 360 900">
          <rect width="360" height="900" fill="#111318"/>
          <rect x="58" y="120" width="244" height="700" rx="78" fill="#d9e2ec"/>
          <circle cx="180" cy="110" r="70" fill="#e8d7c8"/>
          <path d="M62 248 C108 172 252 172 298 248 L286 770 C230 810 130 810 74 770 Z" fill="#35c779"/>
        </svg>
      `);
      await page.click('[data-product-id="fv-sun-glasses"]');
      await page.setInputFiles("#photoInput", {
        name: "synthetic-person.svg",
        mimeType: "image/svg+xml",
        buffer: syntheticPhoto
      });
      await page.waitForTimeout(900);
      metrics.photoMode = await page.evaluate(() => ({
        objectFit: getComputedStyle(document.querySelector("#photoPreview")).objectFit,
        visible: document.querySelector("#photoPreview").classList.contains("visible"),
        tracking: document.querySelector("#trackingText").textContent
      }));
    }

    const screenshot = await page.screenshot({ fullPage: false });
    results.push({
      viewport: viewport.name,
      screenshotBytes: screenshot.length,
      errors,
      ...metrics
    });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
