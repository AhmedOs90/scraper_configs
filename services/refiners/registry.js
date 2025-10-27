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
import thesobrmarket from "./sites/thesobrmarket.com.js";
import thenewbar from "./sites/thenewbar.com.js";
import collectivecraftbeer from "./sites/collectivecraftbeer.com.js";
import freespiritdrinkco from "./sites/freespiritdrinkco.com.au.js";
import vinello from "./sites/vinello.eu.js";
import danmurphys from "./sites/danmurphys.com.au.js";
import market from "./sites/market.nabeerclub.com.js";
import winesformothers from "./sites/winesformothers.com.js";
import zepeim from "./sites/zepeim.com.js";
import minusmoonshine from "./sites/minusmoonshine.com.js";
import themindfuldrinking from "./sites/themindfuldrinking.com.js";
import wisebartender from "./sites/wisebartender.com.js";
import sechey from "./sites/sechey.com.js";
import drinkpointzero from "./sites/drinkpointzero.com.js";
import sobersips from "./sites/sobersips.ca.js";
import thechiller from "./sites/thechiller.co.nz.js";
import boozefree from "./sites/boozefree.co.uk.js";
import amavine from "./sites/amavine.nl.js";
import joinclubsoda from "./sites/joinclubsoda.com.js";
import keinundlow from "./sites/keinundlow.at.js";
import noughtyaf from "./sites/noughtyaf.com.js";
import pierre_chavin from "./sites/shop.pierre-chavin.com.js";
import nonalcoholicwinesonline from "./sites/nonalcoholicwinesonline.com.js";
import noblegreenwinesonline from "./sites/noblegreenwines.co.uk.js";
import healthyplanetcanada from "./sites/healthyplanetcanada.com.js";
import bittersandbottles from "./sites/bittersandbottles.com.js";
import draydrinks from "./sites/draydrinks.com.js";
import zerodrinks from "./sites/zerodrinks.co.za.js";
import evergreencurated from "./sites/evergreencurated.com.js";
import well from "./sites/well.ca.js";
import drinknil from "./sites/drinknil.co.za.js";
import alko from "./sites/alko.fi.js";
import bemakers from "./sites/trade.bemakers.com.js";
import themodernbartender from "./sites/themodernbartender.com.js";
import innexpress from "./sites/inn-express.com.js";
import disndis from "./sites/disndis.com.js";
import drinkfreeco from "./sites/drinkfreeco.com.js";
import hopfnung from "./sites/hopfnung.ch.js";

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
    ["thesobrmarket.com", thesobrmarket],
    ["thenewbar.com", thenewbar],
    ["collectivecraftbeer.com", collectivecraftbeer],
    ["freespiritdrinkco.com.au", freespiritdrinkco],
    ["vinello.eu", vinello],
    ["danmurphys.com.au", danmurphys],
    ["market.nabeerclub.com", market],
    ["winesformothers.com", winesformothers],
    ["zepeim.com", zepeim],
    ["minusmoonshine.com", minusmoonshine],
    ["themindfuldrinking.com", themindfuldrinking],
    ["wisebartender.co.uk", wisebartender],
    ["sechey.com", sechey],
    ["drinkpointzero.com",drinkpointzero],
    ["sobersips.ca", sobersips],
    ["thechiller.co.nz", thechiller],
    ["boozefree.co.uk", boozefree],
    ["amavine.nl", amavine],
    ["joinclubsoda.com", joinclubsoda],
    ["keinundlow.at", keinundlow],
    ["noughtyaf.com", noughtyaf],
    ["shop.pierre-chavin.com", pierre_chavin],
    ["nonalcoholicwinesonline.com", nonalcoholicwinesonline],
    ["noblegreenwines.co.uk", noblegreenwinesonline],
    ["healthyplanetcanada.com", healthyplanetcanada],
    ["bittersandbottles.com", bittersandbottles],
    ["draydrinks.com", draydrinks],
    ["zerodrinks.co.za", zerodrinks],
    ["evergreencurated.com", evergreencurated],
    ["well.ca", well],
    ["drinknil.co.za", drinknil],
    ["alko.fi", alko],
    ["trade.bemakers.com", bemakers],
    ["themodernbartender.com", themodernbartender],
    ["inn-express.com", innexpress],
    ["disndis.com", disndis],
    ["drinkfreeco.com", drinkfreeco],
    ["hopfnung.ch", hopfnung],
]);

export function getRefinerForUrl(rootUrl) {
    const host = canonicalHostFromUrl(rootUrl);
    console.log("Refiner registry lookup for host:", host);
    const siteRefiner = registry.get(host);
    console.log("   Found site refiner?", Boolean(siteRefiner));
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
