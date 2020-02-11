
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
    }

    return modLookupTables;
}

export default { ParseModGroups };