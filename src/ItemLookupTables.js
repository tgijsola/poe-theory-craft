export class ItemLookupTables {
    constructor() {
        this.validBaseTypes = [];
        this.validBaseTypesForItemGroup = {};
    }

    addValidBaseType(itemId, itemGroup) {
        this.validBaseTypes.push(itemId);
        if (itemGroup) {
            if (!(itemGroup in this.validBaseTypesForItemGroup)) {
                this.validBaseTypesForItemGroup[itemGroup] = [];
            }
            this.validBaseTypesForItemGroup[itemGroup].push(itemId);
        }
    }

    baseTypeSorter(a, b, base_items) {
        const itemA = base_items[a];
        const itemB = base_items[b];

        if (itemA.item_class !== itemB.item_class) {
            return itemA.item_class.localeCompare(itemB.item_class);
        }
        if (itemA.drop_level !== itemB.drop_level) {
            return itemB.drop_level - itemA.drop_level;
        }
        return itemA.name.localeCompare(itemB.name);
    }

    sortBaseTypes(base_items) {
        this.validBaseTypes.sort((a, b) => { return this.baseTypeSorter(a, b, base_items)});
        for (const itemGroupName in this.validBaseTypesForItemGroup) {
            this.validBaseTypesForItemGroup[itemGroupName].sort((a, b) => { return this.baseTypeSorter(a, b, base_items) });
        }
    }

    getValidBaseTypes() {
        return this.validBaseTypes;
    }

    getValidBaseTypesForItemGroup(itemGroup) {
        return this.validBaseTypesForItemGroup[itemGroup];
    }
}

export function ParseBaseItems(base_items) {
    let itemLookupTables = new ItemLookupTables();

    const itemLookupGroups = [
        "wand", // Kludge: Order 'wand' before 'one_hand_weapon' so that wands don't get sorted with swords
        "bow", // Kludge: Order 'bow' before 'two_hand_weapon'
        "one_hand_weapon",
        "two_hand_weapon",
        "shield",
        "helmet",
        "body_armour",
        "gloves",
        "boots",
        "ring", 
        "amulet",
        "belt",
        "flask",
        "quiver",
        "jewel",
        "abyss_jewel"
    ];

    for (const itemId in base_items) {
        const item = base_items[itemId];

        if (item.release_state !== "released") {
            continue;
        }
    
        const domain = item["domain"];
        if (domain !== "item" && domain !== "flask" && domain !== "abyss_jewel" && domain !== "misc") {
            continue;
        }

        if (item["name"].search("Talisman") >= 0) {
            // Kludge: Don't include talismans
            continue;
        }

        let itemGroup = "";
        for (const itemLookupGroup of itemLookupGroups) {
            if (item["tags"].includes(itemLookupGroup)) {
                itemGroup = itemLookupGroup;
                break;
            }
        }

        itemLookupTables.addValidBaseType(itemId, itemGroup);
    }

    itemLookupTables.sortBaseTypes(base_items);

    return itemLookupTables;
}

export default { ParseBaseItems };