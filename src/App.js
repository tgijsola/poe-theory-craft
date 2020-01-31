import React from 'react';
import './App.css';
import TranslationHelper from './Translation.js';
import seedrandom from 'seedrandom';
import RareItemNames from './RareItemnames.js';
import ModGroups from './ModGroups.js';
import base_items from './data/base_items.json';
import item_classes from './data/item_classes.json';
import _mods from './data/mods.json';
import stat_translations from './data/stat_translations.json';
import stats from './data/stats.json'

function randRange(rng, minInclusive, maxInclusive) {
  return Math.floor(rng.quick() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

function PropertyLine (props) {
  let replacementIdx = 0;
  let replacementSpans = props.values.map((x) => <span className="property" key={replacementIdx++}>{x}</span>);
  const lineSplit = props.line.split(/{}/g);
  let output = [];
  for (let i = 0; i < lineSplit.length - 1; ++i) {
    output.push(lineSplit[i]);
    output.push(replacementSpans[i]);
  }
  output.push(lineSplit[lineSplit.length - 1]);
  return <div className="propertyLine">{output}</div>;
}

function TipLine (props) {
  return <div className="tipLine">{props.line}</div>
}

function ModLine (props) {
  return <div className="modLine">{props.line}</div>
}

function ItemNameLine (props) {
  return [props.topLine && <div className="itemName" key="itemName_top">{props.topLine}</div>, props.bottomLine && <div className="itemName" key="itemName_bottom">{props.bottomLine}</div>];
}

function ItemHeader (props) {
  const double = props.generatedName.length > 0 && props.itemTypeName.length > 0;
  const leftSymbolClass = props.influences.length > 0 ? props.influences[0] : "";
  const rightSymbolClass = props.influences.length > 1 ? props.influences[1] : leftSymbolClass;
  return  <div className={"header-border " + (double ? "double" : "single")}>
            <span className={"l symbol " + leftSymbolClass}></span>
            <ItemNameLine topLine={props.generatedName} bottomLine={props.itemTypeName} key="nameLine"/>
            <span className={"r symbol " + rightSymbolClass}></span>
          </div>
  ;
}

class CraftedItem extends React.Component {
  getItemTypeName() {
    return base_items[this.props.itemState.baseItemId]["name"];
  }

  getTipLine(modInstance, generationType) {
    const mod = this.props.context.mods[modInstance.id];
    let line = "";
    if (generationType === "prefix" || generationType === "suffix") {
      line = generationType[0].toUpperCase() + generationType.slice(1) + " Modifier \"" + mod["name"] + "\"" + (modInstance.tierCount > 0 ? (" (Tier: " + (modInstance.tier + 1) + " [" + (modInstance.tierCount - modInstance.tierCountAtItemLevel + 1) + "-" + modInstance.tierCount + "])") : "");
    }
    else if (generationType === "unique" || generationType === "implicit") {
      line = generationType[0].toUpperCase() + generationType.slice(1) + " Modifier";
    }
    return <TipLine line={line} key={modInstance.id + "_tip"}/>;
  }

  getStatLines(modInstance) {
    const mod = this.props.context.mods[modInstance.id];
    const values = modInstance.values;
    const translationStrings = TranslationHelper.TranslateMod(stat_translations, mod, values);    
    return translationStrings.map((x, i) => <ModLine line={x} key={modInstance.id + "_mod_" + i}/>);
  }

  getImplicitLine(modInstance) {
    const statLines = this.getStatLines(modInstance);
    if (statLines.length > 0) {
      return [this.getTipLine(modInstance, "implicit"), this.getStatLines(modInstance)];
    }
  }

  getImplicitBoxes() {
    let showMods = this.props.itemState.implicits;
    if (this.props.sortMods) {
      showMods = SortMods(showMods, this.props.context);
    }
    return showMods.map(
      x => <div className="modBox implicit" key={x.id}>{this.getImplicitLine(x)}</div>
    );
  }

  getAffixLine(modInstance) {
    return [this.getTipLine(modInstance, this.props.context.mods[modInstance.id]["generation_type"]), this.getStatLines(modInstance)];
  }

  getAffixBoxes() {
    let showMods = this.props.itemState.affixes;
    if (this.props.sortMods) {
      showMods = SortMods(showMods, this.props.context);
    }
    return showMods.map(    
      x => <div className="modBox" key={x.id}>{this.getAffixLine(x)}</div>
    );
  }

  getGroupsWithSeparators(groups) 
  {
    let separatedGroups = [];
    let separatoridx = 0;
    for (const group of groups) {
      if (group.length > 0) {
        separatedGroups.push(<div className="separator" key={"sep_" + separatoridx} />);
        separatoridx++;
        separatedGroups = separatedGroups.concat(group);
      }
    }
    return separatedGroups;
  }

  render() {
    return <div className={"craftedItem " + this.props.itemState.rarity}>
      <div className="content-box">
        <ItemHeader itemTypeName={this.getItemTypeName()} generatedName={this.props.itemState.generatedName} influences={this.props.itemState.influences} />
        <PropertyLine line="Item Level: {}" values={[this.props.itemState.level]} />
        { this.getGroupsWithSeparators([this.getImplicitBoxes(), this.getAffixBoxes()]) }
      </div>
    </div>
  }
}

function ModListLine(props) {
  let spanIdx = 0;
  let nameLineElements = props.nameLines.map( (x) => <span key={spanIdx++}>{x}</span>);
  for (let i = 1; i < nameLineElements.length; i += 2) {
    nameLineElements.splice(i, 0, <br />);
  }
  return <div className="modLine">
    <div className="modTier">
      { props.tierString }
    </div>
    <div className="modName">
      { nameLineElements }
    </div>
    <div className="modWeight">
      { props.weight }
    </div>
    <div className="modProb">
      { props.prob }
    </div>
  </div>;
}

class ModList extends React.Component {
  render() {
    const modList = GetValidModsAndWeightsForItem(this.props.itemState, this.props.context, "rare").sort((a, b) => { return ModIdComparer(a.modId, b.modId, this.props.context) });
    return <div className="modList">
      <div className="modGroup">
        {
          modList.map((x) => {
            const modData = this.props.context.mods[x.modId];
            const modWeight = x.weight;
            const modName = TranslationHelper.TranslateMod(stat_translations, modData);
            const modTierInfo = GetTierForMod(this.props.itemState, x.modId, this.props.context);
            return <ModListLine tierString={modData["generation_type"].slice(0, 1) + (modTierInfo[0] + 1)} nameLines={modName} weight={modWeight} prob="1.25%" key={x.modId} />
          })
        }
      </div>
    </div>
  }
}


function CanBaseItemHaveRarity(baseItemId, rarity) {
  const baseItem = base_items[baseItemId];
  if (baseItem["domain"] === "flask") {
    return rarity !== "rare";
  }
  return true;
}

function GetSpawnWeightForMod(modId, tags, context) {
  const mod = context.mods[modId];
  for (const spawnWeight of mod["spawn_weights"]) {
    if (tags.includes(spawnWeight["tag"])) {
      return spawnWeight["weight"];
    }
  }
  return 0;
}

function GetPrefixCount(itemState, context) {
  let existingAffixCount = 0;
  for (let i = 0; i < itemState.affixes.length; ++i) {
    const affix = context.mods[itemState.affixes[i].id];
    if (affix["generation_type"] === "prefix") {
      existingAffixCount++;
    }
  }
  return existingAffixCount;
}

function GetSuffixCount(itemState, context) {
  let existingAffixCount = 0;
  for (let i = 0; i < itemState.affixes.length; ++i) {
    const affix = context.mods[itemState.affixes[i].id];
    if (affix["generation_type"] === "suffix") {
      existingAffixCount++;
    }
  }
  return existingAffixCount;
}

function GetAffixCount(itemState, context) {
  return GetPrefixCount(itemState, context) + GetSuffixCount(itemState, context);
}

function GetPrefixLimitForRarity(baseItemId, rarity) {
  if (rarity === "normal") {
    return 0;
  }
  if (rarity === "magic") {
    return 1;
  }
  if (rarity === "rare" || rarity === "unique") {
    const baseItem = base_items[baseItemId];
    if (baseItem["domain"] === "misc" || baseItem["domain"] === "abyss_jewel") {
      return 2;
    }
    return 3;
  }
  return 0;
}

function GetSuffixLimitForRarity(baseItemId, rarity) {
  return GetPrefixLimitForRarity(baseItemId, rarity);
}

function GetAffixLimitForRarity(baseItemId, rarity) {
  return GetPrefixLimitForRarity(baseItemId, rarity) + GetSuffixLimitForRarity(baseItemId, rarity);
}

function GetPrefixLimit(itemState) {
  return GetPrefixLimitForRarity(itemState.baseItemId, itemState.rarity);
}

function GetSuffixLimit(itemState) {
  return GetSuffixLimitForRarity(itemState.baseItemId, itemState.rarity);
}

function GetAffixLimit(itemState) {
  return GetAffixLimitForRarity(itemState.baseItemId, itemState.rarity); 
}

function CanModBeAddedToItem(modId, itemState, context, hasPrefixSlots, hasSuffixSlots, existingModGroups) {
  const mod = context.mods[modId];

  /*
  const baseItem = base_items[itemState.baseItemId];
  if (mod["domain"] !== baseItem["domain"]) {
    return false;
  }
  */

  if (mod["required_level"] > itemState.level) {
    return false;
  }

  if ((mod["generation_type"] === "prefix")) {
    if(!hasPrefixSlots) {
      return false;
    }
  }
  else if (mod["generation_type"] === "suffix") {
    if (!hasSuffixSlots) {
      return false;
    }
  }
  else {
    return false;
  }

  const modGroup = mod["group"];
  if (modGroup && modGroup !== "") {
    if (existingModGroups.has(modGroup)) {
      return false;
    }
  }
  return true;
}

function GetValidModsAndWeightsForItem(itemState, context, rarityOverride = "") {
  const tags = GetItemTags(itemState, context);
  let validMods = [];
  const rarity = rarityOverride !== "" ? rarityOverride : itemState.rarity;
  const hasPrefixSlots = GetPrefixLimitForRarity(itemState.baseItemId, rarity) > GetPrefixCount(itemState, context);
  const hasSuffixSlots = GetSuffixLimitForRarity(itemState.baseItemId, rarity) > GetSuffixCount(itemState, context);
  let existingModGroups = new Set();
  for (const affix of itemState.affixes) {
    const existingMod = context.mods[affix.id];
    existingModGroups.add(existingMod["group"]);
  }

  const modIds = context.modLookupTables.getDomainTable(base_items[itemState.baseItemId]["domain"]);
  for (const modId of modIds) {
    if (!CanModBeAddedToItem(modId, itemState, context, hasPrefixSlots, hasSuffixSlots, existingModGroups)) {
      continue;
    }
    
    const spawnWeight = GetSpawnWeightForMod(modId, tags, context);
    if (spawnWeight <= 0) {
      continue;
    }

    validMods.push({modId: modId, weight: spawnWeight});
  }
  return validMods;
}

function GetValidModsAndWeightsForItemWithPositiveWeightTag(itemState, tag, context) {
  const tags = GetItemTags(itemState, context);
  let validMods = [];
  const hasPrefixSlots = GetPrefixLimitForRarity(itemState.baseItemId, itemState.rarity) > GetPrefixCount(itemState, context);
  const hasSuffixSlots = GetSuffixLimitForRarity(itemState.baseItemId, itemState.rarity) > GetSuffixCount(itemState, context);
  let existingModGroups = new Set();
  for (const affix of itemState.affixes) {
    const existingMod = context.mods[affix.id];
    existingModGroups.add(existingMod["group"]);
  }

  for (const modId in context.mods) {
    const mod = context.mods[modId];
    if (!(mod["spawn_weights"].find(x => x["tag"] === tag && x["weight"] > 0))) {
      continue;
    }

    if (!CanModBeAddedToItem(modId, itemState, context, hasPrefixSlots, hasSuffixSlots, existingModGroups)) {
      continue;
    }

    const spawnWeight = GetSpawnWeightForMod(modId, tags, context);
    if (spawnWeight <= 0) {
      continue;
    }

    validMods.push({modId: modId, weight: spawnWeight});
  }
  return validMods;
}

function CreateWeightedModPool(modsAndWeights) {
  let modPool = {
    totalWeight : 0,
    mods : []
  }

  for (const modAndWeight of modsAndWeights) {
    let modWeight = modAndWeight.weight;
    modPool.mods.push({
      id : modAndWeight.modId,
      weight : modWeight
    });
    modPool.totalWeight += modWeight;
  }

  return modPool;
}

function PickModFromWeightedModPool(modPool, context) {
  const randRoll = randRange(context.rng, 0, modPool.totalWeight - 1);
  let weightAccum = 0;

  for (const mod of modPool.mods) {
    const modEndWeight = weightAccum + mod.weight;
    if (randRoll < modEndWeight) {
      return mod.id;
    }
    weightAccum = modEndWeight;
  }

  return null;
}

function GetInfluenceTag(baseItemId, influence) {
  const baseItem = base_items[baseItemId];
  const baseItemClass = baseItem["item_class"];
  if (baseItemClass in item_classes) {
    const influenceTagId = influence + "_tag";
    if (influenceTagId in item_classes[baseItemClass]) {
      const influenceTag = item_classes[baseItemClass][influenceTagId];
      if (influenceTag) {
        return influenceTag;
      }
    }
  }
  return null;
}

function GetAddedTags(modId, context) {
  return context.mods[modId]["adds_tags"];
}

function GetBaseItemTags (itemState, context) {
  const baseItem = base_items[itemState.baseItemId];
  let tags = [];
  tags = tags.concat(baseItem["tags"]);
  for (const influence of itemState.influences) {
    const influenceTag = GetInfluenceTag(itemState.baseItemId, influence);
    if (influenceTag) {
      tags.push(influenceTag);
    }
  }
  for (const implicit of itemState.implicits) {
    tags = tags.concat(GetAddedTags(implicit.id, context));
  }
  return tags;
}

function GetItemTags(itemState, context) {
  let tags = GetBaseItemTags(itemState, context);
  for (const affix of itemState.affixes) {
    tags = tags.concat(GetAddedTags(affix.id, context));
  }
  return tags;
}

function RollModValues(modId, context) {
  let statRolls = [];
  const mod = context.mods[modId];
  for (const stat of mod["stats"]) {
    statRolls.push(randRange(context.rng, stat["min"], stat["max"]));
  }
  return statRolls;
}

function GetTierForMod(itemState, modId, context) {
  const mod = context.mods[modId];
  if (mod["is_essence_only"]) {
    return [0, 1]
  }

  if (mod["generation_type"] === "unique") {
    return [0, 1]
  }

  let modTier = 0;
  let modCount = 1;
  let modCountAtItemLevel = 1;
  const modLevel = mod["required_level"];
  const baseItemTags = GetBaseItemTags(itemState, context);
  const otherModIds = context.modLookupTables.getGroupedTable(mod["domain"], mod["group"], mod["type"]);
  for (const otherModId of otherModIds) {
    if (otherModId === modId) {
      continue;
    }
    const otherMod = context.mods[otherModId];
    if (otherMod["is_essence_only"]) {
      continue;
    }
    if (GetSpawnWeightForMod(otherModId, baseItemTags, context) <= 0) {
      continue;
    }

    modCount++;

    if (otherMod["required_level"] <= itemState.level) {
      modCountAtItemLevel++;
    }

    if (otherMod["required_level"] > modLevel) {
      modTier++;
    }
  }

  return [modTier, modCount, modCountAtItemLevel];
}

function CreateRolledMod(itemState, modId, context) {
  const tierValues = GetTierForMod(itemState, modId, context);
  return {
    id : modId,
    values : RollModValues(modId, context),
    tier : tierValues[0],
    tierCount : tierValues[1],
    tierCountAtItemLevel : tierValues[2]
  }  
}

function RollRareName(itemState, rng) {
  const itemData = base_items[itemState.baseItemId];
  return RareItemNames.GenerateRareName(itemData, rng);
}

function RollRareAffixCount(baseItemId, rng) {
  const maxAffixCount = GetAffixLimitForRarity(baseItemId, "rare");
  if (maxAffixCount === 6) {
    // Number of mods from data mined note (source: POE Discord, #3rd-party-tool-dev)
    // "1/12 chance for 6 mods, 4/12 chance for 5 mods, and 7/12 chance for 6 mods"
    const randInt = randRange(rng, 0, 11);
    if (randInt < 7) {
      return 4;
    }
    if (randInt < 11) {
      return 5;
    }
    return 6;
  }
  else if (maxAffixCount === 4) {
    // Number of mods from data mined note (source: reddit, https://www.reddit.com/r/pathofexile/comments/8fxnlu/chance_of_getting_specific_number_of_mods_via/)
    // "for jewels: 65/35"
    const randInt = randRange(rng, 0, 99);
    if (randInt < 65) {
      return 3;
    }
    return 4;
  }
  else if (maxAffixCount > 0) {
    // Unexpected situation, roll pure random
    return randRange(rng, 1, maxAffixCount);
  }
  return 0;
}

function cloneMods(modArray) {
  let newArray = Array(modArray.length);
  for (const oldModIdx in modArray) {
    newArray[oldModIdx] = { ...modArray[oldModIdx], values : [ ...modArray[oldModIdx].values ]};
  }
  return newArray;
}

function cloneItemState(itemState) {
  return { 
    ...itemState, 
    influences : itemState.influences.slice(),
    implicits : cloneMods(itemState.implicits), 
    corruptions : cloneMods(itemState.corruptions), 
    affixes : cloneMods(itemState.affixes) 
  };
}

function CreateItem(baseItemId, level, context) {
  let itemState = {
    generatedName : "",
    baseItemId : baseItemId,
    level : level,
    rarity : "normal",
    corrupted : false,
    quality : 0,
    influences : [],
    implicits : [],
    corruptions : [],
    affixes : []
  }  

  // Add and roll implicits
  const baseItem = base_items[baseItemId];
  for (const implicitId of baseItem["implicits"]) {
    itemState.implicits.push(CreateRolledMod(itemState, implicitId, context));
  }

  return itemState;
}

function AddRandomModFromListAndWeights(itemState, modsAndWeights, context) {
  let newItemState = cloneItemState(itemState);
  const weightedModPool = CreateWeightedModPool(modsAndWeights, context);
  const modId = PickModFromWeightedModPool(weightedModPool, context);
  if (!modId) {
    return [false, itemState];
  }
  newItemState.affixes.push(CreateRolledMod(itemState, modId, context));
  return [true, newItemState];  
}

function AddRandomMod(itemState, context) {
  let newItemState = cloneItemState(itemState);
  const modsAndWeights = GetValidModsAndWeightsForItem(newItemState, context);
  return AddRandomModFromListAndWeights(itemState, modsAndWeights, context);
}

const generationTypeOrder = {
  "unique": 0,
  "prefix": 1,
  "suffix": 2,
};

function ModIdComparer (a, b, context) {
  const modA = context.mods[a];
  const modB = context.mods[b];

  const modAGenerationType = modA["generation_type"];
  const modBGenerationType = modB["generation_type"];
  if (modAGenerationType !== modBGenerationType) {
    if (modAGenerationType in generationTypeOrder && modBGenerationType in generationTypeOrder) {
      return generationTypeOrder[modAGenerationType] - generationTypeOrder[modBGenerationType];
    }
    return 0;
  }

  const modAFirstStatIdx = context.modLookupTables.getFirstStatLine(a);
  const modBFirstStartIdx = context.modLookupTables.getFirstStatLine(b);
  if (modAFirstStatIdx !== modBFirstStartIdx) {
    return (modAFirstStatIdx - modBFirstStartIdx);
  }

  const modARequiredLevel = modA["required_level"];
  const modBRequiredLevel = modB["required_level"];
  if (modARequiredLevel !== modBRequiredLevel) {
    return -(modARequiredLevel - modBRequiredLevel);
  }

  return 0;  
}

function ModComparer (a, b, context) {
  return ModIdComparer(a.id, b.id, context);
}

function SortMods(modList, context) {
  let sortedList = cloneMods(modList);
  sortedList.sort((a, b) => { return ModComparer(a, b, context) });
  return sortedList;
}

function CanAddInfluenceToItem(itemState, influence) {
  return GetInfluenceTag(itemState.baseItemId, influence) != null;
}

function AddInfluenceToItem(itemState, influence) {
  if (!CanAddInfluenceToItem(itemState, influence)) {
    return [false, itemState];
  }

  let newState = cloneItemState(itemState);
  newState.influences.push(influence);
  return [true, newState];
}

// eslint-disable-next-line no-unused-vars
function CanScourItem(itemState, context) {
  if (itemState.rarity === "normal") {
    return false;
  }
  if (itemState.rarity === "unique") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }

  return true;
}

function ScourItem(itemState, context) {
  if (!CanScourItem(itemState, context)) {
    return [false, itemState];
  }
  return [true, { ...cloneItemState(itemState), generatedName : "", rarity : "normal", affixes : [] }];
}

// eslint-disable-next-line no-unused-vars
function CanTransmutationItem(itemState, context) {
  if (itemState.rarity !== "normal") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (!CanBaseItemHaveRarity(itemState.baseItemId, "magic")) {
    return false;
  }

  return true;
}

function TransmutationItem(itemState, context) {
  if (!CanTransmutationItem(itemState, context)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), rarity : "magic" };
  const numMods = randRange(context.rng, 1, 2);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, context)[1];
  }

  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanAlterationItem(itemState, context) {
  if (itemState.rarity !== "magic") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }

  return true;
}

