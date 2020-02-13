import React from 'react';
import './App.css';

import TranslationHelper from './Translation.js';
import seedrandom from 'seedrandom';
import RareItemNames from './RareItemnames.js';
import ModGroups from './ModLookupTables.js';
import ItemLookupTables from './ItemLookupTables.js';
import EssenceLookupTables from './EssenceLookupTables.js';

import { FixedSizeList as List } from 'react-window';
import 'balloon-css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCaretRight, 
  faCaretDown, 
  faCog,
  faSortAmountDown,
  faUndo,
  faRedo,
  faDice,
  faFile,
  faCertificate,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';

import base_items from './data/base_items.json';
import item_classes from './data/item_classes.json';
import fossils from './data/fossils.json';
import _mods from './data/mods.json';
import mod_types from './data/mod_types.json';
import stat_translations from './data/stat_translations.json';
import stats from './data/stats.json';
import essences from './data/essences.json';

function importAll(r) {
  let images = {};
  r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); });
  return images;
}

const BenchImages = importAll(require.context('./img/bench/', false, /\.(png|jpe?g|svg)$/));

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
  let className = "modLine";
  if (props.additionalClassName) {
    className = className + " " + props.additionalClassName;
  }
  return <div className={className}>{props.line}</div>
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

function GetItemImageUrl(itemId, scale = 1, w = 0, h = 0) {
  const baseItem = base_items[itemId];
  let itemArtSubPath = baseItem.visual_identity.dds_file;
  if (!itemArtSubPath) {
    return "";
  }

  const extensionIdx = itemArtSubPath.lastIndexOf('.');
  if (extensionIdx >= 0) {
    itemArtSubPath = itemArtSubPath.slice(0, extensionIdx);
  }
  return "https://web.poecdn.com/image/" + itemArtSubPath + ".png?scale=" + scale + "&w=" + w + "&h=" + h;
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
    else if (generationType === "enchantment") {
      line = "Labyrinth Enchantment";
    }
    return <TipLine line={line} key={modInstance.id + "_tip"}/>;
  }

  getStatLines(modInstance, additionalClassName) {
    const mod = this.props.context.mods[modInstance.id];
    const values = modInstance.values;
    const translationStrings = TranslationHelper.TranslateMod(stat_translations, mod, values);    
    return translationStrings.map((x, i) => <ModLine additionalClassName={additionalClassName} line={x} key={modInstance.id + "_mod_" + i}/>);
  }

  getEnchantmentLine(modInstance) {
    const statLines = this.getStatLines(modInstance);
    if (statLines.length > 0) {
      return [this.getTipLine(modInstance, "enchantment"), this.getStatLines(modInstance, "enchantment")];
    }    
  }

  getEnchantmentBoxes() {
    let showMods = this.props.itemState.enchantments;
    if (this.props.sortMods) {
      showMods = SortMods(showMods, this.props.context);
    }
    return showMods.map(
      x => <div className="modBox enchantment" key={x.id}>{this.getEnchantmentLine(x)}</div>
    );
  }

  getImplicitLine(modInstance) {
    const statLines = this.getStatLines(modInstance);
    if (statLines.length > 0) {
      return [this.getTipLine(modInstance, "implicit"), this.getStatLines(modInstance)];
    }
  }

  getImplicitBoxes() {
    let showMods = [...this.props.itemState.baseImplicits, ...this.props.itemState.gildedImplicits];
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
    return <div className={"craftedItem " + this.props.itemState.rarity} key="craftedItem">
      <div className="content-box">
        <ItemHeader itemTypeName={this.getItemTypeName()} generatedName={this.props.itemState.generatedName} influences={this.props.itemState.influences} />
        <PropertyLine line="Item Level: {}" values={[this.props.itemState.level]} />
        { this.getGroupsWithSeparators([this.getEnchantmentBoxes(), this.getImplicitBoxes(), this.getAffixBoxes()]) }
        <img className="craftedItemImage" src={GetItemImageUrl(this.props.itemState.baseItemId, 1, 0, 0)}></img>
      </div>
    </div>
  }
}

class ModListGroupLine extends React.Component {
  // eslint-disable-next-line no-unused-vars
  shouldComponentUpdate(nextProps, nextState) {
    return this.props.collapsed !== nextProps.collapsed
      || this.props.modWeight !== nextProps.modWeight
      || this.props.prob !== nextProps.prob;
  }  
  render() {
    let spanIdx = 0;
    let nameLineElements = this.props.nameLines.map( (x) => <span key={spanIdx++}>{x}</span>);
    for (let i = 1; i < nameLineElements.length; i += 2) {
      nameLineElements.splice(i, 0, <br key={"br_" + i}/>);
    }

    let tierClass = "modTierContents";
    if (this.props.tierContents.length > 0) {
      const affixLetter = this.props.tierContents[0];
      if (affixLetter === "p") {
        tierClass = tierClass + " prefix";
      }
      else if (affixLetter === "s") {
        tierClass = tierClass + " suffix";
      }
    }

    const probClass = "modProb " + this.props.probabilityClass;
    const dropDownArrow = this.props.collapsed ? faCaretRight : faCaretDown;

    return <div className="modGroupLine" onClick={this.props.onGroupClicked}>
      <div className="modTier" key="modTier">
        <FontAwesomeIcon icon={dropDownArrow} />
      </div>
      <div className={tierClass} key="modTierContents">
        { this.props.tierContents }
      </div>
      <div className="modName" key="modName">
        { nameLineElements }
      </div>
      <div className="modWeight" key="modWeight">
        { this.props.weight }
      </div>
      <div className={probClass} key="modProb">
        { this.props.prob }
      </div>
    </div>;
  }
}

class ModListModLine extends React.Component {
  // eslint-disable-next-line no-unused-vars
  shouldComponentUpdate(nextProps, nextState) {
    return this.props.modTier !== nextProps.modTier
      || this.props.modWeight !== nextProps.modWeight
      || this.props.prob !== nextProps.prob;
  }  
  render() {
    let spanIdx = 0;
    let nameLineElements = this.props.nameLines.map( (x) => <span key={spanIdx++}>{x}</span>);
    for (let i = 1; i < nameLineElements.length; i += 2) {
      nameLineElements.splice(i, 0, <br key={"br_" + i}/>);
    }

    let tierClass = "modTier";
    if (this.props.tierString.length > 0) {
      const affixLetter = this.props.tierString[0];
      if (affixLetter === "p") {
        tierClass = tierClass + " prefix";
      }
      else if (affixLetter === "s") {
        tierClass = tierClass + " suffix";
      }
    }

    return <div className="modLine">
      <div className="modLevel" key="modLevel">
        { this.props.requiredLevel }
      </div>
      <div className={tierClass} key="modTier">
        { this.props.tierString }
      </div>
      <div className="modName" key="modName">
        { nameLineElements }
      </div>
      <div className="modWeight" key="modWeight">
        { this.props.weight }
      </div>
      <div className="modProb" key="modProb">
        { this.props.prob }
      </div>
    </div>;
  }
}

class ModGroup extends React.Component {
  renderModsInModGroup() {
    return this.props.modAndWeightGroup.map((x) => {
      const modData = this.props.context.mods[x.modId];
      const modWeight = x.weight;
      const modName = TranslationHelper.TranslateMod(stat_translations, modData);
      const modTierInfo = GetTierForMod(this.props.itemState, x.modId, this.props.context);
      return <ModListModLine lineClass="modLine" context={this.props.context} requiredLevel={modData["required_level"]} tierString={modData["generation_type"].slice(0, 1) + (modTierInfo[0] + 1)} nameLines={modName} weight={modWeight} prob={(modWeight / this.props.totalWeight).toLocaleString(undefined, {style: 'percent', minimumFractionDigits: 2})} key={x.modId} />
    });
  }

  render() {
    const groupWeight = this.props.modAndWeightGroup.reduce((total, value) => { return total + value.weight }, 0);
    const groupName = this.props.groupName;
    let minTier = 1000;
    let maxTier = 0;
    for (const modAndWeight of this.props.modAndWeightGroup) {
      const modId = modAndWeight.modId;
      const tierInfoForMod = GetTierForMod(this.props.itemState, modId, this.props.context);
      const tierForMod = tierInfoForMod[0];
      minTier = Math.min(minTier, tierForMod + 1);
      maxTier = Math.max(maxTier, tierForMod + 1);
    }
    const modData = this.props.context.mods[this.props.modAndWeightGroup[0].modId];
    const tierContentsString = (minTier === maxTier) ?
      TranslationHelper.stringformat("{0}{1}", [modData["generation_type"].slice(0, 1), minTier])
    : TranslationHelper.stringformat("{0}{1}-{0}{2}", [modData["generation_type"].slice(0, 1), minTier, maxTier]);
    const probability = groupWeight / this.props.totalWeight;
    let probabilityClass = "mid";
    if (probability < 0.02) {
      probabilityClass = "veryLow";
    }
    else if (probability < 0.05) {
      probabilityClass = "low";
    }
    else if (probability < 0.10) {
      probabilityClass = "mid";
    }
    else if (probability < 0.25) {
      probabilityClass = "midHigh";
    }
    else if (probability < 1.0) {
      probabilityClass = "high";
    }
    else {
      probabilityClass = "guaranteed";
    }
    const elementList = [<ModListGroupLine tierContents={tierContentsString} collapsed={this.props.collapsed} onGroupClicked={() => this.props.onGroupClicked(this.props.groupKey)} lineClass="modGroupLine" context={this.props.context} nameLines={groupName} weight={groupWeight} probabilityClass={probabilityClass} prob={(probability).toLocaleString(undefined, {style: 'percent', minimumFractionDigits: 2})} key={groupName} />];
    if (!this.props.collapsed) {
      elementList.push(...this.renderModsInModGroup(this.props.modAndWeightGroup, this.props.totalWeight));
    }
    let modGroupClassName = "modGroup";
    if (this.props.groupSource) {
      modGroupClassName = modGroupClassName + " " + this.props.groupSource;
    }
    return <div className={modGroupClassName} key={this.props.groupKey}>
      {
        elementList
      }
      </div>      
  }
}

