import { createClient } from '@supabase/supabase-js';
import playwright from 'playwright-core';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto("https://civitai.com/models?types=LoRA&sort=downloadCount", { waitUntil: "networkidle" });

    const modelNames = await page.$$eval('.model-card .model-card-name', nodes =>
      nodes.map(n => n.textContent.trim())
    );

    console.log("Scraped model names:", modelNames);

    res.status(200).json({ models: modelNames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scrape." });
  } finally {
    if (browser) await browser.close();
  }
}