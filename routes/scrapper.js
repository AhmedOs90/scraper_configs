import express from 'express';
import { runAllSites, runSite, runSiteWithConfig } from '../scraper/zero_scraper.js';
import { extractMissingABV } from '../scraper/abv_extractor.js'; // 👈 use the new batch function
import { randomUUID } from 'crypto';
import { checkAllAvailability } from '../validators/check_all.js';
import path from "path";
import fs from "fs";
import { checkAvailabilityBatch } from "../validators/check_availability.js"; // <-- adjust if path differs

const router = express.Router();

function getSiteNameFromUrl(rootUrl) {
  const host = new URL(rootUrl).hostname.toLowerCase();
  const parts = host.split(".").filter(Boolean);
  const clean = parts[0] === "www" ? parts.slice(1) : parts;

  if (clean.length === 1) return clean[0];

  const last = clean[clean.length - 1];
  const secondLast = clean[clean.length - 2];
  const looksLikeCcTld = last.length === 2 && secondLast.length <= 3;

  return looksLikeCcTld && clean.length >= 3 ? clean[clean.length - 3] : clean[clean.length - 2];
}

function loadConfigForSite(rootUrl) {
  const site_name = getSiteNameFromUrl(rootUrl);
  const configPath = path.join("./config", `${site_name}_config.json`);
  if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  throw new Error(`Configuration file not found for ${site_name} at ${configPath}`);
}

// Route 1: Start full site or single site scraping
router.post('/start-scraping', async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ message: 'Domain name is required.' });
  }

  try {
    let response;

    if (domain.toLowerCase() === "all") {
      console.log("Starting scraper for all sites...");
      response = await runAllSites();
    } else {
      console.log(`Starting scraper for domain: ${domain}`);
      response = await runSite(domain);
    }

    res.json({
      message: `Scraping started successfully for ${domain}.`,
      response
    });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ message: 'Scraping failed.', error: error.message });
  }
});
// ✅ Route 2: Extract ABV for a specific product URL
router.post('/abv', async (req, res) => {
  try {
    await extractMissingABV();
    res.json({ message: 'ABV extraction completed for all applicable products.' });
  } catch (error) {
    console.error('ABV batch extraction error:', error);
    res.status(500).json({ message: 'ABV batch extraction failed.', error: error.message });
  }
});

router.post('/start-scraping-config', async (req, res) => {
  try {
    const { config, refineFunction, options } = req.body || {};
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ message: 'Invalid payload: "config" object is required.' });
    }

    const { rootUrl, baseUrl } = config;
    if (!rootUrl || !baseUrl) {
      return res.status(400).json({ message: 'Invalid config: "rootUrl" and "baseUrl" are required.' });
    }

    if (refineFunction && typeof refineFunction !== 'string') {
      return res.status(400).json({ message: 'Invalid payload: "refineFunction" must be a string if provided.' });
    }

    const jobId = (options && options.jobId) || randomUUID();
    const startedAt = new Date().toISOString();

    // 👇 default to dry run unless explicitly set to true
    const commit = options?.commit === true;

    const response = await runSiteWithConfig(config, { commit , refineFunctionString: refineFunction}); // refineFunction wired later

    return res.status(200).json({
      message: `Scraping completed (config mode, mode=${commit ? 'commit' : 'dry-run'}).`,
      jobId,
      startedAt,
      response,
    });
  } catch (error) {
    console.error('start-scraping-config error:', error);
    return res.status(500).json({ message: 'Failed to run scraping.', error: error.message });
  }
});
router.post("/check-availability", async (req, res) => {
  try {
    const data = await checkAllAvailability(req.body || {});
    return res.status(200).json({ message: "Availability check completed.", ...data });
  } catch (error) {
    console.error("check-availability error:", error);
    return res.status(500).json({ message: "Availability check failed.", error: error.message });
  }
});
router.post("/check-availability-one", async (req, res) => {
  try {
    const { url, headless = true, timeoutMs = 30000 } = req.body || {};
    if (!url) return res.status(400).json({ message: "url is required" });

    const config = loadConfigForSite(url);

    const [result] = await checkAvailabilityBatch(
      [{ id: 1, url, config }],
      { headless, timeoutMs, maxConcurrency: 1 }
    );

    return res.status(200).json({
      message: "Single availability check completed.",
      input: { url },
      configLoaded: Boolean(config),
      result,
    });
  } catch (error) {
    console.error("check-availability-one error:", error);
    return res.status(500).json({ message: "Single availability check failed.", error: error.message });
  }
});
export default router;

