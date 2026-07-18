// ===== DÉCLARATIONS GLOBALES =====
let transactions = [];
let sortableInstance = null;
let currentEditId = null;
let isDarkMode = false;
let currentFilterMonth = null;
let selectedTransactionId = null;
let appSettings = { initialAmount: 0, currency: '€', displayFormat: 'sign' };
let currentSortMode = 'manual';
let savingsAccounts = [];
let budgets = [];
let currentOperationToDelete = null;
let currentHistoryAccountId = null;
let advancedFilters = { dateFrom: null, dateTo: null, category: null, type: null, minAmount: null, maxAmount: null };
let pieChartInstance = null;
let barChartInstance = null;

// DOM elements - avec vérification de sécurité
const safeGetElementById = (id) => {
    const element = document.getElementById(id);
    if (!element) console.warn(`Element with ID "${id}" not found`);
    return element;
};

const listContainer = safeGetElementById('transactionListContainer');
const totalBalanceSpan = safeGetElementById('totalBalance');
const totalRevenueSpan = safeGetElementById('totalRevenue');
const totalExpenseSpan = safeGetElementById('totalExpense');
const openAddBtn = safeGetElementById('openAddModalBtn');
const openSettingsBtn = safeGetElementById('openSettingsBtn');
const modalOverlay = safeGetElementById('transactionModal');
const settingsModal = safeGetElementById('settingsModal');
const closeModalBtn = safeGetElementById('closeModalBtn');
const closeSettingsBtn = safeGetElementById('closeSettingsBtn');
const transactionForm = safeGetElementById('transactionForm');
const settingsForm = safeGetElementById('settingsForm');
const modalTitle = safeGetElementById('modalTitle');
const descInput = safeGetElementById('descInput');
const amountInput = safeGetElementById('amountInput');
const categoryInput = safeGetElementById('categoryInput');
const typeSelect = safeGetElementById('typeSelect');
const dateInput = safeGetElementById('dateInput');
const initialAmountInput = safeGetElementById('initialAmountInput');
const currencySelect = safeGetElementById('currencySelect');
const displayFormatSelect = safeGetElementById('displayFormatSelect');
const initialHintSpan = safeGetElementById('initialHint');

// ===== HELPERS =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ===== THÈME CLAIR/SOMBRE =====
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    isDarkMode = theme === 'dark';
    localStorage.setItem('budgetTheme', theme);
    updateThemeIcon();
}

function loadTheme() {
    applyTheme(localStorage.getItem('budgetTheme') || 'light');
}

function toggleTheme() {
    applyTheme(isDarkMode ? 'light' : 'dark');
}

function updateThemeIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ===== THÈMES COULEURS =====
function applyThemeColor(theme) {
    const root = document.documentElement;
    const colors = {
        default: { primary: '#2c7a3e', rev: '#15803d', exp: '#b91c1c', bg: 'linear-gradient(145deg, #f0f5fb 0%, #e9eef4 100%)' },
        blue: { primary: '#2563eb', rev: '#2563eb', exp: '#dc2626', bg: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)' },
        purple: { primary: '#7c3aed', rev: '#7c3aed', exp: '#dc2626', bg: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)' },
        red: { primary: '#dc2626', rev: '#16a34a', exp: '#dc2626', bg: 'linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%)' }
    };
    const c = colors[theme] || colors.default;
    root.style.setProperty('--revenue-color', c.rev);
    root.style.setProperty('--expense-color', c.exp);
    root.style.setProperty('--bg-body', c.bg);
    document.querySelectorAll('.btn-add, .btn-savings, .btn-add-savings').forEach(el => {
        el.style.background = c.primary;
    });
    localStorage.setItem('budgetThemeColor', theme);
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === theme);
    });
}

function loadThemeColor() {
    const theme = localStorage.getItem('budgetThemeColor') || 'default';
    applyThemeColor(theme);
}

// ===== PARAMÈTRES =====
function saveSettingsToLocalStorage() {
    localStorage.setItem('budgetSettings', JSON.stringify(appSettings));
}

function loadSettings() {
    const stored = localStorage.getItem('budgetSettings');
    if (stored) {
        try { appSettings = { ...appSettings, ...JSON.parse(stored) }; } catch(e) {}
    }
    if (initialAmountInput) initialAmountInput.value = appSettings.initialAmount;
    if (currencySelect) currencySelect.value = appSettings.currency;
    if (displayFormatSelect) displayFormatSelect.value = appSettings.displayFormat;
    updateInitialHintDisplay();
}

function updateInitialHintDisplay() {
    if (initialHintSpan) {
        initialHintSpan.textContent = appSettings.initialAmount !== 0 ? `(départ: ${appSettings.initialAmount.toFixed(2)} ${appSettings.currency})` : '';
    }
}

function formatAmountWithSettings(amount, type) {
    const abs = Math.abs(amount).toFixed(2);
    if (appSettings.displayFormat === 'sign') {
        return `${type === 'expense' ? '- ' : '+ '}${abs} ${appSettings.currency}`;
    } else {
        return type === 'expense' ? `(${abs} ${appSettings.currency})` : `${abs} ${appSettings.currency}`;
    }
}

function formatSignedAmount(amount) {
    if (appSettings.displayFormat === 'sign') {
        return `${amount >= 0 ? '+ ' : '- '}${Math.abs(amount).toFixed(2)} ${appSettings.currency}`;
    } else {
        return amount < 0 ? `(${Math.abs(amount).toFixed(2)} ${appSettings.currency})` : `${amount.toFixed(2)} ${appSettings.currency}`;
    }
}

// ===== STOCKAGE TRANSACTIONS =====
function saveToLocalStorage() {
    localStorage.setItem('budgetTransactions', JSON.stringify(transactions));
}