function AlterationItem(itemState, context) {
  if (!CanAlterationItem(itemState, context)) {
    return [0, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), affixes : [] };
  const numMods = randRange(context.rng, 1, 2);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, context)[1];
  }

  return [true, newItemState];
}

function CanAugmentationItem(itemState, context) {
  if (itemState.rarity !== "magic") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState, context) >= GetAffixLimit(itemState)) {
    return false;
  }

  return true;
}

function AugmentationItem(itemState, context) {
  if (!CanAugmentationItem(itemState, context)) {
    return [false, itemState];
  }

  const [result, newItemState] = AddRandomMod(itemState, context);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanRegalItem(itemState, context) {
  if (itemState.rarity !== "magic") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (!CanBaseItemHaveRarity(itemState.baseItemId, "rare")) {
    return false;
  }

  return true;
}

function RegalItem(itemState, context) {
  if (!CanRegalItem(itemState, context)) {
    return [false, itemState];
  }

  let rareItemState = { ...cloneItemState(itemState), rarity : "rare", generatedName : RollRareName(itemState, context.rng) };
  const [result, newItemState] = AddRandomMod(rareItemState, context);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanAlchemyItem(itemState, context) {
  if (itemState.rarity !== "normal") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (!CanBaseItemHaveRarity(itemState.baseItemId, "rare")) {
    return false;
  }

  return true;
}

function AlchemyItem(itemState, context) {
  if (!CanAlchemyItem(itemState, context)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), rarity : "rare", generatedName : RollRareName(itemState, context.rng) };
  const numMods = RollRareAffixCount(itemState.baseItemId, context.rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, context)[1];
  }
  newItemState.generatedName = RollRareName(itemState, context.rng);

  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanChaosItem(itemState, context) {
  if (itemState.rarity !== "rare") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }

  return true;
}

