export class CraftingBenchLookupTables {
    constructor() {
        this.itemClassToBenchGroups = {};
        const layout = {
            "Body Armour" : {
                groups : [
                    {
                        benchGroup : "PhysicalDamageReductionRatingDuringSoulGainPrevention",
                        modGenerationType : "prefix",
                        firstStatIdx : 0,
                        benchMods : [
                            {
                                tier : 0,
                                cost : {
                                    currencyId : "Metadata/Items/Currency/CurrencyRerollMagic",
                                    amount : 6
                                },
                                modId : "JunMaster2PhysicalDamageReductionRatingDuringSoulGainPrevention2",
                            }
                        ]
                    }
                ]
            }
        }
    }

    getOrAddField(object, field, func_constructor) {
        if (!(field in object)) {
            const newField = func_constructor();
            object[field] = newField;
            return newField;
        }
        return object[field];
    }

    findOrAddInArray(array, predicate, func_constructor) {
        let found = array.find(predicate);
        if (!found) {
            found = func_constructor();
            array.push(found);
        }
        return found;
    }

    addBenchOption(itemClass, benchGroup, benchTier, benchModId, benchModFirstLineIndex, benchModGenerationType, benchCostCurrencyType, benchCostCurrencyAmount) {
        let foundBenchGroups = this.getOrAddField(this.itemClassToBenchGroups, itemClass, () => { 
            return { 
                groups : [] 
        }});
        let foundBenchGroup = this.findOrAddInArray(foundBenchGroups.groups, (x) => x.benchGroup === benchGroup, () => { 
            return { 
                benchGroup : benchGroup, 
                firstStatIdx : benchModFirstLineIndex,
                modGenerationType : benchModGenerationType, 
                benchMods : [] 
        }});
        foundBenchGroup.benchMods.push({
            tier : benchTier,
            cost : { 
                currencyId : benchCostCurrencyType,
                amount : benchCostCurrencyAmount
            },
            modId : benchModId,
        });
    }

    sort() {
        for (const itemClass in this.itemClassToBenchGroups) {
            const benchGroups = this.itemClassToBenchGroups[itemClass];
            benchGroups.groups.sort(
                (a, b) => { 
                    if (a.modGenerationType !== b.modGenerationType) {
                        return (a.modGenerationType === "prefix") ? -1 : 1;
                    }
                    return a.firstStatIdx - b.firstStatIdx
                });
            for (const benchGroup of benchGroups.groups) {
                benchGroup.benchMods.sort((a, b) => { return b.tier - a.tier });
            }
        }
    }
    getGroupsForItemClass(itemClass) {
        return this.itemClassToBenchGroups[itemClass];
    }
}

export function ParseCraftingBenchOptions(crafting_bench_options, mods, modLookupTable) {
    let craftingBenchLookupTables = new CraftingBenchLookupTables();

    for (const benchOption of crafting_bench_options) {
        const benchGroup = benchOption.bench_group;
        const benchTier = benchOption.bench_tier;
        const benchModId = benchOption.mod_id;
        const benchMod = mods[benchModId];
        const lineIndices = modLookupTable.getStatLineIndices(benchMod);
        const benchModFirstLineIndex = (lineIndices && lineIndices.length > 0) ? lineIndices[0] : 0;
        const benchModGenerationType = benchMod.generation_type;
        const benchCost = benchOption.cost;
        const benchCosts = Object.keys(benchCost);
        if (benchCosts.length > 1) {
            // Need to change bench crafter view to display multiple currency types in a single cost
            console.log("Unsupported bench costs for " + benchModId + ": " + benchCost);
        }
        const benchCostCurrency = (benchCosts && benchCosts.length > 0) ? benchCosts[0] : null;
        const benchCostAmount = benchCostCurrency ? benchCost[benchCostCurrency] : 0;

        for (const itemClass of benchOption.item_classes) {
            craftingBenchLookupTables.addBenchOption(itemClass, benchGroup, benchTier, benchModId, benchModFirstLineIndex, benchModGenerationType, benchCostCurrency, benchCostAmount);
        }
    }
    craftingBenchLookupTables.sort();

    return craftingBenchLookupTables;
}

export default { ParseCraftingBenchOptions };