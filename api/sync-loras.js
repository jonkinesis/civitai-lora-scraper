import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const browserlessKey = process.env.BROWSERLESS_API_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const response = await fetch(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://civitai.com/models?types=LoRA&sort=downloadCount',
        waitFor: 'networkidle2',
        screenshot: false,
        html: true,
      }),
    });

    const data = await response.json();

    if (!data || !data.html) {
      throw new Error('No HTML returned');
    }

    // Parse the HTML however you want here, for now just log size:
    console.log(`Downloaded page HTML length: ${data.html.length}`);

    // Example: save to Supabase (optional, modify as needed)
    await supabase.from('lora_scrapes').insert([{ html: data.html }]);

    res.status(200).json({ message: 'Scraping complete' });
  } catch (err) {
    console.error('Scraping failed:', err);
    res.status(500).json({ error: 'Failed to scrape.' });
  }
}
