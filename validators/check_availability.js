import { PuppeteerCrawler, log as crawleeLog } from 'crawlee';
import { debug } from 'puppeteer';
import fs from "fs";
import path from "path";
import { delay } from '../scraper/helper.js';


export const AVAILABILITY = Object.freeze({
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
  ERROR: 'ERROR',
});


async function dumpPageArtifacts({ page, response, rowId, config, log, dir = "/tmp" }) {
  const safeId = String(rowId ?? "x").replace(/[^\w-]/g, "_");
  const base = path.join(dir, `alko_${safeId}_${Date.now()}`);

  const htmlPath = `${base}.dom.html`;
  const rawPath = `${base}.raw.html`;
  const shotPath = `${base}.png`;
  const matchPath = `${base}.matches.json`;

  try {
    // 1) screenshot what puppeteer sees
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);

    // 2) hydrated DOM
    const domHtml = await page.content().catch(() => "");
    await fs.promises.writeFile(htmlPath, domHtml, "utf8").catch(() => null);

    // 3) raw response html (if available)
    if (response) {
      const rawHtml = await response.text().catch(() => "");
      if (rawHtml) await fs.promises.writeFile(rawPath, rawHtml, "utf8").catch(() => null);
    }

    // 4) selector match details
    const sel = config?.addtoCartSelector;
    const matchInfo = await page.evaluate((sel) => {
      const out = { sel, count: -1, samples: [] };
      if (!sel) return { ...out, count: 0 };

      const els = Array.from(document.querySelectorAll(sel));
      out.count = els.length;

      const pick = els.slice(0, 5).map((el) => ({
        tag: el.tagName.toLowerCase(),
        disabled: el.hasAttribute("disabled"),
        ariaDisabled: el.getAttribute("aria-disabled"),
        text: (el.innerText || "").trim().slice(0, 120),
        ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 200),
        outerHTML: (el.outerHTML || "").slice(0, 2000), // trim so file stays reasonable
      }));

      out.samples = pick;
      return out;
    }, sel).catch(() => ({ sel, count: -1, samples: [] }));

    await fs.promises.writeFile(matchPath, JSON.stringify(matchInfo, null, 2), "utf8").catch(() => null);

    log.info(`[dump] id=${rowId} saved:
  - ${shotPath}
  - ${htmlPath}
  - ${rawPath} (if response html)
  - ${matchPath} (selector matches)`);

  } catch (e) {
    log.info(`[dump] id=${rowId} dump_failed: ${e?.message ?? e}`);
  }
}


// const SET_STOCK_URL = `$http://34.141.37.120:3002/availability/set-stock`;
const SET_STOCK_URL = "http://34.141.37.120:3002/availability/set-stock";


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

