import React from 'react';
import './App.css';
import TranslationHelper from './Translation.js';
import seedrandom from 'seedrandom';
import RareItemNames from './RareItemnames.js';
import base_items from './data/base_items.json';
import item_classes from './data/item_classes.json';
import mods from './data/mods.json';
import stat_translations from './data/stat_translations.json';

function randRange(rng, minInclusive, maxInclusive) {
  return Math.floor(rng.quick() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

function TipLine (props) {
  return <div className="tipLine">{props.line}</div>
}

function PropertyLine (props) {
  return <div className="modLine">{props.line}</div>
}

function ItemNameLine (props) {
  return [props.topLine && <div className="itemName" key="itemName_top">{props.topLine}</div>, props.bottomLine && <div className="itemName" key="itemName_bottom">{props.bottomLine}</div>];
}

class CraftedItem extends React.Component {
  getItemTypeName() {
    return base_items[this.props.itemState.baseItemId]["name"];
  }

  getTipLine(modInstance, context) {
    const mod = mods[modInstance.id];
    let line = "";
    if (context === "prefix" || context === "suffix") {
      line = context[0].toUpperCase() + context.slice(1) + " Modifier \"" + mod["name"] + "\"" + (modInstance.tier > 0 ? (" (Tier: " + modInstance.tier + ")") : "");
    }
    else if (context === "unique" || context === "implicit") {
      line = context[0].toUpperCase() + context.slice(1) + " Modifier";
    }
    return <TipLine line={line} key={modInstance.id + "_tip"}/>;
  }

  getStatLines(modInstance) {
    const mod = mods[modInstance.id];
    const values = modInstance.values;
    const translationStrings = TranslationHelper.TranslateMod(stat_translations, mod, values);    
    return translationStrings.map((x, i) => <PropertyLine line={x} key={modInstance.id + "_mod_" + i}/>);
  }

  getImplicitLine(modInstance) {
    return [this.getTipLine(modInstance, "implicit"), this.getStatLines(modInstance)];
  }

  getImplicitLines() {
    return this.props.itemState.implicits.map(x => this.getImplicitLine(x));
  }

  getAffixLine(modInstance) {
    return [this.getTipLine(modInstance, mods[modInstance.id]["generation_type"]), this.getStatLines(modInstance)];
  }

  getAffixLines() {
    return this.props.itemState.affixes.map(x => this.getAffixLine(x));
  }

  render() {
    return [
      <ItemNameLine topLine={this.props.itemState.generatedName} bottomLine={this.getItemTypeName()} key="nameLine"/>, 
      <div className="separator" key="sep1">---</div>, 
      this.getImplicitLines(),
      <div className="separator" key="sep2">---</div>,
      this.getAffixLines()]
  }
}

function CanBaseItemHaveRarity(baseItemId, rarity) {
  const baseItem = base_items[baseItemId];
  if (baseItem["domain"] === "flask") {
    return rarity !== "rare";
  }
  return true;
}

function GetSpawnWeightForMod(modId, tags) {
  const mod = mods[modId];
  for (const spawnWeight of mod["spawn_weights"]) {
    if (tags.includes(spawnWeight["tag"])) {
      return spawnWeight["weight"];
    }
  }
  return 0;
}

function GetPrefixCount(itemState) {
  let existingAffixCount = 0;
  for (let i = 0; i < itemState.affixes.length; ++i) {
    const affix = mods[itemState.affixes[i].id];
    if (affix["generation_type"] === "prefix") {
      existingAffixCount++;
    }
  }
  return existingAffixCount;
}

function GetSuffixCount(itemState) {
  let existingAffixCount = 0;
  for (let i = 0; i < itemState.affixes.length; ++i) {
    const affix = mods[itemState.affixes[i].id];
    if (affix["generation_type"] === "suffix") {
      existingAffixCount++;
    }
  }
  return existingAffixCount;
}

function GetAffixCount(itemState) {
  return GetPrefixCount(itemState) + GetSuffixCount(itemState);
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

function CanModBeAddedToItem(modId, itemState) {
  const mod = mods[modId];
  const baseItem = base_items[itemState.baseItemId];
  if (mod["domain"] !== baseItem["domain"]) {
    return false;
  }
  if (mod["required_level"] > itemState.level) {
    return false;
  }
  if (mod["generation_type"] === "prefix") {
    if (GetPrefixLimit(itemState) <= GetPrefixCount(itemState)) {
      return false;
    }
  }
  else if (mod["generation_type"] === "suffix") {
    if (GetSuffixLimit(itemState) <= GetSuffixCount(itemState)) {
      return false;
    }
  }
  else {
    return false;
  }
  const modGroup = mod["group"];
  if (modGroup && modGroup !== "") {
    for (const affix of itemState.affixes) {
      const existingMod = mods[affix.id];
      if (existingMod["group"] === modGroup) {
        return false;
      }
    }
  }
  return true;
}

function GetValidModsForItem(itemState) {
  const tags = GetItemTags(itemState);
  let validMods = [];
  for (const modId in mods) {
    if (!CanModBeAddedToItem(modId, itemState)) {
      continue;
    }

    if (GetSpawnWeightForMod(modId, tags) <= 0) {
      continue;
    }

    validMods.push(modId);
  }
  return validMods;
}

function GetValidModsForItemWithPositiveWeightTag(itemState, tag) {
  const tags = GetItemTags(itemState);
  let validMods = [];
  for (const modId in mods) {
    const mod = mods[modId];
    if (!(mod["spawn_weights"].find(x => x["tag"] == tag && x["weight"] > 0))) {
      continue;
    }

    if (!CanModBeAddedToItem(modId, itemState)) {
      continue;
    }

    if (GetSpawnWeightForMod(modId, tags) <= 0) {
      continue;
    }

    validMods.push(modId);
  }
  return validMods;
}

function CreateWeightedModPool(modIds, tags) {
  let modPool = {
    totalWeight : 0,
    mods : []
  }

  for (const modId of modIds) {
    let modWeight = GetSpawnWeightForMod(modId, tags);
    modPool.mods.push({
      id : modId,
      weight : modWeight
    });
    modPool.totalWeight += modWeight;
  }

  return modPool;
}

function PickModFromWeightedModPool(modPool, rng) {
  const randRoll = randRange(rng, 0, modPool.totalWeight - 1);
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
  console.log(item_classes);
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

function GetAddedTags(modId) {
  return mods[modId]["adds_tags"];
}

function GetBaseItemTags (itemState) {
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
    tags = tags.concat(GetAddedTags(implicit.id));
  }
  return tags;
}

function GetItemTags(itemState) {
  let tags = GetBaseItemTags(itemState);
  for (const affix of itemState.affixes) {
    tags = tags.concat(GetAddedTags(affix.id));
  }
  return tags;
}

function RollModValues(modId, rng) {
  let statRolls = [];
  const mod = mods[modId];
  for (const stat of mod["stats"]) {
    statRolls.push(randRange(rng, stat["min"], stat["max"]));
  }
  return statRolls;
}

function CreateRolledMod(modId, rng) {
  return {
    id : modId,
    values : RollModValues(modId, rng),
    tier : 0
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

function CreateItem(baseItemId, level, rng) {
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
    itemState.implicits.push(CreateRolledMod(implicitId, rng));
  }

  return itemState;
}

function AddRandomModFromList(itemState, mods, rng) {
  let newItemState = cloneItemState(itemState);
  const itemTags = GetItemTags(newItemState);
  const weightedModPool = CreateWeightedModPool(mods, itemTags);
  const modId = PickModFromWeightedModPool(weightedModPool, rng);
  if (!modId) {
    return [false, itemState];
  }
  newItemState.affixes.push(CreateRolledMod(modId, rng));
  return [true, newItemState];  
}

function AddRandomMod(itemState, rng) {
  let newItemState = cloneItemState(itemState);
  const validMods = GetValidModsForItem(newItemState);
  return AddRandomModFromList(itemState, validMods, rng);
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

function CanScourItem(itemState) {
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

// eslint-disable-next-line no-unused-vars
function ScourItem(itemState, rng) {
  if (!CanScourItem(itemState)) {
    return [false, itemState];
  }
  return [true, { ...cloneItemState(itemState), generatedName : "", rarity : "normal", affixes : [] }];
}

function CanTransmutationItem(itemState) {
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

function TransmutationItem(itemState, rng) {
  if (!CanTransmutationItem(itemState)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), rarity : "magic" };
  const numMods = randRange(rng, 1, 2);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanAlterationItem(itemState) {
  if (itemState.rarity !== "magic") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }

  return true;
}

function AlterationItem(itemState, rng) {
  if (!CanAlterationItem(itemState)) {
    return [0, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), affixes : [] };
  const numMods = randRange(rng, 1, 2);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanAugmentationItem(itemState) {
  if (itemState.rarity !== "magic") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState) >= GetAffixLimit(itemState)) {
    return false;
  }

  return true;
}

function AugmentationItem(itemState, rng) {
  if (!CanAugmentationItem(itemState)) {
    return [false, itemState];
  }

  const [result, newItemState] = AddRandomMod(itemState, rng);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

function CanRegalItem(itemState) {
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

function RegalItem(itemState, rng) {
  if (!CanRegalItem(itemState)) {
    return [false, itemState];
  }

  let rareItemState = { ...cloneItemState(itemState), rarity : "rare", generatedName : RollRareName(itemState, rng) };
  const [result, newItemState] = AddRandomMod(rareItemState, rng);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

function CanAlchemyItem(itemState) {
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

function AlchemyItem(itemState, rng) {
  if (!CanAlchemyItem(itemState)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), rarity : "rare", generatedName : RollRareName(itemState, rng) };
  const numMods = RollRareAffixCount(itemState.baseItemId, rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }
  newItemState.generatedName = RollRareName(itemState, rng);

  return [true, newItemState];
}

function CanChaosItem(itemState) {
  if (itemState.rarity !== "rare") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }

  return true;
}

function ChaosItem(itemState, rng) {
  if (!CanChaosItem(itemState)) {
    return [false, itemState];
  }

  let newItemState = { ...cloneItemState(itemState), affixes : [], generatedName : RollRareName(itemState, rng)  };
  const numMods = RollRareAffixCount(itemState.baseItemId, rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanExaltedItem(itemState) {
  if (itemState.rarity !== "rare") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState) >= GetAffixLimit(itemState)) {
    return false;
  }
  
  return true;
}

function ExaltedItem(itemState, rng) {
  if (!CanExaltedItem(itemState)) {
    return [false, itemState];
  }

  const [result, newItemState] = AddRandomMod(itemState, rng);
  if (!result) {
    return [false, itemState];
  }
  return [true, newItemState];
}

function CanExaltedWithInfluenceItem(itemState, influence) {
  if (itemState.influences.length > 0) {
    return false;
  }
  if (!CanExaltedItem(itemState)) {
    return false;
  }
  if (!CanAddInfluenceToItem(itemState, influence)) {
    return false;
  }

  let [ , newItemState] = AddInfluenceToItem(itemState, influence);
  const influenceTag = GetInfluenceTag(newItemState.baseItemId, influence);
  const validMods = GetValidModsForItemWithPositiveWeightTag(newItemState, influenceTag);
  if (validMods.length == 0) {
    return false;
  }

  return true;
}

function ExaltedWithInfluenceItem(itemState, rng, influence) {
  if (!CanExaltedWithInfluenceItem(itemState, influence)) {
    return false;
  }

  let [ , newItemState] = AddInfluenceToItem(itemState, influence);
  const influenceTag = GetInfluenceTag(newItemState.baseItemId, influence);
  const validMods = GetValidModsForItemWithPositiveWeightTag(newItemState, influenceTag);
  return AddRandomModFromList(newItemState, validMods, rng);
}

function CanAnnulmentItem(itemState) {
  if (itemState.rarity == "normal" || itemState.rarity == "unique") {
    return false;
  }
  if (itemState.corrupted) {
    return false;
  }
  if (GetAffixCount(itemState) == 0) {
    return false;
  }

  return true;
}

function AnnulmentItem(itemState, rng) {
  if (!CanAnnulmentItem(itemState)) {
    return [false, itemState];
  }

  let newItemState = cloneItemState(itemState);
  const numAffixes = GetAffixCount(newItemState);
  const affixIdxToRemove = randRange(rng, 0, numAffixes - 1);
  newItemState.affixes.splice(affixIdxToRemove, 1);
  return [true, newItemState];
}

function CanBlessedItem(itemState) {
  if (itemState.corrupted) {
    return false;
  }
  if (itemState.implicits.length == 0) {
    return false;
  }

  return true;
}

function BlessedItem(itemState, rng) {
  if (!CanBlessedItem(itemState)) {
    return false;
  }

  let newItemState = cloneItemState(itemState);
  for (let implicit of newItemState.implicits) {
    implicit.values = RollModValues(implicit.id, rng);
  }
  return [true, newItemState];
}

function CanDivineItem(itemState) {
  if (itemState.corrupted) {
    return false;
  }
  if (itemState.affixes.length == 0) {
    return false;
  }

  return true;
}

function DivineItem(itemState, rng) {
  if (!CanDivineItem(itemState)) {
    return false;
  }

  let newItemState = cloneItemState(itemState);
  for (let affix of newItemState.affixes) {
    affix.values = RollModValues(affix.id, rng);
  }
  return [true, newItemState];
}

function CraftingButton(props) {
  return <button className="button" onClick={props.onClick} disabled={!props.enabled}>{props.label}</button>;
}

class TheoryCrafter extends React.Component {
  constructor(props) {
    super(props);
    this.history = [];
    this.historyIdx = 0;

    this.testMap = {
      "scour" : CanScourItem,
      "transmute" : CanTransmutationItem,
      "alt" : CanAlterationItem,
      "aug" : CanAugmentationItem,
      "regal" : CanRegalItem,
      "alch" : CanAlchemyItem,
      "chaos" : CanChaosItem,
      "exalt" : CanExaltedItem,
      "exalt_crusader" : (itemState) => CanExaltedWithInfluenceItem(itemState, "crusader"),
      "exalt_hunter" : (itemState) => CanExaltedWithInfluenceItem(itemState, "hunter"),
      "exalt_redeemer" : (itemState) => CanExaltedWithInfluenceItem(itemState, "redeemer"),
      "exalt_warlord" : (itemState) => CanExaltedWithInfluenceItem(itemState, "warlord"),
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
      "exalt_crusader" : (itemState, rng) => ExaltedWithInfluenceItem(itemState, rng, "crusader"),
      "exalt_hunter" : (itemState, rng) => ExaltedWithInfluenceItem(itemState, rng, "hunter"),
      "exalt_redeemer" : (itemState, rng) => ExaltedWithInfluenceItem(itemState, rng, "redeemer"),
      "exalt_warlord" : (itemState, rng) => ExaltedWithInfluenceItem(itemState, rng, "warlord"),
      "annul" : AnnulmentItem,
      "bless" : BlessedItem,
      "divine" : DivineItem,
    }

    this.rng = seedrandom();
    const normalItemState = CreateItem("Metadata/Items/Armours/Boots/BootsAtlas1", 100, this.rng);
    this.state = this.initState(normalItemState);
    const transmuteResult = TransmutationItem(normalItemState, this.rng);
    this.state = this.insertAndCutState(transmuteResult[1]);
  }

  initState(initItemState) {
    return {
      itemStateHistory : [ initItemState ],
      itemStateHistoryIdx : 0
    };
  }

  pushState(newState) {
    return { ...this.state, itemStateHistory : [ ...this.state.itemStateHistory, newState ] };
  }

  getState() {
    return this.state.itemStateHistory[this.state.itemStateHistoryIdx];
  }

  canUndoState() {
    return this.state.itemStateHistoryIdx > 0;
  }

  canRedoState() {
    return this.state.itemStateHistoryIdx < this.state.itemStateHistory.length - 1;
  }

  undoState() {
    if (this.state.itemStateHistoryIdx > 0)
    {
      this.setState({ ...this.state, itemStateHistoryIdx :  this.state.itemStateHistoryIdx - 1 });
    }
  }

  redoState() {
    if (this.state.itemStateHistoryIdx < this.state.itemStateHistory.length - 1)
    {
      this.setState({ ...this.state, itemStateHistoryIdx :  this.state.itemStateHistoryIdx + 1 });
    }    
  }

  insertAndCutState(newState) {
    const newStateHistory = this.state.itemStateHistory.slice(0, this.state.itemStateHistoryIdx + 1);
    newStateHistory.push(newState);
    return { ...this.state, itemStateHistory : newStateHistory, itemStateHistoryIdx : this.state.itemStateHistoryIdx + 1 };
  }

  canPerformAction(actionName) {
    return this.testMap[actionName](this.getState());
  }

  performAction(actionName) {
    const result = this.actionMap[actionName](this.getState(), this.rng);
    if (result[0]) {
      this.setState(this.insertAndCutState(result[1], this.state.itemStateHistoryIdx));
    }
  }

  RenderCraftingButton(actionName, label) {
    return <CraftingButton onClick={ () => this.performAction(actionName) } enabled={ this.canPerformAction(actionName) } label={label} key={actionName} />
  }

  render() {
    return [
//      <CraftingButton onClick={ () => this.setState(this.state) } enabled="true" label="Debug Refresh" key="Refresh" />,
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
        this.RenderCraftingButton("divine", "Divine"),
        <div key="undoDiv"><CraftingButton onClick={ () => this.undoState() } enabled={ this.canUndoState() } label="Undo" key="undo" /><CraftingButton onClick={ () => this.redoState() } enabled={ this.canRedoState() } label="Redo" key="redo" /></div>,
        <CraftedItem itemState={ this.state.itemStateHistory[this.state.itemStateHistoryIdx] } key="craftedItem" />
    ]
  }
}

function App() {
  return <TheoryCrafter />
}

export default App;
