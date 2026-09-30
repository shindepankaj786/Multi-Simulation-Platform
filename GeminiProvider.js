'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure you fall back gracefully if GEMINI_API_KEY is not set
class GeminiProvider {
  constructor() {
    this.ai = null;
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  isAvailable() {
    return !!this.ai;
  }

  async generateResponse(systemPrompt, userText) {
    if (!this.ai) return null;
    
    try {
      const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `${systemPrompt}\n\nUser: ${userText}\nResponse:`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.error("Gemini API Error:", e);
      return null;
    }
  }
}

module.exports = new GeminiProvider();
