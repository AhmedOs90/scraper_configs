import express from 'express';
import { runAllSites, runSite } from '../scraper/zero_scraper.js';
import { extractMissingABV } from '../scraper/abv_extractor.js'; // 👈 use the new batch function
import { randomUUID } from 'crypto';
import { runSiteWithConfig } from '../scraper/zero_scraper.js';

const router = express.Router();

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

export default router;

