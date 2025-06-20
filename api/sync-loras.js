import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const browserlessKey = process.env.BROWSERLESS_API_KEY;

  if (!supabaseUrl || !supabaseKey || !browserlessKey) {
    return res.status(500).json({ error: 'Missing environment variables.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Call Browserless to get the raw HTML
    const response = await fetch(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://civitai.com/models?types=LoRA&sort=downloadCount',
        waitFor: 'networkidle2'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserless failed: ${errorText}`);
    }

    const html = await response.text();

    console.log('✅ Successfully scraped CivitAI page');
    
    // TODO: Parse the HTML and save data to Supabase here
    // For now, just return simple success
    return res.status(200).json({ message: 'Scrape complete.', length: html.length });
  } catch (err) {
    console.error('Scraping failed:', err);
    return res.status(500).json({ error: 'Failed to scrape.' });
  }
}