async function detectAddToCartState(page, opts = {}) {
  const { debug = false, maxCandidates = 80 } = opts;

  return await page.evaluate(({ debug, maxCandidates }) => {
    const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

    const btnCandidates = Array.from(
      document.querySelectorAll("button, input[type='submit'], a[role='button']")
    );

    const getText = (el) =>
      normalize(el.innerText || el.value || el.getAttribute("aria-label") || "");

    const toLite = (el) => {
      // keep it safe & small for logs
      const cls = String(el.className || "").trim();
      return {
        tag: el.tagName?.toLowerCase?.() || null,
        type: el.getAttribute?.("type") || null,
        id: el.id || null,
        name: el.getAttribute?.("name") || null,
        role: el.getAttribute?.("role") || null,
        ariaDisabled: el.getAttribute?.("aria-disabled") || null,
        disabledAttr: el.hasAttribute?.("disabled") || false,
        className: cls.length > 120 ? cls.slice(0, 120) + "…" : cls,
        text: getText(el),
      };
    };

    // ⚠️ your matching logic (keep as-is, but we will LOG what matched)
    const isAtcText = (t) =>
      // EN
      t.includes("add to cart") ||
      t.includes("add to bag") ||
      t.includes("add to basket") ||
      t.includes("buy now") ||
      t.includes("purchase") ||
      t === "add" ||

      // SV
      t.includes("lägg i varukorgen") ||

      // FI
      t.includes("lisää ostoskoriin") ||
      t.includes("lisaa ostoskoriin") ||
      t.includes("lisää koriin") ||
      t.includes("lisaa koriin") ||

      // DA
      t.includes("læg i kurv") ||
      t.includes("læg i indkøbskurv") ||
      t.includes("læg i indkobskurv") ||
      t.includes("tilføj to kurv") ||          // (typo safe)
      t.includes("tilføj til kurv") ||
      t.includes("tilfoej til kurv") ||
      t.includes("tilføj til indkøbskurv") ||
      t.includes("tilfoej til indkobskurv") ||

      // DE
      t.includes("in den warenkorb") ||
      t.includes("warenkorb") ||
      t.includes("in den einkaufswagen") ||
      t.includes("einkaufswagen") ||
      t.includes("jetzt kaufen") ||
      t.includes("kaufen");

    const isSoldText = (t) =>
      // EN
      t.includes("sold out") || t.includes("out of stock") || t.includes("unavailable") ||
      // DA
      t.includes("udsolgt") || t.includes("ikke på lager") || t.includes("ikke paa lager") ||
      // DE
      t.includes("ausverkauft") || t.includes("nicht auf lager") || t.includes("nicht verfügbar") || t.includes("nicht verfugbar");

    const candidatesLite = debug
      ? btnCandidates.slice(0, maxCandidates).map(toLite)
      : null;

    let atcEl = null;
    let atcIndex = -1;
    let matchedText = null;

    for (let i = 0; i < btnCandidates.length; i++) {
      const t = getText(btnCandidates[i]);
      if (isAtcText(t)) {
        atcEl = btnCandidates[i];
        atcIndex = i;
        matchedText = t;
        break;
      }
    }

    // no direct ATC match -> check cart form fallback (keep your logic)
    if (!atcEl) {
      const cartForm = document.querySelector(
        'form[action*="/cart"], form[action*="cart/add"], form[action*="checkout"]'
      );

      if (!cartForm) {
        return {
          present: false,
          enabled: false,
          reason: "no_atc_found",
          debug: debug
            ? { candidates: candidatesLite, atcIndex, matchedText, used: "none" }
            : undefined,
        };
      }

      const submit = cartForm.querySelector("button[type='submit'], input[type='submit']");
      if (!submit) {
        return {
          present: true,
          enabled: true,
          reason: "cart_form_present_no_submit_found",
          debug: debug
            ? { candidates: candidatesLite, atcIndex, matchedText, used: "cart_form_no_submit" }
            : undefined,
        };
      }

      const cs = window.getComputedStyle(submit);

      const disabledAttr =
        submit.hasAttribute("disabled") || submit.getAttribute("aria-disabled") === "true";

      const cls = String(submit.className || "").toLowerCase();
      const tokens = cls.split(/\s+/).filter(Boolean);

      // only real "disabled" tokens, not tailwind variants like "disabled:bg-..."
      const classDisabled = tokens.includes("disabled") || tokens.includes("is-disabled");

      const hidden =
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        cs.opacity === "0";

      const notClickable = cs.pointerEvents === "none";

      const disabled = disabledAttr || classDisabled || hidden || notClickable;

      return {
        present: true,
        enabled: !disabled,
        reason: disabled ? "cart_submit_disabled" : "cart_submit_enabled",
        debug: debug
          ? { candidates: candidatesLite, atcIndex, matchedText, used: "cart_form_submit", submit: toLite(submit) }
          : undefined,
      };
    }

    const cs = window.getComputedStyle(atcEl);

    const disabledAttr =
      atcEl.hasAttribute("disabled") || atcEl.getAttribute("aria-disabled") === "true";

    const cls = String(atcEl.className || "").toLowerCase();
    const tokens = cls.split(/\s+/).filter(Boolean);

    // only real "disabled" tokens, not tailwind variants like "disabled:bg-..."
    const classDisabled = tokens.includes("disabled") || tokens.includes("is-disabled");

    const hidden =
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      cs.opacity === "0";

    const notClickable = cs.pointerEvents === "none";

    const disabled = disabledAttr || classDisabled || hidden || notClickable;


    if (isSoldText(matchedText)) {
      return {
        present: true,
        enabled: false,
        reason: "atc_text_says_sold_out",
        debug: debug
          ? { candidates: candidatesLite, atcIndex, matchedText, used: "direct_match", atc: toLite(atcEl) }
          : undefined,
      };
    }

    return {
      present: true,
      enabled: !disabled,
      reason: disabled ? "atc_disabled_attr" : "atc_enabled",
      debug: debug
        ? { candidates: candidatesLite, atcIndex, matchedText, used: "direct_match", atc: toLite(atcEl) }
        : undefined,
    };
  }, { debug, maxCandidates });
}

