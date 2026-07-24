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

// Variables calendrier
let calendarCurrentDate = new Date();
let calendarSelectedDate = null;

// DOM elements
const listContainer = document.getElementById('transactionListContainer');
const totalBalanceSpan = document.getElementById('totalBalance');
const totalRevenueSpan = document.getElementById('totalRevenue');
const totalExpenseSpan = document.getElementById('totalExpense');
const openAddBtn = document.getElementById('openAddModalBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const modalOverlay = document.getElementById('transactionModal');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const transactionForm = document.getElementById('transactionForm');
const settingsForm = document.getElementById('settingsForm');
const modalTitle = document.getElementById('modalTitle');
const descInput = document.getElementById('descInput');
const amountInput = document.getElementById('amountInput');
const categoryInput = document.getElementById('categoryInput');
const typeSelect = document.getElementById('typeSelect');
const dateInput = document.getElementById('dateInput');
const recurringCheckbox = document.getElementById('recurringCheckbox');
const initialAmountInput = document.getElementById('initialAmountInput');
const currencySelect = document.getElementById('currencySelect');
const displayFormatSelect = document.getElementById('displayFormatSelect');
const initialHintSpan = document.getElementById('initialHint');

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
    document.querySelectorAll('.btn-add, .btn-savings, .btn-add-savings, .btn-transfer').forEach(el => {
        if (el) el.style.background = c.primary;
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
            { id: '1', description: 'Salaire NET', amount: 2450, category: 'Salaire', type: 'revenue', date: '2025-03-01', recurring: true },
            { id: '2', description: 'Courses supermarché', amount: 89.5, category: 'Alimentation', type: 'expense', date: '2025-03-05', recurring: false },
            { id: '3', description: 'Netflix', amount: 25.99, category: 'Abonnements', type: 'expense', date: '2025-03-10', recurring: true },
            { id: '4', description: 'Transport essence', amount: 45.2, category: 'Transport', type: 'expense', date: '2025-02-15', recurring: false },
            { id: '5', description: 'Freelance design', amount: 380, category: 'Freelance', type: 'revenue', date: '2025-02-20', recurring: false },
            { id: '6', description: 'Restaurant', amount: 37.4, category: 'Loisirs', type: 'expense', date: '2025-01-25', recurring: false }
        ];
    }
    transactions = transactions.map(t => {
        if (!t.date) t.date = new Date().toISOString().slice(0, 10);
        if (t.recurring === undefined) t.recurring = false;
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
        const recurringBadge = t.recurring ? '<span class="recurring-badge">🔄</span>' : '';
        html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="drag-area ${currentSortMode !== 'manual' ? 'disabled' : ''}"><i class="fas fa-grip-vertical"></i></div>
                <div class="transaction-info">
                    <span class="transaction-desc">${escapeHtml(t.description)} ${recurringBadge}</span>
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
        date: new Date().toISOString().slice(0, 10),
        recurring: original.recurring || false
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
    recurringCheckbox.checked = false;
    document.getElementById('transactionModal').classList.add('active');
}

function openEditModal(id) {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Modifier la transaction';
    document.getElementById('descInput').value = t.description;
    document.getElementById('amountInput').value = t.amount;
    document.getElementById('categoryInput').value = t.category || '';
    document.getElementById('typeSelect').value = t.type;
    document.getElementById('dateInput').value = t.date || new Date().toISOString().slice(0, 10);
    recurringCheckbox.checked = t.recurring || false;
    document.getElementById('transactionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
    currentEditId = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const description = document.getElementById('descInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const category = document.getElementById('categoryInput').value.trim() || 'Divers';
    const type = document.getElementById('typeSelect').value;
    let date = document.getElementById('dateInput').value || new Date().toISOString().slice(0, 10);
    const recurring = recurringCheckbox.checked;
    if (!description || !amount || amount <= 0) return alert('Veuillez remplir tous les champs.');
    if (currentEditId === null) {
        transactions.push({ 
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), 
            description, amount, category, type, date, recurring 
        });
    } else {
        const idx = transactions.findIndex(tx => tx.id === currentEditId);
        if (idx !== -1) transactions[idx] = { ...transactions[idx], description, amount, category, type, date, recurring };
    }
    closeModal();
    fullRefresh();
}

// ===== COMPTES ÉPARGNE =====
function loadSavingsAccounts() {
    const stored = localStorage.getItem('savingsAccounts');
    savingsAccounts = stored ? JSON.parse(stored) : [];
    savingsAccounts = savingsAccounts.map(acc => ({
        ...acc,
        history: acc.history || [],
        goal: acc.goal || null
    }));
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
        updateSavingsStats();
        return;
    }
    let html = '', total = 0, totalInterest = 0, goalsAchieved = 0, totalGoals = 0;
    savingsAccounts.forEach(acc => {
        total += acc.balance;
        
        let interest = 0;
        if (acc.goal && acc.goal.interest > 0) {
            interest = acc.balance * (acc.goal.interest / 100);
            totalInterest += interest;
        }
        
        let goalStatus = '';
        let goalProgress = 0;
        if (acc.goal) {
            totalGoals++;
            const target = acc.goal.target || 0;
            goalProgress = target > 0 ? Math.min((acc.balance / target) * 100, 100) : 0;
            if (goalProgress >= 100) goalsAchieved++;
            const goalClass = goalProgress >= 100 ? 'achieved' : 'not-achieved';
            const deadline = acc.goal.deadline ? `📅 ${formatDate(acc.goal.deadline)}` : '';
            const interestText = acc.goal.interest > 0 ? `📈 ${acc.goal.interest}%` : '';
            goalStatus = `
                <div class="goal-progress">
                    <div class="goal-header">
                        <span>🎯 ${escapeHtml(acc.goal.name)}</span>
                        <span>${acc.balance.toFixed(0)} / ${target.toFixed(0)} €</span>
                        <button class="goal-remove" data-account="${acc.id}">✕</button>
                    </div>
                    <div class="goal-bar">
                        <div class="fill" style="width: ${goalProgress}%; background: ${goalProgress >= 100 ? 'var(--revenue-color)' : goalProgress > 70 ? '#f59e0b' : 'var(--expense-color)'};"></div>
                    </div>
                    <div class="goal-details">
                        <span class="goal-amount ${goalClass}">${goalProgress >= 100 ? '✅ Objectif atteint !' : `${goalProgress.toFixed(0)}%`}</span>
                        <span class="goal-deadline">${deadline} ${interestText}</span>
                    </div>
                </div>
            `;
        }
        
        const count = acc.history ? acc.history.length : 0;
        html += `
            <div class="savings-account-card" data-id="${acc.id}">
                <div class="savings-account-info">
                    <span class="savings-account-name">${escapeHtml(acc.name)}</span>
                    <span class="savings-account-balance ${acc.balance >= 0 ? 'positive' : 'negative'}">${acc.balance >= 0 ? '+' : ''}${acc.balance.toFixed(2)} ${appSettings.currency}</span>
                </div>
                ${goalStatus}
                <div class="savings-account-actions">
                    <button class="operation" data-id="${acc.id}"><i class="fas fa-exchange-alt"></i> Opération</button>
                    <button class="history" data-id="${acc.id}"><i class="fas fa-history"></i> Hist. (${count})</button>
                    <button class="goal-btn" data-id="${acc.id}"><i class="fas fa-bullseye"></i> Objectif</button>
                    <button class="transfer-btn" data-id="${acc.id}"><i class="fas fa-arrow-right-arrow-left"></i> Transfert</button>
                    <button class="delete-savings" data-id="${acc.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateSavingsStats(total, totalInterest, goalsAchieved, totalGoals);
    
    document.querySelectorAll('.operation').forEach(btn => btn.addEventListener('click', () => openSavingsOperationModal(btn.dataset.id)));
    document.querySelectorAll('.history').forEach(btn => btn.addEventListener('click', () => { currentHistoryAccountId = btn.dataset.id; showHistoryModal(currentHistoryAccountId); }));
    document.querySelectorAll('.goal-btn').forEach(btn => btn.addEventListener('click', () => openGoalModal(btn.dataset.id)));
    document.querySelectorAll('.transfer-btn').forEach(btn => btn.addEventListener('click', () => openTransferModal(btn.dataset.id)));
    document.querySelectorAll('.delete-savings').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Supprimer ce compte ?')) {
            savingsAccounts = savingsAccounts.filter(a => a.id !== btn.dataset.id);
            saveSavingsAccounts();
            renderSavingsAccounts();
            renderDashboard();
        }
    }));
    document.querySelectorAll('.goal-remove').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Supprimer cet objectif ?')) {
            const acc = savingsAccounts.find(a => a.id === btn.dataset.account);
            if (acc) { acc.goal = null; saveSavingsAccounts(); renderSavingsAccounts(); }
        }
    }));
    renderDashboard();
}

function updateSavingsStats(total, totalInterest, goalsAchieved, totalGoals) {
    document.getElementById('totalSavings').textContent = `${(total || 0).toFixed(2)} ${appSettings.currency}`;
    document.getElementById('totalInterest').textContent = `${(totalInterest || 0).toFixed(2)} ${appSettings.currency}`;
    const goalsText = totalGoals > 0 ? `${goalsAchieved || 0}/${totalGoals}` : '0/0';
    document.getElementById('goalsAchieved').textContent = goalsText;
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

// ===== OBJECTIF D'ÉPARGNE =====
function openGoalModal(accountId) {
    const acc = savingsAccounts.find(a => a.id === accountId);
    if (!acc) return;
    document.getElementById('goalAccountId').value = accountId;
    document.getElementById('goalModalTitle').textContent = `🎯 Objectif pour ${acc.name}`;
    document.getElementById('goalName').value = acc.goal?.name || '';
    document.getElementById('goalTarget').value = acc.goal?.target || '';
    document.getElementById('goalDeadline').value = acc.goal?.deadline || '';
    document.getElementById('goalInterest').value = acc.goal?.interest || 0;
    document.getElementById('savingsGoalModal').classList.add('active');
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const accountId = document.getElementById('goalAccountId').value;
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value);
    const deadline = document.getElementById('goalDeadline').value || null;
    const interest = parseFloat(document.getElementById('goalInterest').value) || 0;
    if (!name || !target || target <= 0) return alert('Veuillez remplir tous les champs.');
    const acc = savingsAccounts.find(a => a.id === accountId);
    if (!acc) return;
    acc.goal = { name, target, deadline, interest };
    saveSavingsAccounts();
    renderSavingsAccounts();
    document.getElementById('savingsGoalModal').classList.remove('active');
}

// ===== TRANSFERT ENTRE COMPTES =====
function openTransferModal(sourceId) {
    const selects = [document.getElementById('transferSource'), document.getElementById('transferTarget')];
    const options = savingsAccounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.balance.toFixed(2)} ${appSettings.currency})</option>`).join('');
    selects.forEach(select => {
        select.innerHTML = options;
    });
    if (sourceId) {
        document.getElementById('transferSource').value = sourceId;
        const targets = savingsAccounts.filter(a => a.id !== sourceId);
        if (targets.length > 0) {
            document.getElementById('transferTarget').value = targets[0].id;
        }
    }
    document.getElementById('transferAmount').value = '';
    document.getElementById('savingsTransferModal').classList.add('active');
}

function handleTransferSubmit(e) {
    e.preventDefault();
    const sourceId = document.getElementById('transferSource').value;
    const targetId = document.getElementById('transferTarget').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    if (sourceId === targetId) return alert('Les comptes doivent être différents.');
    if (!amount || amount <= 0) return alert('Montant invalide.');
    const source = savingsAccounts.find(a => a.id === sourceId);
    const target = savingsAccounts.find(a => a.id === targetId);
    if (!source || !target) return alert('Compte introuvable.');
    if (source.balance < amount) return alert(`Solde insuffisant sur ${source.name}.`);
    source.balance -= amount;
    target.balance += amount;
    addOperationToHistory(sourceId, 'debit', amount, `Transfert vers ${target.name}`);
    addOperationToHistory(targetId, 'credit', amount, `Transfert depuis ${source.name}`);
    saveSavingsAccounts();
    renderSavingsAccounts();
    document.getElementById('savingsTransferModal').classList.remove('active');
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

// ===== TRANSACTIONS RÉCURRENTES =====
function getRecurringTransactions() {
    return transactions.filter(t => t.recurring === true);
}

function toggleRecurringStatus(id) {
    const t = transactions.find(tx => tx.id === id);
    if (t) {
        t.recurring = !t.recurring;
        saveToLocalStorage();
        fullRefresh();
        renderRecurringList();
    }
}

function renderRecurringList() {
    const container = document.getElementById('recurringList');
    if (!container) return;
    const recurring = getRecurringTransactions();
    const countSpan = document.getElementById('recurringCount');
    if (countSpan) {
        countSpan.textContent = `${recurring.length} transaction(s)`;
    }
    if (recurring.length === 0) {
        container.innerHTML = '<div class="empty-cats">Aucune transaction récurrente. Cochez "Transaction récurrente" dans une transaction pour l\'ajouter ici.</div>';
        return;
    }
    let html = '';
    recurring.forEach(t => {
        const amountClass = t.type === 'expense' ? 'negative' : 'positive';
        const amountSign = t.type === 'expense' ? '-' : '+';
        html += `
            <div class="recurring-item" data-id="${t.id}">
                <span class="recurring-desc">${escapeHtml(t.description)}</span>
                <span class="recurring-category">${escapeHtml(t.category || 'Non catégorisé')}</span>
                <span class="recurring-date">${t.date || ''}</span>
                <span class="recurring-amount ${amountClass}">${amountSign} ${t.amount.toFixed(2)} ${appSettings.currency}</span>
                <button class="recurring-toggle" data-id="${t.id}" title="Retirer des récurrentes">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;
    document.querySelectorAll('.recurring-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleRecurringStatus(btn.dataset.id);
        });
    });
}

function toggleRecurringView() {
    const view = document.getElementById('recurringView');
    if (view) {
        if (view.style.display === 'none') {
            renderRecurringList();
            view.style.display = 'block';
        } else {
            view.style.display = 'none';
        }
    }
}

// ===== CALENDRIER =====
function renderCalendar() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthName = new Date(year, month, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    document.getElementById('calendarMonthYear').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    let html = daysOfWeek.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
    
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    
    for (let i = 0; i < startOffset; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }
    
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const dayTransactions = {};
    const monthTx = transactions.filter(t => t.date && t.date.startsWith(monthKey));
    monthTx.forEach(t => {
        if (!dayTransactions[t.date]) dayTransactions[t.date] = [];
        dayTransactions[t.date].push(t);
    });
    
    const sortedTx = [...monthTx].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = appSettings.initialAmount || 0;
    const prevMonth = new Date(year, month, 0);
    const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthTx = transactions.filter(t => t.date && t.date.startsWith(prevMonthKey));
    prevMonthTx.forEach(t => {
        if (t.type === 'revenue') cumulative += t.amount;
        else cumulative -= t.amount;
    });
    
    const dailyBalances = {};
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tx = dayTransactions[dateStr] || [];
        tx.forEach(t => {
            if (t.type === 'revenue') cumulative += t.amount;
            else cumulative -= t.amount;
        });
        dailyBalances[dateStr] = cumulative;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tx = dayTransactions[dateStr] || [];
        const balance = dailyBalances[dateStr] || 0;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === calendarSelectedDate;
        
        let classes = 'calendar-day';
        if (tx.length > 0) classes += ' has-transaction';
        if (tx.some(t => t.type === 'revenue')) classes += ' has-revenue';
        if (tx.some(t => t.type === 'expense')) classes += ' has-expense';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        
        const balanceClass = balance >= 0 ? 'positive' : 'negative';
        const balanceDisplay = `${balance >= 0 ? '+' : ''}${balance.toFixed(0)}`;
        
        html += `
            <div class="${classes}" data-date="${dateStr}">
                <span class="day-number">${d}</span>
                ${tx.length > 0 ? `<span class="day-balance ${balanceClass}">${balanceDisplay}</span>` : ''}
            </div>
        `;
    }
    
    document.getElementById('calendarGrid').innerHTML = html;
    
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            calendarSelectedDate = date;
            renderCalendar();
            renderDayDetail(date);
        });
    });
    
    if (!calendarSelectedDate) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (document.querySelector(`.calendar-day[data-date="${todayStr}"]`)) {
            calendarSelectedDate = todayStr;
        } else {
            const firstTx = document.querySelector('.calendar-day.has-transaction');
            if (firstTx) calendarSelectedDate = firstTx.dataset.date;
        }
        if (calendarSelectedDate) {
            renderCalendar();
            renderDayDetail(calendarSelectedDate);
        }
    } else {
        renderDayDetail(calendarSelectedDate);
    }
}

function renderDayDetail(date) {
    const title = document.getElementById('calendarDayTitle');
    const container = document.getElementById('calendarDayTransactions');
    
    if (!date) {
        title.textContent = 'Sélectionnez un jour';
        container.innerHTML = '<div class="empty-detail">Cliquez sur un jour pour voir les transactions</div>';
        return;
    }
    
    const tx = transactions.filter(t => t.date === date);
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    title.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    
    if (tx.length === 0) {
        container.innerHTML = '<div class="empty-detail">Aucune transaction ce jour</div>';
        return;
    }
    
    let totalRev = 0, totalExp = 0;
    let html = '';
    tx.forEach(t => {
        if (t.type === 'revenue') totalRev += t.amount;
        else totalExp += t.amount;
        const amountClass = t.type === 'revenue' ? 'positive' : 'negative';
        html += `
            <div class="day-transaction-item">
                <span class="tx-desc">${escapeHtml(t.description)}</span>
                <span class="tx-cat">${escapeHtml(t.category || 'Non catégorisé')}</span>
                <span class="tx-amount ${amountClass}">${t.type === 'revenue' ? '+' : '-'} ${t.amount.toFixed(2)} ${appSettings.currency}</span>
            </div>
        `;
    });
    
    const net = totalRev - totalExp;
    const netClass = net >= 0 ? 'positive' : 'negative';
    html += `
        <div style="display:flex; justify-content:space-between; padding:0.5rem 0.5rem 0; border-top:2px solid var(--border-light); margin-top:0.3rem; font-weight:600;">
            <span>Total</span>
            <span class="${netClass}">${net >= 0 ? '+' : ''}${net.toFixed(2)} ${appSettings.currency}</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function initCalendar() {
    document.getElementById('calendarPrevBtn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        calendarSelectedDate = null;
        renderCalendar();
    });
    document.getElementById('calendarNextBtn').addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        calendarSelectedDate = null;
        renderCalendar();
    });
    document.getElementById('calendarTodayBtn').addEventListener('click', () => {
        calendarCurrentDate = new Date();
        calendarSelectedDate = new Date().toISOString().slice(0, 10);
        renderCalendar();
    });
    
    renderCalendar();
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
    const onlyRecurring = document.getElementById('onlyRecurring').checked;
    if (!source || !target) return alert('Sélectionnez deux mois.');
    let sourceTx = transactions.filter(t => t.date && t.date.startsWith(source));
    if (onlyRecurring) {
        sourceTx = sourceTx.filter(t => t.recurring === true);
    }
    if (!sourceTx.length) {
        const msg = onlyRecurring ? 'Aucune transaction récurrente trouvée.' : `Aucune transaction en ${source}.`;
        return alert(msg);
    }
    let newTx = overwrite ? transactions.filter(t => !t.date.startsWith(target)) : [...transactions];
    sourceTx.forEach(t => {
        const newDate = t.date.replace(source, target);
        newTx.push({ 
            ...t, 
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), 
            date: newDate,
            recurring: t.recurring 
        });
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
    renderCalendar();
    updateMonthSelect();
    updateCategoryFilter();
    saveToLocalStorage();
    initSortable();
    if (!document.querySelector('.transaction-item')) selectTransaction(null);
    // Mettre à jour la vue récurrente si visible
    const recurringView = document.getElementById('recurringView');
    if (recurringView && recurringView.style.display !== 'none') {
        renderRecurringList();
    }
}

// ===== INIT =====
function init() {
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
    initCalendar();
    initSortControls();

    // Événements
    openAddBtn.addEventListener('click', openAddModal);
    openSettingsBtn.addEventListener('click', () => document.getElementById('settingsModal').classList.add('active'));
    closeModalBtn.addEventListener('click', closeModal);
    closeSettingsBtn.addEventListener('click', () => document.getElementById('settingsModal').classList.remove('active'));
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('themeSelectorBtn').addEventListener('click', () => document.getElementById('themeModal').classList.add('active'));
    document.getElementById('closeThemeModalBtn').addEventListener('click', () => document.getElementById('themeModal').classList.remove('active'));
    document.querySelectorAll('.theme-option').forEach(el => {
        el.addEventListener('click', () => { applyThemeColor(el.dataset.theme); document.getElementById('themeModal').classList.remove('active'); });
    });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) document.getElementById('settingsModal').classList.remove('active'); });
    transactionForm.addEventListener('submit', handleFormSubmit);
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        appSettings.initialAmount = parseFloat(initialAmountInput.value) || 0;
        appSettings.currency = currencySelect.value;
        appSettings.displayFormat = displayFormatSelect.value;
        saveSettingsToLocalStorage();
        updateInitialHintDisplay();
        fullRefresh();
        document.getElementById('settingsModal').classList.remove('active');
    });

    // Budget
    document.getElementById('addBudgetBtn').addEventListener('click', () => {
        document.getElementById('budgetModalTitle').textContent = 'Définir un budget';
        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';
        document.getElementById('budgetModal').classList.add('active');
    });
    document.getElementById('closeBudgetModalBtn').addEventListener('click', () => document.getElementById('budgetModal').classList.remove('active'));
    document.getElementById('budgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const cat = document.getElementById('budgetCategory').value.trim();
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        if (!cat || !amount || amount <= 0) return alert('Veuillez remplir tous les champs.');
        const existing = budgets.find(b => b.category === cat);
        if (existing) existing.amount = amount;
        else budgets.push({ category: cat, amount });
        saveBudgets();
        renderBudgets();
        document.getElementById('budgetModal').classList.remove('active');
    });

    // Épargne
    document.getElementById('openSavingsBtn').addEventListener('click', () => {
        const view = document.getElementById('savingsView');
        view.style.display = view.style.display === 'none' ? 'block' : 'none';
        if (view.style.display === 'block') { renderSavingsAccounts(); renderDashboard(); }
    });
    document.getElementById('addSavingsAccountBtn').addEventListener('click', () => document.getElementById('savingsModal').classList.add('active'));
    document.getElementById('closeSavingsModalBtn').addEventListener('click', () => document.getElementById('savingsModal').classList.remove('active'));
    document.getElementById('savingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('savingsName').value.trim();
        const balance = parseFloat(document.getElementById('savingsInitialBalance').value) || 0;
        if (!name) return alert('Donnez un nom.');
        savingsAccounts.push({ id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), name, balance, history: [] });
        saveSavingsAccounts();
        renderSavingsAccounts();
        document.getElementById('savingsModal').classList.remove('active');
    });
    document.getElementById('closeOpModalBtn').addEventListener('click', () => document.getElementById('savingsOperationModal').classList.remove('active'));
    document.getElementById('savingsOperationForm').addEventListener('submit', handleSavingsOperationSubmit);
    document.getElementById('savingsModal').addEventListener('click', (e) => { if (e.target === document.getElementById('savingsModal')) document.getElementById('savingsModal').classList.remove('active'); });
    document.getElementById('savingsOperationModal').addEventListener('click', (e) => { if (e.target === document.getElementById('savingsOperationModal')) document.getElementById('savingsOperationModal').classList.remove('active'); });

    // Historique épargne
    document.getElementById('closeHistoryModalBtn').addEventListener('click', () => document.getElementById('savingsHistoryModal').classList.remove('active'));
    document.getElementById('exportHistoryCsvBtn').addEventListener('click', () => {
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
    document.getElementById('savingsHistoryModal').addEventListener('click', (e) => { if (e.target === document.getElementById('savingsHistoryModal')) document.getElementById('savingsHistoryModal').classList.remove('active'); });
    document.getElementById('cancelDeleteOpBtn').addEventListener('click', () => document.getElementById('deleteOperationModal').classList.remove('active'));
    document.getElementById('confirmDeleteOpBtn').addEventListener('click', () => {
        if (currentOperationToDelete) {
            deleteOperationFromHistory(currentOperationToDelete.accountId, currentOperationToDelete.opId);
            currentOperationToDelete = null;
            document.getElementById('deleteOperationModal').classList.remove('active');
            if (document.getElementById('savingsHistoryModal').classList.contains('active')) showHistoryModal(currentHistoryAccountId);
        }
    });
    document.getElementById('deleteOperationModal').addEventListener('click', (e) => { if (e.target === document.getElementById('deleteOperationModal')) document.getElementById('deleteOperationModal').classList.remove('active'); });

    // Objectif épargne
    document.getElementById('closeGoalModalBtn').addEventListener('click', () => document.getElementById('savingsGoalModal').classList.remove('active'));
    document.getElementById('savingsGoalForm').addEventListener('submit', handleGoalSubmit);
    document.getElementById('savingsGoalModal').addEventListener('click', (e) => { if (e.target === document.getElementById('savingsGoalModal')) document.getElementById('savingsGoalModal').classList.remove('active'); });

    // Transfert entre comptes
    document.getElementById('closeTransferModalBtn').addEventListener('click', () => document.getElementById('savingsTransferModal').classList.remove('active'));
    document.getElementById('savingsTransferForm').addEventListener('submit', handleTransferSubmit);
    document.getElementById('savingsTransferModal').addEventListener('click', (e) => { if (e.target === document.getElementById('savingsTransferModal')) document.getElementById('savingsTransferModal').classList.remove('active'); });
    document.getElementById('openTransferBtn').addEventListener('click', () => openTransferModal());

    // Récurrentes
    document.getElementById('openRecurringBtn').addEventListener('click', toggleRecurringView);

    // Duplication
    document.getElementById('openDuplicateBtn').addEventListener('click', openDuplicateModal);
    document.getElementById('closeDuplicateModalBtn').addEventListener('click', () => document.getElementById('duplicateModal').classList.remove('active'));
    document.getElementById('duplicateForm').addEventListener('submit', handleDuplicateSubmit);
    document.getElementById('duplicateModal').addEventListener('click', (e) => { if (e.target === document.getElementById('duplicateModal')) document.getElementById('duplicateModal').classList.remove('active'); });

    // Export/Import
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importModal').classList.add('active'));
    document.getElementById('closeImportModalBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('active'));
    document.getElementById('confirmImportBtn').addEventListener('click', () => {
        const file = document.getElementById('importFileInput').files[0];
        if (file) importData(file);
        else alert('Sélectionnez un fichier.');
        document.getElementById('importModal').classList.remove('active');
    });
    document.getElementById('importModal').addEventListener('click', (e) => { if (e.target === document.getElementById('importModal')) document.getElementById('importModal').classList.remove('active'); });

    // PDF
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('exportMonthlyPdfBtn').addEventListener('click', () => {
        if (typeof exportMonthlyToPDF !== 'undefined') exportMonthlyToPDF();
        else alert('Fonction non disponible.');
    });

    // Vue mensuelle
    document.getElementById('openMonthlyBtn').addEventListener('click', () => {
        const view = document.getElementById('monthlyView');
        view.style.display = view.style.display === 'none' ? 'block' : 'none';
        if (view.style.display === 'block' && typeof renderMonthlyTable !== 'undefined') renderMonthlyTable();
    });

    // Filtres avancés
    document.getElementById('applyFiltersBtn').addEventListener('click', applyAdvancedFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetAdvancedFilters);

    // Refresh dashboard
    document.getElementById('refreshDashboardBtn').addEventListener('click', () => { renderDashboard(); });

    // Scroll top
    document.getElementById('scrollTopBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
        document.getElementById('scrollTopBtn').style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
}

function initSortControls() {
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSortMode = e.target.value;
        saveSortMode();
        if (currentSortMode !== 'manual') applySorting();
        fullRefresh();
    });
}

init();
