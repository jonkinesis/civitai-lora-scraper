import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const browserlessKey = process.env.BROWSERLESS_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Launch browserless remotely
    const response = await fetch('https://chrome.browserless.io/content?token=' + browserlessKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: `
          const puppeteer = require("puppeteer-core");
          const browser = await puppeteer.connect({
            browserWSEndpoint: "wss://chrome.browserless.io?token=${browserlessKey}"
          });
          const page = await browser.newPage();
          await page.goto("https://civitai.com/models?types=LoRA&sort=downloadCount", { waitUntil: "networkidle2" });

          // Auto-scroll to load more content
          let previousHeight;
          while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForTimeout(1500);
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) break;
          }

          const models = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a[href^='/models/']")).map(a => {
              const name = a.querySelector("h3")?.innerText || "No Name";
              const url = "https://civitai.com" + a.getAttribute("href");
              const modelId = url.split("/models/")[1]?.split("/")[0];
              return { name, url, modelId };
            });
          });

          await browser.close();
          return models;
        `,
      }),
    });

    const data = await response.json();

    if (!data) {
      throw new Error("No data returned from Browserless");
    }

    // Insert into Supabase (optional: you can fully customize schema here)
    for (const model of data) {
      await supabase.from('loras').upsert({
        civitai_id: model.modelId,
        name: model.name,
        civitai_url: model.url,
        model_type: 'Stable Diffusion', // (or Flux Dev, Flux Pro etc based on your mapping)
      });
    }

    res.status(200).json({ success: true, total: data.length });
  } catch (err) {
    console.error("Scraper error:", err);
    res.status(500).json({ error: 'Failed to scrape.' });
  }
}
