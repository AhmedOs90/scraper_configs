import { PuppeteerCrawler, log as crawleeLog } from 'crawlee';

export const AVAILABILITY = Object.freeze({
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
  ERROR: 'ERROR',
});

  


const SET_STOCK_URL = `$http://34.141.37.120:3002/availability/set-stock`;

function statusToInStock(status) {
  if (status === "IN_STOCK") return true;
  if (status === "OUT_OF_STOCK" || status === "NOT_FOUND") return false;
  return null; // UNKNOWN / ERROR => skip
}

async function pushStockUpdates(results) {
  let ok = 0, skipped = 0, failed = 0;

  for (const r of results) {
    const in_stock = statusToInStock(r.status);
    if (in_stock === null) {
      skipped++;
      continue;
    }

    try {
      await axios.post(SET_STOCK_URL, { id: r.id, in_stock });
      ok++;
      console.log(`🟢 set-stock id=${r.id} in_stock=${in_stock}`);
    } catch (e) {
      failed++;
      console.error(`🔴 set-stock failed id=${r.id}: ${e.message}`);
    }
  }

  return { ok, skipped, failed };
}

// IMPORTANT: reuse the same logic you already wrote in checkProductAvailability
// We'll copy the "decision" logic (HTTP checks + selector detection + JSON-LD + ATC + OOS text)
// because checkProductAvailability itself creates a crawler internally. :contentReference[oaicite:1]{index=1}

// -------------------- small helpers copied from your existing file --------------------

function makeResult(status, httpStatus, finalUrl, signals = []) {
  return {
    status,
    httpStatus: httpStatus ?? null,
    finalUrl: finalUrl ?? null,
    signals,
    checkedAt: new Date().toISOString(),
  };
}

async function safeEval(page, selector, fn, fallback = null) {
  if (!selector) return fallback;
  try {
    return await page.$eval(selector, fn);
  } catch {
    return fallback;
  }
}

async function tryExtractName(page, config) {
  const headerSel = config?.selectors?.header?.name;
  const mainSel = config?.selectors?.main?.name;

  const headerName = await safeEval(page, headerSel, (el) => el.content, null);
  const mainName = await safeEval(page, mainSel, (el) => el.textContent?.trim?.(), "Name not found");

  return headerName || mainName || null;
}

async function tryExtractPrice(page, config) {
  const headerSel = config?.selectors?.header?.price;
  const mainSel = config?.selectors?.main?.price;

  const headerPrice = await safeEval(page, headerSel, (el) => el.content, null);
  const mainPrice = await safeEval(page, mainSel, (el) => el.textContent?.trim?.(), null);

  const price = headerPrice || mainPrice;
  if (!price) return null;

  const trimmed = String(price).trim();
  return trimmed.length ? trimmed : null;
}

function safeJsonParse(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function flattenJsonLd(obj) {
  const out = [];
  const stack = [obj];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;

    if (Array.isArray(cur)) {
      for (const x of cur) stack.push(x);
      continue;
    }

    if (typeof cur === "object") {
      out.push(cur);
      if (cur["@graph"]) stack.push(cur["@graph"]);
      if (cur.mainEntity) stack.push(cur.mainEntity);
      if (cur.itemListElement) stack.push(cur.itemListElement);
    }
  }

  return out;
}

function normalizeType(t) {
  const arr = Array.isArray(t) ? t : t ? [t] : [];
  return arr.map((x) => String(x).toLowerCase());
}

function normalizeAvailability(av) {
  if (!av) return null;
  const s = String(av).toLowerCase();
  if (s.includes("instock")) return "IN_STOCK";
  if (s.includes("outofstock") || s.includes("soldout") || s.includes("discontinued")) return "OUT_OF_STOCK";
  return null;
}

async function extractJsonLdAvailability(page) {
  const raw = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    return scripts.map((s) => s.textContent).filter(Boolean);
  });

  let productFound = false;

  for (const txt of raw) {
    const parsed = safeJsonParse(txt);
    if (!parsed) continue;

    const nodes = flattenJsonLd(parsed);
    for (const node of nodes) {
      const types = normalizeType(node?.["@type"]);
      if (types.includes("product")) productFound = true;

      const offers = node?.offers;
      const offerNodes = Array.isArray(offers) ? offers : offers ? [offers] : [];

      for (const offer of offerNodes) {
        const availability = offer?.availability;
        const normalized = normalizeAvailability(availability);
        if (normalized) return { availability: normalized, productFound: true };
      }
    }
  }

  return { availability: null, productFound };
}

