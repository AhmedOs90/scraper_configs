import fs from "fs";
import path from "path";
import { checkAvailabilityBatch } from "./check_availability.js";
import { updateScraperStatus } from "../services/report.js";
import { supabase } from "../services/supabaseClient.js";

async function fetchAvailabilityPage({ from, to }) {
  const { data, error } = await supabase
    .from("availability")
    .select("id,url,in_stock,product_id,reseller_id,country_id")
    .not("url", "is", null)
    .range(from, to);

  if (error) throw error;
  return data ?? [];
}

async function setStockSupabase(id, in_stock) {
  const { error } = await supabase
    .from("availability")
    .update({ in_stock, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

function getSiteNameFromUrl(rootUrl) {
  const host = new URL(rootUrl).hostname.toLowerCase();
  const parts = host.split(".").filter(Boolean);
  const clean = parts[0] === "www" ? parts.slice(1) : parts;

  if (clean.length === 1) return clean[0];

  const last = clean[clean.length - 1];
  const secondLast = clean[clean.length - 2];
  const looksLikeCcTld = last.length === 2 && secondLast.length <= 3;

  return looksLikeCcTld && clean.length >= 3
    ? clean[clean.length - 3]
    : clean[clean.length - 2];
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

  // paging controls
  pageSize = 1000,           // how many rows to pull per Supabase query
  maxRows = Infinity,        // set e.g. 5000 for testing
} = {}) {
  await updateScraperStatus("validating availability", "running");

  const allResults = [];
  let buffer = [];
  let totalFetched = 0;
  let page = 0;

  async function runBatchAndUpdateStock(currentBatch) {
    console.log(`🚀 running crawler batch size=${currentBatch.length}`);

    const batchResults = await checkAvailabilityBatch(
      currentBatch.map((x) => ({ id: x.id, url: x.url, config: x.config })),
      { headless, timeoutMs, maxConcurrency: 1 }
    );

    for (const r of batchResults) {
      const ref = currentBatch.find((b) => b.id === r.id);
      const signals = [ref?.configSignal, ...(r.signals || [])].filter(Boolean);

      const out = {
        ...r,
        ...(ref?.meta || {}),
        signals,
      };

      allResults.push(
        verbose ? out : { id: out.id, url: out.url, status: out.status, httpStatus: out.httpStatus }
      );

      const desired = statusToInStock(out.status);
      if (desired === null) {
        console.log(`⏭️ skip update id=${out.id} status=${out.status}`);
        continue;
      }

      const current = ref?.currentInStock;
      if (typeof current === "boolean" && current === desired) {
        console.log(`⏭️ no change id=${out.id} in_stock already ${desired}`);
        continue;
      }

      try {
        await setStockSupabase(out.id, desired);
        console.log(`✅ supabase set-stock id=${out.id} in_stock=${desired}`);
      } catch (e) {
        console.error(`🔴 supabase set-stock failed id=${out.id}: ${e.message}`);
      }
    }

    console.log(`✅ batch done. totalProcessed=${allResults.length}`);
  }

  console.log(`📥 fetching check-list from Supabase (pageSize=${pageSize})...`);

  while (totalFetched < maxRows) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const rows = await fetchAvailabilityPage({ from, to });
    if (!rows.length) break;

    totalFetched += rows.length;
    console.log(`✅ fetched ${rows.length} rows (totalFetched=${totalFetched})`);

    for (const row of rows) {
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
        currentInStock: !!row.in_stock,
        meta: {
          productId: row.product_id,
          resellerId: row.reseller_id,
          countryId: row.country_id,
        },
      });

      if (buffer.length >= batchSize) {
        await runBatchAndUpdateStock(buffer);
        buffer = [];
      }

      if (allResults.length >= maxRows) break;
    }

    page++;
  }

  if (buffer.length) {
    await runBatchAndUpdateStock(buffer);
  }

  await updateScraperStatus("validating availability", "completed");
  return { totalProcessed: allResults.length, results: allResults };
}