function ChaosItem(itemState, context) {
  if (!CanChaosItem(itemState, context)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), affixes : [], generatedName : RollRareName(itemState, context.rng)  };
  const numMods = RollRareAffixCount(itemState.baseItemId, context.rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, context)[1];
  }

  return [true, newItemState];
}

function CanExaltedItem(itemState, context) {
  if (itemState.rarity !== "rare") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState, context) >= GetAffixLimit(itemState)) {
    return false;
  }
  
  return true;
}

function ExaltedItem(itemState, context) {
  if (!CanExaltedItem(itemState, context)) {
    return [false, itemState];
  }

  const [result, newItemState] = AddRandomMod(itemState, context);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

function CanExaltedWithInfluenceItem(itemState, context, influence) {
  if (itemState.influences.length > 0) {
    return false;
  }
  if (!CanExaltedItem(itemState, context)) {
    return false;
  }
  if (!CanAddInfluenceToItem(itemState, influence)) {
    return false;
  }

  let [ , newItemState] = AddInfluenceToItem(itemState, influence);
  const influenceTag = GetInfluenceTag(newItemState.baseItemId, influence);
  const validMods = GetValidModsAndWeightsForItemWithPositiveWeightTag(newItemState, influenceTag, context);
  if (validMods.length === 0) {
    return false;
  }

  return true;
}

function ExaltedWithInfluenceItem(itemState, context, influence) {
  if (!CanExaltedWithInfluenceItem(itemState, context, influence)) {
    return false;
  }

  let [ , newItemState] = AddInfluenceToItem(itemState, influence);
  const influenceTag = GetInfluenceTag(newItemState.baseItemId, influence);
  const validMods = GetValidModsAndWeightsForItemWithPositiveWeightTag(newItemState, influenceTag, context);
  return AddRandomModFromListAndWeights(newItemState, validMods, context);
}

function CanAnnulmentItem(itemState, context) {
  if (itemState.rarity === "normal" || itemState.rarity === "unique") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState, context) === 0) {
    return false;
  }

  return true;
}

