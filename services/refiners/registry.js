// services/refiners/registry.js
import { canonicalHostFromUrl } from "./normalizeHost.js";
import defaultRefiner from "./default.js";

// Site refiners
import drydrinker from "./sites/drydrinker.com.js";
import dryvariety from "./sites/dryvariety.com.js";
import sansdrinks from "./sites/sansdrinks.com.au.js";
import alkoholfributik from "./sites/alkoholfributik.dk.js";
import alcoholvrijshop from "./sites/alcoholvrijshop.nl.js";
import ishspirits from "./sites/ishspirits.com.js";
import vildmedvin from "./sites/vildmedvin.dk.js";
import beershoppen from "./sites/beershoppen.dk.js";
import shoppencph from "./sites/shoppencph.dk.js";
import nemlig from "./sites/nemlig.com.js";
import thezeroproof from "./sites/thezeroproof.com.js";
import proofnomore from "./sites/proofnomore.com.js";
import drinknolow from "./sites/drinknolow.com.js";
import worldofnix from "./sites/worldofnix.com.js";
import beyondbeer from "./sites/beyondbeer.de.js";
import craftzero from "./sites/craftzero.com.au.js";
import boisson from "./sites/boisson.co.js";
import upsidedrinks from "./sites/upsidedrinks.com.js";
import thebluedolphinstore from "./sites/thebluedolphinstore.com.js";
import teedawn from "./sites/teedawn.com.js";

// Registry map
const registry = new Map([
  ["drydrinker.com", drydrinker],
  ["dryvariety.com", dryvariety],
  ["sansdrinks.com.au", sansdrinks],
  ["alkoholfributik.dk", alkoholfributik],
  ["alcoholvrijshop.nl", alcoholvrijshop],
  ["ishspirits.com", ishspirits],
  ["vildmedvin.dk", vildmedvin],
  ["beershoppen.dk", beershoppen],
  ["shoppencph.dk", shoppencph],
  ["nemlig.com", nemlig],                 
  ["thezeroproof.com", thezeroproof],
  ["proofnomore.com", proofnomore],
  ["drinknolow.com", drinknolow],
  ["worldofnix.com", worldofnix],
  ["beyondbeer.de", beyondbeer],
  ["craftzero.com.au", craftzero],
  ["boisson.co", boisson],
  ["upsidedrinks.com", upsidedrinks],
  ["thebluedolphinstore.com", thebluedolphinstore],
  ["teedawn.com", teedawn],
]);

export function getRefinerForUrl(rootUrl) {
  const host = canonicalHostFromUrl(rootUrl);
  const siteRefiner = registry.get(host);

  // Return a composed refiner that runs siteRefiner (if any) then defaultRefiner
  return async function refine(rootUrlArg, product, page) {
    let out = product;
    try {
      if (siteRefiner) out = await siteRefiner(rootUrlArg, out, page);
    } catch (e) {
      console.error(`Site refiner error for ${host}: ${e.message}`);
    }
    try {
      out = await defaultRefiner(rootUrlArg, out, page);
    } catch (e) {
      console.error(`Default refiner error: ${e.message}`);
    }
    return out;
  };
}
