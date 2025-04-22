import express from 'express';
import { runAllSites, runSite } from '../scraper/zero_scraper.js';

const router = express.Router();

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

export default router;
