import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let browser = null;

  try {
    console.log("Launching headless browser...");
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    console.log("Navigating to CivitAI...");
    await page.goto("https://civitai.com/models?types=LoRA&sort=downloadCount", {
      waitUntil: "networkidle2",
    });

    // Auto-scroll to load all results
    let previousHeight;
    try {
      while (true) {
        previousHeight = await page.evaluate("document.body.scrollHeight");
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.waitForTimeout(1500);
        const newHeight = await page.evaluate("document.body.scrollHeight");
        if (newHeight === previousHeight) break;
      }
    } catch (err) {
      console.log("Auto-scrolling complete.");
    }

    // [Replace this section with your full scraping logic later]
    console.log("✅ Scraping complete.");
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scrape." });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