class ModList extends React.Component {
  render() {

    const actionInfo = this.props.getActionInfoFunction(this.props.itemState, this.props.context, ...this.props.getActionInfoAdditionalParameters);
    const modRollGroups = GetModRollGroupsForAction(this.props.itemState, actionInfo, this.props.context);

    let modRolls = [];

    for (let modsAndWeights of modRollGroups) {
      let modGroups = [];
      modsAndWeights.sort((a, b) => { return ModIdComparer(a.modId, b.modId, this.props.context) });
      const totalWeight = modsAndWeights.reduce( (total, value) => { return total + value.weight }, 0);
      let currentGroupIdx = modGroups.length - 1;
      let currentGroupTableKey = "";
      for (let modIdx = 0; modIdx < modsAndWeights.length; ++modIdx) {
        const modId = modsAndWeights[modIdx].modId;
        const groupedTableKey = this.props.context.modLookupTables.getGroupedTableKeyForMod(modId, this.props.context.mods[modId]);
        if (groupedTableKey !== currentGroupTableKey) {
          currentGroupIdx++;
          currentGroupTableKey = groupedTableKey;
          const groupName = TranslationHelper.TranslateModForGroup(stat_translations, this.props.context.mods[modId]);
          const groupSource = this.props.context.modLookupTables.getSource(modId);
          modGroups.push({groupName: groupName, groupSource: groupSource, groupKey: modId + "|" + groupedTableKey, totalWeight: totalWeight, modsAndWeights: []});
        }
        modGroups[currentGroupIdx].modsAndWeights.push(modsAndWeights[modIdx]);
      }
      modRolls.push(modGroups);
    }

    let modRollIndex = 0;

    return <div className="modList">
      {
        modRolls.map((modRoll) => 
          <div className="modRoll" key={actionInfo.rolls[modRollIndex].label}>
            {
              [ 
                <div className="modRollLabelLine" key="modRollLabelLine"><div className="modRollLabel">{ actionInfo.rolls[modRollIndex++].label }</div></div>,
                modRoll.map((modAndWeightGroup) => 
                  <ModGroup 
                    groupSource={modAndWeightGroup.groupSource} 
                    groupName={modAndWeightGroup.groupName} 
                    onGroupClicked={this.props.onGroupClicked} 
                    modAndWeightGroup={modAndWeightGroup.modsAndWeights} 
                    groupKey={modAndWeightGroup.groupKey} 
                    totalWeight={modAndWeightGroup.totalWeight} 
                    itemState={this.props.itemState} 
                    context={this.props.context} 
                    collapsed={!this.props.expandedGroups.has(modAndWeightGroup.groupKey)} 
                    key={modAndWeightGroup.groupKey}
                  />
              )
              ]
            }
          </div>
        )
      }
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

// eslint-disable-next-line no-unused-vars
function GetPrefixLimit(itemState) {
  return GetPrefixLimitForRarity(itemState.baseItemId, itemState.rarity);
}

// eslint-disable-next-line no-unused-vars
function GetSuffixLimit(itemState) {
  return GetSuffixLimitForRarity(itemState.baseItemId, itemState.rarity);
}

function GetAffixLimit(itemState) {
  return GetAffixLimitForRarity(itemState.baseItemId, itemState.rarity); 
}

function GetValidModsAndWeightsForItem(itemState, context, extendedParameters) {
  let validMods = [];

  const tags = GetItemTags(itemState, context);

  const rarity = ("rarityOverride" in extendedParameters) ? extendedParameters.rarityOverride : itemState.rarity;
  const ignoreAffixLimits = ("ignoreAffixLimits" in extendedParameters) ? extendedParameters.ignoreAffixLimits : false;
  const ignoreAffixTypes = ("ignoreAffixTypes" in extendedParameters) ? extendedParameters.ignoreAffixTypes : false;
  const forceAffixTypes = ("forceAffixTypes" in extendedParameters) ? extendedParameters.forceAffixTypes : null;
  const requiredPositiveWeightTag = ("requiredPositiveWeightTag" in extendedParameters) ? extendedParameters.requiredPositiveWeightTag : null;
  const negativeWeightMultipliers = ("negativeWeightMultipliers" in extendedParameters) ? extendedParameters.negativeWeightMultipliers : null;
  const positiveWeightMultipliers = ("positiveWeightMultipliers" in extendedParameters) ? extendedParameters.positiveWeightMultipliers : null;
  const ignoreExistingGroups = ("ignoreExistingGroups" in extendedParameters) ? extendedParameters.ignoreExistingGroups : false;
  const ignoreSpawnWeight = ("ignoreSpawnWeight" in extendedParameters) ? extendedParameters.ignoreSpawnWeight : false;
  const ignoreRequiredLevel = ("ignoreRequiredLevel" in extendedParameters) ? extendedParameters.ignoreRequiredLevel : false;
  const addedMods = ("addedMods" in extendedParameters) ? extendedParameters.addedMods : null;
  const forcedModIds = ("forcedModIds" in extendedParameters) ? extendedParameters.forcedModIds : null;
  const itemLevelOverride = ("itemLevelOverride" in extendedParameters) ? extendedParameters.itemLevelOverride : null;

  const hasPrefixSlots = ignoreAffixLimits || (GetPrefixLimitForRarity(itemState.baseItemId, rarity) > GetPrefixCount(itemState, context));
  const hasSuffixSlots = ignoreAffixLimits || (GetSuffixLimitForRarity(itemState.baseItemId, rarity) > GetSuffixCount(itemState, context));

  let modIds = [];
  if (forcedModIds) {
    modIds = [...forcedModIds];
  }
  else {
    modIds = context.modLookupTables.getDomainTable(base_items[itemState.baseItemId]["domain"]);
    if (addedMods) {
      modIds = [...modIds, ...addedMods];
    }
  }

  let existingModGroups = new Set();
  if (!ignoreExistingGroups)
  {
    for (const affix of itemState.affixes) {
      const existingMod = context.mods[affix.id];
      existingModGroups.add(existingMod["group"]);
    }
  }

  const itemLevel = itemLevelOverride ? itemLevelOverride : itemState.level;

  for (const modId of modIds) {
    const mod = context.mods[modId];

    if (requiredPositiveWeightTag) {
      if (!(mod["spawn_weights"].find(x => x["tag"] === requiredPositiveWeightTag && x["weight"] > 0))) {
        continue;
      }
    }

    if (!ignoreRequiredLevel) {
      if (mod["required_level"] > itemLevel) {
        continue;
      }
    }

    if (!ignoreAffixTypes) {
      if (forceAffixTypes) {
        if (!forceAffixTypes.includes(mod["generation_type"])) {
          continue;
        }
      }
      else 
      {
        if ((mod["generation_type"] === "prefix")) {
          if(!hasPrefixSlots) {
            continue;
          }
        }
        else if (mod["generation_type"] === "suffix") {
          if (!hasSuffixSlots) {
            continue;
          }
        }
        else {
          continue;
        }
      }
    }
 
    if (!ignoreExistingGroups) {
      const modGroup = mod["group"];
      if (modGroup && modGroup !== "") {
        if (existingModGroups.has(modGroup)) {
          continue;
        }
      }
    }

    let spawnWeight = GetSpawnWeightForMod(modId, tags, context);
    if (!ignoreSpawnWeight && spawnWeight <= 0) {
      continue;
    }

    if (negativeWeightMultipliers) {
      const modTags = context.modLookupTables.getTags(modId);
      for (const modTag of modTags) {
        if (modTag in negativeWeightMultipliers) {
          spawnWeight = spawnWeight * negativeWeightMultipliers[modTag];
        }
      }

      if (!ignoreSpawnWeight && spawnWeight <= 0) {
        continue;
      }
    }

    if (positiveWeightMultipliers) {
      //   NOTE - It's not clear to me how the game handles multiple applicable positive weight multipliers
      //
      // For example, if you apply both Aberrant (+chaos:10x) and Serrated (+attack:10x) on the AddedChaosSuffix
      // mod (attack, chaos), is the total multiplication 10 * 10 = 100x? Or 10 + 10 = 20x?
      //
      // It's a little more conservative, but I'm going with the additive option here until proven otherwise.

      const modTags = context.modLookupTables.getTags(modId);

      // Additive method
      let totalPositiveWeightMultiplier = 0;
      for (const modTag of modTags) {
        if (modTag in positiveWeightMultipliers) {
          totalPositiveWeightMultiplier = totalPositiveWeightMultiplier + positiveWeightMultipliers[modTag];
        }
      }

      /*
      // Multiplicative method
      let totalPositiveWeightMultiplier = 1;
      for (const modTag of modTags) {
        if (modTag in positiveWeightMultipliers) {
          totalPositiveWeightMultiplier = totalPositiveWeightMultiplier * positiveWeightMultipliers[modTag];
        }
      }
      */

      if (totalPositiveWeightMultiplier > 0) {
        spawnWeight = spawnWeight * totalPositiveWeightMultiplier;
      }
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
  for (const implicit of itemState.baseImplicits) {
    tags = tags.concat(GetAddedTags(implicit.id, context));
  }
  for (const implicit of itemState.gildedImplicits) {
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

function RollModValues(modId, rollsLucky, context) {
  let statRolls = [];
  const mod = context.mods[modId];
  for (const stat of mod["stats"]) {
    if (rollsLucky) {
      const rollOne = randRange(context.rng, stat["min"], stat["max"]);
      const rollTwo = randRange(context.rng, stat["min"], stat["max"]);
      statRolls.push(Math.max(rollOne, rollTwo));
    }
    else {
      statRolls.push(randRange(context.rng, stat["min"], stat["max"]));
    }
  }
  return statRolls;
}

function GetTierForMod(itemState, modId, context) {
  const mod = context.mods[modId];
  if (mod["is_essence_only"]) {
    return [0, 1, 1]
  }

  if (mod["generation_type"] === "unique") {
    return [0, 1, 1]
  }

  let modTier = 0;
  let modCount = 1;
  let modCountAtItemLevel = 1;
  const modLevel = mod["required_level"];
  const baseItemTags = GetBaseItemTags(itemState, context);
  const otherModIds = context.modLookupTables.getGroupedTable(mod["domain"], mod["group"], mod["type"], context.modLookupTables.getStatLineIndices(modId));
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

function CreateRolledMod(itemState, modId, rollsLucky, context) {
  const tierValues = GetTierForMod(itemState, modId, context);
  return {
    id : modId,
    values : RollModValues(modId, rollsLucky, context),
    tier : tierValues[0],
    tierCount : tierValues[1],
    tierCountAtItemLevel : tierValues[2]
  }  
}

function RollRareName(itemState, rng) {
  const itemData = base_items[itemState.baseItemId];
  return RareItemNames.GenerateRareName(itemData, rng);
}

function RollMagicAffixCount(itemState, rng) {
  return randRange(rng, 1, 2);
}

function RollRareAffixCount(baseItemId, rng) {
  const maxAffixCount = GetAffixLimitForRarity(baseItemId, "rare");
  if (maxAffixCount === 6) {
    // Number of mods from data mined note (source: https://www.reddit.com/r/pathofexile/comments/amm2tg/tool_poecraftingshenanigans_a_crafting_simulator/)
    let modCount = 4;
    if (randRange(rng, 0, 2) === 0) {
      // Roughly 33% chance to get 5 or 6
      modCount++;
      if (randRange(rng, 0, 2) === 0) {
        // Roughly 33% * 33% chance to get 6
        modCount++;
      }
    }
    return modCount;
  }
  else if (maxAffixCount === 4) {
    // Number of mods from data mined note (source: reddit, https://www.reddit.com/r/pathofexile/comments/8fxnlu/chance_of_getting_specific_number_of_mods_via/)
    // "for jewels: 65/35"
    let modCount = 3;
    if (randRange(rng, 0, 2) === 0) {
      // Roughly 33% chance to get 4
      modCount++;
    }
    return modCount;
  }
  else if (maxAffixCount > 0) {
    // Unexpected situation, roll pure random!
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
    enchantments : cloneMods(itemState.enchantments),
    baseImplicits : cloneMods(itemState.baseImplicits), 
    gildedImplicits : cloneMods(itemState.gildedImplicits),
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
    enchantments : [],
    baseImplicits : [],
    gildedImplicits : [],
    corruptions : [],
    affixes : []
  }  

  // Add and roll implicits
  const baseItem = base_items[baseItemId];
  for (const implicitId of baseItem["implicits"]) {
    itemState.baseImplicits.push(CreateRolledMod(itemState, implicitId, false, context));
  }

  return itemState;
}

function PickRandomModFromListAndWeights(modsAndWeights, context) {
  const weightedModPool = CreateWeightedModPool(modsAndWeights, context);
  return PickModFromWeightedModPool(weightedModPool, context);
}

const generationTypeOrder = {
  "unique": 0,
  "prefix": 1,
  "suffix": 2,
};

const sourceOrder = {
  "delve" : 0,
  "essence" : 1,
  "shaper" : 2,
  "elder" : 3,
  "crusader" : 4,
  "hunter" : 5,
  "redeemer" : 6,
  "warlord" : 7,
  "" : 100,
}

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

  const modASource = context.modLookupTables.getSource(a);
  const modBSource = context.modLookupTables.getSource(b);
  if (modASource !== modBSource) {
    return sourceOrder[modASource] - sourceOrder[modBSource];
  }

  const aStatIndices = context.modLookupTables.getStatLineIndices(a);
  const bStatIndices = context.modLookupTables.getStatLineIndices(b);
  const aNumStats = aStatIndices.length;
  const bNumStats = bStatIndices.length;
  let statIdx = 0;
  while (statIdx < aNumStats && statIdx < bNumStats) {
    if (aStatIndices[statIdx] !== bStatIndices[statIdx]) {
      return aStatIndices[statIdx] - bStatIndices[statIdx];
    }
    ++statIdx;
  }
  if (aNumStats !== bNumStats) {
    return aNumStats - bNumStats;
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

const AffixCountRule = {
  RandomMagicAffixCount : "magic",
  RandomRareAffixCount : "rare",
  Exact : "exact",
}

const ActionInfo = {
  setRarity : null,
  clearAffixes : false,
  generateNewName : false,
  addInfluences : [],
  affixCountRule : AffixCountRule.Exact,
  affixCount : 0,
  rolls : []
}

const ModRollInfo = {
  weightParameters : {},
  modType : "affix",
  rollSelectionChance : 1.0,
  rollsLucky : false,
  forceWeights : -1,
  fillRemainingAffixRolls : false,
  label : "Affix Pool",
}

function GetModRollGroupsForAction(itemState, actionInfo, context) {
  let newItemState = cloneItemState(itemState);
  if (actionInfo.clearAffixes) {
    newItemState.affixes = [];
  }
  if (actionInfo.setRarity) {
    newItemState.rarity = actionInfo.setRarity;
  }
  if (actionInfo.generateNewName) {
    newItemState.generatedName = RollRareName(itemState, context.rng);
  }

  for (const influence of actionInfo.addInfluences) {
    [ , newItemState] = AddInfluenceToItem(newItemState, influence);
  }

  let modRollGroups = [];
  for (const modRoll of actionInfo.rolls) {
    const modsAndWeights = GetValidModsAndWeightsForItem(newItemState, context, modRoll.weightParameters);
    if (modRoll.forceWeights >= 0) {
      for (let modAndWeight of modsAndWeights) {
        modAndWeight.weight = modRoll.forceWeights;
      }
    }    
    modRollGroups.push(modsAndWeights);
  }
  return modRollGroups;
}

function RollOnModRolls(itemState, modRolls, affixRollCount, context) {
  let addedMods = 0;
  let rolledAffixes = 0;
  let modRollIdx = 0;
  let newItemState = cloneItemState(itemState);
  while (modRollIdx < modRolls.length) {
    const modRoll = modRolls[modRollIdx];

    if (modRoll.rollSelectionChance < 1.0) {
      if (context.rng.quick() >= modRoll.rollSelectionChance) {
        modRollIdx++;
        continue;
      }
    }

    if (modRoll.modType === "affix" && rolledAffixes >= affixRollCount) {
      modRollIdx++;
      continue;
    }

    const modsAndWeights = GetValidModsAndWeightsForItem(newItemState, context, modRoll.weightParameters);
    if (modRoll.forceWeights >= 0) {
      for (let modAndWeight of modsAndWeights) {
        modAndWeight.weight = modRoll.forceWeights;
      }
    }
    const modId = PickRandomModFromListAndWeights(modsAndWeights, context);
    if (modId) {
      const mod = CreateRolledMod(newItemState, modId, modRoll.rollsLucky, context);
      if (mod) {
        newItemState = cloneItemState(newItemState);
        switch (modRoll.modType) {
          case "affix":
            newItemState.affixes.push(mod);
            break;
          case "gildedImplicit":
            newItemState.gildedImplicits = [mod];
            break;
          case "enchantment":
            newItemState.enchantments = [mod];
            break;
          default:
            break;
        }
        addedMods++;
      }
    }    
    
    if (modRoll.modType === "affix") {
      rolledAffixes++;
    }

    if (modRoll.modType === "affix" && modRoll.fillRemainingAffixRolls) {
      continue;
    }

    modRollIdx++;
    continue;
  }

  if (addedMods === 0) {
    return [false, itemState];
  }

  return [true, newItemState];
}

function TryApplyAction(itemState, actionInfo, context) {
  let newItemState = cloneItemState(itemState);
  if (actionInfo.clearAffixes) {
    newItemState.affixes = [];
  }
  if (actionInfo.setRarity) {
    newItemState.rarity = actionInfo.setRarity;
  }
  if (actionInfo.generateNewName) {
    newItemState.generatedName = RollRareName(itemState, context.rng);
  }

  for (const influence of actionInfo.addInfluences) {
    let [success, postInfluenceItemState] = AddInfluenceToItem(newItemState, influence);
    if (!success) {
      return [false, itemState];
    }
    newItemState = postInfluenceItemState;
  }

  let affixCount = 0;
  switch (actionInfo.affixCountRule) {
    case AffixCountRule.RandomMagicAffixCount:
      affixCount = RollMagicAffixCount(itemState.baseItemId, context.rng);
      break;
    case AffixCountRule.RandomRareAffixCount:
      affixCount = RollRareAffixCount(itemState.baseItemId, context.rng);
      break;
    case AffixCountRule.Exact:
      affixCount = actionInfo.affixCount;
      break;
    default:
      break;
  }

  return RollOnModRolls(newItemState, actionInfo.rolls, affixCount, context);
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

function GetTransmutationActionInfo(itemState, context) {
  return { ...ActionInfo,
    setRarity : "magic",
    affixCountRule : AffixCountRule.RandomMagicAffixCount,
    rolls : [{ ...ModRollInfo, modType : "affix", fillRemainingAffixRolls : true }],
  };
}

function TransmutationItem(itemState, context) {
  if (!CanTransmutationItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetTransmutationActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetAlterationActionInfo(itemState, context) {
  return { ...ActionInfo,
    clearAffixes : true,
    affixCountRule : AffixCountRule.RandomMagicAffixCount,
    rolls : [{ ...ModRollInfo, modType : "affix", fillRemainingAffixRolls : true }],
  };
}

function AlterationItem(itemState, context) {
  if (!CanAlterationItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetAlterationActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetAugmentationActionInfo(itemState, context) {
  return { ...ActionInfo,
    affixCountRule : AffixCountRule.Exact,
    affixCount : 1,
    rolls : [{ ...ModRollInfo, modType : "affix" }],
  };
}

function AugmentationItem(itemState, context) {
  if (!CanAugmentationItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetAugmentationActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetRegalActionInfo(itemState, context) {
  return { ...ActionInfo,
    setRarity : "rare",
    generateNewName : true,
    affixCountRule : AffixCountRule.Exact,
    affixCount : 1,
    rolls : [{ ...ModRollInfo, modType : "affix" }],
  };
}

function RegalItem(itemState, context) {
  if (!CanRegalItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetRegalActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetAlchemyActionInfo(itemState, context) {
  return { ...ActionInfo,
    setRarity : "rare",
    generateNewName : true,
    affixCountRule : AffixCountRule.RandomRareAffixCount,
    rolls : [{ ...ModRollInfo, modType : "affix", fillRemainingAffixRolls : true, }],
  };
}

function AlchemyItem(itemState, context) {
  if (!CanAlchemyItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetAlchemyActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetChaosActionInfo(itemState, context) {
  return { ...ActionInfo,
    generateNewName : true,
    clearAffixes : true,
    affixCountRule : AffixCountRule.RandomRareAffixCount,
    rolls : [{ ...ModRollInfo, modType : "affix", fillRemainingAffixRolls : true, }],
  };
}

function ChaosItem(itemState, context) {
  if (!CanChaosItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetChaosActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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

function GetExaltedActionInfo(itemState, context) {
  return { ...ActionInfo,
    affixCount : 1,
    rolls : [{ ...ModRollInfo, modType : "affix" }],
  };
}

function ExaltedItem(itemState, context) {
  if (!CanExaltedItem(itemState, context)) {
    return [false, itemState];
  }

  const actionInfo = GetExaltedActionInfo(itemState, context);
  return TryApplyAction(itemState, actionInfo, context);
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
  const validMods = GetValidModsAndWeightsForItem(newItemState, context, { requiredPositiveWeightTag : influenceTag });
  if (validMods.length === 0) {
    return false;
  }

  return true;
}

function GetExaltedWithInfluenceActionInfo(itemState, context, influence) {
  const influenceTag = GetInfluenceTag(itemState.baseItemId, influence);
  return { ...ActionInfo,
    clearAffixes : false,
    generateNewName : false,
    addInfluences : [influence],
    affixCountRule : AffixCountRule.Exact,
    affixCount : 1,
    rolls : [{ ...ModRollInfo, modType : "affix", weightParameters : { requiredPositiveWeightTag : influenceTag } }],
  };
}

function ExaltedWithInfluenceItem(itemState, context, influence) {
  if (!CanExaltedWithInfluenceItem(itemState, context, influence)) {
    return [false, itemState];
  }

  const actionInfo = GetExaltedWithInfluenceActionInfo(itemState, context, influence);
  return TryApplyAction(itemState, actionInfo, context);
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
  if (itemState.baseImplicits.length === 0) {
    return false;
  }

  return true;
}

function BlessedItem(itemState, context) {
  if (!CanBlessedItem(itemState, context)) {
    return [false, itemState];
  }

  let newItemState = cloneItemState(itemState);
  for (let implicit of newItemState.baseImplicits) {
    implicit.values = RollModValues(implicit.id, false, context);
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
    return [false, itemState];
  }

  let newItemState = cloneItemState(itemState);
  for (let affix of newItemState.affixes) {
    affix.values = RollModValues(affix.id, false, context);
  }
  return [true, newItemState];
}

// eslint-disable-next-line no-unused-vars
function CanFossilItem(itemState, context) {
  if (itemState.corrupted) {
    return false;
  }

  if (base_items[itemState.baseItemId]["domain"] === "flask") {
    return false;
  }

  const fossilTypes = Array.prototype.slice.call(arguments, 2);
  if (fossilTypes.length === 0) {
    return false;
  }

  for (const fossilId of fossilTypes) {
    const fossil = fossils[fossilId];

    if (fossil["allowed_tags"].length > 0) {
      const baseItem = base_items[itemState.baseItemId];
      let hasAllowedTag = false;
      for (const allowedTag of fossil["allowed_tags"]) {
        if (baseItem["tags"].includes(allowedTag)) {
          hasAllowedTag = true;
          break;
        }
      }
      if (!hasAllowedTag) {
        return false;
      }
    }

    if (fossil["forbidden_tags"].length > 0) {
      const baseItem = base_items[itemState.baseItemId];
      for (const forbiddenTag of fossil["allowed_tags"]) {
        if (baseItem["tags"].includes(forbiddenTag)) {
          return false;
        }
      }
    }
  }

  return true;
}

function GetWeightParametersForFossils(fossilTypes) {
  let addedMods = [];
  let forcedModLists = [];
  let gildedFossilMods = [];
  let negativeTagMultipliers = {};
  let positiveTagMultipliers = {};
  let corruptedEssenceChances = [];
  let rollsLucky = false;
  let addsEnchant = false;

  for (const fossilId of fossilTypes) {
    const fossil = fossils[fossilId];
    addedMods = [ ...addedMods, ...fossil["added_mods"] ];
    for (const negativeWeightMod of fossil["negative_mod_weights"]) {
      const tag = negativeWeightMod["tag"];
      const weightMultiplier = negativeWeightMod["weight"] / 100.0;
      if (tag in negativeTagMultipliers) {
        negativeTagMultipliers[tag] = negativeTagMultipliers[tag] * weightMultiplier;
      }
      else {
        negativeTagMultipliers[tag] = weightMultiplier;
      }
    }
    for (const positiveWeightMod of fossil["positive_mod_weights"]) {
      const tag = positiveWeightMod["tag"];
      const weightMultiplier = positiveWeightMod["weight"] / 100.0;
      if (tag in positiveTagMultipliers) {
        positiveTagMultipliers[tag] = positiveTagMultipliers[tag] + weightMultiplier;
      }
      else {
        positiveTagMultipliers[tag] = weightMultiplier;
      }
    }
    if (fossil["forced_mods"].length > 0) {
      forcedModLists = [ ...forcedModLists, { modIds : [...fossil["forced_mods"]], fossilId: fossilId }];
    }
    if (fossil["sell_price_mods"].length > 0) {
      gildedFossilMods = [ ...gildedFossilMods, ...fossil["sell_price_mods"]];
    }
    if (fossil["corrupted_essence_chance"] > 0) {
      corruptedEssenceChances.push(fossil["corrupted_essence_chance"]);
    }
    if (fossil["enchants"]) {
      addsEnchant = true;
    }
    rollsLucky = rollsLucky || fossil["rolls_lucky"];
  }

  return {
    negativeWeightMultipliers : negativeTagMultipliers,
    positiveWeightMultipliers : positiveTagMultipliers,
    addedMods : addedMods,
    forcedModLists : forcedModLists,
    gildedFossilMods : gildedFossilMods,
    rollsLucky : rollsLucky,
    corruptedEssenceChances : corruptedEssenceChances,
    addsEnchant : addsEnchant,
  }
}

function GetRollsForFossil(itemState, context) {
  if (!CanFossilItem(...arguments)) {
    return [];
  }

  let modRolls = [];

  const fossilTypes = Array.prototype.slice.call(arguments, 2);
  const weightParameters = GetWeightParametersForFossils(fossilTypes);
  let mockItemState = { ...cloneItemState(itemState), rarity : "rare", affixes : [] };  

  if (weightParameters.gildedFossilMods.length > 0) {
    modRolls.push({...ModRollInfo,
      weightParameters : { forcedModIds : weightParameters.gildedFossilMods, ignoreAffixTypes : true },
      rollsLucky : weightParameters.rollsLucky, 
      modType : "gildedImplicit",
      label : "Gilded Fossil",
    });
  }

  if (weightParameters.addsEnchant) {
    modRolls.push({...ModRollInfo,
      weightParameters : { forceAffixTypes : ["enchantment"], ignoreExistingGroups : true },
      rollsLucky : weightParameters.rollsLucky,         
      modType : "enchantment",
      label : "Enchanted Fossil",
    })
  }

  for (const forcedModList of weightParameters.forcedModLists) {
    modRolls.push({...ModRollInfo, 
      weightParameters : { ...weightParameters, forcedModIds : forcedModList.modIds },
      rollsLucky : weightParameters.rollsLucky,           
      modType : "affix",
      label : fossils[forcedModList.fossilId].name,
    });
  }

  if (weightParameters.corruptedEssenceChances.length > 0) {
    let essenceModIds = [];
    const itemClass = base_items[mockItemState.baseItemId]["item_class"];
    for (const essenceId in essences) {
      const essence = essences[essenceId];
      if (essence["type"]["is_corruption_only"]) {
        if (itemClass in essence["mods"]) {
          essenceModIds.push(essence["mods"][itemClass]);
        }
      }
    }    

    for (const corruptedEssenceChance of weightParameters.corruptedEssenceChances) {
      modRolls.push({...ModRollInfo, 
        weightParameters : { ignoreAffixLimits : true, ignoreSpawnWeight : true, forcedModIds : [...essenceModIds] },
        rollSelectionChance : (corruptedEssenceChance / 100.0),
        forceWeights : 100,
        rollsLucky : weightParameters.rollsLucky,           
        modType : "affix",
        label : corruptedEssenceChance === 100 ? "Glyphic Fossil (100% Chance)" : "Tangled Fossil (10% Chance)"
      });
    }
  }

  modRolls.push({...ModRollInfo, 
    weightParameters : weightParameters,
    rollsLucky : weightParameters.rollsLucky,           
    modType : "affix", 
    fillRemainingAffixRolls : true
  });

  return modRolls;
}

// eslint-disable-next-line no-unused-vars
function GetFossilActionInfo(itemState, context) {
  return { ...ActionInfo,
    setRarity : "rare",
    clearAffixes : true,
    generateNewName : true,
    affixCountRule : AffixCountRule.RandomRareAffixCount,
    rolls : GetRollsForFossil(...arguments) 
  };
}

function FossilItem(itemState, context) {
  if (!CanFossilItem(...arguments)) {
    return [false, itemState];
  }

  const actionInfo = GetFossilActionInfo(...arguments);
  return TryApplyAction(itemState, actionInfo, context);
}

function CanEssenceItem(itemState, context, essenceId) {
  if (itemState.corrupted) {
    return false;
  }

  const item = base_items[itemState.baseItemId];
  const essence = essences[essenceId];
  if (!(item.item_class in essence.mods)) {
    return false;
  }

  const modToApply = essence.mods[item.item_class];
  if (!modToApply) {
    return false;
  }

  const itemLevelLimit = essence.item_level_restriction;

  let mockItemState = cloneItemState(itemState);
  mockItemState.affixes = [];
  mockItemState.rarity = "rare";
  const validMods = GetValidModsAndWeightsForItem(mockItemState, context, { forcedModIds : [modToApply], ignoreSpawnWeight : true, ignoreRequiredLevel : true });
  if (validMods.length === 0) {
    return false;
  }

  return true;
}

function GetEssenceActionInfo(itemState, context, essenceId) {
  const essence = essences[essenceId];
  const item = base_items[itemState.baseItemId];
  const modToApply = essence.mods[item.item_class];
  let itemLevelOverride = itemState.level;
  if (essence.item_level_restriction) {
    if (essence.item_level_restriction < itemLevelOverride) {
      itemLevelOverride = essence.item_level_restriction;
    }
  }

  return { ...ActionInfo,
    setRarity : "rare",
    clearAffixes : true,
    generateNewName : true,
    affixCountRule : AffixCountRule.RandomRareAffixCount,
    rolls : [
      { ...ModRollInfo, 
        weightParameters : { 
          forcedModIds : [modToApply], 
          ignoreSpawnWeight : true, 
          ignoreRequiredLevel : true,
        }, 
        modType : "affix", 
        label : essence.name, 
        forceWeights : 100
      },
      { ...ModRollInfo, 
        weightParameters : {
          itemLevelOverride : itemLevelOverride
        },
        modType : "affix", 
        fillRemainingAffixRolls : true 
      }
    ],
  };
}

function EssenceItem(itemState, context, essenceId) {
  if (!CanEssenceItem(itemState, context, essenceId)) {
    return [false, itemState];
  }

  const actionInfo = GetEssenceActionInfo(itemState, context, essenceId);
  return TryApplyAction(itemState, actionInfo, context);
}


function NormalButton(props) {
  return <button className="button" onClick={props.onClick} disabled={!props.enabled}>{props.label}</button>;  
}

function CraftingButton(props) {
  return <div className="craftingButtonContainer">
          <button 
            className="craftingButton" 
            selectedformodlist={props.selectedForModList} 
            onClick={props.onClick} 
            onContextMenu={props.onRightClick}
            disabled={!props.enabled} 
            aria-label={props.itemTooltip} 
            data-balloon-pos="up" 
            data-balloon-nofocus left={props.left} 
            right={props.right}
          >
          { 
            props.itemUrl ? 
              <div className="label">
                <img src={props.itemUrl}></img>
              </div> 
              : 
              <div className="label">
                {props.label}
              </div>
          }
          </button>
        </div>;
}

class TheoryCrafterContext {
  constructor(modDatabase, rng) {
    this.mods = modDatabase;
    this.modLookupTables = ModGroups.ParseModGroups(modDatabase, stats, item_classes, mod_types);
    this.itemLookupTables = ItemLookupTables.ParseBaseItems(base_items);
    this.essenceLookupTables = EssenceLookupTables.ParseEssences(essences);
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
      "exalt_inf" : CanExaltedWithInfluenceItem,
      "annul" : CanAnnulmentItem,
      "bless" : CanBlessedItem,
      "divine" : CanDivineItem,
      "fossil" : CanFossilItem,
      "essence" : CanEssenceItem,
    }

    this.getActionInfoMap = {
      "scour" : null,
      "transmute" : GetTransmutationActionInfo,
      "alt" : GetAlterationActionInfo,
      "aug" : GetAugmentationActionInfo,
      "regal" : GetRegalActionInfo,
      "alch" : GetAlchemyActionInfo,
      "chaos" : GetChaosActionInfo,
      "exalt" : GetExaltedActionInfo,
      "exalt_inf" : GetExaltedWithInfluenceActionInfo,
      "annul" : null,
      "bless" : null,
      "divine" : null,
      "fossil" : GetFossilActionInfo,
      "essence" : GetEssenceActionInfo,
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
      "exalt_inf" : ExaltedWithInfluenceItem,
      "annul" : AnnulmentItem,
      "bless" : BlessedItem,
      "divine" : DivineItem,
      "fossil" : FossilItem,
      "essence" : EssenceItem,
    }

    this.theoryCrafterContext = new TheoryCrafterContext(_mods, seedrandom());

    const normalItemState = CreateItem("Metadata/Items/Armours/Boots/BootsAtlas1", 100, this.theoryCrafterContext);
    this.state = this.initState(normalItemState);
  }

  initState(initItemState) {
    let initState = {
      itemStateHistory : [ { itemState: initItemState, action : "" } ],
      itemStateHistoryIdx : 0,
      lastCommand : "",
      sortMods : false,
      selectedActionForModList : "",
      popupActionForModList : "",
      expandedGroups : new Set(),
      
      newBaseSelectorShown : false,
      newBaseItemLevel : 100,
      newBaseSelectedInfluences : [],
      newBaseFilter : "",
      newBaseCurrentSelection : this.theoryCrafterContext.itemLookupTables.getValidBaseTypes()[0], 
      newBaseRequiredTag : "",
      newBaseAllowedStats : { dex: 1, int: 1, str: 1},

      fossilPopupShown : false,
      selectedFossils : [],
      
      influencedExaltPopupShown : false,
      selectedInfluenceExalt : "crusader",

      essencePopupShown : false,
      selectedEssence : "",
      expandedEssenceGroups : [],
    };
    initState.selectedEssence = this.selectInitialEssenceForItem(initState.itemStateHistory[0].itemState);
    return initState;
  }

  initStateForNewBase(oldState, initItemState) {
    let initState = {
      ...oldState,
      
      itemStateHistory : [ { itemState: initItemState, action : "" } ],
      itemStateHistoryIdx : 0,
      lastCommand : "",
      selectedActionForModList : "",
      popupActionForModList : "",
      expandedGroups : new Set(),
      
      newBaseSelectorShown : false,
      fossilPopupShown : false,
      selectedFossils : [],
      
      influencedExaltPopupShown : false,
    };
    if (!this.state.selectedEssence || !CanEssenceItem(initState.itemStateHistory[0].itemState, this.theoryCrafterContext, this.state.selectedEssence)) {
      initState.selectedEssence = this.selectInitialEssenceForItem(initState.itemStateHistory[0].itemState);
    }
    return initState;
  }

  selectInitialEssenceForItem(itemState) {
    for (const groupId of this.theoryCrafterContext.essenceLookupTables.getSortedEssenceGroupIds()) {
      for (const essenceId of this.theoryCrafterContext.essenceLookupTables.getGroupByGroupId(groupId).essenceIds) {
        if (CanEssenceItem(itemState, this.theoryCrafterContext, essenceId)) {
          return essenceId;
        }
      }
    }
    return "";
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
    const canPerformAction = this.canPerformAction(action, previousItemState);
    if (!canPerformAction) {
      return;
    }
    this.performAction(action, previousItemState, this.state.itemStateHistoryIdx);
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

  canPerformAction(actionName, itemState) {
    return this.splitAndTestAction(actionName, itemState);
  }

  splitAndTestAction(actionName, itemState) {
    const splitAction = actionName.split(" ");
    return this.testMap[splitAction[0]](itemState, this.theoryCrafterContext, ...(splitAction.slice(1)));
  }

  performAction(actionName, itemState, splitLocationOverride = null) {
    return this.splitAndExecuteAction(actionName, itemState, splitLocationOverride);
  }

  splitAndExecuteAction(actionName, itemState, splitLocationOverride = null) {
    const splitAction = actionName.split(" ");
    const result = this.actionMap[splitAction[0]](itemState, this.theoryCrafterContext, ...(splitAction.slice(1)));
    if (result[0]) {
      if (splitLocationOverride) {
        this.setState(this.insertAndCutStateAt(result[1], actionName, splitLocationOverride));
      }
      else {
        this.setState(this.insertAndCutState(result[1], actionName));
      }
    }
  }

  RenderBaseSelectButton() {
    return <button onClick={() => this.handleBaseSelectButtonClicked()} key="baseItemCreateButton">Create New Item</button>;
  }

  RenderUtilityButtonPanel() {
    return (
      <div className="craftingButtonSection" key="utilityButtonSection">
        <div className="craftingButtonLine" key="craftingButtonLine1">
          <CraftingButton
            itemTooltip="New Base"
            onClick={() => this.toggleNewBaseSelector()}
            enabled={true}
            label={<FontAwesomeIcon size="2x" icon={faFile} />}
            key="newBase"
          />
          <div>
            &nbsp;
          </div>          
          <CraftingButton
            itemTooltip="Toggled Sorted Mods"
            label={<FontAwesomeIcon size="2x" icon={faSortAmountDown} />}
            onClick={(e) => this.handleSortModsToggled(e)}
            enabled={true}
            selectedForModList={this.state.sortMods ? "true" : "false"}
          />
          <div>
            &nbsp;
          </div>
          <CraftingButton
            itemTooltip={this.getUndoLabel()}
            onClick={() => this.undoState()}
            enabled={this.canUndoState()}
            label={<FontAwesomeIcon size="2x" icon={faUndo} />}
            key="undo"
          />          
          <CraftingButton
            itemTooltip={this.getRerollLabel()}
            label={<FontAwesomeIcon size="2x" icon={faDice} />}
            onClick={() => this.rerollAction()}
            enabled={this.canRerollAction()}
          />
          <CraftingButton
            itemTooltip={this.getRedoLabel()}
            label={<FontAwesomeIcon size="2x" icon={faRedo} />}
            onClick={() => this.redoState()}
            enabled={this.canRedoState()}
          />
        </div>
      </div>
    );
  }

  RenderCraftingButtonManual(actionName, label, itemUrl, itemTooltip, dropdownAction = null, dropdownEnabled = true) {
    const buttonOnClick = () => this.performAction(actionName, this.getState());
    const buttonOnRightClick = (e) => this.selectActionForModList(e, actionName);
    const actionSplit = actionName.split(' ');
    const selectedForModList = this.getSelectedActionForModList() === actionSplit[0];
    const isEnabled = this.canPerformAction(actionName, this.getState());
    const showDropDown = dropdownAction !== null;

    const craftingButtons = [<CraftingButton 
      itemUrl={itemUrl}
      itemTooltip={itemTooltip}
      onClick={buttonOnClick} 
      onRightClick={buttonOnRightClick}
      enabled={isEnabled} 
      label={label} 
      selectedForModList={selectedForModList ? "true" : "false"}
      key={actionName} 
      left={showDropDown ? "true" : "false"}
    />]
    if (showDropDown) {
      craftingButtons.push(
        <CraftingButton
          onClick={dropdownAction} 
          onRightClick={buttonOnRightClick}          
          enabled={dropdownEnabled}
          label={<FontAwesomeIcon icon={faCog} />}
          selectedForModList={selectedForModList ? "true" : "false"}
          key={actionName + "_dropdown"}
          right="true"
        />
      );
    }

    return craftingButtons;
  }

  RenderCraftingButton(actionName, label, currencyId, dropdownAction = null, dropdownEnabled = true) {
    const buttonOnClick = () => this.performAction(actionName, this.getState());
    const isEnabled = this.canPerformAction(actionName, this.getState());

    const baseItem = base_items[currencyId];
    if (!baseItem) {
      console.log("No base item for " + currencyId + " (label: " + label + ")");
      return NormalButton({onClick : buttonOnClick, disabled: !isEnabled, label: label});
    }
  
    const itemUrl = GetItemImageUrl(currencyId);
    let itemTooltip = baseItem.name;
    return this.RenderCraftingButtonManual(actionName, label, itemUrl, itemTooltip, dropdownAction, dropdownEnabled);
  }

  RenderCraftingPanel() {
    return <div className="craftedItemContainer" key="craftedItemContainer">
      { this.RenderUtilityButtonPanel() }  
      <div className="craftingButtonSection" key="craftingButtonSection">
        <div className="craftingButtonLine" key="craftingButtonLine1">
          {[
            this.RenderCraftingButton("transmute", "Transmutation", "Metadata/Items/Currency/CurrencyUpgradeToMagic"),
            this.RenderCraftingButton("aug", "Augmentation", "Metadata/Items/Currency/CurrencyAddModToMagic"),
            this.RenderCraftingButton("alt", "Alteration", "Metadata/Items/Currency/CurrencyRerollMagic"),
            this.RenderCraftingButton("regal", "Regal", "Metadata/Items/Currency/CurrencyUpgradeMagicToRare"),
            this.RenderCraftingButton("alch", "Alchemy", "Metadata/Items/Currency/CurrencyUpgradeToRare"),
            this.RenderCraftingButton("chaos", "Chaos", "Metadata/Items/Currency/CurrencyRerollRare"),
            this.RenderCraftingButton("exalt", "Exalted", "Metadata/Items/Currency/CurrencyAddModToRare"),
            this.RenderInfluencedExaltCraftingButton(),
          ]}
        </div>
        <div className="craftingButtonLine" key="craftingButtonLine2">
          {[
            this.RenderCraftingButton("scour", "Scour", "Metadata/Items/Currency/CurrencyConvertToNormal"),
            this.RenderCraftingButton("annul", "Annulment", "Metadata/Items/Currency/CurrencyRemoveMod"),
            this.RenderCraftingButton("bless", "Blessed", "Metadata/Items/Currency/CurrencyRerollImplicit"),
            this.RenderCraftingButton("divine", "Divine", "Metadata/Items/Currency/CurrencyModValues"),
            this.RenderEssenceCraftingButton(),
            this.RenderFossilCraftingButton(),
          ]}
        </div>
      </div>
      <CraftedItem
        itemState={this.state.itemStateHistory[this.state.itemStateHistoryIdx].itemState}
        context={this.theoryCrafterContext}
        sortMods={this.state.sortMods}
      />
    </div>
  }

  RenderModListPanel() {
    const selectedAction = this.getSelectedActionForModList();
    return <div className="modListContainer" key="modListContainer">
      <ModList
        expandedGroups={this.state.expandedGroups}
        onGroupClicked={(groupKey) => this.onGroupClicked(groupKey)}
        getActionInfoFunction={this.getActionInfoFunctionForModList(selectedAction)}
        getActionInfoAdditionalParameters={this.getAdditionalActionParametersForModList(selectedAction)}
        fossilTypes={this.state.selectedFossils}
        itemState={this.state.itemStateHistory[this.state.itemStateHistoryIdx].itemState}
        context={this.theoryCrafterContext}
        key="modList"
      />
    </div>    
  }

  RenderEssenceCraftingButton() {
    let dropdownEnabled = false;
    for (const essenceId in essences) {
      if (CanEssenceItem(this.getState(), this.theoryCrafterContext, essenceId)) {
        dropdownEnabled = true;
        break;
      }
    }
    const essence = essences[this.state.selectedEssence];

    return this.RenderCraftingButton("essence " + this.state.selectedEssence, essence.name, this.state.selectedEssence, () => { this.toggleEssenceSelector() }, dropdownEnabled);
  }


  RenderFossilCraftingButton() {
    let dropdownEnabled = false;
    for (const fossilId in fossils) {
      if (CanFossilItem(this.getState(), this.theoryCrafterContext, fossilId)) {
        dropdownEnabled = true;
        break;
      }
    }
    return this.RenderCraftingButtonManual(
      ["fossil", ...this.state.selectedFossils].join(" "), 
      "Fossil", 
      "https://web.poecdn.com/image/Art/2DItems/Currency/Delve/Reroll2x2C.png", 
      "Fossil", 
      () => { this.toggleFossilSelector() },
      dropdownEnabled
    );
  }

  RenderInfluencedExaltCraftingButton() {
    const influenceTypeToItemId = {
      "crusader" : "Metadata/Items/AtlasExiles/AddModToRareCrusader",
      "hunter" : "Metadata/Items/AtlasExiles/AddModToRareHunter",
      "redeemer" : "Metadata/Items/AtlasExiles/AddModToRareRedeemer",
      "warlord" : "Metadata/Items/AtlasExiles/AddModToRareWarlord"
    };

    const itemId = influenceTypeToItemId[this.state.selectedInfluenceExalt];
    const item = base_items[itemId];
    const itemName = item.name;

    let dropdownEnabled = false;
    for (const influenceType in influenceTypeToItemId) {
      const canInfluence = CanExaltedWithInfluenceItem(this.getState(), this.theoryCrafterContext, influenceType);
      if (canInfluence) {
        dropdownEnabled = true;
        break;
      }
    }

    return this.RenderCraftingButton("exalt_inf " + this.state.selectedInfluenceExalt, itemName, itemId, () => { this.toggleInfluencedExaltSelector() }, dropdownEnabled);
  }

  GetAllowedBasesForNewBasePopup() {
    let allowedBases = [];

    let validBaseTypes = [];
    if (this.state.newBaseRequiredTag) {
      validBaseTypes = this.theoryCrafterContext.itemLookupTables.getValidBaseTypesForItemGroup(this.state.newBaseRequiredTag);
    }
    else {
      validBaseTypes = this.theoryCrafterContext.itemLookupTables.getValidBaseTypes();
    }

    for (const itemId of validBaseTypes) {
      const item = base_items[itemId];

      if (item.requirements) {
        if (!this.state.newBaseAllowedStats.dex && ("dexterity" in item.requirements) && (item.requirements.dexterity > 0)) {
          continue;
        }
        if (!this.state.newBaseAllowedStats.int && ("intelligence" in item.requirements) && (item.requirements.intelligence > 0)) {
          continue;
        }
        if (!this.state.newBaseAllowedStats.str && ("strength" in item.requirements) && (item.requirements.strength > 0)) {
          continue;
        }
      }

      if (this.state.newBaseRequiredTag) {
        if (!(item.tags.includes(this.state.newBaseRequiredTag))) {
          continue;
        }
      }

      if (this.state.newBaseFilter) {
        const searchStrings = this.state.newBaseFilter.split(/\s+/);
        let filterPassed = true;
        for (const searchString of searchStrings) {
          if (item.name.toLowerCase().indexOf(searchString) === -1
          && item.item_class.toLowerCase().indexOf(searchString) === -1) {
            filterPassed = false;
            break;
          }
        }
        if (!filterPassed) {
          continue;
        }
      }
      allowedBases.push(itemId);
    }
    return allowedBases;
  }

  RenderBaseItemEntry(props) {
    const itemId = props.data[props.index];
    const selected = itemId === this.state.newBaseCurrentSelection;
    const baseItem = base_items[itemId];
    const itemName = baseItem.name;
    const itemLevel = baseItem.drop_level;
    const itemClass = baseItem.item_class;
    let itemReqIcons = [];
    if (baseItem.requirements) {
      const requirements = baseItem.requirements;
      if ((requirements.dexterity) && requirements.dexterity > 0) {
        itemReqIcons.push(<FontAwesomeIcon icon={faCertificate} color="#608600" key="dex"/>);
      }
      if ((requirements.intelligence) && requirements.intelligence > 0) {
        itemReqIcons.push(<FontAwesomeIcon icon={faCertificate} color="#5A78F4" key="int"/>);
      }
      if ((requirements.strength) && requirements.strength > 0) {
        itemReqIcons.push(<FontAwesomeIcon icon={faCertificate} color="#DE3852" key="str"/>);
      }
    }

    return  <button 
              className="selectorPopupButton" 
              itemselected={selected ? "true" : "false"} 
              onClick={ (e) => this.handleNewBaseSelected(e, itemId) } 
              key={itemId}
              style = {props.style}
            >
                <span className="label">
                  {itemReqIcons}
                  &nbsp;
                  {itemName}
                  <br />
                  {itemClass + " [" + itemLevel + "]"}
                </span>
            </button>        
  }

  RenderNewBaseInfluenceSelector(influenceId, label) {
    const enabled = GetInfluenceTag(this.state.newBaseCurrentSelection, influenceId) != null;
    const selected = enabled && this.state.newBaseSelectedInfluences.includes(influenceId);
    return  <button 
              className="selectorPopupButton influenceSelectorButton" 
              disabled={!enabled}
              itemselected={selected ? "true" : "false"} 
              onClick={ (e) => this.handleNewBaseInfluenceSelectorClicked(e, influenceId) } 
              key={influenceId}
            >
                <span className="label">{label}</span>
            </button>    
  }

  handleNewBaseInfluenceSelectorClicked(e, influenceId) {
    e.stopPropagation();
    let newSelectedInfluences = [...this.state.newBaseSelectedInfluences];
    if (newSelectedInfluences.includes(influenceId)) {
      newSelectedInfluences = newSelectedInfluences.filter((x) => {return x !== influenceId});
    }
    else {
      newSelectedInfluences.push(influenceId);
    }
    this.setState({...this.state, newBaseSelectedInfluences : newSelectedInfluences});
  }

  RenderNewBaseLevelSelector() {
    return [
      <span className="label" key="label">
        Item Level: 
      </span>,
      <input key="input" value={this.state.newBaseItemLevel} onChange={(e) => {this.onNewBaseItemLevelChanged(e)}}/>
    ];
  }

  onNewBaseItemLevelChanged(e) {
    let newValue = parseInt(e.target.value);
    if (isNaN(newValue)) {
      newValue = 1;
    }

    this.setState({...this.state, newBaseItemLevel : newValue});
  }

  RenderNewBaseCreateItemButton() {
    return  <button 
              className="selectorPopupButton createItemButton" 
              disabled={false}
              itemselected={"true"} 
              onClick={ (e) => this.handleNewBaseCreateItemButtonClicked(e) } 
              key="createItemButton"
            >
                <span className="label">Create Item</span>
            </button>        
  }

  handleNewBaseCreateItemButtonClicked(e) {
    e.stopPropagation();

    const item = base_items[this.state.newBaseCurrentSelection];
    let minLevel = 1;    
    if (item.drop_level) {
      minLevel = item.drop_level;
    }
    let itemLevel = this.state.newBaseItemLevel;
    if (itemLevel < minLevel) {
      itemLevel = minLevel;
    }
    else if (itemLevel > 100) {
      itemLevel = 100;
    }    

    let normalItemState = CreateItem(this.state.newBaseCurrentSelection, itemLevel, this.theoryCrafterContext);
    for (const influenceId of this.state.newBaseSelectedInfluences) {
      if (GetInfluenceTag(this.state.newBaseCurrentSelection, influenceId)) {
        [, normalItemState] = AddInfluenceToItem(normalItemState, influenceId);
      }
    }

    this.setState({ ...this.initStateForNewBase(this.state, normalItemState) });    
  }

  RenderNewBasePropertiesPanel() {
    return [
      <div className="influenceSelectorLabel" key="influenceSelectorLabel">
        Select Influence(s):
      </div>,
      <div className="influenceSelectorButtonContainer" key="influenceSelectorButtonContainer">
        {[
        this.RenderNewBaseInfluenceSelector("shaper", "Shaper"),
        this.RenderNewBaseInfluenceSelector("elder", "Elder"),
        this.RenderNewBaseInfluenceSelector("crusader", "Crusader"),
        this.RenderNewBaseInfluenceSelector("hunter", "Hunter"),
        this.RenderNewBaseInfluenceSelector("redeemer", "Redeemer"),
        this.RenderNewBaseInfluenceSelector("warlord", "Warlord"),
        ]}
      </div>,
      <div className="influenceSelectorLevelContainer" key="influenceSelectorLevelContainer">
        {
        this.RenderNewBaseLevelSelector()
        }
      </div>,
      <div className="influenceSelectorCreateItemContainer" key="influenceSelectorCreateItemContainer">
        {
        this.RenderNewBaseCreateItemButton()
        }
      </div>
    ];
  }

  RenderNewBasePopup(isShown) {
    if (isShown) {
      const bases = this.GetAllowedBasesForNewBasePopup();

      const item = base_items[this.state.newBaseCurrentSelection];
      let minLevel = 1;    
      if (item.drop_level) {
        minLevel = item.drop_level;
      }
      let itemLevel = this.state.newBaseItemLevel;
      if (itemLevel < minLevel) {
        itemLevel = minLevel;
      }
      else if (itemLevel > 100) {
        itemLevel = 100;
      }
  
      let newItem = CreateItem(this.state.newBaseCurrentSelection, itemLevel, this.theoryCrafterContext);
      for (const influenceId of this.state.newBaseSelectedInfluences) {
        [,newItem] = AddInfluenceToItem(newItem, influenceId);
      }
  
      return <div className="selectorPopup newBase" key="newBasePopup">
                <div className="modal" onClick={() => this.toggleNewBaseSelector()}></div>
                <div className="selectorPopupContents">
                  <div className="selectorPopupLabelLine" key="selectorPopupLabelLine">
                  <div className="selectorPopupLabelLine">Select New Base</div>
                  <div className="selectorPopupClose" onClick={() => this.toggleNewBaseSelector()}>✖</div>
                </div>
                <div className="selectorPopupContainer newBase" width="1280px">
                  <div className="newBaseItemListContainer">
                    <div className="filterButtonsTop">
                      {[
                        this.RenderNewBaseItemTagToggle("", "all"),
                        this.RenderNewBaseItemTagToggle("one_hand_weapon", "one-hand"),
                        this.RenderNewBaseItemTagToggle("two_hand_weapon", "two-hand"),
                        this.RenderNewBaseItemTagToggle("wand", "one-hand-ranged"),
                        this.RenderNewBaseItemTagToggle("bow", "two-hand-ranged"),
                        this.RenderNewBaseItemTagToggle("shield", "shield"),
                        this.RenderNewBaseItemTagToggle("helmet", "helmet"),
                        this.RenderNewBaseItemTagToggle("body_armour", "chest"),
                        this.RenderNewBaseItemTagToggle("gloves", "gloves"),
                        this.RenderNewBaseItemTagToggle("boots", "boots"),
                      ]}
                    </div>
                    <div className="filterButtonsBottom">
                      {[
                        this.RenderNewBaseItemTagToggle("ring", "ring"),
                        this.RenderNewBaseItemTagToggle("amulet", "amulet"),
                        this.RenderNewBaseItemTagToggle("belt", "belt"),
                        this.RenderNewBaseItemTagToggle("flask", "flask"),
                        this.RenderNewBaseItemTagToggle("quiver", "quiver"),
                        this.RenderNewBaseItemTagToggle("jewel", "jewel"),
                        this.RenderNewBaseItemTagToggle("abyss_jewel", "abyss-jewel"),
                        this.RenderNewBaseItemColorToggle("dex", "socket-green"),
                        this.RenderNewBaseItemColorToggle("int", "socket-blue"),
                        this.RenderNewBaseItemColorToggle("str", "socket-red"),
                      ]}
                    </div>
                    <div className="newBaseItemList">
                      {
                        <List height={550} itemCount={bases.length} width={420} itemSize={48} itemData={bases}>
                          { (props) => this.RenderBaseItemEntry(props) }
                        </List>
                      }
                    </div>
                    <div className="newBaseItemFilter" height="50px">
                      <input onInput={(e) => {this.onNewBaseItemFilterChanged(e)}}></input>
                      <FontAwesomeIcon icon={faSearch} color="white" />
                    </div>
                  </div>
                  <div className="newBaseItemPropertiesContainer">
                    {
                      this.RenderNewBasePropertiesPanel()
                    }
                  </div>
                  <div className="newBaseItemPreviewContainer">
                    <CraftedItem
                        itemState={newItem}
                        context={this.theoryCrafterContext}
                        sortMods={true}
                    />
                  </div>
                </div>
              </div>
            </div>;
    }
    else {
      return [];
    }
  }

  RenderNewBaseItemTagToggle(tagName, imageBase) {
    const selected = this.state.newBaseRequiredTag === tagName;
    const imageName = selected ? (imageBase + "-active.png") : (imageBase + ".png");
    return <img key={tagName} src={BenchImages[imageName]} onClick={(e) => this.onNewBaseItemTagClicked(e, tagName)} />;
  }

  onNewBaseItemTagClicked(e, tagName) {
    e.stopPropagation();
    this.setState({...this.state, newBaseRequiredTag : tagName});
  }

  RenderNewBaseItemColorToggle(statName, imageBase) {
    const selected = this.state.newBaseAllowedStats[statName] === 1;
    const imageName = selected ? (imageBase + "-active.png") : (imageBase + ".png");
    return <img width="43px" key={statName} src={BenchImages[imageName]} onClick={(e) => this.onNewBaseItemColorClicked(e, statName)} />;
  }

  onNewBaseItemColorClicked(e, statName) {
    e.stopPropagation();
    const newBaseAllowedStats = {...this.state.newBaseAllowedStats};
    newBaseAllowedStats[statName] = newBaseAllowedStats[statName] === 1 ? 0 : 1;
    this.setState({...this.state, newBaseAllowedStats : newBaseAllowedStats});
  }

  onNewBaseItemFilterChanged(e) {
    this.setState({...this.state, newBaseFilter : e.target.value});
  }

  handleNewBaseSelected(e, itemId) {
    e.stopPropagation();
    this.setState({...this.state, newBaseCurrentSelection: itemId});
  }

  RenderInfluencedExaltPopup(isShown) {
    if (isShown) {
      return <div className="selectorPopup" key="influencedExaltPopup">
                <div className="modal" onClick={() => this.toggleInfluencedExaltSelector()}></div>
                <div className="selectorPopupContents">
                  <div className="selectorPopupLabelLine" key="selectorPopupLabelLine">
                  <div className="selectorPopupLabelLine">Select Influence</div>
                  <div className="selectorPopupClose" onClick={() => this.toggleInfluencedExaltSelector()}>✖</div>
                </div>
                <div className="selectorPopupContainer">
                  { [
                    this.RenderInfluencedExaltSelector("Metadata/Items/AtlasExiles/AddModToRareCrusader", "crusader"),
                    this.RenderInfluencedExaltSelector("Metadata/Items/AtlasExiles/AddModToRareHunter", "hunter"),
                    this.RenderInfluencedExaltSelector("Metadata/Items/AtlasExiles/AddModToRareRedeemer", "redeemer"),
                    this.RenderInfluencedExaltSelector("Metadata/Items/AtlasExiles/AddModToRareWarlord", "warlord"),
                  ] }
                </div>
              </div>
            </div>;
    }
    else {
      return [];
    }
  }

  RenderInfluencedExaltSelector(itemId, influenceType) {
    const enabled = CanExaltedWithInfluenceItem(this.getState(), this.theoryCrafterContext, influenceType);
    const checked = (enabled && this.state.selectedInfluenceExalt === influenceType) ? "true" : null;
    const item = base_items[itemId];
    const itemName = item.name;
    const itemDescription = item.properties.description;
    let itemDescriptionSplit = ["<b>" + itemName + "</b>"];
    itemDescriptionSplit = [...itemDescriptionSplit, itemDescription.split("\\r\\n")];

    let itemDescriptionHtml = { __html: itemDescriptionSplit.join("<br />") };

    const itemUrl = GetItemImageUrl(itemId);
    const buttonStyle = {
      backgroundImage: 'url(' + itemUrl +')',
    };

    return  <button 
              className="selectorPopupButton" 
              disabled={!enabled} 
              itemselected={checked} 
              onClick={ (e) => this.handleInfluencedExaltSelectorClicked(e, influenceType) } 
              key={itemId}
              style={buttonStyle}
            >
                <span 
                  className="label" 
                  dangerouslySetInnerHTML={itemDescriptionHtml}
                />
            </button>
  }

  handleInfluencedExaltSelectorClicked(e, influenceType) {
    e.stopPropagation();
    let newState = { ...this.state, selectedInfluenceExalt: influenceType};
    // TODO: Delete this when user can manually select action for mod list
    if (CanExaltedWithInfluenceItem(this.getState(), this.theoryCrafterContext, newState.selectedInfluenceExalt)) {
      newState.popupActionForModList = "exalt_inf";
    }
    else {
      newState.popupActionForModList = "";
    }
    this.setState(newState);
  }

  RenderFossilPopup(isShown) {
    if (isShown) {
      return <div className="fossilPopup" key="fossilPopup">
               <div className="modal" onClick={() => this.toggleFossilSelector()}></div>
                <div className="fossilPopupContents">
                  <div className="fossilPopupLabelLine" key="fossilPopupLabelLine">
                  <div className="fossilPopupLabelLine">Select Fossils</div>
                  <div className="fossilPopupClose" onClick={() => this.toggleFossilSelector()}>✖</div>
                </div>
                <div className="fossilSelectorContainer">
                  { [
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingChaos", "Aberrant"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingCasterMods", "Aetheric"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingVaal", "Bloodstained"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingMinionsAuras", "Bound"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingBleedPoison", "Corroded"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingDefences", "Dense"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingEnchant", "Enchanted"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingGemLevel", "Faceted"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingCold", "Frigid"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingSellPrice", "Gilded"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingCorruptEssence", "Glyphic"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingAbyss", "Hollow"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingPhysical", "Jagged"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingMana", "Lucent"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingLightning", "Metallic"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingElemental", "Prismatic"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingLife", "Pristine"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingLuckyModRolls", "Sanctified"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingFire", "Scorched"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingAttackMods", "Serrated"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingSpeed", "Shuddering"),
                    this.RenderFossilSelector("Metadata/Items/Currency/CurrencyDelveCraftingRandom", "Tangled"),
                  ] }
                </div>
              </div>
            </div>;
    }
    else {
      return [];
    }
  }

  RenderFossilSelector(fossilId) {
    const checked = this.state.selectedFossils.includes(fossilId) ? "true" : null;
    const enabled = (this.state.selectedFossils.length < 4 || checked) && CanFossilItem(this.getState(), this.theoryCrafterContext, fossilId);
    const fossil = fossils[fossilId];
    const fossilName = fossil.name;
    const fossilDescriptions = fossil.descriptions;
    let fossilDescriptionsSplit = ["<b>" + fossilName + "</b>"];
    for (const fossilDescription of fossilDescriptions) {
      fossilDescriptionsSplit = [...fossilDescriptionsSplit, fossilDescription.split("\\r\\n")];
    }

    let fossilDescriptionHtml = { __html: fossilDescriptionsSplit.join("<br />") };

    const itemUrl = GetItemImageUrl(fossilId);
    const buttonStyle = {
      backgroundImage: 'url(' + itemUrl +')',
    };

    return  <button 
              className="fossilSelectorButton" 
              disabled={!enabled} 
              fossilselected={checked} 
              onClick={ (e) => this.handleFossilSelectorClicked(e, fossilId) } 
              key={fossilId}
              style = {buttonStyle}
            >
                <span 
                  className="label" 
                  dangerouslySetInnerHTML={fossilDescriptionHtml}
                />
            </button>
  }

  handleFossilSelectorClicked(e, fossilId) {
    e.stopPropagation();
    const idx = this.state.selectedFossils.findIndex((x) => { return x === fossilId });
    let newState = null;
    if (idx >= 0) {
      newState = { ...this.state };
      newState.selectedFossils.splice(idx, 1);
    }
    else {
      newState = { ...this.state, selectedFossils : [...this.state.selectedFossils, fossilId] };
    }
    if (newState.selectedFossils.length > 0 && CanFossilItem(this.getState(), this.theoryCrafterContext, ...newState.selectedFossils)) {
      newState.selectedActionForModList = "fossil";
    }
    else {
      newState.selectedActionForModList = "";
    }
    this.setState(newState);
  }

  RenderEssencePopup(isShown) {
    if (isShown) {
      return <div className="selectorPopup" key="essencePopup">
                <div className="modal" onClick={() => this.toggleEssenceSelector()}></div>
                <div className="selectorPopupContents">
                  <div className="selectorPopupLabelLine" key="selectorPopupLabelLine">
                  <div className="selectorPopupLabelLine">Select Essence</div>
                  <div className="selectorPopupClose" onClick={() => this.toggleEssenceSelector()}>✖</div>
                </div>
                <div className="selectorPopupContainer">
                  {
                    this.RenderEssenceSelectorList()
                  }
                </div>
              </div>
            </div>;
    }
    else {
      return [];
    }
  }

  RenderEssenceSelectorList() {
    let essenceElements = [];
    for (const groupId of this.theoryCrafterContext.essenceLookupTables.getSortedEssenceGroupIds()) {
      const group = this.theoryCrafterContext.essenceLookupTables.getGroupByGroupId(groupId);
      const groupExpanded = this.state.expandedEssenceGroups.includes(groupId);
      const selectedInGroup = group.essenceIds.includes(this.state.selectedEssence);
      
      let firstInGroup = true;
      for (let i = 0; i < group.essenceIds.length; ++i) {
        const essenceId = group.essenceIds[i];
        const selected = essenceId === this.state.selectedEssence;
        if (CanEssenceItem(this.getState(), this.theoryCrafterContext, essenceId)) {
          if (!groupExpanded && selectedInGroup) {
            if (selected) {
              essenceElements.push(this.RenderEssenceGroupSelector(essenceId, true, groupId, false));
              break;
            }
          }
          else {
            if (firstInGroup) {
              essenceElements.push(this.RenderEssenceGroupSelector(essenceId, selected, groupId, groupExpanded));
              if (!groupExpanded) {
                break;
              }
              firstInGroup = false;
            }
            else {
              essenceElements.push(this.RenderEssenceSelector(essenceId, selected));
            }
          }
        }
      }
    }
    return <div className="selectorList essenceSelector">
      { essenceElements }
    </div>
  }

  RenderEssenceGroupSelector(essenceId, selected, groupId, groupExpanded) {
    const essence = essences[essenceId];

    return  <div className="selectorListElement groupHeader" itemselected={selected ? "true" : "false"} onClick={(e) => { this.handleEssenceSelected(e, essenceId) }} key={essenceId}>
              <div className="expander">
                <FontAwesomeIcon size="2x" icon={groupExpanded ? faCaretDown : faCaretRight} onClick={(e) => { this.handleEssenceGroupCollapseToggle(e, groupId) }}/>
              </div>
              <div className="image">
                <img src={GetItemImageUrl(essenceId, 1, 1, 1)} />
              </div>
              <span className="label">{essence.name}</span>
            </div>
  }

  RenderEssenceSelector(essenceId, selected) {
    const essence = essences[essenceId];

    return  <div className="selectorListElement" itemselected={selected ? "true" : "false"}  onClick={(e) => { this.handleEssenceSelected(e, essenceId) }} key={essenceId}>
              <div></div>
              <div className="image">
                <img src={GetItemImageUrl(essenceId, 1, 1, 1)} />
              </div>
              <span className="label">{essence.name}</span>
            </div>
  }

  handleEssenceSelected(e, essenceId) {
    e.stopPropagation();
    let newState = {...this.state, selectedEssence : essenceId};
    if (essenceId && CanEssenceItem(this.getState(), this.theoryCrafterContext, essenceId)) {
      newState.selectedActionForModList = "essence";
    }
    else {
      newState.selectedActionForModList = "";
    }
    this.setState(newState);
  }

  handleEssenceGroupCollapseToggle(e, groupName) {
    e.stopPropagation();
    const idx = this.state.expandedEssenceGroups.findIndex((x) => { return x === groupName });
    let newState = null;
    if (idx >= 0) {
      newState = { ...this.state };
      newState.expandedEssenceGroups.splice(idx, 1);
    }
    else {
      newState = { ...this.state, expandedEssenceGroups : [...this.state.expandedEssenceGroups, groupName] };
    }
    this.setState(newState);    
  }

  toggleEssenceSelector() {
    this.setState({...this.state, essencePopupShown : !this.state.essencePopupShown});
  }

  handleSortModsToggled(e) {
    this.setState( {...this.state, sortMods : !this.state.sortMods} );
  }

  selectActionForModList(e, actionName) {
    e.preventDefault();
    const splitActionName = actionName.split(' ')[0];
    if (splitActionName in this.getActionInfoMap && this.getActionInfoMap[splitActionName]) {
      this.setState({...this.state, selectedActionForModList : (splitActionName === this.state.selectedActionForModList ? "" : splitActionName)});
    }
  }

  getSelectedActionForModList() {
    let selectedAction = (this.state.popupActionForModList || this.state.selectedActionForModList);
    if (!selectedAction || (!this.canPerformAction([selectedAction, ...this.getAdditionalActionParametersForModList(selectedAction)].join(" "), this.getState()))) {
      const rarity = this.getState().rarity;
      if (rarity === "normal") {
        return "transmute";
      }
      if (rarity === "magic") {
        return "regal";
      }
      if (rarity === "rare") {
        return "exalt";
      }
      return "exalt";
    }
    return selectedAction;
  }

  getActionInfoFunctionForModList(selectedAction) {
    return this.getActionInfoMap[selectedAction];
  }

  getAdditionalActionParametersForModList(selectedAction) {
    if (selectedAction === "fossil") {
      return [...this.state.selectedFossils];
    }
    if (selectedAction === "exalt_inf") {
      return [this.state.selectedInfluenceExalt];
    }
    if (selectedAction === "essence") {
      return [this.state.selectedEssence];
    }
    // TODO: Add crafting bench here!
    return [];
  }

  onGroupClicked(groupKey) {
    const isExpanded = this.state.expandedGroups.has(groupKey);
    let newSet = new Set(this.state.expandedGroups);
    if (isExpanded) {
      newSet.delete(groupKey);
    }
    else {
      newSet.add(groupKey);
    }
    this.setState({ ...this.state, expandedGroups : newSet });
  }

  toggleNewBaseSelector() {
    this.setState({ ...this.state, newBaseSelectorShown : !this.state.newBaseSelectorShown});
  }

  toggleInfluencedExaltSelector() {
    let newState = { ...this.state, influencedExaltPopupShown : !this.state.influencedExaltPopupShown };
    if (newState.influencedExaltPopupShown)
    { 
      if (CanExaltedWithInfluenceItem(this.getState(), this.theoryCrafterContext, newState.selectedInfluenceExalt)) {
        newState.popupActionForModList = "exalt_inf";
      }
      else {
        newState.popupActionForModList = "";
      }
    }
    else {
      newState.popupActionForModList = "";
      if (CanExaltedWithInfluenceItem(this.getState(), this.theoryCrafterContext, newState.selectedInfluenceExalt)) {
        newState.selectedActionForModList = "exalt_inf";
      }
    }
    this.setState(newState);
  }

  toggleFossilSelector() {
    this.setState({ ...this.state, fossilPopupShown : !this.state.fossilPopupShown });
  }

  render() {
    return [
        <div className="topPanel" key="topPanel">
          <div className="info top">
            Path of Exile Theory Crafter
          </div>
          <div className="info bottom">
            v0.1 - by @jsola
          </div>
        </div>,
        <div className="bottomPanel" key="bottomPanel">
          {[
            this.RenderCraftingPanel(),
            this.RenderModListPanel(),
            this.RenderFossilPopup(this.state.fossilPopupShown),
            this.RenderInfluencedExaltPopup(this.state.influencedExaltPopupShown),
            this.RenderEssencePopup(this.state.essencePopupShown),
            this.RenderNewBasePopup(this.state.newBaseSelectorShown),
          ]}
        </div>
    ]
  }
}

function App() {
  return <TheoryCrafter />
}

export default App;