function loadInitialData() {
    const stored = localStorage.getItem('budgetTransactions');
    if (stored) {
        transactions = JSON.parse(stored);
    } else {
        transactions = [
            { id: '1', description: 'Salaire NET', amount: 2450, category: 'Salaire', type: 'revenue', date: '2025-03-01' },
            { id: '2', description: 'Courses supermarché', amount: 89.5, category: 'Alimentation', type: 'expense', date: '2025-03-05' },
            { id: '3', description: 'Netflix', amount: 25.99, category: 'Abonnements', type: 'expense', date: '2025-03-10' },
            { id: '4', description: 'Transport essence', amount: 45.2, category: 'Transport', type: 'expense', date: '2025-02-15' },
            { id: '5', description: 'Freelance design', amount: 380, category: 'Freelance', type: 'revenue', date: '2025-02-20' },
            { id: '6', description: 'Restaurant', amount: 37.4, category: 'Loisirs', type: 'expense', date: '2025-01-25' }
        ];
    }
    transactions = transactions.map(t => {
        if (!t.date) t.date = new Date().toISOString().slice(0, 10);
        return t;
    });
    saveToLocalStorage();
}

// ===== BUDGETS =====
function loadBudgets() {
    const stored = localStorage.getItem('budgetCategories');
    budgets = stored ? JSON.parse(stored) : [];
}

function saveBudgets() {
    localStorage.setItem('budgetCategories', JSON.stringify(budgets));
}