function AnnulmentItem(itemState, context) {
  if (!CanAnnulmentItem(itemState, context)) {
    return [false, itemState];
  }

  let newItemState = cloneItemState(itemState);
  const numAffixes = GetAffixCount(newItemState, context);
  const affixIdxToRemove = randRange(context.rng, 0, numAffixes - 1);
  newItemState.affixes.splice(affixIdxToRemove, 1);
  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanBlessedItem(itemState, context) {
  if (itemState.corrupted) {
    return false;
  }
  if (itemState.implicits.length === 0) {
    return false;
  }

  return true;
}

function BlessedItem(itemState, context) {
  if (!CanBlessedItem(itemState, context)) {
    return false;
  }

  let newItemState = cloneItemState(itemState);
  for (let implicit of newItemState.implicits) {
    implicit.values = RollModValues(implicit.id, context);
  }
  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanDivineItem(itemState, context) {
  if (itemState.corrupted) {
    return false;
  }
  if (itemState.affixes.length === 0) {
    return false;
  }

  return true;
}

function DivineItem(itemState, context) {
  if (!CanDivineItem(itemState, context)) {
    return false;
  }

  let newItemState = cloneItemState(itemState);
  for (let affix of newItemState.affixes) {
    affix.values = RollModValues(affix.id, context);
  }
  return [true, newItemState];
}

function CraftingButton(props) {
  return <button className="button" onClick={props.onClick} disabled={!props.enabled}>{props.label}</button>;
}

class TheoryCrafterContext {
  constructor(modDatabase, rng) {
    this.mods = modDatabase;
    this.modLookupTables = ModGroups.ParseModGroups(modDatabase, stats);
    this.rng = rng;
  }
}

class TheoryCrafter extends React.Component {
  constructor(props) {
    super(props);

    this.testMap = {
      "scour" : CanScourItem,
      "transmute" : CanTransmutationItem,
      "alt" : CanAlterationItem,
      "aug" : CanAugmentationItem,
      "regal" : CanRegalItem,
      "alch" : CanAlchemyItem,
      "chaos" : CanChaosItem,
      "exalt" : CanExaltedItem,
      "exalt_crusader" : (itemState, context) => CanExaltedWithInfluenceItem(itemState, context, "crusader"),
      "exalt_hunter" : (itemState, context) => CanExaltedWithInfluenceItem(itemState, context, "hunter"),
      "exalt_redeemer" : (itemState, context) => CanExaltedWithInfluenceItem(itemState, context, "redeemer"),
      "exalt_warlord" : (itemState, context) => CanExaltedWithInfluenceItem(itemState, context, "warlord"),
      "annul" : CanAnnulmentItem,
      "bless" : CanBlessedItem,
      "divine" : CanDivineItem,
    }

    this.actionMap = {
      "scour" : ScourItem,
      "transmute" : TransmutationItem,
      "alt" : AlterationItem,
      "aug" : AugmentationItem,
      "regal" : RegalItem,
      "alch" : AlchemyItem,
      "chaos" : ChaosItem,
      "exalt" : ExaltedItem,
      "exalt_crusader" : (itemState, context) => ExaltedWithInfluenceItem(itemState, context, "crusader"),
      "exalt_hunter" : (itemState, context) => ExaltedWithInfluenceItem(itemState, context, "hunter"),
      "exalt_redeemer" : (itemState, context) => ExaltedWithInfluenceItem(itemState, context, "redeemer"),
      "exalt_warlord" : (itemState, context) => ExaltedWithInfluenceItem(itemState, context, "warlord"),
      "annul" : AnnulmentItem,
      "bless" : BlessedItem,
      "divine" : DivineItem,
    }

    this.theoryCrafterContext = new TheoryCrafterContext(_mods, seedrandom());

    const normalItemState = CreateItem("Metadata/Items/Armours/Boots/BootsAtlas1", 100, this.theoryCrafterContext);
    this.state = this.initState(normalItemState);
  }

  initState(initItemState) {
    return {
      itemStateHistory : [ { itemState: initItemState, action : "" } ],
      itemStateHistoryIdx : 0,
      lastCommand : "",
      selectedBaseId : initItemState.baseItemId,
      selectedBaseLevel : initItemState.level,
      sortMods : false
    };
  }

  pushState(newState, actionName) {
    return { ...this.state, itemStateHistory : [ ...this.state.itemStateHistory, { itemState: newState, action : actionName } ] };
  }

  getState() {
    return this.state.itemStateHistory[this.state.itemStateHistoryIdx].itemState;
  }

  canUndoState() {
    return this.state.itemStateHistoryIdx > 0;
  }

  getUndoLabel() {
    if (!this.canUndoState()) {
      return "Undo";
    }
    return "Undo " + this.state.itemStateHistory[this.state.itemStateHistoryIdx].action;
  }

  undoState() {
    if (this.state.itemStateHistoryIdx > 0)
    {
      this.setState({ ...this.state, itemStateHistoryIdx :  this.state.itemStateHistoryIdx - 1 });
    }
  }

  canRerollAction() {
    return (this.state.itemStateHistory[this.state.itemStateHistoryIdx].action !== "") 
      && (this.state.itemStateHistoryIdx > 0);
  }

  getRerollLabel() {
    if (!this.canRerollAction()) {
      return "Reroll Action";
    }
    return "Reroll " + this.state.itemStateHistory[this.state.itemStateHistoryIdx].action;
  }

  rerollAction() {
    if (!this.canRerollAction()) {
      return;
    }
    const action = this.state.itemStateHistory[this.state.itemStateHistoryIdx].action;
    const previousItemState = this.state.itemStateHistory[this.state.itemStateHistoryIdx - 1].itemState;
    const canPerformAction = this.testMap[action](previousItemState, this.theoryCrafterContext);
    if (!canPerformAction) {
      return;
    }
    const result = this.actionMap[action](previousItemState, this.theoryCrafterContext);
    if (result[0]) {
      this.setState(this.insertAndCutStateAt(result[1], action, this.state.itemStateHistoryIdx));
    }
  }

  canRedoState() {
    return this.state.itemStateHistoryIdx < this.state.itemStateHistory.length - 1;
  }

  getRedoLabel() {
    if (!this.canRedoState()) {
      return "Redo";
    }
    return "Redo " + this.state.itemStateHistory[this.state.itemStateHistoryIdx + 1].action;
  }

  redoState() {
    if (this.state.itemStateHistoryIdx < this.state.itemStateHistory.length - 1)
    {
      this.setState({ ...this.state, itemStateHistoryIdx :  this.state.itemStateHistoryIdx + 1 });
    }
  }

  insertAndCutStateAt(newState, actionName, index) {
    const newStateHistory = this.state.itemStateHistory.slice(0, index);
    newStateHistory.push( { itemState: newState, action : actionName } );
    return { ...this.state, itemStateHistory : newStateHistory, itemStateHistoryIdx : index };    
  }

  insertAndCutState(newState, actionName) {
    return this.insertAndCutStateAt(newState, actionName, this.state.itemStateHistoryIdx + 1);
  }

  canPerformAction(actionName) {
    return this.testMap[actionName](this.getState(), this.theoryCrafterContext);
  }

  performAction(actionName) {
    const result = this.actionMap[actionName](this.getState(), this.theoryCrafterContext);
    if (result[0]) {
      this.setState(this.insertAndCutState(result[1], actionName));
    }
  }

  handleSelectedBaseChanged(e) {
    this.setState({ ...this.state, selectedBaseId : e.target.value });
  }

  RenderBaseSelectList() {
    const baseItems = {}
    for (const baseItemId in base_items) {
      if (base_items[baseItemId]["release_state"] === "released") {
        const domain = base_items[baseItemId]["domain"];
        if (domain === "item" || domain === "flask") {
          baseItems[baseItemId] = baseItemId.slice(baseItemId.lastIndexOf('/') + 1);
        }
      }
    }
    return <select value={this.state.selectedBaseId} onChange={(x) => this.handleSelectedBaseChanged(x)} key="baseItemSelector">
      { Object.keys(baseItems).map( (k) => <option value={k} key={k}>{baseItems[k]}</option> ) }
    </select>;
  }

  handleSelectedBaseLevelChanged(e) {
    this.setState({ ...this.state, selectedBaseLevel : e.target.value });
  }

  RenderBaseSelectLevel() {
    return <input value={this.state.selectedBaseLevel} onChange={(x) => this.handleSelectedBaseLevelChanged(x)} key="baseItemLevelInput"/>;
  }

  handleBaseSelectButtonClicked() {
    const normalItemState = CreateItem(this.state.selectedBaseId, this.state.selectedBaseLevel, this.theoryCrafterContext);
    this.setState({ ...this.initState(normalItemState), sortMods: this.state.sortMods });
  }

  RenderBaseSelectButton() {
    return <button onClick={() => this.handleBaseSelectButtonClicked()} key="baseItemCreateButton">Create New Item</button>;
  }

  RenderCraftingButton(actionName, label) {
    return <CraftingButton onClick={ () => this.performAction(actionName) } enabled={ this.canPerformAction(actionName) } label={label} key={actionName} />
  }

  handleSortModsToggled(e) {
    this.setState( {...this.state, sortMods : e.target.checked} );
  }

  rollTest() {
    let itemState = cloneItemState(this.getState());
    for (let i = 0; i < 100; ++i) {
      itemState = ScourItem(itemState, this.theoryCrafterContext)[1];
      itemState = TransmutationItem(itemState, this.theoryCrafterContext)[1];
    }
    this.setState(this.insertAndCutState(itemState, "scour"));
  }

  render() {
    return [
        <div key="baseSelection">
          { [
            this.RenderBaseSelectList(),
            this.RenderBaseSelectLevel(),
            this.RenderBaseSelectButton(),
          ] }
        </div>,
        <div key="craftingButtons">
          { [
            this.RenderCraftingButton("scour", "Scour"),
            this.RenderCraftingButton("transmute", "Transmutation"),
            this.RenderCraftingButton("aug", "Augmentation"),
            this.RenderCraftingButton("alt", "Alteration"),
            this.RenderCraftingButton("regal", "Regal"),
            this.RenderCraftingButton("alch", "Alchemy"),
            this.RenderCraftingButton("chaos", "Chaos"),
            this.RenderCraftingButton("exalt", "Exalted"),
            this.RenderCraftingButton("exalt_crusader", "Crusader Exalt"),
            this.RenderCraftingButton("exalt_hunter", "Hunter Exalt"),
            this.RenderCraftingButton("exalt_redeemer", "Redeemer Exalt"),
            this.RenderCraftingButton("exalt_warlord", "Warlord Exalt"),
            this.RenderCraftingButton("annul", "Annulment"),
            this.RenderCraftingButton("bless", "Blessed"),
            this.RenderCraftingButton("divine", "Divine")
          ] }
        </div>,
        <div key="undoDiv"><CraftingButton onClick={ () => this.undoState() } enabled={ this.canUndoState() } label={ this.getUndoLabel() } key="undo" /></div>,
        <div key="redoDiv"><CraftingButton onClick={ () => this.redoState() } enabled={ this.canRedoState() } label={ this.getRedoLabel() } key="redo" /></div>,
        <div key="rerollDiv"><CraftingButton onClick={ () => this.rerollAction() } enabled={ this.canRerollAction() } label={ this.getRerollLabel() } key="undo" /></div>,
        <div key="rollTest"><CraftingButton onClick={ () => this.rollTest() } enabled={ true } label="Roll 100000" /></div>,
        <div key="sortMods"><input type="checkbox" onChange={(e) => this.handleSortModsToggled(e)} checked={this.state.sortMods} /><span style={{color: 'white'}}>Sort Mods</span></div>,
        <CraftedItem itemState={ this.state.itemStateHistory[this.state.itemStateHistoryIdx].itemState } context={this.theoryCrafterContext} sortMods={this.state.sortMods} key="craftedItem" />,
        <ModList itemState={ this.state.itemStateHistory[this.state.itemStateHistoryIdx].itemState } context={this.theoryCrafterContext} key="modList" />,
    ]
  }
}

function App() {
  return <TheoryCrafter />
}

export default App;
