/**
 * SimulationEngine
 * Reusable engine for managing the state of a simulation session.
 * Important: The application controls the simulation state, not the AI/backend responses.
 */
class SimulationEngine {
    constructor(config = {}) {
        this.scenario = config.scenario || 'Default Scenario';
        this.character = config.character || { name: 'Facilitator', role: 'system' };
        this.currentState = config.initialState || 'initialized';
        this.conversationHistory = [];
        this.turnNumber = 0;
        this.maxTurns = config.maxTurns || 20;
        this.nextAction = null;
        
        // Listeners for UI updates
        this.onStateChange = config.onStateChange || (() => {});
        this.onMessageAdded = config.onMessageAdded || (() => {});
        this.onSimulationEnd = config.onSimulationEnd || (() => {});
    }

    /**
     * Start the simulation
     */
    start() {
        this.currentState = 'running';
        this.turnNumber = 1;
        this.onStateChange(this.currentState);
        
        // System prompt or initial scenario description could be added here
        this.addMessage({
            role: 'system',
            content: `Scenario: ${this.scenario}. You are interacting with ${this.character.name}.`
        });
    }

    /**
     * Add a message to the history and increment turn if it's a user action
     * @param {Object} message - { role: 'user'|'system'|'facilitator', content: 'text', payload: {} }
     */
    addMessage(message) {
        const msg = {
            id: Date.now(),
            turn: this.turnNumber,
            timestamp: new Date().toISOString(),
            ...message
        };
        
        this.conversationHistory.push(msg);
        this.onMessageAdded(msg);

        // If the user just spoke, we expect the system/character to reply next
        if (message.role === 'user') {
            this.nextAction = 'wait_for_response';
            this.turnNumber++;
            
            if (this.turnNumber > this.maxTurns) {
                this.end('max_turns_reached');
            }
        } else {
            this.nextAction = 'wait_for_user';
        }
    }

    /**
     * Advance the state based on external rules (handled by the app, not hardcoded in responses)
     */
    updateState(newState, context = {}) {
        this.currentState = newState;
        this.onStateChange(this.currentState, context);
    }

    /**
     * Set the active character (handled by application logic/rules engine)
     */
    setCharacter(characterData) {
        this.character = characterData;
        this.addMessage({
            role: 'system',
            content: `Character switched to ${this.character.name}.`
        });
    }

    /**
     * End the simulation
     */
    end(reason = 'completed') {
        this.currentState = 'ended';
        this.nextAction = null;
        this.onStateChange(this.currentState, { reason });
        this.onSimulationEnd({
            reason,
            turns: this.turnNumber,
            history: this.conversationHistory
        });
    }

    /**
     * Get current state snapshot
     */
    getSnapshot() {
        return {
            scenario: this.scenario,
            character: this.character,
            state: this.currentState,
            turn: this.turnNumber,
            maxTurns: this.maxTurns,
            nextAction: this.nextAction
        };
    }
}

// Export for frontend use (window object attachment for vanilla JS)
window.SimulationEngine = SimulationEngine;
