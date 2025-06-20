// Vercel Serverless Function for CivitAI LoRA Scraping via Browserless

import puppeteer from '@browserless/puppeteer';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const browserlessApiKey = process.env.BROWSERLESS_API_KEY;

  if (!browserlessApiKey) {
    return res.status(500).json({ error: 'Missing Browserless API key' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessApiKey}`
    });

    const page = await browser.newPage();
    await page.goto('https://civitai.com/models?types=LoRA&sort=downloadCount', { waitUntil: 'networkidle2' });

    // Auto scroll to load full content
    let previousHeight;
    while (true) {
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(1000);
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === previousHeight) break;
    }

    // Extract LoRA data
    const loras = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.mantine-Card-root')).map(card => {
        const title = card.querySelector('.mantine-Text-root')?.innerText || '';
        const imageUrl = card.querySelector('img')?.src || '';
        const link = card.querySelector('a')?.href || '';
        return { title, imageUrl, link };
      });
    });

    await browser.close();

    // Insert into Supabase
    for (const lora of loras) {
      await supabase.from('loras').upsert(lora, { onConflict: 'link' });
    }

    res.status(200).json({ message: 'Scraping completed', count: loras.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scrape.' });
  }
}
