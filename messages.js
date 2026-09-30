'use strict';

const express = require('express');
const router = express.Router();
const MessageModel = require('../models/message.model');
const { requireAuth } = require('../middleware/sessionAuth');

// POST /api/messages
// Post a message to a session
router.post('/', requireAuth, async (req, res) => {
  const { role, content, payload } = req.body;
  const sessionId = req.session.id;

  if (!role || !content) {
    return res.status(400).json({ error: 'role and content are required' });
  }

  try {
    const textLower = content.trim().toLowerCase();
    const SessionModel = require('../models/session.model');
    const session = await SessionModel.findById(sessionId);

    // TRIGGER: END SIMULATION
    if (textLower === 'end simulation') {
      let evalData;
      let summaryStr = "Simulation ended by user.";
      if (session.module_slug === 'leadership-uncertainty') {
        const LeadershipAssessment = require('../engine/leadershipAssessment');
        const state = session.metadata.assessmentState || LeadershipAssessment.getInitialState();
        evalData = LeadershipAssessment.evaluate(state);
        summaryStr = "Assessment completed early.";
      } else {
        const Evaluator = require('../engine/evaluator');
        evalData = await Evaluator.evaluate(sessionId, session.metadata.mode || 'standard');
      }
      
      const ResultModel = require('../models/result.model');
      await ResultModel.create({
        sessionId,
        moduleSlug: session.module_slug,
        scores: evalData.scores,
        summary: summaryStr,
        rawData: evalData
      });

      return res.json({ 
        endSimulation: true, 
        evaluation: evalData 
      });
    }

    // TRIGGER: PART 2
    const part2Triggers = ['play part 2', 'start advanced mode', 'advanced simulation'];
    if (part2Triggers.includes(textLower)) {
      session.metadata.mode = 'advanced';
      session.metadata.currentCharacter = 'Khaled';
      session.metadata.usedResponseIds = [];
      
      const db = require('../db/pool');
      await db.query(
        `UPDATE sessions SET metadata = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(session.metadata), sessionId]
      );

      const replyMsg = await MessageModel.create({
        sessionId,
        role: 'facilitator',
        content: "Where are we going with this now? I think we are wasting our time.",
        payload: { new_state: 'defensive', character: 'Khaled' }
      });

      return res.json({ 
        userMessage: await MessageModel.create({ sessionId, role, content }),
        replyMessage: replyMsg 
      });
    }

    // 1. Save normal user message
    const msg = await MessageModel.create({
      sessionId,
      role,
      content,
      payload: payload || {}
    });

    // We respond immediately if it's a user message
    if (role === 'user') {
      // Load session to get context
      const SessionModel = require('../models/session.model');
      const session = await SessionModel.findById(sessionId);

      // --- LEADERSHIP ASSESSMENT LOGIC ---
      if (session.module_slug === 'leadership-uncertainty') {
        const LeadershipAssessment = require('../engine/leadershipAssessment');
        const assessmentState = session.metadata.assessmentState || LeadershipAssessment.getInitialState();
        
        const result = LeadershipAssessment.processMessage(content, assessmentState);
        
        if (result.action === 'completed') {
          const evalData = LeadershipAssessment.evaluate(assessmentState);
          
          const ResultModel = require('../models/result.model');
          await ResultModel.create({
            sessionId,
            moduleSlug: session.module_slug,
            scores: evalData.scores,
            summary: "Assessment completed successfully.",
            rawData: evalData
          });

          // Save final system response (report)
          const replyMsg = await MessageModel.create({
            sessionId,
            role: 'facilitator',
            content: result.replyText + '\\n\\n' + evalData.report,
            payload: {}
          });
          
          session.metadata.assessmentState = result.newState;
          const db = require('../db/pool');
          await db.query(
            `UPDATE sessions SET metadata = $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(session.metadata), sessionId]
          );

          return res.json({
            endSimulation: true,
            userMessage: msg,
            replyMessage: replyMsg,
            evaluation: evalData
          });
        }
        
        // Save intermediate system response
        const replyMsg = await MessageModel.create({
          sessionId,
          role: 'facilitator',
          content: result.replyText,
          payload: {}
        });

        session.metadata.assessmentState = result.newState;
        const db = require('../db/pool');
        await db.query(
          `UPDATE sessions SET metadata = $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [JSON.stringify(session.metadata), sessionId]
        );
        
        return res.json({ userMessage: msg, replyMessage: replyMsg });
      }
      // --- END LEADERSHIP ASSESSMENT LOGIC ---

      const RulesEngine = require('../engine/RulesEngine');
      
      const historyMessages = await MessageModel.findBySession(sessionId);
      const chatHistory = historyMessages
        .filter(m => m.role === 'user' || m.role === 'facilitator')
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Supervisor' : 'Employee'}: ${m.content}`)
        .join('\n');

      const engineContext = {
        state: session.metadata.characterState || 'neutral',
        character: session.metadata.currentCharacter || 'Latifa',
        usedIds: session.metadata.usedResponseIds || [],
        moduleSlug: session.module_slug,
        turnCount: (session.metadata.characterTurnCount || 0) + 1,
        chatHistory: chatHistory
      };

      // Process through rules engine
      let engineResult = await RulesEngine.process(content, engineContext);
      let nextCharacter = engineContext.character;
      let newCharacterState = engineResult.newState;
      let characterTurnCount = engineContext.turnCount;
      let transitionMessage = null;

      // Character switching logic: switch if receptive, OR if taking too long (>= 5 turns)
      let shouldEndSimulation = false;
      let evalData = null;
      let transitionMessage = null;
      const oldCharacter = engineContext.character;

      if ((newCharacterState === 'receptive' && characterTurnCount >= 5) || characterTurnCount >= 7) {
        const characters = ['Latifa', 'Ahmed', 'Shamma', 'Khaled'];
        const currentIndex = characters.indexOf(oldCharacter);
        
        if (currentIndex !== -1 && currentIndex < characters.length - 1) {
          nextCharacter = characters[currentIndex + 1];
          newCharacterState = 'neutral';
          characterTurnCount = 0;
          transitionMessage = `**${nextCharacter} – Next Employee**\n\n*Later, ${nextCharacter} approaches your desk.*`;
        } else if (currentIndex === characters.length - 1) {
          shouldEndSimulation = true;
          transitionMessage = `*You have successfully handled all employees and concluded the day.*`;
        }
      }

      // Save the AI's actual response FIRST, using the OLD character's name
      const replyMsg = await MessageModel.create({
        sessionId,
        role: 'facilitator',
        content: engineResult.replyText,
        payload: {
          behavior_detected: engineResult.behavior,
          new_state: newCharacterState, // this can be the updated state
          response_id: engineResult.usedResponseId,
          character: oldCharacter
        }
      });

      // If there's a transition, save it as a separate system message
      let transitionMsgObj = null;
      if (transitionMessage) {
         transitionMsgObj = await MessageModel.create({
           sessionId,
           role: 'system',
           content: transitionMessage,
           payload: { character: 'System' }
         });
      }

      // Update session metadata
      const newUsedIds = [...engineContext.usedIds, engineResult.usedResponseId];
      if (newUsedIds.length > 50) newUsedIds.shift();
      
      session.metadata.characterState = newCharacterState;
      session.metadata.currentCharacter = nextCharacter;
      session.metadata.characterTurnCount = characterTurnCount;
      session.metadata.usedResponseIds = newUsedIds;

      const db = require('../db/pool');
      await db.query(
        `UPDATE sessions SET metadata = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [JSON.stringify(session.metadata), sessionId]
      );

      if (shouldEndSimulation) {
        const Evaluator = require('../engine/evaluator');
        evalData = await Evaluator.evaluate(sessionId, session.metadata.mode || 'standard', session.module_slug);
        
        const ResultModel = require('../models/result.model');
        await ResultModel.create({
          sessionId,
          moduleSlug: session.module_slug,
          scores: evalData.scores,
          summary: "Simulation completed successfully.",
          rawData: evalData
        });
        
        return res.json({ 
          endSimulation: true,
          userMessage: msg, 
          replyMessage: replyMsg,
          transitionMessage: transitionMsgObj,
          evaluation: evalData 
        });
      }

      // Return both messages so the frontend can render immediately
      return res.json({ userMessage: msg, replyMessage: replyMsg, transitionMessage: transitionMsgObj });
    }

    res.json({ userMessage: msg });
  } catch (err) {
    console.error('[Messages Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages
// Get all messages for the current session
router.get('/', requireAuth, async (req, res) => {
  const sessionId = req.session.id;

  try {
    const messages = await MessageModel.findBySession(sessionId);
    res.json(messages);
  } catch (err) {
    console.error('[Messages Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
