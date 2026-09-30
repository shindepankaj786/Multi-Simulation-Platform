document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.getElementById('sim-title');
    const turnCounterEl = document.getElementById('turn-counter');
    const messagesEl = document.getElementById('messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const exitBtn = document.getElementById('exit-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const moduleSlug = urlParams.get('module');

    if (!moduleSlug) {
        window.location.href = '/dashboard.html';
        return;
    }

    let sessionData = null;
    let engine = null;

    // Fetch session and module config
    try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) throw new Error('No active session');
        sessionData = await sessionRes.json();

        // Ensure session is mapped to this module
        if (sessionData.module_slug !== moduleSlug) {
            window.location.href = '/dashboard.html';
            return;
        }

        // We would fetch the module config from the backend here in a full implementation.
        // For this foundation, we'll setup the engine with some defaults based on the slug.
        initEngine(moduleSlug);

        // Fetch existing messages to populate the chat
        const msgsRes = await fetch('/api/messages');
        if (msgsRes.ok) {
            const msgs = await msgsRes.json();
            if (msgs.length > 0) {
                engine.currentState = 'running';
                engine.turnNumber = msgs.filter(m => m.role === 'user').length + 1;
                msgs.forEach(msg => {
                    engine.addMessage(msg);
                });
                enableInput();
            } else {
                engine.start();
                enableInput();
            }
        }
    } catch (e) {
        console.error(e);
        window.location.href = '/dashboard.html';
    }

    function initEngine(slug) {
        titleEl.textContent = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        engine = new window.SimulationEngine({
            scenario: `Starting module: ${slug}`,
            character: { name: 'System Coordinator', role: 'facilitator' },
            onStateChange: handleStateChange,
            onMessageAdded: renderMessage,
            onSimulationEnd: handleEnd
        });

        // Start engine only if there's no pre-existing messages (handled in fetch)
        
        if (slug === 'leadership-uncertainty') {
            document.getElementById('input-area').style.display = 'none';
            document.getElementById('options-area').style.display = 'grid';
        } else {
            document.getElementById('input-area').style.display = 'flex';
            document.getElementById('options-area').style.display = 'none';
        }
    }

    function handleStateChange(state, context) {
        console.log(`Simulation state: ${state}`, context);
    }

    function renderMessage(msg) {
        const div = document.createElement('div');
        div.className = `message msg-${msg.role}`;
        
        const roles = {
            'Latifa': 'Data Entry Officer',
            'Ahmed': 'Customer Service',
            'Shamma': 'Teller',
            'Khaled': 'Accountant'
        };

        let prefix = '';
        if (msg.role === 'facilitator') {
            const charName = (msg.payload && msg.payload.character) ? msg.payload.character : engine.character.name;
            const role = roles[charName] ? ` &ndash; ${roles[charName]}` : '';
            prefix = `<strong>${charName}${role}</strong><br><br>`;
        }
        if (msg.role === 'user') prefix = `<strong>You</strong><br><br>`;

        // Parse markdown italics (*text*) to HTML <i>text</i> and preserve linebreaks
        const formattedContent = msg.content
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/\n/g, '<br>');

        div.innerHTML = `${prefix}${formattedContent}`;
        messagesEl.appendChild(div);
        
        // Auto scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Hide the turn counter entirely as it dynamically switches
        turnCounterEl.style.display = 'none';
    }

    function handleEnd(data) {
        disableInput();
        renderMessage({
            role: 'system',
            content: `Simulation ended. Reason: ${data.reason}`
        });
    }

    function enableInput() {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
        
        const optionBtns = document.querySelectorAll('#options-area button');
        optionBtns.forEach(btn => btn.disabled = false);
    }

    function disableInput() {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        
        const optionBtns = document.querySelectorAll('#options-area button');
        optionBtns.forEach(btn => btn.disabled = true);
    }
    
    window.handleOption = function(val) {
        chatInput.value = val.toString();
        handleSend();
    };

    // Handle user input
    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        disableInput();
        chatInput.value = '';

        let didEnd = false;

        // 1. Add user message to engine and UI
        engine.addMessage({ role: 'user', content: text });

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message msg-facilitator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        messagesEl.appendChild(typingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // 2. Persist to backend and get response
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user', content: text })
            });
            const data = await res.json();

            // The backend now returns { userMessage, replyMessage, transitionMessage }
            if (data.replyMessage) {
                engine.addMessage(data.replyMessage);
                if (data.replyMessage.payload?.new_state) {
                    engine.updateState(data.replyMessage.payload.new_state);
                }
            }
            if (data.transitionMessage) {
                engine.addMessage(data.transitionMessage);
            }

            // Check if simulation ended
            if (data.endSimulation) {
                renderEvaluation(data.evaluation);
                disableInput();
                didEnd = true;
                return;
            }
        } catch (e) {
            console.error('Failed to save message:', e);
        } finally {
            const t = document.getElementById('typing-indicator');
            if (t) t.remove();
            
            if (!didEnd) enableInput();
        }
    }

    function renderEvaluation(evaluation) {
        const div = document.createElement('div');
        div.className = 'glass-panel';
        div.style.padding = '1rem';
        div.style.marginTop = '1rem';
        div.style.border = '1px solid var(--accent-color)';

        let html = `<h3>Simulation Evaluation</h3>`;
        
        if (evaluation.totalTurns !== undefined) {
            html += `<p>Total Turns: ${evaluation.totalTurns}</p>`;
        }
        
        html += `<hr style="margin: 1rem 0; border-color: var(--panel-border);">`;
        
        // Handle markdown-style report text (like Leadership Assessment)
        if (evaluation.report) {
            // Improved markdown to HTML for the report
            let formattedReport = evaluation.report
                .replace(/^# (.*$)/gim, '<h2>$1</h2>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/^### (.*$)/gim, '<h4>$1</h4>')
                .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 4px solid var(--accent-color); padding-left: 1rem; color: var(--text-secondary); margin: 1rem 0; font-style: italic;">$1</blockquote>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/^\* (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.5rem;">$1</li>')
                .replace(/^- (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.5rem;">$1</li>')
                .replace(/^\d+\. (.*$)/gim, '<li style="margin-left: 1.5rem; margin-bottom: 0.5rem; list-style-type: decimal;">$1</li>')
                .replace(/\n/g, '<br>');
            html += `<div class="report-content" style="line-height: 1.6; padding-bottom: 2rem;">${formattedReport}</div>`;
        } 
        // Handle structured details (like Supervisory Skills)
        else if (evaluation.details) {
            for (const [comp, data] of Object.entries(evaluation.details)) {
                html += `
                    <div style="margin-bottom: 1rem;">
                        <strong>${comp}</strong>: ${data.score}/5<br>
                        <span style="color: var(--success-color);">Strength:</span> ${data.strengths}<br>
                        <span style="color: var(--error-color);">Gap:</span> ${data.gaps}<br>
                        <span style="color: var(--accent-color);">Improvement:</span> ${data.improvement}
                    </div>
                `;
            }
        } else {
            html += `<p>Simulation ended successfully.</p>`;
        }
        
        div.innerHTML = html;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    exitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit this simulation? Progress will be saved.')) {
            window.location.href = '/dashboard.html';
        }
    });
});