function renderBudgets() {
    const container = document.getElementById('budgetList');
    if (!container) return;
    if (budgets.length === 0) {
        container.innerHTML = '<div class="empty-cats">Aucun budget défini.</div>';
        return;
    }
    const monthKey = currentFilterMonth || new Date().toISOString().slice(0, 7);
    let html = '';
    budgets.forEach(b => {
        const spent = transactions
            .filter(t => t.category === b.category && t.type === 'expense' && t.date.startsWith(monthKey))
            .reduce((sum, t) => sum + t.amount, 0);
        const percent = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
        const statusClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : '';
        const color = percent > 90 ? 'var(--expense-color)' : percent > 70 ? '#f59e0b' : 'var(--revenue-color)';
        html += `
            <div class="budget-item">
                <span class="budget-name">${escapeHtml(b.category)}</span>
                <div class="budget-progress">
                    <div class="fill ${statusClass}" style="width: ${percent}%; background: ${color};"></div>
                </div>
                <span class="budget-amount">${spent.toFixed(2)} / ${b.amount.toFixed(2)} €</span>
                <button class="delete-budget" data-category="${escapeHtml(b.category)}" style="background:none;border:none;cursor:pointer;color:var(--expense-color);">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
    document.querySelectorAll('.delete-budget').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-category');
            budgets = budgets.filter(b => b.category !== cat);
            saveBudgets();
            renderBudgets();
        });
    });
}

// ===== FILTRES AVANCÉS =====
function updateCategoryFilter() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    const cats = new Set();
    transactions.forEach(t => { if (t.category) cats.add(t.category); });
    const current = select.value;
    select.innerHTML = '<option value="">Toutes</option>';
    Array.from(cats).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
    if (Array.from(cats).includes(current)) select.value = current;
}

function getFilteredTransactions() {
    let filtered = transactions;
    const f = advancedFilters;
    if (f.dateFrom) filtered = filtered.filter(t => t.date >= f.dateFrom);
    if (f.dateTo) filtered = filtered.filter(t => t.date <= f.dateTo);
    if (f.category) filtered = filtered.filter(t => t.category === f.category);
    if (f.type) filtered = filtered.filter(t => t.type === f.type);
    if (f.minAmount) filtered = filtered.filter(t => t.amount >= f.minAmount);
    if (f.maxAmount) filtered = filtered.filter(t => t.amount <= f.maxAmount);
    return filtered;
}

function applyAdvancedFilters() {
    advancedFilters.dateFrom = document.getElementById('filterDateFrom').value;
    advancedFilters.dateTo = document.getElementById('filterDateTo').value;
    advancedFilters.category = document.getElementById('filterCategory').value;
    advancedFilters.type = document.getElementById('filterType').value;
    advancedFilters.minAmount = parseFloat(document.getElementById('filterMinAmount').value) || null;
    advancedFilters.maxAmount = parseFloat(document.getElementById('filterMaxAmount').value) || null;
    fullRefresh();
}

function resetAdvancedFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterMinAmount').value = '';
    document.getElementById('filterMaxAmount').value = '';
    advancedFilters = { dateFrom: null, dateTo: null, category: null, type: null, minAmount: null, maxAmount: null };
    fullRefresh();
}

// ===== GRAPHIQUES =====
function renderCharts() {
    const monthKey = currentFilterMonth || new Date().toISOString().slice(0, 7);
    
    // Camembert
    const categorySpending = {};
    transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(monthKey))
        .forEach(t => {
            const cat = t.category || 'Divers';
            categorySpending[cat] = (categorySpending[cat] || 0) + t.amount;
        });
    const labels = Object.keys(categorySpending);
    const data = Object.values(categorySpending);
    const ctxPie = document.getElementById('pieChart')?.getContext('2d');
    if (ctxPie) {
        if (pieChartInstance) pieChartInstance.destroy();
        if (data.length > 0) {
            pieChartInstance = new Chart(ctxPie, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#15803d', '#2563eb', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        } else {
            ctxPie.clearRect(0, 0, ctxPie.canvas.width, ctxPie.canvas.height);
        }
    }

    // Histogramme
    const monthTotals = {};
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        last6Months.push(key);
        monthTotals[key] = { rev: 0, exp: 0 };
    }
    transactions.forEach(t => {
        if (!t.date) return;
        const key = t.date.substring(0, 7);
        if (monthTotals[key]) {
            if (t.type === 'revenue') monthTotals[key].rev += t.amount;
            else monthTotals[key].exp += t.amount;
        }
    });
    const labelsBar = last6Months.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'short' });
    });
    const dataBarRev = last6Months.map(m => monthTotals[m]?.rev || 0);
    const dataBarExp = last6Months.map(m => monthTotals[m]?.exp || 0);
    const ctxBar = document.getElementById('barChart')?.getContext('2d');
    if (ctxBar) {
        if (barChartInstance) barChartInstance.destroy();
        if (dataBarRev.some(v => v > 0) || dataBarExp.some(v => v > 0)) {
            barChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: labelsBar,
                    datasets: [
                        { label: 'Revenus', data: dataBarRev, backgroundColor: '#15803d' },
                        { label: 'Dépenses', data: dataBarExp, backgroundColor: '#dc2626' }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        } else {
            ctxBar.clearRect(0, 0, ctxBar.canvas.width, ctxBar.canvas.height);
        }
    }
}

// ===== EXPORT/IMPORT =====
function exportData() {
    const data = { transactions, settings: appSettings, savings: savingsAccounts, budgets };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `budgetflow_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.transactions) transactions = data.transactions;
            if (data.settings) appSettings = data.settings;
            if (data.savings) savingsAccounts = data.savings;
            if (data.budgets) budgets = data.budgets;
            saveToLocalStorage();
            saveSavingsAccounts();
            saveBudgets();
            saveSettingsToLocalStorage();
            fullRefresh();
            renderSavingsAccounts();
            renderBudgets();
            alert('Import réussi !');
        } catch (err) {
            alert('Erreur: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ===== RÉSUMÉ =====
function updateSummary() {
    const previousCard = document.getElementById('previousBalanceCard');
    const previousSpan = document.getElementById('previousBalance');
    let totalRev = 0, totalExp = 0;
    const filtered = getFilteredTransactions();

    function getCumulativeBalance(untilDate) {
        let balance = appSettings.initialAmount;
        const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let t of sorted) {
            if (t.date <= untilDate) {
                if (t.type === 'revenue') balance += t.amount;
                else balance -= t.amount;
            }
        }
        return balance;
    }

    function setColorClass(element, amount) {
        element.classList.remove('positive', 'negative');
        element.classList.add(amount >= 0 ? 'positive' : 'negative');
    }

    if (currentFilterMonth) {
        const [year, month] = currentFilterMonth.split('-');
        const yearNum = parseInt(year), monthNum = parseInt(month);
        const lastDayCurrent = new Date(yearNum, monthNum, 0).getDate();
        const endCurrentDate = `${currentFilterMonth}-${String(lastDayCurrent).padStart(2,'0')}`;
        let prevYear = yearNum, prevMonth = monthNum - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2,'0')}`;
        const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
        const endPrevDate = `${prevMonthStr}-${String(lastDayPrev).padStart(2,'0')}`;
        
        const balancePrevMonth = getCumulativeBalance(endPrevDate);
        previousSpan.innerText = formatSignedAmount(balancePrevMonth);
        setColorClass(previousSpan, balancePrevMonth);
        previousCard.style.display = 'flex';
        
        const balanceCurrent = getCumulativeBalance(endCurrentDate);
        filtered.forEach(t => {
            if (t.date.startsWith(currentFilterMonth)) {
                if (t.type === 'revenue') totalRev += t.amount;
                else totalExp += t.amount;
            }
        });
        totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        totalBalanceSpan.innerText = formatSignedAmount(balanceCurrent);
        setColorClass(totalBalanceSpan, balanceCurrent);
    } else {
        previousCard.style.display = 'none';
        filtered.forEach(t => {
            if (t.type === 'revenue') totalRev += t.amount;
            else totalExp += t.amount;
        });
        const balance = appSettings.initialAmount + totalRev - totalExp;
        totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        totalBalanceSpan.innerText = formatSignedAmount(balance);
        setColorClass(totalBalanceSpan, balance);
    }
}

// ===== CATÉGORIES =====
function renderCategorySummary() {
    const categoryMap = new Map();
    const filtered = getFilteredTransactions();
    filtered.forEach(t => {
        const cat = t.category || 'Divers';
        if (!categoryMap.has(cat)) categoryMap.set(cat, { revenue: 0, expense: 0 });
        const entry = categoryMap.get(cat);
        if (t.type === 'revenue') entry.revenue += t.amount;
        else entry.expense += t.amount;
    });
    const container = document.getElementById('categoryList');
    if (!container) return;
    const titleEl = document.querySelector('#categorySummaryContainer h3');
    if (titleEl) {
        const monthName = currentFilterMonth ? new Date(currentFilterMonth).toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : 'tous les mois';
        titleEl.innerHTML = `<i class="fas fa-chart-pie"></i> Totaux par catégorie (${monthName})`;
    }
    if (categoryMap.size === 0) {
        container.innerHTML = '<div class="empty-cats">Aucune catégorie</div>';
        return;
    }
    let html = '';
    for (let [cat, totals] of categoryMap.entries()) {
        const net = totals.revenue - totals.expense;
        const netClass = net >= 0 ? 'amount-revenue' : 'amount-expense';
        html += `
            <div class="category-item">
                <span class="category-name">${escapeHtml(cat)}</span>
                <span class="category-total ${netClass}">${net >= 0 ? '+' : ''}${net.toFixed(2)} ${appSettings.currency}</span>
                <small>(R:${totals.revenue.toFixed(2)} D:${totals.expense.toFixed(2)})</small>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ===== FILTRE MOIS =====
function updateMonthSelect() {
    const monthSet = new Set();
    transactions.forEach(t => { if (t.date) monthSet.add(t.date.substring(0, 7)); });
    const months = Array.from(monthSet).sort().reverse();
    const select = document.getElementById('monthSelect');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Tous les mois --</option>';
    months.forEach(m => {
        const [year, month] = m.split('-');
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' })} ${year}`;
        select.appendChild(opt);
    });
    if (currentFilterMonth && months.includes(currentFilterMonth)) select.value = currentFilterMonth;
    else if (currentValue && months.includes(currentValue)) select.value = currentValue;
    else select.value = '';
}

function setMonthFilter(month) {
    currentFilterMonth = month;
    document.getElementById('monthSelect').value = month || '';
    fullRefresh();
}

function initMonthFilter() {
    const select = document.getElementById('monthSelect');
    select?.addEventListener('change', () => setMonthFilter(select.value || null));
    document.getElementById('resetMonthFilter')?.addEventListener('click', () => setMonthFilter(null));
}

// ===== TRI =====
function loadSortMode() {
    const saved = localStorage.getItem('budgetSortMode');
    currentSortMode = ['category', 'date_desc', 'date_asc'].includes(saved) ? saved : 'manual';
    document.getElementById('sortSelect').value = currentSortMode;
}

function saveSortMode() { localStorage.setItem('budgetSortMode', currentSortMode); }

function applySorting() {
    if (currentSortMode === 'category') {
        transactions.sort((a, b) => (a.category || 'Divers').localeCompare(b.category || 'Divers'));
    } else if (currentSortMode === 'date_desc') {
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (currentSortMode === 'date_asc') {
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    saveToLocalStorage();
}

// ===== RENDU TRANSACTIONS =====
function renderTransactionList() {
    if (!listContainer) return;
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="empty-list">Aucune transaction pour cette période.</div>`;
        return;
    }
    let html = '';
    filtered.forEach(t => {
        const amountClass = t.type === 'expense' ? 'amount-expense' : 'amount-revenue';
        html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="drag-area ${currentSortMode !== 'manual' ? 'disabled' : ''}"><i class="fas fa-grip-vertical"></i></div>
                <div class="transaction-info">
                    <span class="transaction-desc">${escapeHtml(t.description)}</span>
                    <span class="transaction-category">${escapeHtml(t.category || 'Non catégorisé')}</span>
                    <span class="transaction-amount ${amountClass}">${formatAmountWithSettings(t.amount, t.type)}</span>
                    <span class="transaction-date">${t.date || ''}</span>
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit" data-id="${t.id}"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
    document.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn')) return;
            selectTransaction(item.dataset.id);
        });
    });
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(btn.dataset.id); });
    });
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTransactionById(btn.dataset.id); });
    });
}

// ===== SÉLECTION =====
function selectTransaction(id) {
    selectedTransactionId = id;
    document.getElementById('qaEditBtn').disabled = !id;
    document.getElementById('qaDeleteBtn').disabled = !id;
    document.getElementById('qaDuplicateBtn').disabled = !id;
    document.querySelectorAll('.transaction-item').forEach(el => el.classList.toggle('selected-transaction', el.dataset.id === id));
}

function duplicateTransactionById(id) {
    const original = transactions.find(t => t.id === id);
    if (!original) return;
    const newT = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
        description: original.description,
        amount: original.amount,
        category: original.category,
        type: original.type,
        date: new Date().toISOString().slice(0, 10)
    };
    transactions.push(newT);
    fullRefresh();
    alert('Transaction dupliquée.');
}

// ===== SORTABLE =====
function syncOrderFromDOM() {
    if (currentSortMode !== 'manual') return;
    const items = document.querySelectorAll('.transaction-item');
    if (!items.length) return;
    const order = Array.from(items).map(el => el.dataset.id);
    const ordered = [];
    for (let id of order) {
        const found = transactions.find(t => t.id === id);
        if (found) ordered.push(found);
    }
    transactions = ordered;
    saveToLocalStorage();
}

function initSortable() {
    if (sortableInstance) sortableInstance.destroy();
    if (!listContainer || currentSortMode !== 'manual') {
        document.querySelectorAll('.drag-area').forEach(el => el.classList.add('disabled'));
        return;
    }
    sortableInstance = new Sortable(listContainer, {
        handle: '.drag-area',
        animation: 200,
        ghostClass: 'sortable-ghost',
        onEnd: syncOrderFromDOM
    });
    document.querySelectorAll('.drag-area').forEach(el => el.classList.remove('disabled'));
}

// ===== CRUD =====
function deleteTransactionById(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    transactions = transactions.filter(t => t.id !== id);
    if (selectedTransactionId === id) selectTransaction(null);
    fullRefresh();
}

function openAddModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Ajouter une transaction';
    document.getElementById('descInput').value = '';
    document.getElementById('amountInput').value = '';
    document.getElementById('categoryInput').value = '';
    document.getElementById('typeSelect').value = 'expense';
    document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
    document.getElementById('transactionModal').classList.add('active');
}

function openEditModal(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return;
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Modifier la transaction';
    document.getElementById('descInput').value = t.description;
    document.getElementById('amountInput').value = t.amount;
    document.getElementById('categoryInput').value = t.category || '';
    document.getElementById('typeSelect').value = t.type;
    document.getElementById('dateInput').value = t.date || new Date().toISOString().slice(0, 10);
    document.getElementById('transactionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
    currentEditId = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const description = descInput?.value.trim() || '';
    const amount = parseFloat(amountInput?.value || 0);
    const category = (categoryInput?.value.trim() || 'Divers');
    const type = typeSelect?.value || 'expense';
    let date = dateInput?.value || new Date().toISOString().slice(0, 10);
    
    // Validation robuste
    if (!description) return alert('Description requise.');
    if (!amount || amount <= 0) return alert('Montant doit être > 0.');
    if (isNaN(amount)) return alert('Montant invalide.');
    
    if (currentEditId === null) {
        transactions.push({ 
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), 
            description, 
            amount, 
            category, 
            type, 
            date 
        });
    } else {
        const idx = transactions.findIndex(t => t.id === currentEditId);
        if (idx !== -1) transactions[idx] = { ...transactions[idx], description, amount, category, type, date };
    }
    closeModal();
    fullRefresh();
}

// ===== COMPTES ÉPARGNE =====
function loadSavingsAccounts() {
    const stored = localStorage.getItem('savingsAccounts');
    savingsAccounts = stored ? JSON.parse(stored) : [];
    savingsAccounts = savingsAccounts.map(acc => ({ ...acc, history: acc.history || [] }));
}

function saveSavingsAccounts() {
    localStorage.setItem('savingsAccounts', JSON.stringify(savingsAccounts));
}

function addOperationToHistory(accountId, type, amount, description) {
    const acc = savingsAccounts.find(a => a.id === accountId);
    if (!acc) return;
    acc.history.unshift({ id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), date: new Date().toISOString(), type, amount, description: description || '' });
    if (acc.history.length > 100) acc.history = acc.history.slice(0, 100);
    saveSavingsAccounts();
}

function deleteOperationFromHistory(accountId, opId) {
    const acc = savingsAccounts.find(a => a.id === accountId);
    if (!acc) return;
    const op = acc.history.find(o => o.id === opId);
    if (!op) return;
    acc.balance += op.type === 'credit' ? -op.amount : op.amount;
    acc.history = acc.history.filter(o => o.id !== opId);
    saveSavingsAccounts();
    renderSavingsAccounts();
    renderDashboard();
}

function renderSavingsAccounts() {
    const container = document.getElementById('savingsAccountsList');
    if (!container) return;
    if (savingsAccounts.length === 0) {
        container.innerHTML = '<div class="empty-savings">Aucun compte épargne.</div>';
        document.getElementById('totalSavings').textContent = `0.00 ${appSettings.currency}`;
        return;
    }
    let html = '', total = 0;
    savingsAccounts.forEach(acc => {
        total += acc.balance;
        const count = acc.history ? acc.history.length : 0;
        html += `
            <div class="savings-account-card">
                <div class="savings-account-info">
                    <span class="savings-account-name">${escapeHtml(acc.name)}</span>
                    <span class="savings-account-balance">${acc.balance.toFixed(2)} ${appSettings.currency}</span>
                </div>
                <div class="savings-account-actions">
                    <button class="operation" data-id="${acc.id}"><i class="fas fa-exchange-alt"></i> Opération</button>
                    <button class="history" data-id="${acc.id}"><i class="fas fa-history"></i> Hist. (${count})</button>
                    <button class="delete-savings" data-id="${acc.id}"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('totalSavings').textContent = `${total.toFixed(2)} ${appSettings.currency}`;
    document.querySelectorAll('.operation').forEach(btn => btn.addEventListener('click', () => openSavingsOperationModal(btn.dataset.id)));
    document.querySelectorAll('.history').forEach(btn => btn.addEventListener('click', () => { currentHistoryAccountId = btn.dataset.id; showHistoryModal(currentHistoryAccountId); }));
    document.querySelectorAll('.delete-savings').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Supprimer ce compte ?')) {
            savingsAccounts = savingsAccounts.filter(a => a.id !== btn.dataset.id);
            saveSavingsAccounts();
            renderSavingsAccounts();
            renderDashboard();
        }
    }));
    renderDashboard();
}

