'use strict';

const QUESTIONS = [
  "Q1: In uncertain situations, I intentionally seek diverse viewpoints to gain a deeper understanding.",
  "Q2: I can recognize emerging patterns or signals in ambiguous situations ahead of others.",
  "Q3: I support others in understanding complex or fast-changing situations by breaking down key points.",
  "Q4: I stay calm and maintain composure, even under pressure or uncertainty.",
  "Q5: I offer clear guidance to others, even when I don't have complete information.",
  "Q6: I take prompt action and make decisions, even when all the information isn't available.",
  "Q7: I clearly communicate what matters most during uncertain times.",
  "Q8: I make sure my team understands goals and expectations, even as situations evolve.",
  "Q9: I maintain a constructive and positive mindset that helps others stay engaged and focused.",
  "Q10: I recognize how uncertainty affects others emotionally and respond with understanding.",
  "Q11: I make an effort to keep team morale strong during difficult or unclear periods.",
  "Q12: I help create a sense of consistency and reassurance, even when things are changing.",
  "Q13: I emphasize shared values and expected behaviors, especially during uncertain times.",
  "Q14: I address negative or unhelpful behaviors that could harm team culture, even under stress.",
  "Q15: I ensure that my decisions and actions reflect our core values, even in challenging situations.",
  "Q16: I demonstrate the behaviors I expect others to follow during uncertain times.",
  "Q17: I promote open dialogue and create an environment where people feel safe to share their thoughts.",
  "Q18: I build trust and encourage collaboration within the team during periods of uncertainty.",
  "Q19: I consciously maintain a respectful and positive team atmosphere, even under pressure.",
  "Q20: I take purposeful steps to strengthen team unity during uncertain times."
];

const INTRO_TEXT = `You'll be presented with 20 statements, one at a time. For each, respond using this scale:
1 = Rarely
2 = Sometimes
3 = Often
4 = Almost Always

Try to answer instinctively based on how you typically show up as a leader during uncertainty.

${QUESTIONS[0]}`;

const ROLE_TEMPLATES = {
  'Sense-Maker': {
    meaning: "Sense-Makers excel at gathering information, seeking diverse viewpoints, and identifying emerging patterns when situations are ambiguous.",
    showsUp: "They provide clarity by breaking down complex situations and helping others understand the 'why' behind changes.",
    behaves: "In uncertainty, they remain curious, avoid jumping to conclusions, and actively synthesize fragmented data into a cohesive picture.",
    risks: "If underdeveloped, teams may act on incomplete information, misinterpret market signals, or struggle to understand the underlying causes of disruption.",
    steps: [
      "Actively solicit input from team members with different backgrounds or perspectives.",
      "Set aside time specifically for reflection and analyzing trends, even when busy.",
      "Practice breaking down complex problems into smaller, understandable components for your team.",
      "Challenge your own assumptions by asking 'What am I missing?'"
    ]
  },
  'Direction-Giver': {
    meaning: "Direction-Givers provide clear guidance, take prompt action, and make decisive choices even with incomplete information.",
    showsUp: "They set expectations, prioritize goals, and ensure everyone knows what matters most in the present moment.",
    behaves: "In uncertainty, they decisively navigate ambiguity, keeping the team moving forward instead of stalling in analysis paralysis.",
    risks: "If underdeveloped, teams may drift, lose momentum, or become paralyzed by indecision due to a lack of clear priorities.",
    steps: [
      "Focus on communicating the 'next best step' rather than waiting for a perfect long-term plan.",
      "Be transparent about what you know and what you don't know, but still make a call.",
      "Regularly realign the team on top priorities as situations evolve.",
      "Empower others to make decisions within defined guardrails."
    ]
  },
  'Energy-Holder': {
    meaning: "Energy-Holders maintain a constructive mindset, manage their own composure, and recognize the emotional toll of uncertainty on others.",
    showsUp: "They provide reassurance, support team morale, and create consistency amidst chaos.",
    behaves: "In uncertainty, they act as a stabilizing force, absorbing stress and radiating calm and optimism.",
    risks: "If underdeveloped, anxiety can spread unchecked, morale may plummet, and burnout can accelerate during prolonged uncertainty.",
    steps: [
      "Practice self-regulation techniques to maintain composure before reacting to stressful news.",
      "Check in on your team's emotional well-being, not just their task progress.",
      "Celebrate small wins to maintain momentum and a positive outlook.",
      "Create predictable routines to offer a sense of stability when external factors are chaotic."
    ]
  },
  'Culture-Protector': {
    meaning: "Culture-Protectors emphasize shared values, address unhelpful behaviors, and foster an environment of trust and open dialogue.",
    showsUp: "They ensure that actions and decisions reflect core principles, even under extreme pressure.",
    behaves: "In uncertainty, they act as the guardian of psychological safety and team unity, ensuring the culture doesn't degrade.",
    risks: "If underdeveloped, toxic behaviors can emerge under stress, trust can erode, and the team may compromise its core values for short-term gains.",
    steps: [
      "Regularly connect daily tasks and decisions back to the organization's core values.",
      "Address negative behaviors immediately, before they become normalized under stress.",
      "Actively foster psychological safety by encouraging open and honest dialogue.",
      "Model the exact behaviors you want to see from your team, especially when it's difficult."
    ]
  }
};

