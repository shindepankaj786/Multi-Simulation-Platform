'use strict';

/**
 * Classifies user input into a behavior category using keyword matching.
 */
class Classifier {
  constructor() {
    this.patterns = {
      directive: /\b(must|should|have to|need to|do this|tell you|expect)\b/i,
      blaming: /\b(your fault|you failed|you messed up|why didn't you|always|never)\b/i,
      supportive: /\b(here to help|support|together|we can|good job|great work)\b/i,
      empathetic: /\b(understand|feel|must be hard|sorry to hear|i see why)\b/i,
      dismissive: /\b(not a big deal|get over it|moving on|doesn't matter|whatever)\b/i,
      clarification: /\b(what do you mean|can you explain|clarify|elaborate)\b/i,
      coaching: /\b(how could we|what do you think|how might you|ideas)\b/i
    };
  }

  classify(text) {
    if (!text || typeof text !== 'string') return 'vague';

    for (const [category, regex] of Object.entries(this.patterns)) {
      if (regex.test(text)) {
        return category;
      }
    }
    return 'vague'; // Default if no keywords match
  }
}

module.exports = new Classifier();