async function detectAtc(page, config, opts = {}) {
  // 1) Try config selector first (if present)
  const cfg = await detectAtcFromConfig(page, config);

  // If selector exists AND matched, trust it fully
  if (cfg.present) return { ...cfg, source: "config" };

  // 2) If config selector is missing OR not found -> fallback to generic
  const gen = await detectAddToCartState(page, opts);
  return { ...gen, source: "generic", reason: gen.reason || cfg.reason };
}

async function detectAtcFromConfig(page, config) {
  const selector = config?.addtoCartSelector;
  if (!selector) return { present: false, enabled: false, reason: "no_addtoCartSelector_in_config" };

  const handles = await page.$$(selector);
  if (!handles || handles.length === 0) {
    return { present: false, enabled: false, reason: "addtoCartSelector_not_found" };
  }

  // evaluate all matches, prefer any enabled one
  const infos = [];
  for (const h of handles.slice(0, 6)) { // cap to avoid crazy pages
    const info = await h.evaluate((btn) => {
      const cs = window.getComputedStyle(btn);

      const disabledAttr =
        btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true";

      const cls = String(btn.className || "").toLowerCase();
      const tokens = cls.split(/\s+/).filter(Boolean);

      // only treat as disabled if there is an actual class named "disabled" or "is-disabled"
      // (NOT tailwind variants like "disabled:bg-...")
      const classDisabled = tokens.includes("disabled") || tokens.includes("is-disabled");

      const hidden =
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        cs.opacity === "0";

      const notClickable = cs.pointerEvents === "none";

      const enabled = !disabledAttr && !classDisabled && !hidden && !notClickable;

      return {
        enabled,
        text: (btn.innerText || btn.getAttribute("aria-label") || "").trim(),
        ariaDisabled: btn.getAttribute("aria-disabled"),
        disabledAttr,
        className: String(btn.className || "").slice(0, 120),
        style: {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          pointerEvents: cs.pointerEvents,
        },
      };
    });

    infos.push(info);
    if (info.enabled) break; // stop early if we found a good one
  }

  const best = infos.find((x) => x.enabled) || infos[0];

  return {
    present: true,
    enabled: !!best.enabled,
    reason: best.enabled ? "config_atc_enabled" : "config_atc_disabled",
    debug: { selector, matches: infos.length, pickedText: best.text, ...best },
  };
}
// async function detectAtcFromConfig(page, config) {
//   const selector = config?.addtoCartSelector;
//   if (!selector) return { present: false, enabled: false, reason: "no_addtoCartSelector_in_config" };

//   const el = await page.$(selector);
//   if (!el) return { present: false, enabled: false, reason: "addtoCartSelector_not_found" };

//   const info = await el.evaluate((btn) => {
//     const cs = window.getComputedStyle(btn);

//     const disabledAttr =
//       btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true";

//     const classDisabled = String(btn.className || "").toLowerCase().includes("disabled");

//     const hidden =
//       cs.display === "none" ||
//       cs.visibility === "hidden" ||
//       cs.opacity === "0";

