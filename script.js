let pollInterval = null;

function startPolling() {
    fetchRates();
    pollInterval = setInterval(fetchRates, 60000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// ===== Theme Toggle =====
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }
    // Default is light (set in HTML)
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Only fetch when the page is visible
    if (!document.hidden) {
        startPolling();
    }

    // Pause polling when tab is hidden, resume when visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopPolling();
        } else {
            startPolling();
        }
    });
});

async function fetchRates() {
    const errorEl = document.getElementById('error');

    try {
        const response = await fetch('/api/gold/price/details');

        let data;
        if (!response.ok) {
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Failed to fetch data');
            }
            const apiError = data?.details?.error?.message || data?.error || 'Failed to fetch data';
            throw new Error(apiError);
        } else {
            data = await response.json();
        }

        // Hide error if previously shown
        errorEl.classList.add('hidden');

        // Update main prices
        setValue('gold-price', data.goldPricePerGramInr);
        setValue('silver-price', data.silverPricePerGramInr);
        setValue('gold-usd', data.xauUsd, 2);
        setValue('silver-usd', data.xagUsd, 2);
        setValue('usd-inr', data.usdInr, 2);

        // Update calculation breakdown
        setValue('calc-gold-oz', data.goldInrPerOunce, 2);
        setValue('calc-gold-customs', data.goldAfterCustoms, 2);
        setValue('calc-gold-gst', data.goldAfterGst, 2);
        setValue('calc-gold-gram', data.goldPricePerGramInr, 2);

        setValue('calc-silver-oz', data.silverInrPerOunce, 2);
        setValue('calc-silver-customs', data.silverAfterCustoms, 2);
        setValue('calc-silver-gst', data.silverAfterGst, 2);
        setValue('calc-silver-gram', data.silverPricePerGramInr, 2);

        // Show the breakdown section
        document.getElementById('calc-breakdown').classList.remove('hidden');

        // Set timestamp
        const now = new Date();
        document.getElementById('last-updated').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    } catch (err) {
        console.error(err);
        errorEl.classList.remove('hidden');
        errorEl.querySelector('p').textContent = err.message || 'Failed to load data. Please try again later.';
    }
}

// Set value directly without animation
function setValue(id, value, decimals = 2) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
}
