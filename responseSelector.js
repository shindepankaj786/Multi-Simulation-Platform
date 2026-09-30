'use strict';

const fs = require('fs');
const path = require('path');

// Cache databases in memory
const dbCache = {};

function getDatabase(moduleSlug) {
  if (dbCache[moduleSlug]) {
    return dbCache[moduleSlug];
  }

  try {
    const dbPath = path.join(__dirname, 'database', `${moduleSlug}.json`);
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      dbCache[moduleSlug] = data;
      return data;
    }
  } catch (err) {
    console.error(`Error loading database for module ${moduleSlug}:`, err);
  }

  // Fallback to default if module-specific DB doesn't exist
  if (!dbCache['default']) {
    const defaultPath = path.join(__dirname, 'database', 'defaultResponses.json');
    if (fs.existsSync(defaultPath)) {
      dbCache['default'] = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    } else {
      dbCache['default'] = [];
    }
  }
  return dbCache['default'];
}

class ResponseSelector {
  /**
   * Selects an appropriate response.
   * @param {string} moduleSlug
   * @param {string} character 
   * @param {string} state 
   * @param {string} behavior 
   * @param {Array<string>} usedIds Array of previously used response IDs
   */
  selectResponse(moduleSlug, character, state, behavior, usedIds = []) {
    const db = getDatabase(moduleSlug);

    // 1. Filter by exact match (character, state, behavior)
    let candidates = db.filter(r => 
      r.character === character &&
      r.state === state &&
      r.trigger_behavior === behavior
    );

    // 2. Filter out recently used ones to prevent repetition
    let freshCandidates = candidates.filter(r => !usedIds.includes(r.id));

    // 3. Fallbacks if no fresh exact matches
    if (freshCandidates.length === 0) {
      // Relax behavior matching, just match state
      candidates = db.filter(r => 
        r.character === character &&
        r.state === state
      );
      freshCandidates = candidates.filter(r => !usedIds.includes(r.id));
    }

    if (freshCandidates.length === 0) {
      // Relax character matching, but match state
      candidates = db.filter(r => 
        (r.character === character || r.character === 'default' || r.character === 'any') &&
        r.state === state
      );
      freshCandidates = candidates.filter(r => !usedIds.includes(r.id));
    }

    if (freshCandidates.length === 0) {
      // Total fallback to 'any' state/behavior for this character
      freshCandidates = db.filter(r => (r.character === character || r.character === 'any') && r.state === 'any' && !usedIds.includes(r.id));
    }

    // 4. Final fallback (reuse if absolutely necessary)
    if (freshCandidates.length === 0) {
      freshCandidates = db.filter(r => r.character === character || r.character === 'any' || r.character === 'default');
      if (freshCandidates.length === 0) freshCandidates = db; // absolute worst case
    }

    // 5. Pick a random candidate from the final pool
    const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
    
    // If somehow DB is completely empty
    if (!selected) return { id: 'fallback-0', text: "I have no response right now." };

    // Inject character-specific actions based on their current state
    const actions = {
      'Latifa': {
        'neutral': ['*Latifa approaches your desk, looking slightly nervous but determined.*', '*Latifa nods, clearly appreciating the specificity.*', '*Latifa looks thoughtfully at her notes.*'],
        'receptive': ['*Latifa smiles and nods confidently.*', '*Latifa relaxes her posture, feeling supported.*', '*Latifa packs up her notes, feeling much better.*'],
        'defensive': ['*Latifa crosses her arms defensively.*', '*Latifa frowns, looking a bit overwhelmed.*'],
        'any': ['*Latifa listens closely.*', '*Latifa shifts nervously.*']
      },
      'Ahmed': {
        'neutral': ['*Ahmed approaches you after finishing with a customer.*', '*Ahmed leans forward, looking motivated.*'],
        'receptive': ['*Ahmed looks encouraged.*', '*Ahmed smiles, appreciating the autonomy.*'],
        'defensive': ['*Ahmed seems slightly frustrated.*', '*Ahmed sighs softly.*'],
        'any': ['*Ahmed listens to your feedback.*']
      },
      'Shamma': {
        'neutral': ['*Shamma stops by your office.*', '*Shamma maintains eye contact, waiting for your response.*'],
        'receptive': ['*Shamma nods, feeling respected.*', '*Shamma smiles, glad to be heard.*'],
        'defensive': ['*Shamma looks slightly annoyed.*', '*Shamma narrows her eyes slightly.*'],
        'any': ['*Shamma listens quietly.*']
      },
      'Khaled': {
        'neutral': ['*Khaled steps into your office, holding a folder.*', '*Khaled gives a brief, professional nod.*'],
        'receptive': ['*Khaled seems reassured.*', '*Khaled relaxes visibly.*'],
        'defensive': ['*Khaled stiffens, clearly preferring his independence.*', '*Khaled frowns, unhappy with the micromanagement.*'],
        'any': ['*Khaled listens attentively.*']
      }
    };
    
    let charActions = actions[selected.character] || actions['Latifa'];
    let stateActions = charActions[selected.state] || charActions['any'];
    if (!stateActions || stateActions.length === 0) stateActions = charActions['any'];
    
    const randomAction = stateActions[Math.floor(Math.random() * stateActions.length)];
    
    // Check if the text already contains quotes, if not, wrap it
    let dialogue = selected.text;
    if (!dialogue.startsWith('"')) {
       dialogue = `"${dialogue}"`;
    }
    
    return { 
      id: selected.id, 
      text: `${randomAction}\n\n${dialogue}` 
    };
  }
}

module.exports = new ResponseSelector();