function openSavingsOperationModal(id) {
    const acc = savingsAccounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('opAccountId').value = id;
    document.getElementById('operationModalTitle').textContent = `Opération sur ${acc.name}`;
    document.getElementById('opAmount').value = '';
    document.getElementById('opType').value = 'credit';
    document.getElementById('opDescription').value = '';
    document.getElementById('savingsOperationModal').classList.add('active');
}

function handleSavingsOperationSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('opAccountId').value;
    const amount = parseFloat(document.getElementById('opAmount').value);
    const type = document.getElementById('opType').value;
    const desc = document.getElementById('opDescription').value.trim();
    if (!amount || amount <= 0) return alert('Montant invalide.');
    const acc = savingsAccounts.find(a => a.id === id);
    if (!acc) return;
    if (type === 'credit') {
        acc.balance += amount;
        addOperationToHistory(id, 'credit', amount, desc);
    } else {
        if (acc.balance - amount < 0 && !confirm('Le solde deviendra négatif. Continuer ?')) return;
        acc.balance -= amount;
        addOperationToHistory(id, 'debit', amount, desc);
    }
    saveSavingsAccounts();
    renderSavingsAccounts();
    document.getElementById('savingsOperationModal').classList.remove('active');
}

function showHistoryModal(id) {
    const acc = savingsAccounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('historyModalTitle').textContent = `Historique - ${acc.name}`;
    const tbody = document.getElementById('historyTableBody');
    if (!acc.history || acc.history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Aucune opération</td></tr>';
    } else {
        tbody.innerHTML = acc.history.map(op => `
            <tr style="border-bottom:1px solid var(--border-light);">
                <td style="padding:0.5rem;">${formatDate(op.date)}</td>
                <td style="padding:0.5rem;" class="${op.type === 'credit' ? 'positive' : 'negative'}">${op.type === 'credit' ? '💰 Crédit' : '💸 Débit'}</td>
                <td style="padding:0.5rem;text-align:right;" class="${op.type === 'credit' ? 'positive' : 'negative'}">${op.type === 'credit' ? '+' : '-'}${op.amount.toFixed(2)} €</td>
                <td style="padding:0.5rem;">${escapeHtml(op.description || '-')}</td>
                <td style="padding:0.5rem;text-align:center;">
                    <button class="delete-op-btn" data-account="${acc.id}" data-op="${op.id}" style="background:none;border:none;cursor:pointer;color:var(--expense-color);">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.delete-op-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentOperationToDelete = { accountId: btn.dataset.account, opId: btn.dataset.op };
                document.getElementById('deleteOperationModal').classList.add('active');
            });
        });
    }
    document.getElementById('savingsHistoryModal').classList.add('active');
}

// ===== DASHBOARD =====
function renderDashboard() {
    const container = document.getElementById('dashboardContainer');
    if (!container) return;
    const active = savingsAccounts.filter(a => a.balance !== 0 || (a.history && a.history.length > 0));
    if (active.length === 0) {
        container.innerHTML = '<div class="empty-dashboard">Aucun compte actif.</div>';
        return;
    }
    container.innerHTML = active.map(acc => {
        const movements = acc.history ? acc.history.slice(0, 3) : [];
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <span class="dashboard-card-name">${escapeHtml(acc.name)}</span>
                    <span class="dashboard-card-balance ${acc.balance < 0 ? 'negative' : ''}">${acc.balance >= 0 ? '+' : ''}${acc.balance.toFixed(2)} ${appSettings.currency}</span>
                </div>
                ${movements.length ? `<ul class="dashboard-movements">${movements.map(m => `
                    <li class="dashboard-movement">
                        <span class="dashboard-movement-date">${formatDate(m.date)}</span>
                        <span>${escapeHtml(m.description || 'Opération')}</span>
                        <span class="dashboard-movement-amount ${m.type === 'credit' ? 'positive' : 'negative'}">${m.type === 'credit' ? '+' : '-'}${m.amount.toFixed(2)} €</span>
                    </li>
                `).join('')}</ul>` : '<div class="dashboard-empty">Aucun mouvement récent</div>'}
                ${acc.history && acc.history.length > 3 ? `<div style="text-align:right;font-size:0.75rem;color:var(--text-secondary);">+ ${acc.history.length - 3} autre(s) mouvement(s)</div>` : ''}
            </div>
        `;
    }).join('');
}

