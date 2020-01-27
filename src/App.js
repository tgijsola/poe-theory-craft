import React from 'react';
import './App.css';
import TranslationHelper from './Translation.js';
import seedrandom from 'seedrandom';

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
  getItemTypeName = function() {
    return base_items[this.props.itemState.baseItemId]["name"];
  }

  getTipLine = function(modInstance, context) {
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

  getStatLines = function(modInstance) {
    const mod = mods[modInstance.id];
    const values = modInstance.values;
    const translationStrings = TranslationHelper.TranslateMod(stat_translations, mod, values);    
    return translationStrings.map((x, i) => <PropertyLine line={x} key={modInstance.id + "_mod_" + i}/>);
  }

  getImplicitLine = function(modInstance) {
    return [this.getTipLine(modInstance, "implicit"), this.getStatLines(modInstance)];
  }

  getImplicitLines = function() {
    return this.props.itemState.implicits.map(x => this.getImplicitLine(x));
  }

  getAffixLine = function(modInstance) {
    return [this.getTipLine(modInstance, mods[modInstance.id]["generation_type"]), this.getStatLines(modInstance)];
  }

  getAffixLines = function() {
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

function GetInfluenceTags(baseItemId, influence) {
  const baseItem = base_items[baseItemId];
  const baseItemClass = baseItem["item_class"];
  if (item_classes.includes(baseItemClass)) {
    const influenceTagId = influence + "_tag";
    if (item_classes[baseItemClass].includes(influenceTagId)) {
      const influenceTag = item_classes[baseItemClass][influenceTagId];
      if (influenceTag) {
        return [influenceTag];
      }
    }
  }
  return [];
}

function GetAddedTags(modId) {
  return mods[modId]["adds_tags"];
}

function GetBaseItemTags (itemState) {
  const baseItem = base_items[itemState.baseItemId];
  let tags = [];
  tags = tags.concat(baseItem["tags"]);
  for (const influence of itemState.influences) {
    tags = tags.concat(GetInfluenceTags(itemState.baseItemId, influence));
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

function AddRandomMod(itemState, rng) {
  let newItemState = { ...itemState };
  const validMods = GetValidModsForItem(newItemState);
  const itemTags = GetItemTags(newItemState);
  const weightedModPool = CreateWeightedModPool(validMods, itemTags);
  const modId = PickModFromWeightedModPool(weightedModPool, rng);
  if (!modId) {
    return [false, itemState];
  }
  newItemState.affixes.push(CreateRolledMod(modId, rng));
  return [true, newItemState];
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

function ScourItem(itemState, rng) {
  if (!CanScourItem(itemState)) {
    return [false, itemState];
  }
  return [true, { ...itemState, rarity : "normal", affixes : [] }];
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

  let newItemState = { ...itemState, rarity : "magic" };
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

  let newItemState = { ...itemState, affixes : [] };
  const numMods = randRange(rng, 1, 2);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanAugmentationItem(itemState) {
  if (itemState.rarity != "magic") {
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
  if (itemState.rarity != "magic") {
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

  let rareItemState = { ...itemState, rarity : "rare" };
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

  let newItemState = { ...itemState, rarity : "rare" };
  const numMods = RollRareAffixCount(itemState.baseItemId, rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanChaosItem(itemState) {
  if (itemState.rarity != "rare") {
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

  let newItemState = { ...itemState, affixes : [] };
  const numMods = RollRareAffixCount(itemState.baseItemId, rng);
  for (let i = 0; i < numMods; ++i) {
    newItemState = AddRandomMod(newItemState, rng)[1];
  }

  return [true, newItemState];
}

function CanExaltedItem(itemState) {
  if (itemState.rarity != "rare") {
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

function CraftingButton(props) {
  return <button className="button" onClick={props.onClick} disabled={!props.enabled}>{props.label}</button>;
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
    }

    this.rng = seedrandom();
    const normalItemState = CreateItem("Metadata/Items/Armours/Boots/BootsAtlas1", 100, this.rng);
    const transmuteResult = TransmutationItem(normalItemState, this.rng);
    this.state = {
      itemState : transmuteResult[0] ? transmuteResult[1] : normalItemState
    }
  }

  canPerformAction(actionName) {
    return this.testMap[actionName](this.state.itemState);
  }

  performAction(actionName) {
    const result = this.actionMap[actionName](this.state.itemState, this.rng);
    if (result[0]) {
      this.setState( {...this.state, itemState : result[1]} );
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
      <CraftedItem itemState={ this.state.itemState } />
    ]
  }
}

function App() {
  return <TheoryCrafter />
}

export default App;
