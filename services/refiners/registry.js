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
import vinello from "./sites/vinello.dk.js";
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
import thefuss from './sites/thefuss.club.js';
import ginsiders from './sites/ginsiders.com.js';
import hopburnsblack from "./sites/hopburnsblack.co.uk.js";
import tesco from "./sites/tesco.com.js";
import thelightdrinker from "./sites/thelightdrinker.com.js";
import afdrinks from "./sites/af-drinks.com.js";
import puninwine from "./sites/puninwine.com.js";
import threshers from "./sites/threshers.co.uk.js";
import soberciety from "./sites/soberciety.de.js";
import positivedrinks from "./sites/positivedrinks.co.js";
import softerdrink from "./sites/softerdrink.ca.js";
import nakedlifespirits from "./sites/nakedlifespirits.com.au.js";
import decantalo from "./sites/decantalo.dk.js";
import wineanthology from "./sites/wineanthology.com.js";
import barrelandbatch from "./sites/barrelandbatch.com.au.js";
import sierranevada from "./sites/sierranevada.com.js";
import guiltlesswines from "./sites/guiltlesswines.com.js";
import drinksurely from "./sites/drinksurely.com.js";
import vintageroots from "./sites/vintageroots.co.uk.js";
import cheekyanddry from "./sites/cheekyanddry.com.js";
import athleticbrewing from "./sites/athleticbrewing.ca.js";
import albertabeerexchange from "./sites/albertabeerexchange.ca.js";
import mondaydistillery from "./sites/mondaydistillery.com.js";
import sobercarpenter from "./sites/sobercarpenter.com.js";
import thenaddrinks from "./sites/thenaddrinks.com.js";
import masterofmalt from "./sites/masterofmalt.com.js";
import collectiveartscreativity from "./sites/collectiveartscreativity.com.js";
import espadafor from "./sites/espadafor.es.js";
import liquorland from "./sites/liquorland.com.au.js";
import moju_zero from "./sites/moju-zero.com.js";
import whisky from "./sites/whisky.fr.js";
import thebelgianbeercompany from "./sites/thebelgianbeercompany.com.js";
import kodriget from "./sites/kodriget.dk.js";
import onestopwineshop from "./sites/onestopwineshop.com.js";
import lemoderato from "./sites/le-moderato.com.js";
import wolffer from "./sites/wolffer.com.js";
import sipyours from "./sites/sipyours.com.js";
import prikeshop from "./sites/prikeshop.lt.js";
import vesselliquor from "./sites/vesselliquor.com.js";
import seedlipdrinks from "./sites/seedlipdrinks.com.js";
import jomoclub from "./sites/jomoclub.co.uk.js";
import altinadrinks from "./sites/altinadrinks.com.js";
import kineuphorics from "./sites/kineuphorics.com.js";
import heynolo from "./sites/heynolo.com.js";
import passionspirits from "./sites/passionspirits.com.js";
import asda from "./sites/asda.com.js";
import beerritz from "./sites/beerritz.co.uk.js";
import diceys from "./sites/diceys.com.js";
import smashd from "./sites/smashd.com.js";
import _1001spirits from "./sites/1001spirits.com.js";
import alambika from "./sites/alambika.ca.js";
import waitrosecellar from "./sites/waitrosecellar.com.js";
import belgianbeerfactory from "./sites/belgianbeerfactory.com.js"
import wine_searcher from "./sites/wine-searcher.com.js"
import belowbrewco from "./sites/belowbrewco.com.js";
import threespiritdrinks from "./sites/threespiritdrinks.com.js";
import obrienswine from "./sites/obrienswine.ie.js";
import goodpairdays from "./sites/goodpairdays.com.js";
import flaskandfield from "./sites/flaskandfield.com.js";
import zeroclub from "./sites/zeroclub.com.au.js";
import cockburnsofleith from "./sites/cockburnsofleith.co.uk.js";
import vinyawine from "./sites/vinyawine.com.js";
import mrwest from "./sites/mrwest.com.au.js";
import vinmedmere from "./sites/vinmedmere.dk.js";
import eng_whisky from "./sites/eng.whisky.dk.js";
import topdrinks from "./sites/topdrinks.dk.js";
import kjaersommerfeldt from "./sites/kjaersommerfeldt.dk.js";
import bilkatogo from "./sites/bilkatogo.dk.js";
import hjhansen_vin from "./sites/hjhansen-vin.dk.js";
import fleggaard from "./sites/fleggaard.dk.js";
import supervin from "./sites/supervin.dk.js";
import uhrskov_vine from "./sites/uhrskov-vine.dk.js";
import gourmetsaft from "./sites/gourmetsaft.dk.js";
import foetex from "./sites/foetex.dk.js";
import osterbrovin from "./sites/osterbrovin.dk.js";
import philipsonwine from "./sites/philipsonwine.com.js";

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
    ["vinello.dk", vinello],
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
    ["thefuss.club", thefuss],
    ["ginsiders.com", ginsiders],
    ["hopburnsblack.co.uk", hopburnsblack],
    ["tesco.com", tesco],
    ["thelightdrinker.com", thelightdrinker],
    ["af-drinks.com", afdrinks],
    ["puninwine.com", puninwine],
    ["threshers.co.uk", threshers],
    ["soberciety.de", soberciety],
    ["positivedrinks.co", positivedrinks],
    ["softerdrink.ca", softerdrink],
    ["nakedlifespirits.com.au", nakedlifespirits],
    ["wineanthology.com", wineanthology],
    ["barrelandbatch.com.au", barrelandbatch],
    ["sierranevada.com", sierranevada],
    ["guiltlesswines.com", guiltlesswines],
    ["drinksurely.com", drinksurely],
    ["vintageroots.co.uk", vintageroots],
    ["cheekyanddry.com", cheekyanddry],
    ["athleticbrewing.ca", athleticbrewing],
    ["albertabeerexchange.ca", albertabeerexchange],
    ["mondaydistillery.com", mondaydistillery],
    ["sobercarpenter.com", sobercarpenter],
    ["thenaddrinks.com", thenaddrinks],
    ["masterofmalt.com", masterofmalt],
    ["collectiveartscreativity.com", collectiveartscreativity],
    ["espadafor.es", espadafor],
    ["liquorland.com.au", liquorland],
    ["moju-zero.com", moju_zero],
    ["whisky.fr", whisky],
    ["thebelgianbeercompany.com", thebelgianbeercompany],
    ["decantalo.dk", decantalo],
    ["kodriget.dk", kodriget],
    ["onestopwineshop.com", onestopwineshop],
    ["le-moderato.com", lemoderato],
    ["wolffer.com", wolffer],
    ["sipyours.com", sipyours],
    ["prikeshop.lt", prikeshop],
    ["vesselliquor.com", vesselliquor],
    ["seedlipdrinks.com", seedlipdrinks],
    ["jomoclub.co.uk", jomoclub],
    ["altinadrinks.com", altinadrinks],
    ["kineuphorics.com", kineuphorics],
    ["heynolo.com", heynolo],
    ["passionspirits.com", passionspirits],
    ["asda.com", asda],
    ["beerritz.co.uk", beerritz],
    ["diceys.com", diceys],
    ["smashd.com", smashd],
    ["1001spirits.com", _1001spirits],
    ["alambika.ca", alambika],
    ["waitrosecellar.com", waitrosecellar],
    ["belgianbeerfactory.com", belgianbeerfactory],
    ["wine-searcher.com", wine_searcher],
    ["belowbrewco.com", belowbrewco],
    ["threespiritdrinks.com", threespiritdrinks],
    ["obrienswine.ie", obrienswine],
    ["goodpairdays.com", goodpairdays],
    ["flaskandfield.com", flaskandfield],
    ["zeroclub.com.au", zeroclub],
    ["cockburnsofleith.co.uk", cockburnsofleith],
    ["vinyawine.com", vinyawine],
    ["mrwest.com.au", mrwest],
    ["vinmedmere.dk", vinmedmere],
    ["eng.whisky.dk", eng_whisky],
    ["topdrinks.dk", topdrinks],
    ["kjaersommerfeldt.dk", kjaersommerfeldt],
    ["bilkatogo.dk", bilkatogo],
    ["hjhansen-vin.dk", hjhansen_vin],
    ["fleggaard.dk", fleggaard],
    ["supervin.dk", supervin],
    ["uhrskov-vine.dk", uhrskov_vine],
    ["gourmetsaft.dk", gourmetsaft],
    ["foetex.dk", foetex],
    ["osterbrovin.dk", osterbrovin],
    ["philipsonwine.com", philipsonwine]
]);

export function getRefinerForUrl(rootUrl, siteConfig) {
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
            out = await defaultRefiner(rootUrlArg, out, page, siteConfig);
        } catch (e) {
            console.error(`Default refiner error: ${e.message}`);
        }
        return out;
    };
}
