export default class TranslationHelper {
    static IndexHandlers = {
        "30%_of_value": v => { return v * 0.3 },
        "60%_of_value": v => { return v * 0.6 },
        "deciseconds_to_seconds": v => { return v / 10 },
        "divide_by_one_hundred": v => { return v / 100 },
        "divide_by_one_hundred_and_negate": v => { return -v / 100 },
        "divide_by_one_hundred_2dp": v => { return (v / 100).toFixed(2) },
        "milliseconds_to_seconds": v => { return v / 1000 },
        "milliseconds_to_seconds_0dp": v => { return (v / 1000).toFixed(0) },
        "milliseconds_to_seconds_1dp": v => { return (v / 1000).toFixed(1) },
        "milliseconds_to_seconds_2dp": v => { return (v / 1000).toFixed(2) },
        "milliseconds_to_seconds_2dp_if_required": v => { return (v / 1000).toFixed(2) },
        "multiplicative_damage_modifier": v => { return v + 100 },
        "multiplicative_permyriad_damage_modifier": v => { return v / 100 + 100 },
        "negate": v => { return -v },
        "old_leech_percent": v => { return v / 5 },
        "old_leech_permyriad": v => { return v / 500 },
        "per_minute_to_per_second": v => { return (v / 60).toFixed(1) },
        "per_minute_to_per_second_0dp": v => { return (v / 60).toFixed(0) },
        "per_minute_to_per_second_1dp": v => { return (v / 60).toFixed(1) },
        "per_minute_to_per_second_2dp": v => { return (v / 60).toFixed(2) },
        "per_minute_to_per_second_2dp_if_required": v => { return (v / 60).toFixed(2) },
        "divide_by_two_0dp": v => { return Math.floor(v / 2) },
        "divide_by_six": v => { return v / 6 },
        "divide_by_ten_0dp": v => { return Math.floor(v / 10) },
        "divide_by_twelve": v => { return v / 12 },
        "divide_by_fifteen_0dp": v => { return Math.floor(v / 15) },
        "divide_by_twenty_then_double_0dp": v => { return Math.floor(v / 20) * 2 },
        "times_twenty": v => { return v * 20 }
    };

    static stringformat = function(fmt) {
        const args = Array.prototype.slice.call(arguments, 1);
        return fmt.replace(/{(\d+)}/g, (match, number) => {
            return args[0][number];
        });
    }

    static ModTypeTranslationLineOverrides = {
        "DoubleModSellPrice1" : [ "Item sells for much more to vendors", "(3x Chaos Orbs)" ],
        "DoubleModSellPrice2" : [ "Item sells for much more to vendors", "(Exalted Orb)" ],
        "DoubleModSellPrice3" : [ "Item sells for much more to vendors", "(5x Orb of Alchemy)" ],
        "DoubleModSellPrice4" : [ "Item sells for much more to vendors", "(3x Stacked Deck)" ],
        "DoubleModSellPrice5" : [ "Item sells for much more to vendors", "(5x Wisdom / Alch / Chance / Transmute / Alt)" ],
        "DoubleModSellPrice6" : [ "Item sells for much more to vendors", "(5x Albino Rhoa Feather)" ],
        "DoubleModSellPrice7" : [ "Item sells for much more to vendors", "(1x Random Crafting Currency)" ],
        "DoubleModSellPrice8" : [ "Item sells for much more to vendors", "(2x Mirror Shard)" ],
        "DoubleModSellPrice9" : [ "Item sells for much more to vendors", "(5x Remnant of Corruption)" ],
    }

    static GetTranslationLinesForMod = function(translationJson, mod, values = null) {
        // End hacky mod translations
        let consumedIdxs = new Set();
        let translationLines = [];
        for (let statIdx in mod["stats"]) {
            if (consumedIdxs.has(statIdx)) {
                continue;
            }
            const statObj = mod["stats"][statIdx];
            const statId = statObj["id"];
            consumedIdxs.add(statIdx);

            for (const translationIdx in translationJson) {
                const translation = translationJson[translationIdx];
                const translationStatIdx = translation["ids"].findIndex((x => x === statId));
                if (translationStatIdx >= 0) {
                    let translationLine = {};
                    translationLine["tidx"] = translationIdx;
                    const numStatsInTranslation = translation["ids"].length;
                    translationLine["mins"] = Array(numStatsInTranslation).fill(0);
                    translationLine["maxs"] = Array(numStatsInTranslation).fill(0);
                    if (values)
                        translationLine["values"] = Array(numStatsInTranslation).fill(0);

                    translationLine["mins"][translationStatIdx] = statObj["min"];
                    translationLine["maxs"][translationStatIdx] = statObj["max"];
                    if (values)                    
                        translationLine["values"][translationStatIdx] = values[statIdx];

                    for (let addlStatIdx in mod["stats"]) {
                        const addlStat = mod["stats"][addlStatIdx];
                        const addlStatId = addlStat["id"];
                        if (consumedIdxs.has(addlStatIdx)) {
                            continue;
                        }
                        const addlStatTranslationIdx = translation["ids"].findIndex((x => x === addlStatId));
                        if (addlStatTranslationIdx > 0) {
                            translationLine["mins"][addlStatTranslationIdx] = addlStat["min"];
                            translationLine["maxs"][addlStatTranslationIdx] = addlStat["max"];
                            if (values)                            
                                translationLine["values"][addlStatTranslationIdx] = values[addlStatIdx];

                            consumedIdxs.add(addlStatIdx);
                        }
                    }
                    translationLines.push(translationLine);
                }
            }
        }
        return translationLines;
    }

