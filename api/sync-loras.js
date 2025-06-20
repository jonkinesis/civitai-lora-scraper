// Vercel Serverless Function for CivitAI Hybrid Ingestion

import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  console.log("Navigating to CivitAI LoRAs...");
  await page.goto("https://civitai.com/models?types=LoRA&sort=downloadCount", {
    waitUntil: "networkidle2",
  });

  // Auto scroll to load more models (simulate infinite scroll)
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
    console.log("Scrolling complete.");
  }

  console.log("Extracting LoRA data...");

  const loras = await page.evaluate(() => {
    const cards = document.querySelectorAll("a.group");
    return Array.from(cards).map((card) => {
      const modelUrl = card.href;
      const civitaiIdMatch = modelUrl.match(/models\/(\d+)/);
      const civitai_id = civitaiIdMatch ? parseInt(civitaiIdMatch[1]) : null;
      const name = card.querySelector(".line-clamp-2")?.textContent?.trim() || "";
      const baseModel = card.querySelector("div:has(span:text('Base:')) span:last-child")?.textContent?.trim() || "";
      const tags = Array.from(card.querySelectorAll(".flex-wrap .text-xs")).map((tag) => tag.textContent.trim());
      const downloadCount = parseInt(
        card.querySelector("[title*='Downloads']")?.textContent?.replace(/\D/g, "") || "0"
      );
      return {
        civitai_id,
        name,
        base_model: baseModel,
        tags,
        download_count: downloadCount,
        model_url: modelUrl,
        download_url: civitai_id ? `https://civitai.com/api/download/models/${civitai_id}` : null,
      };
    });
  });

  console.log(`Extracted ${loras.length} LoRAs.`);

  for (const lora of loras) {
    const { error } = await supabase.from("loras").upsert(lora, { onConflict: ["civitai_id"] });
    if (error) {
      console.error("Failed inserting:", lora.name, error);
    }
  }

  await browser.close();
  res.status(200).json({ message: `✅ Ingestion complete: ${loras.length} LoRAs stored.` });
}