// ===== DUPLICATION MOIS =====
function openDuplicateModal() {
    const today = new Date();
    const defaultSource = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    document.getElementById('sourceMonth').value = defaultSource;
    const nextMonth = today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2;
    const nextYear = today.getMonth() + 2 > 12 ? today.getFullYear() + 1 : today.getFullYear();
    document.getElementById('targetMonth').value = `${nextYear}-${String(nextMonth).padStart(2,'0')}`;
    document.getElementById('duplicateModal').classList.add('active');
}

function handleDuplicateSubmit(e) {
    e.preventDefault();
    const source = document.getElementById('sourceMonth').value;
    const target = document.getElementById('targetMonth').value;
    const overwrite = document.getElementById('overwriteTarget').checked;
    if (!source || !target) return alert('Sélectionnez deux mois.');
    const sourceTx = transactions.filter(t => t.date && t.date.startsWith(source));
    if (!sourceTx.length) return alert(`Aucune transaction en ${source}.`);
    let newTx = overwrite ? transactions.filter(t => !t.date.startsWith(target)) : [...transactions];
    sourceTx.forEach(t => {
        const newDate = t.date.replace(source, target);
        newTx.push({ ...t, id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), date: newDate });
    });
    transactions = newTx;
    saveToLocalStorage();
    fullRefresh();
    alert(`${sourceTx.length} transaction(s) dupliquée(s).`);
    document.getElementById('duplicateModal').classList.remove('active');
}