class LeadershipAssessment {
  getInitialState() {
    return {
      questionIndex: 0,
      answers: [], // Array of integers 1-4
      isCompleted: false
    };
  }

  processMessage(content, state) {
    const text = content.trim();

    // End simulation early support
    if (text.toLowerCase() === 'end simulation') {
      return { action: 'end_early' };
    }

    const answer = parseInt(text, 10);
    if (isNaN(answer) || answer < 1 || answer > 4) {
      return {
        newState: state,
        replyText: "Please respond with a valid number (1–4)."
      };
    }

    // Valid answer
    state.answers.push(answer);
    state.questionIndex += 1;

    if (state.questionIndex >= QUESTIONS.length) {
      state.isCompleted = true;
      return {
        newState: state,
        replyText: "Thank you for completing the assessment.",
        action: 'completed'
      };
    }

    let nextText = "";
    if (state.questionIndex > 0 && state.questionIndex % 5 === 0) {
      nextText += `You're on Question ${state.questionIndex + 1} of 20.\n\n`;
    }
    nextText += QUESTIONS[state.questionIndex];

    return {
      newState: state,
      replyText: nextText
    };
  }

  evaluate(state) {
    const a = state.answers;
    // 0-indexed in array, so Q1 is a[0], Q20 is a[19]
    // Sense-Maker = Q1+Q2+Q3 (indices 0, 1, 2)
    const senseMaker = (a[0] || 0) + (a[1] || 0) + (a[2] || 0);
    // Direction-Giver = Q5+Q6+Q7+Q8 (indices 4, 5, 6, 7)
    const directionGiver = (a[4] || 0) + (a[5] || 0) + (a[6] || 0) + (a[7] || 0);
    // Energy-Holder = Q4+Q9+Q10+Q11+Q12 (indices 3, 8, 9, 10, 11)
    const energyHolder = (a[3] || 0) + (a[8] || 0) + (a[9] || 0) + (a[10] || 0) + (a[11] || 0);
    // Culture-Protector = Q13+Q14+Q15+Q16+Q17+Q18+Q19+Q20 (indices 12 to 19)
    const cultureProtector = (a[12] || 0) + (a[13] || 0) + (a[14] || 0) + (a[15] || 0) + 
                             (a[16] || 0) + (a[17] || 0) + (a[18] || 0) + (a[19] || 0);

    const smPct = Math.round((senseMaker / 12) * 100);
    const dgPct = Math.round((directionGiver / 16) * 100);
    const ehPct = Math.round((energyHolder / 20) * 100);
    const cpPct = Math.round((cultureProtector / 32) * 100);

    const roles = [
      { name: 'Sense-Maker', score: senseMaker, max: 12, pct: smPct },
      { name: 'Direction-Giver', score: directionGiver, max: 16, pct: dgPct },
      { name: 'Energy-Holder', score: energyHolder, max: 20, pct: ehPct },
      { name: 'Culture-Protector', score: cultureProtector, max: 32, pct: cpPct }
    ];

    roles.sort((a, b) => b.pct - a.pct); // Highest to lowest

    const dominant = roles[0];
    const secondary = roles[1];
    const weakest = roles[roles.length - 1];

    const domTmpl = ROLE_TEMPLATES[dominant.name];
    const secTmpl = ROLE_TEMPLATES[secondary.name];
    const weakTmpl = ROLE_TEMPLATES[weakest.name];

    const report = `### Your Leadership Profile in Uncertainty

**Scores by Role:**

* **Sense-Maker:** Q1 (${a[0] || 0}) + Q2 (${a[1] || 0}) + Q3 (${a[2] || 0}) = **${senseMaker}/12 (${smPct}%)**
* **Direction-Giver:** Q5 (${a[4] || 0}) + Q6 (${a[5] || 0}) + Q7 (${a[6] || 0}) + Q8 (${a[7] || 0}) = **${directionGiver}/16 (${dgPct}%)**
* **Energy-Holder:** Q4 (${a[3] || 0}) + Q9 (${a[8] || 0}) + Q10 (${a[9] || 0}) + Q11 (${a[10] || 0}) + Q12 (${a[11] || 0}) = **${energyHolder}/20 (${ehPct}%)**
* **Culture-Protector:** Q13 (${a[12] || 0}) + Q14 (${a[13] || 0}) + Q15 (${a[14] || 0}) + Q16 (${a[15] || 0}) + Q17 (${a[16] || 0}) + Q18 (${a[17] || 0}) + Q19 (${a[18] || 0}) + Q20 (${a[19] || 0}) = **${cultureProtector}/32 (${cpPct}%)**

**Role profile, highest to lowest:**

1. ${roles[0].name} — ${roles[0].pct}%
2. ${roles[1].name} — ${roles[1].pct}%
3. ${roles[2].name} — ${roles[2].pct}%
4. ${roles[3].name} — ${roles[3].pct}%

### Dominant Role

**${dominant.name} — ${dominant.pct}%**

${domTmpl.meaning}

This can show up as:

* ${domTmpl.showsUp}
* ${domTmpl.behaves}

### Secondary Strength

**${secondary.name} — ${secondary.pct}%**

${secTmpl.meaning}
${secTmpl.showsUp}

### Weakest Role

**${weakest.name} — ${weakest.pct}%**

${weakTmpl.meaning}

**Key risks in uncertainty:**

* ${weakTmpl.risks}

### How to Strengthen the Weakest Role

${weakTmpl.steps.map((s, idx) => (idx + 1) + ". **Action:**\\n   " + s).join('\\n\\n')}

### How to Balance All 4 Roles

The ideal sequence is:

**Sense-Making → Direction → Energy → Culture**

First, understand what is happening and gather perspectives.
Then translate that understanding into clear priorities and decisions.
Next, maintain people's confidence, engagement, and emotional capacity.
Finally, reinforce the behaviors, values, trust, and collaboration needed to sustain the team.

### Bottom-Line Summary

Your core strength lies in being a **${dominant.name}**, supported by **${secondary.name}** capabilities. Your biggest opportunity for growth during uncertain times is developing your **${weakest.name}** skills. Focus on the action steps above to create a more balanced leadership approach.`;

    return {
      scores: {
        senseMaker: smPct,
        directionGiver: dgPct,
        energyHolder: ehPct,
        cultureProtector: cpPct
      },
      report,
      rawRoles: roles
    };
  }
}

module.exports = new LeadershipAssessment();
module.exports.INTRO_TEXT = INTRO_TEXT;
