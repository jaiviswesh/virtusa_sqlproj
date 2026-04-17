/* ── RetailSQL App Logic ── */

const API = '';   // same-origin

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const navTabs = document.querySelectorAll('.nav-tab');
const pages = document.querySelectorAll('.page');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetId = `page-${tab.dataset.tab}`;
        navTabs.forEach(t => t.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

// ─── Toast ────────────────────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;

function showToast(msg, type = 'success') {
    toastEl.textContent = msg;
    toastEl.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ─── API Helper ───────────────────────────────────────────────────────────────
async function runSQL(query) {
    const res = await fetch(`${API}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    return res.json();
}

// ─── Render table ─────────────────────────────────────────────────────────────
function renderTable(container, data, columns) {
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="padding:1rem;color:var(--text-muted);font-size:.85rem">No data returned.</p>';
        return;
    }
    const cols = columns || Object.keys(data[0]);
    let html = `<table class="data-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    data.forEach(row => {
        html += `<tr>${cols.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        // KPIs
        const [rev, trx, cust, prod] = await Promise.all([
            runSQL('SELECT ROUND(SUM(t.quantity * p.price),2) AS revenue FROM transactions t JOIN products p ON t.product_id = p.product_id'),
            runSQL('SELECT COUNT(*) AS total FROM transactions'),
            runSQL('SELECT COUNT(*) AS total FROM customers'),
            runSQL('SELECT COUNT(*) AS total FROM products'),
        ]);

        animateCount('kv-revenue', rev.data[0].revenue, (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        animateCount('kv-transactions', trx.data[0].total);
        animateCount('kv-customers', cust.data[0].total);
        animateCount('kv-products', prod.data[0].total);

        // Top products
        const topProducts = await runSQL(`
      SELECT p.product_name AS Product, p.category AS Category,
             SUM(t.quantity) AS "Units Sold",
             ROUND(SUM(t.quantity * p.price),2) AS "Revenue ($)"
      FROM transactions t JOIN products p ON t.product_id = p.product_id
      GROUP BY t.product_id ORDER BY "Revenue ($)" DESC LIMIT 5
    `);
        renderRankedTable('top-products-table', topProducts.data, topProducts.columns);

        // Top stores
        const topStores = await runSQL(`
      SELECT s.location AS Store, s.manager_name AS Manager,
             COUNT(*) AS Transactions,
             ROUND(SUM(t.quantity * p.price),2) AS "Revenue ($)"
      FROM transactions t
      JOIN stores s ON t.store_id = s.store_id
      JOIN products p ON t.product_id = p.product_id
      GROUP BY t.store_id ORDER BY "Revenue ($)" DESC
    `);
        renderRankedTable('top-stores-table', topStores.data, topStores.columns);

        // Monthly trend chart
        const monthly = await runSQL(`
      SELECT strftime('%b %Y', transaction_date) AS month,
             strftime('%Y%m', transaction_date) AS sort_key,
             ROUND(SUM(t.quantity * p.price),2) AS revenue
      FROM transactions t JOIN products p ON t.product_id = p.product_id
      GROUP BY sort_key ORDER BY sort_key
    `);
        renderBarChart('monthly-chart', monthly.data, 'month', 'revenue');

        // Category revenue
        const cat = await runSQL(`
      SELECT p.category AS Category, COUNT(*) AS Transactions,
             ROUND(SUM(t.quantity * p.price),2) AS "Revenue ($)"
      FROM transactions t JOIN products p ON t.product_id = p.product_id
      GROUP BY category ORDER BY "Revenue ($)" DESC
    `);
        renderRankedTable('category-table', cat.data, cat.columns);

        // Top customers
        const topCust = await runSQL(`
      SELECT c.first_name || ' ' || c.last_name AS Customer,
             COUNT(*) AS Purchases,
             ROUND(SUM(t.quantity * p.price),2) AS "Total Spent ($)"
      FROM transactions t
      JOIN customers c ON t.customer_id = c.customer_id
      JOIN products p ON t.product_id = p.product_id
      GROUP BY t.customer_id ORDER BY "Total Spent ($)" DESC LIMIT 5
    `);
        renderRankedTable('top-customers-table', topCust.data, topCust.columns);

    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

// animated number counter
function animateCount(elId, finalVal, formatter) {
    const el = document.getElementById(elId);
    const numFinal = parseFloat(finalVal) || 0;
    const isDecimal = numFinal % 1 !== 0;
    const duration = 1200;
    const start = performance.now();
    const fmt = formatter || ((v) => Math.round(v).toLocaleString());
    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = fmt(numFinal * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(numFinal);
    }
    requestAnimationFrame(tick);
}

function renderRankedTable(containerId, data, columns) {
    if (!data || data.length === 0) return;
    const container = document.getElementById(containerId);
    const cols = columns || Object.keys(data[0]);
    let html = `<table class="data-table"><thead><tr><th>#</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    data.forEach((row, i) => {
        const rank = i < 3 ? `<span class="rank-badge rank-${i + 1}">${i + 1}</span>` : `<span class="rank-badge rank-n">${i + 1}</span>`;
        html += `<tr><td>${rank}</td>${cols.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderBarChart(containerId, data, labelKey, valueKey) {
    const container = document.getElementById(containerId);
    const values = data.map(d => parseFloat(d[valueKey]) || 0);
    const maxVal = Math.max(...values);
    if (maxVal === 0) return;

    const bars = data.map((d, i) => {
        const pct = Math.round((values[i] / maxVal) * 160);
        return `
      <div class="bar-item">
        <div class="bar-val">$${(values[i] / 1000).toFixed(1)}k</div>
        <div class="bar" style="height:${pct}px" title="${d[labelKey]}: $${values[i]}"></div>
        <div class="bar-label">${d[labelKey]}</div>
      </div>`;
    }).join('');

    container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

// ─── SQL Explorer ─────────────────────────────────────────────────────────────
const sqlEditor = document.getElementById('sql-editor');
const resultBody = document.getElementById('result-body');
const resultMeta = document.getElementById('result-meta');

document.getElementById('btn-run').addEventListener('click', executeQuery);
document.getElementById('btn-clear').addEventListener('click', () => {
    sqlEditor.value = '';
    resultBody.innerHTML = `<div class="result-placeholder"><div class="result-placeholder-icon">SQL</div><p>Run a query to see results here</p></div>`;
    resultMeta.textContent = '';
});

sqlEditor.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ejecuteQuery();
    // tab key support
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = sqlEditor.selectionStart;
        const end = sqlEditor.selectionEnd;
        sqlEditor.value = sqlEditor.value.substring(0, start) + '  ' + sqlEditor.value.substring(end);
        sqlEditor.selectionStart = sqlEditor.selectionEnd = start + 2;
    }
});

async function executeQuery() {
    const query = sqlEditor.value.trim();
    if (!query) return;

    resultBody.innerHTML = `<div class="result-placeholder"><div class="result-placeholder-icon">...</div><p>Executing query...</p></div>`;
    resultMeta.textContent = '';

    const t0 = performance.now();
    try {
        const result = await runSQL(query);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(3);

        if (result.error) {
            resultBody.innerHTML = `<div class="result-error">Error: ${result.error}</div>`;
            resultMeta.textContent = '';
            showToast('Query error — check syntax', 'error');
        } else if (result.data !== undefined) {
            const tableHTML = buildResultTable(result.columns, result.data);
            resultBody.innerHTML = tableHTML;
            resultMeta.textContent = `${result.data.length} row${result.data.length !== 1 ? 's' : ''} · ${elapsed}s`;
            showToast(`${result.data.length} rows returned in ${elapsed}s`);
        } else {
            resultBody.innerHTML = `<div class="result-message">${result.message}</div>`;
            resultMeta.textContent = `${elapsed}s`;
            showToast(result.message);
            loadDashboard(); // refresh KPIs if data changed
        }
    } catch (err) {
        resultBody.innerHTML = `<div class="result-error">Network error: ${err.message}</div>`;
        showToast('Network error', 'error');
    }
}

function buildResultTable(columns, data) {
    if (!data || data.length === 0) return '<div class="result-message" style="color:var(--text-muted)">Query returned no rows.</div>';
    let html = `<table class="data-table"><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    data.forEach(row => {
        html += `<tr>${columns.map(c => {
            const val = row[c];
            const isNum = typeof val === 'number';
            return `<td style="${isNum ? 'text-align:right;font-family:var(--font-mono);font-size:.82rem' : ''}">${val ?? '<span style="color:var(--text-muted)">NULL</span>'}</td>`;
        }).join('')}</tr>`;
    });
    return html + '</tbody></table>';
}

// Quick query buttons
document.querySelectorAll('.qq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        sqlEditor.value = btn.dataset.q;
        executeQuery();
    });
});

// Tutorial "Try it" buttons
document.querySelectorAll('.tut-run-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Switch to explorer tab
        document.querySelector('[data-tab="explorer"]').click();
        sqlEditor.value = btn.dataset.q;
        executeQuery();
    });
});

// ─── Reset DB ─────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset the database to original seed data? All changes will be lost.')) return;
    try {
        const res = await fetch(`${API}/api/reset`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message || data.error, data.error ? 'error' : 'success');
        loadDashboard();
    } catch (err) {
        showToast('Reset failed: ' + err.message, 'error');
    }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadDashboard();
