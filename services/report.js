import axios from 'axios';

// const API_BASE_URL = 'http://localhost:3002';
const API_BASE_URL = 'http://34.141.37.120:3002';

/**
 * Sends a scraping report to the source_sites API.
 * @param {Object} reportData - The data to be sent.
 */
export async function sendScrapingReport(reportData) {
  const apiUrl = `${API_BASE_URL}/source_sites/edit`;

  if (!reportData.url) {
    console.error("❌ Error: 'url' is required in reportData.");
    return;
  }

  try {
    const response = await axios.post(apiUrl, reportData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Report sent successfully: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`❌ Failed to send scraping report: ${error.message}`);
  }
}

/**
 * Updates the scraper status in the database.
 * @param {string} url - The URL of the site being scraped.
 * @param {string} status - The status of the scraper (e.g., "running", "completed", "error").
 */
export async function updateScraperStatus(url, status) {
  const apiUrl = `${API_BASE_URL}/scraper_status/update`;

  if (!url || !status) {
    console.error("❌ Error: 'url' and 'status' are required parameters.");
    return;
  }

  try {
    const response = await axios.post(apiUrl, { url, status }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`✅ Scraper status updated successfully: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`❌ Failed to update scraper status: ${error.message}`);
  }
}
