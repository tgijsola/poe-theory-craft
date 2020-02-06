// export class ModGroupTree {
//     constructor() {
//         this.domains = {};
//     }

//     add(modId, domain, group, type, positiveWeightTags, zeroWeightTags) {
//         // { domains : { <domain_str> : <groupset> } }
//         // <groupset> = { <group_str> : <typeset> }
//         // <typeset>  = { <type_str> : { positiveTags : <tagset>, zeroTags : <tagset> } }
//         // <tagset>   = { <tag_str> : [ <modId> ... ] }
//         if (!(domain in this.domains)) {
//             this.domains[domain] = {};
//         }
//         let groupSet = this.domains[domain];
//         if (!(group in groupSet)) {
//             groupSet[group] = {};
//         }
//         let typeSet = groupSet[group];
//         if (!(type in typeSet)) {
//             typeSet[type] = { positiveTags : {}, zeroTags: {} };
//         }
//         let positiveTagSet = typeSet[type].positiveTags;
//         let zeroTagSet = typeSet[type].zeroTags;
//         for (let tag of positiveWeightTags) {
//             if (!(tag in positiveTagSet)) {
//                 positiveTagSet[tag] = [];
//             }
//             positiveTagSet[tag].push(modId);
//         }
//         for (let tag of zeroWeightTags) {
//             if (!(tag in zeroTagSet)) {
//                 zeroTagSet[tag] = [];
//             }
//             zeroTagSet[tag].push(modId);
//         }
//     }
// }

// export class ModGroupSet {
//     constructor() { 
//         this.groupSets = {};
//     }

//     add(modId, domain, group, type) {
//         const key = domain + "|" + group + "|" + type;
//         if (!(key in this.groupSets)) {
//             this.groupSets[key] = [ modId ];
//         }
//         else {
//             this.groupSets[key].push(modId);
//         }
//     }
// }

export class InfluenceLookupTables {
    constructor() {
        this.influenceToTags = {};
    }

    add(influence, tag) {
        if (!(influence in this.influenceToTags)) {
            this.influenceToTags[influence] = [];
        }
        if (!this.influenceToTags[influence].includes(tag)) {
            this.influenceToTags[influence].push(tag);
        }
    }

    get(influence) {
        return this.influenceToTags[influence];
    }
}

export class ModLookupTables {
    constructor() {
        this.domainTable = {};
        this.groupedModTable = {};
        this.statLineIndices = {};
        this.tags = {};
        this.source = {};
    }

    add(modId, domain, group, type, source, statLineIndices, tags) {
        this.addToDomainTable(modId, domain);
        this.addToGroupedModTable(modId, domain, group, type, statLineIndices);
        this.addStatLineIndices(modId, statLineIndices);
        this.addTags(modId, tags);
        this.addSource(modId, source);
    }

    addStatLineIndices(modId, statLineIndices)
    {
        this.statLineIndices[modId] = statLineIndices;
    }

    addTags(modId, tags) 
    {
        this.tags[modId] = tags;
    }

    addSource(modId, source)
    {
        this.source[modId] = source;
    }

    addToDomainTable(modId, domain) {
        if (!(domain in this.domainTable)) {
            this.domainTable[domain] = [modId];
        }
        else {
            this.domainTable[domain].push(modId);
        }
    }

    addToGroupedModTable(modId, domain, group, type, statIndices) {
        const key = this.getGroupedTableKey(domain, group, type, statIndices);
        if (!(key in this.groupedModTable)) {
            this.groupedModTable[key] = [ modId ];
        }
        else {
            this.groupedModTable[key].push(modId);
        }
    }

    getDomainTable(domain) {
        return this.domainTable[domain];
    }

    getGroupedTable(domain, group, type, statIndices) {
        return this.groupedModTable[this.getGroupedTableKey(domain, group, type, statIndices)];
    }

    getGroupedTableKey(domain, group, type, statIndices) {
        return domain + "|" + group + "|" + type + "|" + statIndices.join("|");
    }

    getGroupedTableKeyForMod(modId, modData) {
        return this.getGroupedTableKey(modData["domain"], modData["group"], modData["type"], this.getStatLineIndices(modId));
    }

    getStatLineIndices(modId) {
        return this.statLineIndices[modId];
    }

    getTags(modId) {
        return this.tags[modId];
    }

    getSource(modId) {
        return this.source[modId];
    }
}

// export class ModGroup {
//     constructor(domain, group, type, positiveWeightTags, zeroWeightTags) {
//         this.domain = domain;
//         this.group = group;
//         this.type = type;
//         this.positiveWeightTags = new Set(positiveWeightTags);
//         this.zeroWeightTags = new Set(zeroWeightTags);

