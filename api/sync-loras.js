import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let browser = null;

  try {
    console.log("Launching Puppeteer...");

    browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    console.log("Navigating to CivitAI...");
    await page.goto("https://civitai.com/models?types=LoRA&sort=downloadCount", {
      waitUntil: "networkidle2",
    });

    await page.waitForTimeout(2000);  // Let the page fully settle

    console.log("✅ Successfully navigated.");
    res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Scraping failed:", err);
    res.status(500).json({ error: "Failed to scrape." });
  } finally {
    if (browser) await browser.close();
  }
}