    static GetTranslationRuleForLine = function(translationJson, line) {
        const translation = translationJson[line["tidx"]]["English"];
        for (const translationRule of translation) {
            let conditionsFailed = false;
            for (const statIdx in line["mins"]) {
                let condition = translationRule["condition"][statIdx];
                const value = line["mins"][statIdx];
                if ("min" in condition) {
                    if (value < condition["min"]) {
                        conditionsFailed = true;
                        break;
                    }
                }
                if ("max" in condition) {
                    if (value > condition["max"]) {
                        conditionsFailed = true;
                        break;
                    }
                }
            }
            if (!conditionsFailed) {
                return translationRule;
            }
        }
        return null;
    }

    static ApplyIndexHandlers = function(indexHandlers, value) {
        for (const handler of indexHandlers) {
            if (handler in this.IndexHandlers) {
                value = this.IndexHandlers[handler](value)
            }
        }
        return value;
    }

    static GetStringForTranslationRule = function(translationJson, rule, line, stringReplacementForValues = null) {
        const translation = translationJson[line["tidx"]];
        let replacementStrings = Array(translation["ids"].length);
        for (const statIdx in translation["ids"]) {
            let replacementMin = this.ApplyIndexHandlers(rule["index_handlers"][statIdx], line["mins"][statIdx]);
            let replacementMax = this.ApplyIndexHandlers(rule["index_handlers"][statIdx], line["maxs"][statIdx]);
            let replacementValue = null;
            if ("values" in line) {
                replacementValue = this.ApplyIndexHandlers(rule["index_handlers"][statIdx], line["values"][statIdx]);
            }

            let replacementCombined = "";
            if (replacementMin === replacementMax) {
                if (stringReplacementForValues) {
                    replacementCombined = stringReplacementForValues;
                }
                else {
                    replacementCombined = replacementMin;
                }
            }
            else {
                if (stringReplacementForValues) {
                    replacementMin = stringReplacementForValues;
                    replacementMax = stringReplacementForValues;
                    if (replacementValue) {
                        replacementValue = stringReplacementForValues;
                    }
                }

                replacementCombined = "(" + replacementMin + "-" + replacementMax + ")";
                if (replacementValue) {
                    replacementCombined = replacementValue + replacementCombined;
                }
            }
            replacementStrings[statIdx] = rule["format"][statIdx].replace("#", replacementCombined);
        }
        return this.stringformat(rule["string"], replacementStrings);
    }

    static GetStringsForTranslationLines = function(translationJson, translationLines, stringReplacementForValues = null) {
        let strings = [];
        for (const lineIdx in translationLines) {
            const translationRule = this.GetTranslationRuleForLine(translationJson, translationLines[lineIdx]);
            if (translationRule) {
                strings = strings.concat(this.GetStringForTranslationRule(translationJson, translationRule, translationLines[lineIdx], stringReplacementForValues).split("\n"));
            }
        }
        return strings;
    }

    static TranslateMod = function(translationJson, mod, values = null) {
        // Hacky mod translations go here!
        if (mod.type in this.ModTypeTranslationLineOverrides) {
            return [...this.ModTypeTranslationLineOverrides[mod.type]];
        }
        const translationLines = this.GetTranslationLinesForMod(translationJson, mod, values);
        return this.GetStringsForTranslationLines(translationJson, translationLines);
    }

    static TranslateModForGroup = function(translationJson, minMod, maxMod) {
        // Hacky mod translations go here!
        if (minMod.type in this.ModTypeTranslationLineOverrides) {
            return [...this.ModTypeTranslationLineOverrides[minMod.type]];
        }
        const minTranslationLines = this.GetTranslationLinesForMod(translationJson, minMod, null);
        const maxTranslationLines = this.GetTranslationLinesForMod(translationJson, maxMod, null);
        let combinedTranslationLines = [];
        for (let translationLineIdx = 0; translationLineIdx < minTranslationLines.length; ++translationLineIdx) {
            let combinedTranslationLine = {};
            const minTranslationLine = minTranslationLines[translationLineIdx];
            const maxTranslationLine = maxTranslationLines[translationLineIdx];
            combinedTranslationLine.tidx = minTranslationLine.tidx;
            combinedTranslationLine.mins = [...minTranslationLine.mins];
            combinedTranslationLine.maxs = [...maxTranslationLine.maxs];
            combinedTranslationLines.push(combinedTranslationLine);
        }
        return this.GetStringsForTranslationLines(translationJson, combinedTranslationLines);
    }    
}