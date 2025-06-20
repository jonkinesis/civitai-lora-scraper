import { createClient } from '@supabase/supabase-js';

// Build your Browserless URL:
const browserlessKey = process.env.BROWSERLESS_API_KEY;
const browserlessURL = `https://chrome.browserless.io?token=${browserlessKey}`;

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting Browserless scrape...");

    // Use Browserless directly to scrape the page:
    const scrapePayload = {
      url: "https://civitai.com/models?types=LoRA&sort=downloadCount",
      elements: [
        {
          selector: ".mantine-Grid-root .mantine-Paper-root",
          properties: ["innerText", "href"]
        }
      ]
    };

    const response = await fetch(`${browserlessURL}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapePayload)
    });

    if (!response.ok) {
      throw new Error(`Browserless scrape failed: ${response.statusText}`);
    }

    const data = await response.json();

    // You would now parse the data here as needed and save to Supabase
    console.log("Scrape completed:", data);

    res.status(200).json({ message: 'Scrape successful!', data });
  } catch (err) {
    console.error('Scraper Error:', err);
    res.status(500).json({ error: 'Failed to scrape.' });
  }
}