async function detectAddToCartState(page) {
  return await page.evaluate(() => {
    const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

    const btnCandidates = Array.from(
      document.querySelectorAll("button, input[type='submit'], a[role='button']")
    );
    const texts = btnCandidates.map((el) =>
      normalize(el.innerText || el.value || el.getAttribute("aria-label") || "")
    );

    const isAtcText = (t) =>
      t.includes("add to cart") ||
      t.includes("add to bag") ||
      t.includes("add to basket") ||
      t.includes("buy now") ||
      t.includes("purchase") ||
      t === "add";

    const isSoldText = (t) => t.includes("sold out") || t.includes("out of stock") || t.includes("unavailable");

    let atcEl = null;
    for (let i = 0; i < btnCandidates.length; i++) {
      if (isAtcText(texts[i])) {
        atcEl = btnCandidates[i];
        break;
      }
    }

    if (!atcEl) {
      const cartForm = document.querySelector(
        'form[action*="/cart"], form[action*="cart/add"], form[action*="checkout"]'
      );
      if (!cartForm) return { present: false, enabled: false, reason: "no_atc_found" };

      const submit = cartForm.querySelector("button[type='submit'], input[type='submit']");
      if (!submit) return { present: true, enabled: true, reason: "cart_form_present_no_submit_found" };

      const disabled = submit.hasAttribute("disabled") || submit.getAttribute("aria-disabled") === "true";
      return { present: true, enabled: !disabled, reason: disabled ? "cart_submit_disabled" : "cart_submit_enabled" };
    }

    const atcText = normalize(atcEl.innerText || atcEl.value || atcEl.getAttribute("aria-label") || "");

    const disabled =
      atcEl.hasAttribute("disabled") ||
      atcEl.getAttribute("aria-disabled") === "true" ||
      String(atcEl.className || "").toLowerCase().includes("disabled");

    if (isSoldText(atcText)) return { present: true, enabled: false, reason: "atc_text_says_sold_out" };

    return { present: true, enabled: !disabled, reason: disabled ? "atc_disabled_attr" : "atc_enabled" };
  });
}

async function detectOutOfStockText(page) {
  const text = await page.evaluate(() => (document.body?.innerText || "").toLowerCase());
  return (
    text.includes("sold out") ||
    text.includes("out of stock") ||
    text.includes("currently unavailable") ||
    text.includes("temporarily unavailable") ||
    text.includes("notify me when available") ||
    text.includes("notify me") ||
    text.includes("back in stock")
  );
}

async function detectNotFoundText(page) {
  const text = await page.evaluate(() => (document.body?.innerText || "").toLowerCase());
  return (
    text.includes("page not found") ||
    text.includes("product not found") ||
    text.includes("we couldn’t find") ||
    text.includes("sorry, this page does not exist")
  );
}

// -------------------- batch runner --------------------
function logVerdict(log, rowId, status, httpStatus, signals = []) {
  log.info(
    `[verdict] id=${rowId} status=${status} http=${httpStatus ?? "n/a"} signals=${signals.join("|")}`
  );
}

