document.addEventListener('DOMContentLoaded', async () => {
    const modulesContainer = document.getElementById('modules-container');
    const logoutBtn = document.getElementById('logout-btn');

    // Handle logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/session', { method: 'DELETE' });
            localStorage.removeItem('allowed_modules');
            window.location.href = '/index.html';
        } catch (e) {
            console.error('Logout failed', e);
        }
    });

    // Fetch session and modules
    try {
        // Bypassing session auth check entirely on the frontend

        // Fetch modules
        const modulesRes = await fetch('/api/modules');
        if (!modulesRes.ok) {
            throw new Error('Failed to load modules');
        }

        const modules = await modulesRes.json();
        renderModules(modules);

    } catch (error) {
        console.error('Dashboard error:', error);
        window.location.href = '/index.html';
    }

    function renderModules(modules) {
        if (modules.length === 0) {
            modulesContainer.innerHTML = '<div class="glass-panel"><p style="padding: 2rem; text-align: center;">No modules available for your access code.</p></div>';
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'modules-grid';

        modules.forEach(mod => {
            const card = document.createElement('div');
            card.className = 'glass-panel module-card';
            
            const timeInfo = mod.config?.timerMinutes ? `${mod.config.timerMinutes} min` : 'Untimed';
            const turnInfo = mod.config?.maxTurns ? `${mod.config.maxTurns} turns` : 'Open';

            card.innerHTML = `
                <div class="module-category">${mod.category || 'Simulation'}</div>
                <h3 class="module-title">${mod.title}</h3>
                <p class="module-desc">${mod.description}</p>
                <div class="module-footer">
                    <span>⏱ ${timeInfo}</span>
                    <span>🔄 ${turnInfo}</span>
                </div>
            `;

            card.addEventListener('click', () => startSimulation(mod.slug));
            grid.appendChild(card);
        });

        modulesContainer.innerHTML = '';
        modulesContainer.appendChild(grid);
    }

    async function startSimulation(slug) {
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleSlug: slug })
            });

            if (res.ok) {
                window.location.href = `/simulation.html?module=${slug}`;
            } else {
                alert('Failed to start simulation. Please try again.');
            }
        } catch (error) {
            console.error('Failed to start session', error);
            alert('Network error. Could not start simulation.');
        }
    }
});