//         this.modIds = [];
//     }

//     equivalent(other) {
//         return (other.domain == this.domain
//             && other.group == this.group
//             && other.type == this.type
//             && this.setsCompatible(other.positiveWeightTags, this.positiveWeightTags)
//             && this.setsCompatible(other.zeroWeightTags, this.zeroWeightTags)
//         );
//     }

//     setsCompatible(a, b) {
//         /*
//         if (a.size !== b.size) {
//             return false;
//         }
//         */
//         for (const _a of a) {
//             if (!b.has(_a)) {
//                 return false;
//             }
//         }
//         for (const _b of b) {
//             if (!a.has(_b)) {
//                 return false;
//             }
//         }
//         return true;
//     }
// }

export function ParseModGroups(mods, stats, item_classes, mod_types) {
    let knownInfluences = ["crusader", "redeemer", "hunter", "warlord", "shaper", "elder"];
    let influenceLookupTables = new InfluenceLookupTables();
    for (const itemClassId in item_classes) {
        const itemClass = item_classes[itemClassId];
        for (const influenceId of knownInfluences) {
            const influenceTag = influenceId + "_tag";
            if (influenceTag in itemClass && itemClass[influenceTag]) {
                influenceLookupTables.add(influenceId, itemClass[influenceTag]);
            }
        }
    }

    let modLookupTables = new ModLookupTables();

    let statKeyToIndex = {};
    let idx = 0;
    for (let statKey in stats) {
        statKeyToIndex[statKey] = idx;
        idx++;
    }

    for (const modId in mods) {
        const mod = mods[modId];

        let statIndices = [];
        for (const stat of mod["stats"]) {
            statIndices.push(statKeyToIndex[stat.id]);
        }

        let modTags = [ ...mod_types[mod["type"]]["tags"] ];

        let source = "";
        if (mod["domain"] === "delve") {
            source = "delve";
        }
        else if (mod["is_essence_only"]) {
            source = "essence";
        }
        else {
            for (const spawnWeight of mod["spawn_weights"]) {
                if (spawnWeight["weight"] === 0) {
                    continue;
                }
                for (const influenceId of knownInfluences) {
                    const tagList = influenceLookupTables.get(influenceId);
                    if (tagList.includes(spawnWeight["tag"])) {
                        source = influenceId;
                        break;
                    }
                }
            }
        }

        modLookupTables.add(modId, mod["domain"], mod["group"], mod["type"], source, statIndices, modTags);

        // // Filter mods from unaccepted domains
        // if (!validModDomains.has(mod["domain"])) {
        //     continue;
        // }

        // if (!validModGenerationTypes.has(mod["generation_type"])) {
        //     continue;
        // }
        
        // let positiveWeightTags = [];
        // let zeroWeightTags = [];
        // for (const spawnWeight of mod["spawn_weights"]) {
        //     if (spawnWeight["weight"] > 0) {
        //         positiveWeightTags.push(spawnWeight["tag"]);
        //     }
        //     else {
        //         zeroWeightTags.push(spawnWeight["tag"]);
        //     }
        // }

        // // Filter un-rollable mods
        // if (positiveWeightTags.length == 0) {
        //     continue;
        // }

        // modGroupTree.add(modId, mod["domain"], mod["group"], mod["type"], positiveWeightTags, zeroWeightTags);
        // modGroupSet.add(modId, mod["domain"], mod["group"], mod["type"]);

        // let candidateModGroup = new ModGroup(mod["domain"], mod["group"], mod["type"], positiveWeightTags, zeroWeightTags);
        // let existingModGroup = null;
        // for (let testExistingModGroup of modGroups) {
        //     if (testExistingModGroup.equivalent(candidateModGroup)) {
        //         existingModGroup = testExistingModGroup;
        //         break;
        //     }
        // }
        // if (existingModGroup === null) {
        //     candidateModGroup.modIds.push(modId);
        //     modGroups.push(candidateModGroup);
        // }
        // else {
        //     existingModGroup.modIds.push(modId);
        // }
    }

    // for (const modGroup of modGroups) {
    //     console.log("{" + modGroup.domain + " " + modGroup.group + " " + modGroup.type + " +" + modGroup.positiveWeightTags + " -" + modGroup.zeroWeightTags + "} : " + modGroup.modIds.length);
    //     for (const modId of modGroup.modIds) {
    //         console.log(" - " + modId);
    //     }
    // }
    return modLookupTables;
}

export default { ParseModGroups };