//     const notClickable = cs.pointerEvents === "none";

//     const enabled = !disabledAttr && !classDisabled && !hidden && !notClickable;

//     return {
//       enabled,
//       text: (btn.innerText || btn.getAttribute("aria-label") || "").trim(),
//       ariaDisabled: btn.getAttribute("aria-disabled"),
//       disabledAttr,
//       className: String(btn.className || "").slice(0, 120),
//       style: {
//         display: cs.display,
//         visibility: cs.visibility,
//         opacity: cs.opacity,
//         pointerEvents: cs.pointerEvents,
//       },
//     };
//   });

//   return {
//     present: true,
//     enabled: !!info.enabled,
//     reason: info.enabled ? "config_atc_enabled" : "config_atc_disabled",
//     debug: { selector, ...info },
//   };
// }


async function detectOutOfStockText(page) {
  const text = await page.evaluate(() => (document.body?.innerText || "").toLowerCase());

  return (
    // EN
    text.includes("sold out") ||
    text.includes("out of stock") ||
    text.includes("currently unavailable") ||
    text.includes("temporarily unavailable") ||
    text.includes("notify me when available") ||
    text.includes("notify me") ||

    // DA (Danish)
    text.includes("udsolgt") ||
    text.includes("ikke på lager") ||
    text.includes("ikke paa lager") ||
    text.includes("midlertidigt udsolgt") ||
    text.includes("kommer snart") ||
    text.includes("giv besked") ||          // "notify me"
    text.includes("giv mig besked") ||

    // SV/NO (nice bonus)
    text.includes("slutsåld") ||
    text.includes("slut i lager") ||
    text.includes("ikke på lager") ||
    text.includes("utsolgt") ||
    // DE
    text.includes("ausverkauft") ||
    text.includes("nicht auf lager") ||
    text.includes("nicht verfügbar") ||
    text.includes("derzeit nicht verfügbar") ||
    text.includes("bald verfügbar") ||
    text.includes("benachrichtige mich") ||
    text.includes("benachrichtigen sie mich") ||
    text.includes("wieder verfügbar")
  );
}

