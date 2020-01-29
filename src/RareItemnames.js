const RarePrefixes = [
    "Agony", "Apocalypse", "Armageddon", "Beast", "Behemoth", "Blight", "Blood", "Bramble", "Brimstone", "Brood", "Carrion", "Cataclysm", "Chimeric", "Corpse", "Corruption", "Damnation", "Death", "Demon", "Dire", "Dragon", "Dread", "Doom", "Dusk", "Eagle", "Empyrean", "Fate", "Foe", "Gale", "Ghoul", "Gloom", "Glyph", "Golem", "Grim", "Hate", "Havoc", "Honour", "Horror", "Hypnotic", "Kraken", "Loath", "Maelstrom", "Mind", "Miracle", "Morbid", "Oblivion", "Onslaught", "Pain", "Pandemonium", "Phoenix", "Plague", "Rage", "Rapture", "Rune", "Skull", "Sol", "Soul", "Sorrow", "Spirit", "Storm", "Tempest", "Torment", "Vengeance", "Victory", "Viper", "Vortex", "Woe", "Wrath"
];

const RareSuffixes = {
    "One Hand Axe" : ["Bane", "Bite", "Edge", "Hunger", "Roar", "Song", "Thirst", "Beak", "Butcher", "Etcher", "Gnash", "Mangler", "Rend", "Sever", "Slayer", "Spawn", "Splitter", "Sunder" ],
    "Two Hand Axe" : ["Bane", "Bite", "Edge", "Hunger", "Roar", "Song", "Thirst", "Beak", "Butcher", "Etcher", "Gnash", "Mangler", "Rend", "Sever", "Slayer", "Spawn", "Splitter", "Sunder" ],
    "One Hand Mace" : ["Bane", "Batter", "Blast", "Blow", "Blunt", "Brand", "Breaker", "Burst", "Crack", "Crusher", "Grinder", "Knell", "Mangler", "Ram", "Roar", "Ruin", "Shatter", "Smasher", "Star", "Thresher", "Wreck" ],
    "Two Hand Mace" : ["Bane", "Batter", "Blast", "Blow", "Blunt", "Brand", "Breaker", "Burst", "Crack", "Crusher", "Grinder", "Knell", "Mangler", "Ram", "Roar", "Ruin", "Shatter", "Smasher", "Star", "Thresher", "Wreck" ],
    "Sceptre" : ["Bane", "Blow", "Breaker", "Call", "Chant", "Crack", "Crusher", "Cry", "Gnarl", "Grinder", "Knell", "Ram", "Roar", "Smasher", "Song", "Spell", "Star", "Weaver" ],
    "Staff" : ["Bane", "Beam", "Branch", "Call", "Chant", "Cry", "Gnarl", "Goad", "Mast", "Pile", "Pillar", "Pole", "Post", "Roar", "Song", "Spell", "Spire", "Weaver" ],
    "FishingRod" : ["Bane", "Beam", "Branch", "Call", "Chant", "Cry", "Gnarl", "Goad", "Mast", "Pile", "Pillar", "Pole", "Post", "Roar", "Song", "Spell", "Spire", "Weaver" ],
    "Warstaff" : ["Bane", "Beam", "Branch", "Call", "Chant", "Cry", "Gnarl", "Goad", "Mast", "Pile", "Pillar", "Pole", "Post", "Roar", "Song", "Spell", "Spire", "Weaver" ],
    "One Hand Sword" : ["Bane", "Barb", "Beak", "Bite", "Edge", "Fang", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Saw", "Scalpel", "Scratch", "Sever", "Skewer", "Slicer", "Song", "Spike", "Spiker", "Stinger", "Thirst" ],
    "Thrusting One Hand Sword" : ["Bane", "Barb", "Beak", "Bite", "Edge", "Fang", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Saw", "Scalpel", "Scratch", "Sever", "Skewer", "Slicer", "Song", "Spike", "Spiker","Stinger", "Thirst" ],
    "Two Hand Sword" : ["Bane", "Barb", "Beak", "Bite", "Edge", "Fang", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Saw", "Scalpel", "Scratch", "Sever", "Skewer", "Slicer", "Song", "Spike", "Spiker", "Stinger", "Thirst" ],
    "Dagger" : ["Bane", "Barb", "Bite", "Edge", "Etcher", "Fang", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Scalpel", "Scratch", "Sever", "Skewer", "Slicer", "Song", "Spike", "Stinger", "Thirst" ],
    "Rune Dagger" : ["Bane", "Barb", "Bite", "Edge", "Etcher", "Fang", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Scalpel", "Scratch", "Sever", "Skewer", "Slicer", "Song", "Spike", "Stinger", "Thirst" ],
    "Claw" : ["Bane", "Bite", "Edge", "Fang", "Fist", "Gutter", "Hunger", "Impaler", "Needle", "Razor", "Roar", "Scratch", "Skewer", "Slicer", "Song", "Spike", "Stinger", "Talons", "Thirst" ],
    "Bow" : ["Arch", "Bane", "Barrage", "Blast", "Branch", "Breeze", "Fletch", "Guide", "Horn", "Mark", "Nock", "Rain", "Reach", "Siege", "Song", "Stinger", "Strike", "Thirst", "Thunder", "Twine", "Volley", "Wind", "Wing" ],
    "Wand" : ["Bane", "Barb", "Bite", "Branch", "Call", "Chant", "Charm", "Cry", "Edge", "Gnarl", "Goad", "Needle", "Scratch", "Song", "Spell", "Spire", "Thirst", "Weaver" ],

    // Armor
    "Body Armour" : ["Carapace", "Cloak", "Coat", "Curtain", "Guardian", "Hide", "Jack", "Keep", "Mantle", "Pelt", "Salvation", "Sanctuary", "Shell", "Shelter", "Shroud", "Skin", "Suit", "Veil", "Ward", "Wrap" ],
    "Helmet" : ["Brow", "Corona", "Cowl", "Crest", "Crown", "Dome", "Glance", "Guardian", "Halo", "Horn", "Keep", "Peak", "Salvation", "Shelter", "Star", "Veil", "Visage", "Visor", "Ward" ],
    "Gloves" : ["Caress", "Claw", "Clutches", "Fingers", "Fist", "Grasp", "Grip", "Hand", "Hold", "Knuckle", "Mitts", "Nails", "Palm", "Paw", "Talons", "Touch", "Vise" ],
    "Boots" : ["Dash", "Goad", "Hoof", "League", "March", "Pace", "Road", "Slippers", "Sole", "Span", "Spark", "Spur", "Stride", "Track", "Trail", "Tread", "Urge" ],
    // These share the 'Shield' item class, have to search for the 'focus' tag on the item
    "_Spirit Shield" : ["Ancient", "Anthem", "Call", "Chant", "Charm", "Emblem", "Guard", "Mark", "Pith", "Sanctuary", "Song", "Spell", "Star", "Ward", "Weaver", "Wish" ],
    "_Other Shield" : ["Aegis", "Badge", "Barrier", "Bastion", "Bulwark", "Duty", "Emblem", "Fend", "Guard", "Mark", "Refuge", "Rock", "Rook", "Sanctuary", "Span", "Tower", "Watch", "Wing" ],

    // Accessories
    "Amulet" : ["Beads", "Braid", "Charm", "Choker", "Clasp", "Collar", "Idol", "Gorget", "Heart", "Locket", "Medallion", "Noose", "Pendant", "Rosary", "Scarab", "Talisman", "Torc" ],
    "Ring" : ["Band", "Circle", "Coil", "Eye", "Finger", "Grasp", "Grip", "Gyre", "Hold", "Knot", "Knuckle", "Loop", "Nail", "Spiral", "Turn", "Twirl", "Whorl" ],
    "Belt" : ["Bind", "Bond", "Buckle", "Clasp", "Cord", "Girdle", "Harness", "Lash", "Leash", "Lock", "Locket", "Shackle", "Snare", "Strap", "Tether", "Thread", "Trap", "Twine" ],
    "Quiver" : ["Arrow", "Barb", "Bite", "Bolt", "Brand", "Dart", "Flight", "Hail", "Impaler", "Nails", "Needle", "Quill", "Rod", "Shot", "Skewer", "Spear", "Spike", "Spire", "Stinger" ],

    // No source for this! Just pulling some random names off poe.trade
    "Jewel" : ["Bliss", "Bloom", "Creed", "Cut", "Delirium", "Dream", "Edge", "Essence", "Eye", "Fist", "Glisten", "Gnash", "Heart", "Horn", "Hunger", "Ichor", "Impaler", "Joy", "Needle", "Nock", "Ornament", "Pause", "Prism", "Roar", "Ruin", "Scratch", "Shard", "Shine", "Sliver", "Solace", "Spiker", "Splinter", "Stone", "Thunder", "Wound" ],
    "AbyssJewel" : ["Bliss", "Bloom", "Creed", "Cut", "Delirium", "Dream", "Edge", "Essence", "Eye", "Fist", "Glisten", "Gnash", "Heart", "Horn", "Hunger", "Ichor", "Impaler", "Joy", "Needle", "Nock", "Ornament", "Pause", "Prism", "Roar", "Ruin", "Scratch", "Shard", "Shine", "Sliver", "Solace", "Spiker", "Splinter", "Stone", "Thunder", "Wound" ],
};

export function GenerateRareName(itemData, rng) {
    const prefixIdx = Math.floor(rng() * RarePrefixes.length);
    const prefix = RarePrefixes[prefixIdx];
    let suffixPool = [];
    if (itemData["item_class"] === "Shield") {
        if (itemData["tags"].includes("focus")) {
            suffixPool = RareSuffixes["_Spirit Shield"];
        }
        else {
            suffixPool = RareSuffixes["_Other Shield"];
        }
    }
    else {
        suffixPool = RareSuffixes[itemData["item_class"]];
    }
    const suffixIdx = Math.floor(rng() * suffixPool.length);
    const suffix = suffixPool[suffixIdx];
    return prefix + " " + suffix;
}

export default { GenerateRareName };