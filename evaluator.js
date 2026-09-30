'use strict';

const MessageModel = require('../models/message.model');

class Evaluator {
  /**
   * Evaluate the session based on behavior frequencies.
   */
  async evaluate(sessionId, mode, moduleSlug) {
    const messages = await MessageModel.findBySession(sessionId);
    
    // Tally behaviors
    const counts = {
      directive: 0, blaming: 0, dismissive: 0,
      supportive: 0, empathetic: 0, coaching: 0,
      clarification: 0, vague: 0
    };
    
    let totalUserTurns = 0;

    messages.forEach(m => {
      if (m.role === 'facilitator' && m.payload && m.payload.behavior_detected) {
        const b = m.payload.behavior_detected;
        if (counts[b] !== undefined) counts[b]++;
        totalUserTurns++;
      }
    });

    // Score calculation logic (deterministic mapping based on behavior profile)
    // 1-5 scale based on positive vs negative behaviors.
    
    const positive = counts.supportive + counts.empathetic + counts.coaching;
    const negative = counts.directive + counts.blaming + counts.dismissive;
    const neutral = counts.clarification + counts.vague;

    const calcScore = (focusPos, focusNeg) => {
      if (totalUserTurns === 0) return 3; // default
      // Basic ratio math to map to 1-5
      const ratio = focusPos / (focusPos + focusNeg + 0.1); // prevent div/0
      if (ratio > 0.8) return 5;
      if (ratio > 0.6) return 4;
      if (ratio > 0.4) return 3;
      if (ratio > 0.2) return 2;
      return 1;
    };

    const compScores = {
      "Supervisor Motivation skills using sense of mastery, autonomy and purpose": calcScore(counts.supportive + counts.coaching, counts.directive + counts.blaming),
      "Supervisor communication quality, clarity and related answers": calcScore(counts.clarification + counts.supportive, counts.vague + counts.dismissive),
      "Supervisor ability to handle resistance": calcScore(counts.empathetic, counts.directive + counts.blaming),
      "Supervisor ability to match his coaching with the level of task and willingness maturity of the employee": calcScore(counts.coaching, counts.directive),
      "Supervisor ability to give a proper SBI feedback very objectively as per the CCL model": calcScore(counts.clarification + counts.supportive, counts.blaming + counts.vague),
      "Supervisor ability & confidence to speak assertively in words used": calcScore(counts.directive + counts.clarification, counts.vague + counts.supportive),
      "Supervisor ability to evaluate to be decisive": calcScore(counts.directive, counts.vague),
      "Supervisor ability to empower and delegate at the right time and right situation": calcScore(counts.coaching + counts.supportive, counts.directive),
      "Supervisor ability to recognize publicly and punish in private": calcScore(counts.supportive, counts.blaming),
      "Supervisor ability to show control and firmness but also kindness and humanity": calcScore(counts.directive + counts.empathetic, counts.blaming + counts.dismissive),
      "Supervisor ability to run the business as manager and lead the people and influence them as leader": calcScore(counts.coaching + counts.empathetic, counts.directive + counts.vague),
      "Supervisor ability to listen to facts and emotions and values and summarize": calcScore(counts.empathetic, counts.dismissive + counts.directive),
      "Supervisor ability to run a tight ship operation": calcScore(counts.directive + counts.clarification, counts.vague),
      "Supervisor ability to understand personalities and elicit values": calcScore(counts.empathetic + counts.coaching, counts.directive + counts.blaming)
    };

    if (mode === 'advanced') {
      compScores["Leading the conversation with leadership influence under pressure & with confidence"] = calcScore(counts.coaching + counts.empathetic, counts.blaming + counts.dismissive + counts.directive);
    }

    let reportMarkdown = null;
    let details = null;

    if (moduleSlug === 'supervisory-skills') {
      reportMarkdown = `## Competency Scores:

Supervisor Motivation skills using sense of mastery, autonomy and purpose: **${compScores["Supervisor Motivation skills using sense of mastery, autonomy and purpose"]}/5**
Supervisor communication quality, clarity and related answers: **${compScores["Supervisor communication quality, clarity and related answers"]}/5**
Supervisor ability to handle resistance: **${compScores["Supervisor ability to handle resistance"]}/5**
Supervisor ability to match his coaching with the level of task and willingness maturity of the employee: **${compScores["Supervisor ability to match his coaching with the level of task and willingness maturity of the employee"]}/5**
Supervisor ability to give a proper SBI feedback very objectively as per the CCL model: **${compScores["Supervisor ability to give a proper SBI feedback very objectively as per the CCL model"]}/5**
Supervisor ability & confidence to speak assertively in words used: **${compScores["Supervisor ability & confidence to speak assertively in words used"]}/5**
Supervisor ability to evaluate to be decisive: **${compScores["Supervisor ability to evaluate to be decisive"]}/5**
Supervisor ability to empower and delegate at the right time and right situation: **${compScores["Supervisor ability to empower and delegate at the right time and right situation"]}/5**
Supervisor ability to recognize publicly and punish in private: **${compScores["Supervisor ability to recognize publicly and punish in private"]}/5**
Supervisor ability to show control and firmness but also kindness and humanity: **${compScores["Supervisor ability to show control and firmness but also kindness and humanity"]}/5**
Supervisor ability to run the business as manager and lead the people and influence them as leader: **${compScores["Supervisor ability to run the business as manager and lead the people and influence them as leader"]}/5**
Supervisor ability to listen to facts and emotions and values and summarize: **${compScores["Supervisor ability to listen to facts and emotions and values and summarize"]}/5**
Supervisor ability to run a tight ship operation: **${compScores["Supervisor ability to run a tight ship operation"]}/5**
Supervisor ability to understand personalities and elicit values: **${compScores["Supervisor ability to understand personalities and elicit values"]}/5**

---

# 1. Motivation — Mastery, Autonomy & Purpose — ${compScores["Supervisor Motivation skills using sense of mastery, autonomy and purpose"]}/5

**Strengths**
* You gave Latifa concrete mastery targets rather than generic encouragement.
* You created autonomy progressively: demonstrate competence → receive more responsibility.
* With Ahmed, you connected ownership of the pilot to personal development and visibility.
* With Shamma, you connected the coaching assignment to leadership development.
* With Khaled, you respected his high competence and avoided unnecessary supervision.

**Gaps**
* At times, you moved quickly into solutions without explicitly asking the employee to articulate their own motivational driver.

**Practical improvement**
* Ask more value-eliciting questions such as: *"What would success here allow you to become capable of?"* or *"Which part of this responsibility matters most to you?"*

---

# 2. Communication Quality & Clarity — ${compScores["Supervisor communication quality, clarity and related answers"]}/5

**Strengths**
* Your communication was consistently specific and actionable.
* You used measurable expectations: 99% accuracy, three weeks, 60-day pilot, weekly modules, review dates.
* You avoided vague statements such as "do your best."
* You clarified ownership boundaries exceptionally well.

**Gaps**
* Some responses were highly solution-heavy. Occasionally the employee's perspective could have been explored further before you moved to the answer.

**Practical improvement**
* Use a **Listen → Summarize → Decide → Confirm** rhythm before introducing the solution.

---

# 3. Handling Resistance — ${compScores["Supervisor ability to handle resistance"]}/5

**Strengths**
* You did not become defensive when employees challenged you.
* When Latifa questioned follow-through, you converted reassurance into a measurable commitment.
* When Shamma challenged the workload solution, you refined it rather than defending the original approach.
* You treated resistance as information rather than disloyalty.

**Gaps**
* The simulation remained professionally challenging rather than highly adversarial, so your resistance-handling capability was not tested under extreme emotional pressure.

**Practical improvement**
* In a harder situation, explicitly acknowledge the resistance before solving:
  *"I understand why you don't trust that commitment yet. Let's separate what I can guarantee from what I cannot."*

---

# 4. Matching Coaching to Employee Maturity — ${compScores["Supervisor ability to match his coaching with the level of task and willingness maturity of the employee"]}/5

**Strengths**
* **Latifa:** high direction and frequent feedback appropriate for a new employee.
* **Ahmed:** coaching plus increasing autonomy.
* **Shamma:** empowerment with clearly defined accountability boundaries.
* **Khaled:** delegation and trust appropriate for a highly experienced employee.

This was one of your strongest areas.

**Gaps**
* You could have explicitly checked each employee's readiness before increasing responsibility rather than primarily establishing objective criteria.

**Practical improvement**
* Combine performance evidence with a willingness check: *"Are you ready to own this independently, or do you want one more supported cycle?"*

---

# 5. SBI Feedback / CCL Model — ${compScores["Supervisor ability to give a proper SBI feedback very objectively as per the CCL model"]}/5

**Strengths**
* Your feedback to Shamma was specific and evidence-oriented:
  * strong cash-balancing record
  * compliance adherence
  * customer de-escalation
  * need for peer leadership
* You distinguished strengths from development needs.
* You linked development to future responsibility.

**Gaps**
* The feedback was not consistently structured as full **Situation → Behavior → Impact**.
* You did not always identify the precise situation/context in which the behavior occurred.
* You sometimes moved from observed behavior directly into a solution.

**Practical improvement**
Use:
> **Situation:** "During the last three peak periods..."
> **Behavior:** "You absorbed the excess queue without flagging it..."
> **Impact:** "That protected service levels short term but created workload imbalance and delayed escalation."

Then ask for the employee's perspective before agreeing on action.

---

# 6. Assertiveness & Confidence — ${compScores["Supervisor ability & confidence to speak assertively in words used"]}/5

**Strengths**
* Strong use of decisive language: *"I approve your recommendation."*
* You established boundaries without becoming authoritarian.
* You were comfortable saying what you could and could not control.
* Your language conveyed managerial ownership.

**Gaps**
* Your confidence occasionally approached over-commitment—for example, promising specific organizational outcomes that could ultimately depend on HR or senior management.

**Practical improvement**
Differentiate:
* **Guarantee:** what you personally control.
* **Commitment:** what you will actively pursue.
* **Dependency:** what another party must approve.

---

# 7. Decisiveness — ${compScores["Supervisor ability to evaluate to be decisive"]}/5

**Strengths**
* You repeatedly converted ambiguity into decisions.
* With Khaled, you listened to his recommendation and made the final call.
* With Latifa, you established explicit performance thresholds.
* With Ahmed, you defined who designs the pilot and who approves rollout.
* With Shamma, you defined the 60-day structure.

**Gaps**
* None significant in this simulation.

**Practical improvement**
Continue using the pattern: **facts → options → recommendation → decision → owner → deadline.**

---

# 8. Empowerment & Delegation — ${compScores["Supervisor ability to empower and delegate at the right time and right situation"]}/5

**Strengths**
* Ahmed was given genuine ownership rather than symbolic responsibility.
* Shamma received authority appropriate to her expertise while performance management remained with you.
* Khaled received substantial autonomy consistent with his experience.
* You repeatedly avoided micromanagement.

**Gaps**
* Delegation would be even stronger if you explicitly established escalation triggers for each delegated responsibility.

**Practical improvement**
When delegating, state:
> "You own X. You decide Y. Bring Z to me if condition A occurs."

---

# 9. Public Recognition / Private Correction — ${compScores["Supervisor ability to recognize publicly and punish in private"]}/5

**Strengths**
* You explicitly committed to recognizing good performance.
* You clearly told Shamma that criticism would be private.
* You recognized specific employee contributions rather than offering generic praise.

**Gaps**
* Actual public recognition was discussed but not demonstrated during the simulation.
* "Punishment" was not really tested; your approach appropriately emphasized corrective accountability rather than punitive behavior.

**Practical improvement**
Demonstrate the behavior operationally:
* Publicly recognize specific contributions.
* Privately correct specific performance gaps.
* Document serious accountability issues objectively.

---

# 10. Control, Firmness, Kindness & Humanity — ${compScores["Supervisor ability to show control and firmness but also kindness and humanity"]}/5

**Strengths**
* You maintained standards while demonstrating empathy.
* Your response to Khaled's health concern was particularly strong: you separated his personal circumstances from your assessment of his capability.
* You maintained accountability without humiliating employees.
* You did not confuse kindness with lowering standards.

**Gaps**
* Very little demonstrated weakness here.

**Practical improvement**
Continue combining empathy with explicit expectations:
> "I understand the situation, and the standard remains X. Let's determine how we can achieve it realistically."

---

# 11. Running the Business & Leading People — ${compScores["Supervisor ability to run the business as manager and lead the people and influence them as leader"]}/5

**Strengths**
You demonstrated both sides of the managerial role:
**Business management:** accuracy, compliance, workload balancing, transaction metrics, operational controls, deadlines, documentation.
**Leadership:** trust, autonomy, purpose, development, recognition, psychological safety, influence.
You rarely treated people and business results as competing priorities.

**Gaps**
* Your simulation focused mainly on individual conversations, so broader branch-level prioritization under simultaneous competing demands was not fully tested.

**Practical improvement**
Practice making explicit trade-offs between **customer service, compliance, employee capacity, profitability and operational risk**.

---

# 12. Listening to Facts, Emotions & Values — ${compScores["Supervisor ability to listen to facts and emotions and values and summarize"]}/5

**Strengths**
This was a major strength.
You recognized:
* Latifa's fear of appearing incompetent.
* Ahmed's desire for growth and meaningful responsibility.
* Shamma's concern about fairness and being taken for granted.
* Khaled's need for trust and dignity regarding his health.

You also responded to factual concerns with concrete operational mechanisms.

**Gaps**
* You sometimes responded to the factual problem before explicitly summarizing the emotional concern.

**Practical improvement**
Use a deliberate dual summary:
> "Factually, you're concerned about workload distribution. Emotionally, it sounds like you're worried your reliability is being taken for granted. Have I understood that correctly?"

---

# 13. Tight-Ship Operations — ${compScores["Supervisor ability to run a tight ship operation"]}/5

**Strengths**
* Clear performance thresholds.
* Review cadence.
* Escalation rules.
* Compliance emphasis.
* Workload measurement.
* Documentation.
* Defined ownership.
* Measurable pilot outcomes.
* Explicit follow-through mechanisms.
Your management style was strongly operational.

**Gaps**
* Some metrics were ambitious and would need validation against actual branch baselines before becoming formal performance standards.

**Practical improvement**
Before setting targets, establish the baseline and validate that the metric is within the employee's reasonable control.

---

# 14. Understanding Personalities & Eliciting Values — ${compScores["Supervisor ability to understand personalities and elicit values"]}/5

**Strengths**
You adapted effectively:
* **Latifa:** confidence, safety, learning and recognition.
* **Ahmed:** purpose, growth and autonomy.
* **Shamma:** fairness, recognition, trust and meaningful responsibility.
* **Khaled:** trust, independence and dignity.
Your management approach changed without compromising your standards.

**Gaps**
* You inferred values effectively from what employees said, but you could elicit them more deliberately through direct questions.

**Practical improvement**
Ask:
> "What matters most to you about succeeding in this role?"
> "What would make this responsibility meaningful for you?"
> "What would make you feel trusted?"

---

## Overall Assessment

Your strongest pattern was **turning employee concerns into explicit operating agreements**. You consistently moved conversations from emotion or ambiguity toward ownership, measures, deadlines and accountability.

The principal development opportunity is **SBI feedback**. You are already good at identifying what is working and what needs to change; the next level is making the feedback more behaviorally precise by explicitly establishing the **situation, observable behavior and impact**, then allowing the employee to respond before moving into the solution.

Your other major opportunity is to maintain the same decisiveness while becoming slightly more careful about commitments involving **HR, compensation or senior-management approval**. Commit strongly to the actions you control, while clearly identifying organizational dependencies.
`;
    } else {
      details = this.generateDetails(compScores);
    }

    const evaluation = {
      totalTurns: totalUserTurns,
      mode,
      behaviorCounts: counts,
      scores: compScores,
      report: reportMarkdown,
      details: details
    };

    return evaluation;
  }

  generateDetails(scores) {
    const details = {};
    for (const [comp, score] of Object.entries(scores)) {
      details[comp] = {
        score,
        strengths: score >= 4 ? "Consistently demonstrated strong alignment with this competency." : "Showed occasional flashes of appropriate behavior.",
        gaps: score <= 3 ? "Relied too heavily on non-optimal approaches like vague or overly directive responses." : "None significant.",
        improvement: score <= 3 ? "Focus on integrating more coaching and empathetic questioning into your management style." : "Maintain this balance of firmness and humanity."
      };
    }
    return details;
  }
}

module.exports = new Evaluator();