async function detectNotFoundText(page) {
  const text = await page.evaluate(() => (document.body?.innerText || "").toLowerCase());
  const title = await page.title().catch(() => "");
  const t = (title || "").toLowerCase();

  return (
    // EN
    text.includes("page not found") ||
    text.includes("product not found") ||
    text.includes("we couldn’t find") ||
    text.includes("sorry, this page does not exist") ||

    // DA
    text.includes("siden blev ikke fundet") ||
    text.includes("side blev ikke fundet") ||
    text.includes("vi kunne ikke finde") ||
    text.includes("denne side findes ikke") ||

    // common 404 signals
    t.includes("404") ||
    text.includes("404")
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

        await delay(4000);
        // after goto
        const debug = request.userData?.debug === true;

        if (debug) {
          await dumpPageArtifacts({ page, response, rowId, config, log, dir: "/tmp" });

          // 1) prove what URL/UA we are actually on
          log.info(`[dbg] finalUrl=${page.url()}`);
          log.info(`[dbg] ua=${await page.evaluate(() => navigator.userAgent)}`);

          // 2) count your selector
          const sel = config.addtoCartSelector;
          const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel).catch(() => -1);
          log.info(`[dbg] addtoCartSelector_count=${count} sel=${JSON.stringify(sel)}`);

          // 3) dump any "basket" buttons (text/aria-label)
          const basketBtns = await page.evaluate(() => {
            const norm = (s) => (s || "").toLowerCase();
            const out = [];
            const els = Array.from(document.querySelectorAll("button, a[role='button'], input[type='submit']"));
            for (const el of els) {
              const t = norm(el.innerText || el.value || "");
              const aria = norm(el.getAttribute("aria-label") || "");
              if (t.includes("basket") || aria.includes("basket")) {
                out.push({
                  tag: el.tagName.toLowerCase(),
                  text: (el.innerText || el.value || "").trim().slice(0, 80),
                  aria: (el.getAttribute("aria-label") || "").slice(0, 80),
                  disabled: el.hasAttribute("disabled"),
                  ariaDisabled: el.getAttribute("aria-disabled"),
                  className: String(el.className || "").slice(0, 120),
                });
              }
            }
            return out.slice(0, 20);
          }).catch(() => []);
          log.info(`[dbg] basket_buttons=${JSON.stringify(basketBtns)}`);

          // 4) save screenshot + html (so you can inspect EXACT DOM later)
          await page.screenshot({ path: `/tmp/alko_${request.userData.rowId}.png`, fullPage: true }).catch(() => { });
          const html = await page.content().catch(() => "");
          await fs.promises.writeFile(`/tmp/alko_${request.userData.rowId}.html`, html, "utf8").catch(() => { });
          log.info(`[dbg] saved /tmp/alko_${request.userData.rowId}.png and .html`);
        }

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
        resultsById.set(rowId, out);
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
        resultsById.set(rowId, out);
        return;
      }


      // 4) JSON-LD availability (ONLY strong YES)
      if (jsonLd.availability === "IN_STOCK") {
        const out = makeResult(AVAILABILITY.IN_STOCK, httpStatus, finalUrl, ["jsonld_availability_instock"]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 5) ATC signal (strong YES, beats JSON-LD OUT_OF_STOCK)
      const atc = await detectAtc(page, config, { debug: true, maxCandidates: 120 });

      // const atc = await detectAddToCartState(page, { debug: true, maxCandidates: 120 });
      log.info(
        `[atc_cfg] id=${rowId} present=${atc.present} enabled=${atc.enabled} reason=${atc.reason}` +
        (atc?.debug?.text ? ` text="${atc.debug.text}"` : "")
      );
      if (atc?.debug?.atc) {
        log.info(`[atc_match] id=${rowId} ${JSON.stringify(atc.debug.atc)}`);
      }
      if (atc.present && !atc.enabled) {
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, [
          "atc_present_but_disabled",
          ...(atc.reason ? [atc.reason] : []),
        ]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      if (atc.present && atc.enabled) {
        const out = makeResult(AVAILABILITY.IN_STOCK, httpStatus, finalUrl, [
          "add_to_cart_present_and_enabled",
          ...(atc.reason ? [atc.reason] : []),
        ]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 6) Explicit out-of-stock keywords (strong NO)
      const oosText = await detectOutOfStockText(page);
      if (oosText) {
        const signals = ["oos_keywords_found"];
        if (extractedPrice) signals.push("price_present_but_oos_text_found");
        if (!atc.present) signals.push("add_to_cart_not_present");
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, signals);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      // 7) JSON-LD OUT_OF_STOCK (weak) — never treat as OOS when ATC exists
      if (jsonLd.availability === "OUT_OF_STOCK") {
        if (atc.present) {
          const out = makeResult(AVAILABILITY.UNKNOWN, httpStatus, finalUrl, [
            "jsonld_outofstock_but_atc_present",
            "atc_present_but_not_enabled",
          ]);
          logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
          resultsById.set(rowId, out);
          return;
        }

        // No ATC found at all => allow JSON-LD to mark out of stock (still weak)
        const out = makeResult(AVAILABILITY.OUT_OF_STOCK, httpStatus, finalUrl, [
          "jsonld_availability_outofstock_fallback",
          "atc_not_found",
        ]);
        logVerdict(log, rowId, out.status, out.httpStatus, out.signals);
        resultsById.set(rowId, out);
        return;
      }

      if (!extractedPrice) {
        const status = atc.present ? AVAILABILITY.UNKNOWN : AVAILABILITY.OUT_OF_STOCK;

        const out = makeResult(status, httpStatus, finalUrl, [
          "price_missing",
          ...(atc.present ? ["atc_present_price_missing"] : ["atc_not_found_price_missing"]),
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
    userData: { rowId: row.id, config: row.config, debug: true },
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
