'use strict';

const classifier = require('./classifier');
const stateManager = require('./stateManager');
const responseSelector = require('./responseSelector');
const LocalAIProvider = require('./LocalAIProvider');

class RulesEngine {
  /**
   * Process a user message and determine the system's response.
   * @param {string} userText The text input from the user
   * @param {Object} context The current session context
   * @returns {Object} { replyText, newState, usedResponseId, behavior }
   */
  async process(userText, context) {
    const currentState = context.state || 'neutral';
    const character = context.character || 'default';
    const usedIds = context.usedIds || [];
    const moduleSlug = context.moduleSlug || 'default';

    // 1. Classify Behavior
    const behavior = classifier.classify(userText);

    // 2. Update State
    const newState = stateManager.updateState(currentState, behavior);

    // 3. Generate or Select Response
    let replyText = "";
    let usedResponseId = "ai-generated-" + Date.now();

    let charDesc = "";
    if (character === 'Latifa') {
      charDesc = "You are Latifa (Data Entry Officer). New, inexperienced, needs clear direction and confidence-building. You respond well to public recognition but may hesitate to ask for help. You value respect and a supervisor who listens to facts and feelings.";
    } else if (character === 'Ahmed') {
      charDesc = "You are Ahmed (Customer Service). Relatively new but motivated with useful ideas. You respond well to purpose, growth opportunities, and increasing autonomy. You value transparency and a boss who listens to facts and feelings.";
    } else if (character === 'Shamma') {
      charDesc = "You are Shamma (Teller). Capable and trustworthy. You prefer empowerment over micromanagement. You sometimes focus on concerns about colleagues, workload, or salary. You value a strong relationship and being heard on both facts and feelings.";
    } else if (character === 'Khaled') {
      charDesc = "You are Khaled (Accountant). Highly experienced, self-sufficient, requiring minimal supervision. You need little recognition but appreciate reassurance during periods of financial/health concerns. You value a boss who listens to facts/emotions and places high importance on trust.";
    }

    if (LocalAIProvider.isAvailable()) {
      const chatHistory = context.chatHistory ? `\nRecent conversation history:\n${context.chatHistory}\n` : '';

      const systemPrompt = `${charDesc}
You are in a banking simulation (${moduleSlug}). Your current mood/state is: ${newState}.
${chatHistory}
The user is your manager/supervisor. They just spoke to you and demonstrated a "${behavior}" behavior.
Your instructions:
- Challenge vague answers.
- Reject the wrong style of coaching.
- Become convinced only if the supervisor builds rapport, communicates clearly, shows they care for your wellbeing, and gives you autonomy/purpose.
- Speak naturally, like a real employee. Keep it concise (1-3 sentences max).
- Do NOT repeat what you just said. Acknowledge what the user just told you.
- NEVER break character. Do not say you are an AI.
- FORMATTING REQUIREMENT: Always include a brief physical action or emotion in italics (like *Latifa crosses her arms.* or *Ahmed smiles slightly.*) followed by your spoken dialogue in quotation marks. Separate paragraphs using a blank line.`;
      
      const aiResponse = await LocalAIProvider.generateResponse(systemPrompt, userText);
      if (aiResponse) {
        replyText = aiResponse.trim();
      }
    }

    // Fallback if AI fails or is not available
    if (!replyText) {
      const responseObj = responseSelector.selectResponse(moduleSlug, character, newState, behavior, usedIds);
      replyText = responseObj.text;
      usedResponseId = responseObj.id;
    }

    return {
      replyText,
      newState: newState,
      usedResponseId: usedResponseId,
      behavior: behavior
    };
  }
}

module.exports = new RulesEngine();
