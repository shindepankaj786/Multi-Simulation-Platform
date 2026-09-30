'use strict';

/**
 * Manages character state transitions based on behavior inputs.
 */
class StateManager {
  /**
   * Calculate next state based on current state and the user's behavior.
   * @param {string} currentState (e.g., 'neutral', 'defensive', 'receptive')
   * @param {string} behavior 
   * @returns {string} The new state
   */
  updateState(currentState, behavior) {
    let state = currentState || 'neutral';

    // Shifts towards defensive
    if (['blaming', 'dismissive'].includes(behavior)) {
      state = 'defensive';
    } 
    // Directive makes neutral people defensive, but keeps defensive people defensive
    else if (behavior === 'directive') {
      if (state === 'neutral') state = 'defensive';
      if (state === 'receptive') state = 'neutral';
    }
    // Shifts towards receptive
    else if (['supportive', 'empathetic', 'coaching'].includes(behavior)) {
      if (state === 'defensive') state = 'neutral'; // Requires two steps to become receptive from defensive
      else state = 'receptive';
    }
    // Neutral behaviors might slowly normalize the state
    else if (['clarification', 'vague'].includes(behavior)) {
      if (state === 'receptive') state = 'neutral';
      // Defensive people stay defensive if you're just vague
    }

    return state;
  }
}

module.exports = new StateManager();
