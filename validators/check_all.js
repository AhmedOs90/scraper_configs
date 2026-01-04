import axios from "axios";
import fs from "fs";
import path from "path";
import { checkAvailabilityBatch } from "./check_availability.js";
import { updateScraperStatus } from "../services/report.js";

const API_BASE_URL = "http://34.141.37.120:3002";
const SET_STOCK_URL = `${API_BASE_URL}/availability/set-stock`;

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

// Map checker verdict -> desired DB boolean
function statusToInStock(status) {
  if (status === "IN_STOCK") return true;
  if (status === "OUT_OF_STOCK" || status === "NOT_FOUND") return false;
  return null; // UNKNOWN / ERROR => don't update
}

export async function checkAllAvailability({
  batchSize = 200,
  headless = true,
  timeoutMs = 30000,
  verbose = false,
} = {}) {
  await updateScraperStatus("validating availability", "running");
  console.log(`📥 fetching full check-list...`);
  const resp = await axios.get(`${API_BASE_URL}/availability/check-list`);
  const availabilities = resp.data?.availabilities || [];

  console.log(`✅ got ${availabilities.length} rows`);

  const allResults = [];
  let buffer = [];

  async function runBatchAndUpdateStock(currentBatch) {
    console.log(`🚀 running crawler batch size=${currentBatch.length}`);

    const batchResults = await checkAvailabilityBatch(
      currentBatch.map((x) => ({ id: x.id, url: x.url, config: x.config })),
      { headless, timeoutMs, maxConcurrency: 1 }
    );

    // merge + update DB one-by-one
    for (const r of batchResults) {
      const ref = currentBatch.find((b) => b.id === r.id);
      const signals = [ref?.configSignal, ...(r.signals || [])].filter(Boolean);

      const out = {
        ...r,
        ...(ref?.meta || {}),
        signals,
      };

      // store output for returning
      allResults.push(
        verbose ? out : { id: out.id, url: out.url, status: out.status, httpStatus: out.httpStatus }
      );

      const desired = statusToInStock(out.status);
      if (desired === null) {
        console.log(`⏭️ skip set-stock id=${out.id} status=${out.status}`);
        continue;
      }

      const current = ref?.currentInStock;
      if (typeof current === "boolean" && current === desired) {
        console.log(`⏭️ no change id=${out.id} in_stock already ${desired}`);
        continue;
      }

      try {
        await axios.post(SET_STOCK_URL, { id: out.id, in_stock: desired });
        console.log(`✅ set-stock id=${out.id} in_stock=${desired}`);
      } catch (e) {
        console.error(`🔴 set-stock failed id=${out.id}: ${e.message}`);
      }
    }

    console.log(`✅ batch done. totalProcessed=${allResults.length}`);
  }

  for (const row of availabilities) {
    if (!row.url) continue;

    let config = null;
    let configSignal = null;

    try {
      config = loadConfigForSite(row.url);
    } catch (e) {
      configSignal = `config_missing:${e.message}`;
    }

    buffer.push({
      id: row.id,
      url: row.url,
      config,
      configSignal,
      currentInStock: typeof row.in_stock === "number" ? row.in_stock === 1 : !!row.in_stock,
      meta: { productId: row.productId, resellerId: row.resellerId, countryId: row.countryId },
    });

    if (buffer.length >= batchSize) {
      await runBatchAndUpdateStock(buffer);
      buffer = [];
    }
  }

  if (buffer.length) {
    await runBatchAndUpdateStock(buffer);
  }
  await updateScraperStatus("validating availability", "completed");
  return { totalProcessed: allResults.length, results: allResults };
}