export async function checkAvailabilityBatch(rows, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 30000;
  const headless = opts.headless ?? true;
  const maxConcurrency = opts.maxConcurrency ?? 1;
  const log = opts.log ?? crawleeLog;

  const resultsById = new Map();

  const crawler = new PuppeteerCrawler({
    maxConcurrency,
    requestHandlerTimeoutSecs: 1200, // ⬅️ Increase to 120 seconds (or more if needed)

    launchContext: {
      launchOptions: { headless },
    },

    async requestHandler({ page, request }) {
      const { rowId, config } = request.userData || {};
      const url = request.url;

      // logs
      log.info(`[check] id=${rowId} url=${url}`);

      // speed
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const rt = req.resourceType();
        if (rt === "image" || rt === "media" || rt === "font" || rt === "stylesheet") req.abort();
        else req.continue();
      });

      page.setDefaultNavigationTimeout(timeoutMs);

      let response = null;
      try {
        response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      } catch (e) {
        const out = makeResult(AVAILABILITY.ERROR, null, null, [`goto_failed:${e?.message ?? "unknown"}`]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(
          rowId,
          out
        );


        return;
      }

      const httpStatus = response?.status?.() ?? null;
      const finalUrl = page.url?.() ?? null;

      // 1) Hard NOT_FOUND from HTTP
      if (httpStatus === 404 || httpStatus === 410) {
        const out = makeResult(AVAILABILITY.NOT_FOUND, httpStatus, finalUrl, ["http_404_or_410"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 2) Temporary / blocked
      if (httpStatus === 429) {

        const out = makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, ["rate_limited_429"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }
      if (httpStatus === 403) {
        const out = makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, ["forbidden_403_possible_bot_block"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(
          rowId,
          makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, ["forbidden_403_possible_bot_block"])
        );
        return;
      }
      if (httpStatus && httpStatus >= 500) {
        const out = makeResult(AVAILABILITY.ERROR, httpStatus, finalUrl, ["server_error_5xx"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 3) detect product page by your existing selectors / JSON-LD
      const extractedName = await tryExtractName(page, config);
      const extractedPrice = await tryExtractPrice(page, config);
      const jsonLd = await extractJsonLdAvailability(page);

      const isProductPage = Boolean(extractedName && extractedName !== "Name not found") || Boolean(jsonLd.productFound);

      if (!isProductPage) {
        const notFoundByText = await detectNotFoundText(page);
        const out = notFoundByText
          ? makeResult(AVAILABILITY.NOT_FOUND, httpStatus, finalUrl, ["not_found_text_template"])
          : makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, ["not_product_page_or_blocked_or_gate"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);

        resultsById.set(
          rowId,
          notFoundByText
            ? makeResult(AVAILABILITY.NOT_FOUND, httpStatus, finalUrl, ["not_found_text_template"])
            : makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, ["not_product_page_or_blocked_or_gate"])
        );
        return;
      }

      // 4) JSON-LD availability
      if (jsonLd.availability === "IN_STOCK") {
        const out = makeResult(AVAILABILITY.IN_STOCK, httpStatus, finalUrl, ["jsonld_availability_instock"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }
      if (jsonLd.availability === "OUT_OF_STOCK") {
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, ["jsonld_availability_outofstock"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(
          rowId,
          makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, ["jsonld_availability_outofstock"])
        );
        return;
      }

      const atc = await detectAddToCartState(page);

      // ✅ if ATC is enabled, trust it and return IN_STOCK
      if (atc.present && atc.enabled) {
        const out = makeResult(AVAILABILITY.IN_STOCK, httpStatus, finalUrl, [
          "add_to_cart_present_and_enabled",
          ...(atc.reason ? [atc.reason] : []),
        ]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 6) Explicit out-of-stock keyword fallback (ONLY when explicit keywords exist)
      const oosText = await detectOutOfStockText(page);
      if (oosText) {
        const signals = ["oos_keywords_found"];
        if (extractedPrice) signals.push("price_present_but_oos_text_found");
        if (atc.present && !atc.enabled) signals.push("add_to_cart_present_but_disabled_ignored");
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, signals);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 7) Default fallback (your new rule)
      // If no price => OUT_OF_STOCK
      if (!extractedPrice) {
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, [
          "price_missing",
          ...(atc.present
            ? ["add_to_cart_present_but_not_enabled_ignored"]
            : ["add_to_cart_not_found_ignored"]),
        ]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // Otherwise => IN_STOCK
      const out = makeResult(AVAILABILITY.IN_STOCK, httpStatus, finalUrl, [
        "default_in_stock",
        "price_present",
        ...(atc.present
          ? ["add_to_cart_present_but_not_enabled_ignored"]
          : ["add_to_cart_not_found_ignored"]),
      ]);
      logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
      resultsById.set(rowId, out);
      return;
    },

    failedRequestHandler({ request, error }) {
      const { rowId } = request.userData || {};
      const out = makeResult(AVAILABILITY.ERROR, null, request?.url ?? null, [`failed_request:${error?.message ?? "unknown"}`]);
      logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
      resultsById.set(rowId, out);
    },
  });
  const cleanup = async () => {
    try {
      console.log('Cleaning up before exit...');
      if (crawler.browserPool) {
        await crawler.browserPool.closeAllBrowsers();


        await crawler.browserPool.destroy();
        console.log('Browser pool destroyed.');
      }
      await purgeDefaultStorages();


      crawler.requestQueue.drop()
      crawler.teardown();
    }
    catch (e) {

    }
    // process.exit(0); // Ensure the process exits after cleanup
  };

  // Convert rows → crawlee requests (RequestList style)
  const requests = rows.map((row) => ({
    url: row.url,
    userData: { rowId: row.id, config: row.config },
  }));

  try {
  await crawler.run(requests);
  } catch (e) {
    log.error(`Crawler run failed: ${e?.message ?? "unknown error"}`);
  } finally {
    await cleanup();
  }
  // Return results in same order
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    ...(resultsById.get(row.id) ?? makeResult(AVAILABILITY.ERROR, null, row.url, ["no_result_returned"])),
  }));
}