// ===== EXPORT PDF =====
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const btn = document.getElementById('exportPdfBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Génération...';
    btn.disabled = true;
    try {
        const el = document.querySelector('.app-container');
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        const w = 210, h = (canvas.height * w) / canvas.width;
        let pos = 0;
        pdf.addImage(img, 'PNG', 0, pos, w, h);
        while (h - pos > 297) { pos -= 297; pdf.addPage(); pdf.addImage(img, 'PNG', 0, pos, w, h); }
        pdf.save('budgetflow.pdf');
    } catch (e) { alert('Erreur PDF.'); }
    btn.innerHTML = original;
    btn.disabled = false;
}

// ===== BARRE ACTIONS =====
function initQuickActionBar() {
    document.getElementById('qaAddBtn').addEventListener('click', openAddModal);
    document.getElementById('qaEditBtn').addEventListener('click', () => { if (selectedTransactionId) openEditModal(selectedTransactionId); });
    document.getElementById('qaDeleteBtn').addEventListener('click', () => { if (selectedTransactionId) deleteTransactionById(selectedTransactionId); });
    document.getElementById('qaDuplicateBtn').addEventListener('click', () => { if (selectedTransactionId) duplicateTransactionById(selectedTransactionId); });
    document.getElementById('qaSaveBtn').addEventListener('click', () => {
        if (document.getElementById('transactionModal').classList.contains('active')) {
            document.getElementById('transactionForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else {
            alert('Aucune transaction en cours.');
        }
    });
}

// ===== FULL REFRESH =====
function fullRefresh() {
    renderTransactionList();
    updateSummary();
    renderCategorySummary();
    renderBudgets();
    renderCharts();
    updateMonthSelect();
    updateCategoryFilter();
    saveToLocalStorage();
    initSortable();
    if (!document.querySelector('.transaction-item')) selectTransaction(null);
}

// ===== INIT =====
function init() {
    try {
        loadTheme();
        loadThemeColor();
        loadSettings();
        loadInitialData();
        loadBudgets();
        loadSavingsAccounts();
        loadSortMode();
        applySorting();
        fullRefresh();
        renderSavingsAccounts();
        renderDashboard();
        initMonthFilter();
        initQuickActionBar();
        initSortControls();

        // Événements - avec vérifications de sécurité
        if (openAddBtn) openAddBtn.addEventListener('click', openAddModal);
        if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => safeGetElementById('settingsModal')?.classList.add('active'));
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => safeGetElementById('settingsModal')?.classList.remove('active'));
        
        const themeToggleBtn = safeGetElementById('themeToggleBtn');
        if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
        
        const themeSelectorBtn = safeGetElementById('themeSelectorBtn');
        if (themeSelectorBtn) themeSelectorBtn.addEventListener('click', () => safeGetElementById('themeModal')?.classList.add('active'));
        
        const closeThemeModalBtn = safeGetElementById('closeThemeModalBtn');
        if (closeThemeModalBtn) closeThemeModalBtn.addEventListener('click', () => safeGetElementById('themeModal')?.classList.remove('active'));
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(el => {
            el.addEventListener('click', () => {
                applyThemeColor(el.dataset.theme);
                safeGetElementById('themeModal')?.classList.remove('active');
            });
        });
        
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
        if (settingsModal) settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) safeGetElementById('settingsModal')?.classList.remove('active'); });
        if (transactionForm) transactionForm.addEventListener('submit', handleFormSubmit);
        if (settingsForm) settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (initialAmountInput) appSettings.initialAmount = parseFloat(initialAmountInput.value) || 0;
            if (currencySelect) appSettings.currency = currencySelect.value;
            if (displayFormatSelect) appSettings.displayFormat = displayFormatSelect.value;
            saveSettingsToLocalStorage();
            updateInitialHintDisplay();
            fullRefresh();
            safeGetElementById('settingsModal')?.classList.remove('active');
        });

        // Budget
        const addBudgetBtn = safeGetElementById('addBudgetBtn');
        if (addBudgetBtn) addBudgetBtn.addEventListener('click', () => {
            const budgetModalTitle = safeGetElementById('budgetModalTitle');
            if (budgetModalTitle) budgetModalTitle.textContent = 'Définir un budget';
            const budgetCategory = safeGetElementById('budgetCategory');
            if (budgetCategory) budgetCategory.value = '';
            const budgetAmount = safeGetElementById('budgetAmount');
            if (budgetAmount) budgetAmount.value = '';
            safeGetElementById('budgetModal')?.classList.add('active');
        });
        
        const closeBudgetModalBtn = safeGetElementById('closeBudgetModalBtn');
        if (closeBudgetModalBtn) closeBudgetModalBtn.addEventListener('click', () => safeGetElementById('budgetModal')?.classList.remove('active'));
        
        const budgetForm = safeGetElementById('budgetForm');
        if (budgetForm) budgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const budgetCategory = safeGetElementById('budgetCategory');
            const budgetAmount = safeGetElementById('budgetAmount');
            const cat = budgetCategory?.value.trim() || '';
            const amount = parseFloat(budgetAmount?.value || 0);
            if (!cat || !amount || amount <= 0) return alert('Veuillez remplir tous les champs.');
            const existing = budgets.find(b => b.category === cat);
            if (existing) existing.amount = amount;
            else budgets.push({ category: cat, amount });
            saveBudgets();
            renderBudgets();
            safeGetElementById('budgetModal')?.classList.remove('active');
        });

        // Épargne
        const openSavingsBtn = safeGetElementById('openSavingsBtn');
        if (openSavingsBtn) openSavingsBtn.addEventListener('click', () => {
            const savingsView = safeGetElementById('savingsView');
            if (savingsView) {
                savingsView.style.display = savingsView.style.display === 'none' ? 'block' : 'none';
                if (savingsView.style.display === 'block') { renderSavingsAccounts(); renderDashboard(); }
            }
        });
        
        const addSavingsAccountBtn = safeGetElementById('addSavingsAccountBtn');
        if (addSavingsAccountBtn) addSavingsAccountBtn.addEventListener('click', () => safeGetElementById('savingsModal')?.classList.add('active'));
        
        const closeSavingsModalBtn = safeGetElementById('closeSavingsModalBtn');
        if (closeSavingsModalBtn) closeSavingsModalBtn.addEventListener('click', () => safeGetElementById('savingsModal')?.classList.remove('active'));
        
        const savingsForm = safeGetElementById('savingsForm');
        if (savingsForm) savingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const savingsName = safeGetElementById('savingsName');
            const savingsInitialBalance = safeGetElementById('savingsInitialBalance');
            const name = savingsName?.value.trim() || '';
            const balance = parseFloat(savingsInitialBalance?.value || 0);
            if (!name) return alert('Donnez un nom.');
            savingsAccounts.push({ id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), name, balance, history: [] });
            saveSavingsAccounts();
            renderSavingsAccounts();
            safeGetElementById('savingsModal')?.classList.remove('active');
        });
        
        const closeOpModalBtn = safeGetElementById('closeOpModalBtn');
        if (closeOpModalBtn) closeOpModalBtn.addEventListener('click', () => safeGetElementById('savingsOperationModal')?.classList.remove('active'));
        
        const savingsOperationForm = safeGetElementById('savingsOperationForm');
        if (savingsOperationForm) savingsOperationForm.addEventListener('submit', handleSavingsOperationSubmit);
        
        const savingsModal = safeGetElementById('savingsModal');
        if (savingsModal) savingsModal.addEventListener('click', (e) => { if (e.target === savingsModal) safeGetElementById('savingsModal')?.classList.remove('active'); });
        
        const savingsOperationModal = safeGetElementById('savingsOperationModal');
        if (savingsOperationModal) savingsOperationModal.addEventListener('click', (e) => { if (e.target === savingsOperationModal) safeGetElementById('savingsOperationModal')?.classList.remove('active'); });

        // Historique épargne
        const closeHistoryModalBtn = safeGetElementById('closeHistoryModalBtn');
        if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', () => safeGetElementById('savingsHistoryModal')?.classList.remove('active'));
        
        const exportHistoryCsvBtn = safeGetElementById('exportHistoryCsvBtn');
        if (exportHistoryCsvBtn) exportHistoryCsvBtn.addEventListener('click', () => {
            const acc = savingsAccounts.find(a => a.id === currentHistoryAccountId);
            if (!acc || !acc.history?.length) return alert('Aucune donnée.');
            let csv = 'Date;Type;Montant;Description\n';
            acc.history.forEach(op => { csv += `${formatDate(op.date)};${op.type === 'credit' ? 'Crédit' : 'Débit'};${op.amount};"${op.description || ''}"\n`; });
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `historique_${acc.name}.csv`;
            link.click();
        });
        
        const savingsHistoryModal = safeGetElementById('savingsHistoryModal');
        if (savingsHistoryModal) savingsHistoryModal.addEventListener('click', (e) => { if (e.target === savingsHistoryModal) safeGetElementById('savingsHistoryModal')?.classList.remove('active'); });
        
        const cancelDeleteOpBtn = safeGetElementById('cancelDeleteOpBtn');
        if (cancelDeleteOpBtn) cancelDeleteOpBtn.addEventListener('click', () => safeGetElementById('deleteOperationModal')?.classList.remove('active'));
        
        const confirmDeleteOpBtn = safeGetElementById('confirmDeleteOpBtn');
        if (confirmDeleteOpBtn) confirmDeleteOpBtn.addEventListener('click', () => {
            if (currentOperationToDelete) {
                deleteOperationFromHistory(currentOperationToDelete.accountId, currentOperationToDelete.opId);
                currentOperationToDelete = null;
                safeGetElementById('deleteOperationModal')?.classList.remove('active');
                if (safeGetElementById('savingsHistoryModal')?.classList.contains('active')) showHistoryModal(currentHistoryAccountId);
            }
        });
        
        const deleteOperationModal = safeGetElementById('deleteOperationModal');
        if (deleteOperationModal) deleteOperationModal.addEventListener('click', (e) => { if (e.target === deleteOperationModal) safeGetElementById('deleteOperationModal')?.classList.remove('active'); });

        // Duplication
        const openDuplicateBtn = safeGetElementById('openDuplicateBtn');
        if (openDuplicateBtn) openDuplicateBtn.addEventListener('click', openDuplicateModal);
        
        const closeDuplicateModalBtn = safeGetElementById('closeDuplicateModalBtn');
        if (closeDuplicateModalBtn) closeDuplicateModalBtn.addEventListener('click', () => safeGetElementById('duplicateModal')?.classList.remove('active'));
        
        const duplicateForm = safeGetElementById('duplicateForm');
        if (duplicateForm) duplicateForm.addEventListener('submit', handleDuplicateSubmit);
        
        const duplicateModal = safeGetElementById('duplicateModal');
        if (duplicateModal) duplicateModal.addEventListener('click', (e) => { if (e.target === duplicateModal) safeGetElementById('duplicateModal')?.classList.remove('active'); });

        // Export/Import
        const exportDataBtn = safeGetElementById('exportDataBtn');
        if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
        
        const importDataBtn = safeGetElementById('importDataBtn');
        if (importDataBtn) importDataBtn.addEventListener('click', () => safeGetElementById('importModal')?.classList.add('active'));
        
        const closeImportModalBtn = safeGetElementById('closeImportModalBtn');
        if (closeImportModalBtn) closeImportModalBtn.addEventListener('click', () => safeGetElementById('importModal')?.classList.remove('active'));
        
        const confirmImportBtn = safeGetElementById('confirmImportBtn');
        if (confirmImportBtn) confirmImportBtn.addEventListener('click', () => {
            const importFileInput = safeGetElementById('importFileInput');
            const file = importFileInput?.files[0];
            if (file) importData(file);
            else alert('Sélectionnez un fichier.');
            safeGetElementById('importModal')?.classList.remove('active');
        });
        
        const importModal = safeGetElementById('importModal');
        if (importModal) importModal.addEventListener('click', (e) => { if (e.target === importModal) safeGetElementById('importModal')?.classList.remove('active'); });

        // PDF
        const exportPdfBtn = safeGetElementById('exportPdfBtn');
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
        
        const exportMonthlyPdfBtn = safeGetElementById('exportMonthlyPdfBtn');
        if (exportMonthlyPdfBtn) exportMonthlyPdfBtn.addEventListener('click', () => {
            if (typeof exportMonthlyToPDF !== 'undefined') exportMonthlyToPDF();
            else alert('Fonction non disponible.');
        });

        // Vue mensuelle
        const openMonthlyBtn = safeGetElementById('openMonthlyBtn');
        if (openMonthlyBtn) openMonthlyBtn.addEventListener('click', () => {
            const monthlyView = safeGetElementById('monthlyView');
            if (monthlyView) {
                monthlyView.style.display = monthlyView.style.display === 'none' ? 'block' : 'none';
                if (monthlyView.style.display === 'block' && typeof renderMonthlyTable !== 'undefined') renderMonthlyTable();
            }
        });

        // Filtres avancés
        const applyFiltersBtn = safeGetElementById('applyFiltersBtn');
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyAdvancedFilters);
        
        const resetFiltersBtn = safeGetElementById('resetFiltersBtn');
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAdvancedFilters);

        // Refresh dashboard
        const refreshDashboardBtn = safeGetElementById('refreshDashboardBtn');
        if (refreshDashboardBtn) refreshDashboardBtn.addEventListener('click', () => { renderDashboard(); });

        // Scroll top
        const scrollTopBtn = safeGetElementById('scrollTopBtn');
        if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            if (scrollTopBtn) scrollTopBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
        });
    } catch (error) {
        console.error('Erreur lors de l\'initialisation :', error);
        alert('Une erreur s\'est produite lors du chargement. Veuillez rafraîchir la page.');
    }
}

function initSortControls() {
    const sortSelect = safeGetElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSortMode = e.target.value;
            saveSortMode();
            if (currentSortMode !== 'manual') applySorting();
            fullRefresh();
        });
    }
}

init();
