import React from 'react';
import './App.css';
import mods from './data/mods.json';
import stat_translations from './data/stat_translations.json';
import TranslationHelper from './Translation.js';

function PropertyLine (props) {
  return <div class="property">{props.line}</div>
}

class TheoryCraft extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return <PropertyLine line="+8-13 Added Physical Damage" />
  }
}

function App() {
  const mod = mods["LocalIncreasedPhysicalDamageReductionRatingPercentAndAdditionalBlockChance1"];
  const translationStrings = TranslationHelper.TranslateMod(stat_translations, mod);
  return <div>{translationStrings.map(x => <div>{x}</div>)}</div>
}

export default App;
