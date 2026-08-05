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
let bankAccounts = [];
let budgets = [];
let currentOperationToDelete = null;
let currentHistoryAccountId = null;
let currentDetailAccountId = null;
let currentDetailAccountType = null;
let dayDetailDate = null;
let detailFilters = {
    dateFrom: null,
    dateTo: null,
    type: null,
    minAmount: null,
    maxAmount: null,
    search: null
};
let advancedFilters = { 
    dateFrom: null, dateTo: null, category: null, type: null, 
    minAmount: null, maxAmount: null, account: null 
};
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
const transactionAccount = document.getElementById('transactionAccount');
const transactionTarget = document.getElementById('transactionTarget');
const transferInfo = document.getElementById('transferInfo');
const transferInfoText = document.getElementById('transferInfoText');
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

function getAccountName(accountId) {
    if (accountId === 'general') return 'Compte général';
    const acc = bankAccounts.find(a => a.id === accountId);
    return acc ? acc.name : 'Compte inconnu';
}

function getBankTypeLabel(type) {
    const labels = {
        courant: '💳 Compte courant',
        livret: '🏦 Livret',
        pel: '📈 PEL',
        lds: '🏦 LDD',
        epargne: '🏦 Épargne',
        autre: '📁 Autre'
    };
    return labels[type] || type;
}

// ===== THÈME CLAIR/SOMBRE =====
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    isDarkMode = theme === 'dark';
    localStorage.setItem('budgetTheme', theme);
    updateThemeIcon();
    
    // Rafraîchir les graphiques après le changement de thème
    setTimeout(() => {
        renderCharts();
        renderFullCharts();
    }, 50);
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
    document.querySelectorAll('.btn-add, .btn-savings, .btn-add-savings, .btn-transfer, .btn-add-bank').forEach(el => {
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
        if (currentFilterMonth) {
            const [year, month] = currentFilterMonth.split('-');
            const monthName = new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' });
            initialHintSpan.textContent = `(filtre: ${monthName} ${year})`;
        } else {
            initialHintSpan.textContent = appSettings.initialAmount !== 0 ? `(départ: ${appSettings.initialAmount.toFixed(2)} ${appSettings.currency})` : '';
        }
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
        migrateTransactionsWithTarget();
    } else {
        transactions = [
            { id: '1', description: 'Salaire NET', amount: 2450, category: 'Salaire', type: 'revenue', date: '2025-03-01', recurring: true, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null },
            { id: '2', description: 'Courses supermarché', amount: 89.5, category: 'Alimentation', type: 'expense', date: '2025-03-05', recurring: false, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null },
            { id: '3', description: 'Netflix', amount: 25.99, category: 'Abonnements', type: 'expense', date: '2025-03-10', recurring: true, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null },
            { id: '4', description: 'Transport essence', amount: 45.2, category: 'Transport', type: 'expense', date: '2025-02-15', recurring: false, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null },
            { id: '5', description: 'Freelance design', amount: 380, category: 'Freelance', type: 'revenue', date: '2025-02-20', recurring: false, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null },
            { id: '6', description: 'Restaurant', amount: 37.4, category: 'Loisirs', type: 'expense', date: '2025-01-25', recurring: false, account: 'general', source: 'general', target: '', isTransfer: false, linkedId: null }
        ];
        saveToLocalStorage();
    }
}

function migrateTransactionsWithTarget() {
    let changed = false;
    transactions = transactions.map(t => {
        if (t.target === undefined) {
            t.target = '';
            changed = true;
        }
        if (t.source === undefined) {
            t.source = t.account || 'general';
            changed = true;
        }
        if (t.account === undefined) {
            t.account = 'general';
            changed = true;
        }
        if (t.recurring === undefined) {
            t.recurring = false;
            changed = true;
        }
        if (!t.date) {
            t.date = new Date().toISOString().slice(0, 10);
            changed = true;
        }
        if (t.category === undefined) {
            t.category = '';
            changed = true;
        }
        if (t.isTransfer === undefined) {
            t.isTransfer = false;
            changed = true;
        }
        if (t.linkedId === undefined) {
            t.linkedId = null;
            changed = true;
        }
        return t;
    });
    if (changed) {
        saveToLocalStorage();
        console.log('Transactions migrées.');
    }
}

// ===== COMPTES BANCAIRES =====
function loadBankAccounts() {
    const stored = localStorage.getItem('bankAccounts');
    bankAccounts = stored ? JSON.parse(stored) : [];
}

function saveBankAccounts() {
    localStorage.setItem('bankAccounts', JSON.stringify(bankAccounts));
}

// ===== SYNCHRONISATION COMPTES BANCAIRES =====
function updateBankAccountBalance(accountId) {
    if (!accountId || accountId === 'general') return;
    const account = bankAccounts.find(a => a.id === accountId);
    if (!account) return;
    
    const accountTransactions = transactions.filter(t => t.account === accountId);
    let balance = 0;
    accountTransactions.forEach(t => {
        if (t.type === 'revenue') balance += t.amount;
        else balance -= t.amount;
    });
    
    account.balance = balance;
    saveBankAccounts();
}

function updateAllBankAccountsBalances() {
    bankAccounts.forEach(acc => {
        updateBankAccountBalance(acc.id);
    });
    renderBankAccounts();
    updateTransactionSelects();
}

// ===== MISE À JOUR DES SÉLECTEURS =====
function updateTransactionSelects() {
    if (!transactionAccount || !transactionTarget) return;
    const currentSource = transactionAccount.value;
    const currentTarget = transactionTarget.value;
    const accounts = bankAccounts.map(a => ({
        id: a.id,
        name: a.name
    }));
    
    let sourceHtml = '<option value="general">📊 Compte général</option>';
    let targetHtml = '<option value="">─── Sélectionner ───</option>';
    targetHtml += '<option value="general">📊 Compte général</option>';
    
    accounts.forEach(acc => {
        const sourceSelected = currentSource === acc.id ? 'selected' : '';
        const targetSelected = currentTarget === acc.id ? 'selected' : '';
        sourceHtml += `<option value="${acc.id}" ${sourceSelected}>🏦 ${escapeHtml(acc.name)}</option>`;
        targetHtml += `<option value="${acc.id}" ${targetSelected}>🏦 ${escapeHtml(acc.name)}</option>`;
    });
    
    transactionAccount.innerHTML = sourceHtml;
    transactionTarget.innerHTML = targetHtml;
    
    if (currentSource && accounts.some(a => a.id === currentSource)) {
        transactionAccount.value = currentSource;
    }
    if (currentTarget && (currentTarget === 'general' || accounts.some(a => a.id === currentTarget))) {
        transactionTarget.value = currentTarget;
    }
    
    updateTransferInfo();
}

function updateTransferInfo() {
    if (!transferInfo || !transferInfoText) return;
    const source = transactionAccount ? transactionAccount.value : 'general';
    const target = transactionTarget ? transactionTarget.value : '';
    const type = typeSelect ? typeSelect.value : 'expense';
    
    if (target && target !== '') {
        transferInfo.style.display = 'block';
        const sourceName = getAccountName(source);
        const targetName = getAccountName(target);
        if (type === 'expense') {
            transferInfoText.textContent = `💸 Dépense : ${sourceName} → ${targetName} (débit sur source, crédit sur cible)`;
        } else {
            transferInfoText.textContent = `💰 Revenu : ${sourceName} → ${targetName} (crédit sur source, débit sur cible)`;
        }
    } else {
        transferInfo.style.display = 'none';
    }
}

function updateAccountFilter() {
    const select = document.getElementById('filterAccount');
    if (!select) return;
    const current = select.value;
    let html = '<option value="">Tous</option>';
    html += '<option value="general">📊 Compte général</option>';
    bankAccounts.forEach(acc => {
        const selected = current === acc.id ? 'selected' : '';
        html += `<option value="${acc.id}" ${selected}>🏦 ${escapeHtml(acc.name)}</option>`;
    });
    select.innerHTML = html;
    if (current && bankAccounts.some(a => a.id === current)) {
        select.value = current;
    }
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
    
    // Filtrer les transactions par mois
    const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(monthKey));
    
    budgets.forEach(b => {
        const spent = monthTransactions
            .filter(t => t.category === b.category && t.type === 'expense')
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
    if (f.account) filtered = filtered.filter(t => t.account === f.account || t.target === f.account);
    return filtered;
}

function applyAdvancedFilters() {
    advancedFilters.dateFrom = document.getElementById('filterDateFrom').value;
    advancedFilters.dateTo = document.getElementById('filterDateTo').value;
    advancedFilters.category = document.getElementById('filterCategory').value;
    advancedFilters.type = document.getElementById('filterType').value;
    advancedFilters.minAmount = parseFloat(document.getElementById('filterMinAmount').value) || null;
    advancedFilters.maxAmount = parseFloat(document.getElementById('filterMaxAmount').value) || null;
    advancedFilters.account = document.getElementById('filterAccount').value || null;
    fullRefresh();
}

function resetAdvancedFilters() {
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterMinAmount').value = '';
    document.getElementById('filterMaxAmount').value = '';
    document.getElementById('filterAccount').value = '';
    advancedFilters = { dateFrom: null, dateTo: null, category: null, type: null, minAmount: null, maxAmount: null, account: null };
    fullRefresh();
}

// ===== RÉSUMÉ =====
function updateSummary() {
    const previousCard = document.getElementById('previousBalanceCard');
    const previousSpan = document.getElementById('previousBalance');
    let totalRev = 0, totalExp = 0;
    const filtered = getFilteredTransactions();

    // Mettre à jour le hint dans le titre du solde
    const initialHint = document.getElementById('initialHint');
    if (initialHint) {
        if (currentFilterMonth) {
            const [year, month] = currentFilterMonth.split('-');
            const monthName = new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' });
            initialHint.textContent = `(filtre: ${monthName} ${year})`;
        } else {
            initialHint.textContent = appSettings.initialAmount !== 0 ? 
                `(départ: ${appSettings.initialAmount.toFixed(2)} ${appSettings.currency})` : '';
        }
    }

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
        if (!element) return;
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
        if (previousSpan) {
            previousSpan.innerText = formatSignedAmount(balancePrevMonth);
            setColorClass(previousSpan, balancePrevMonth);
        }
        if (previousCard) previousCard.style.display = 'flex';
        
        const balanceCurrent = getCumulativeBalance(endCurrentDate);
        filtered.forEach(t => {
            if (t.date.startsWith(currentFilterMonth)) {
                if (t.type === 'revenue') totalRev += t.amount;
                else totalExp += t.amount;
            }
        });
        if (totalRevenueSpan) totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        if (totalExpenseSpan) totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        if (totalBalanceSpan) {
            totalBalanceSpan.innerText = formatSignedAmount(balanceCurrent);
            setColorClass(totalBalanceSpan, balanceCurrent);
        }
    } else {
        if (previousCard) previousCard.style.display = 'none';
        filtered.forEach(t => {
            if (t.type === 'revenue') totalRev += t.amount;
            else totalExp += t.amount;
        });
        const balance = appSettings.initialAmount + totalRev - totalExp;
        if (totalRevenueSpan) totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        if (totalExpenseSpan) totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        if (totalBalanceSpan) {
            totalBalanceSpan.innerText = formatSignedAmount(balance);
            setColorClass(totalBalanceSpan, balance);
        }
    }
}

// ===== CATÉGORIES =====
function renderCategorySummary() {
    const categoryMap = new Map();
    const filtered = getFilteredTransactions();
    
    // Filtrer par mois si sélectionné
    let monthFiltered = filtered;
    if (currentFilterMonth) {
        monthFiltered = filtered.filter(t => t.date && t.date.startsWith(currentFilterMonth));
    }
    
    monthFiltered.forEach(t => {
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
        let monthDisplay = 'tous les mois';
        if (currentFilterMonth) {
            const [year, month] = currentFilterMonth.split('-');
            monthDisplay = new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        }
        titleEl.innerHTML = `<i class="fas fa-chart-pie"></i> Totaux par catégorie (${monthDisplay})`;
    }
    if (categoryMap.size === 0) {
        container.innerHTML = `<div class="empty-cats">Aucune catégorie ${currentFilterMonth ? 'pour ce mois' : ''}</div>`;
        return;
    }
    let html = '';
    // Trier par montant net décroissant
    const sortedCats = Array.from(categoryMap.entries()).sort((a, b) => {
        const netA = a[1].revenue - a[1].expense;
        const netB = b[1].revenue - b[1].expense;
        return Math.abs(netB) - Math.abs(netA);
    });
    
    for (let [cat, totals] of sortedCats) {
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
    if (select) select.addEventListener('change', () => setMonthFilter(select.value || null));
    const resetBtn = document.getElementById('resetMonthFilter');
    if (resetBtn) resetBtn.addEventListener('click', () => setMonthFilter(null));
}

// ===== DASHBOARD MONTH FILTER =====
function initDashboardMonthFilter() {
    const select = document.getElementById('dashboardMonthSelect');
    const resetBtn = document.getElementById('dashboardMonthReset');
    
    if (!select) return;
    
    // Remplir le sélecteur avec les mois disponibles
    function populateDashboardMonths() {
        const monthSet = new Set();
        transactions.forEach(t => {
            if (t.date) monthSet.add(t.date.substring(0, 7));
        });
        const months = Array.from(monthSet).sort().reverse();
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">📅 Tous les mois</option>';
        months.forEach(m => {
            const [year, month] = m.split('-');
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = `${new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' })} ${year}`;
            select.appendChild(opt);
        });
        
        // Restaurer la valeur si elle existe encore
        if (currentValue && months.includes(currentValue)) {
            select.value = currentValue;
        } else {
            select.value = '';
        }
    }
    
    // Appliquer le filtre du dashboard
    function applyDashboardFilter() {
        const month = select.value || null;
        currentFilterMonth = month;
        
        // Mettre à jour le sélecteur de mois principal (synchronisation)
        const mainMonthSelect = document.getElementById('monthSelect');
        if (mainMonthSelect) {
            mainMonthSelect.value = month || '';
        }
        
        // Rafraîchir les données du dashboard
        renderCharts();
        renderCategorySummary();
        updateSummary();
        renderBudgets();
        renderRecentTransactions();
        
        // Mettre à jour le hint
        updateInitialHintDisplay();
    }
    
    // Événements
    if (select) {
        select.addEventListener('change', applyDashboardFilter);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            select.value = '';
            applyDashboardFilter();
        });
    }
    
    // Initialiser
    populateDashboardMonths();
    
    // Si un filtre mois est déjà actif, l'appliquer
    if (currentFilterMonth) {
        select.value = currentFilterMonth;
        applyDashboardFilter();
    }
    
    // Exposer les fonctions pour les mises à jour
    window._dashboardMonth = {
        populate: populateDashboardMonths,
        apply: applyDashboardFilter
    };
}

// ===== TRI =====
function loadSortMode() {
    const saved = localStorage.getItem('budgetSortMode');
    currentSortMode = ['category', 'date_desc', 'date_asc'].includes(saved) ? saved : 'manual';
    const select = document.getElementById('sortSelect');
    if (select) select.value = currentSortMode;
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
        const transferBadge = t.isTransfer ? '<span class="transfer-badge">↔</span>' : '';
        const accountDisplay = t.account && t.account !== 'general' ? 
            `🏦 ${escapeHtml(bankAccounts.find(a => a.id === t.account)?.name || t.account)}` : '📊 Général';
        const targetDisplay = t.target && t.target !== 'general' && t.target !== '' ? 
            `→ 🏦 ${escapeHtml(bankAccounts.find(a => a.id === t.target)?.name || t.target)}` : '';
        html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="drag-area ${currentSortMode !== 'manual' ? 'disabled' : ''}"><i class="fas fa-grip-vertical"></i></div>
                <div class="transaction-info">
                    <span class="transaction-desc">${escapeHtml(t.description)} ${recurringBadge} ${transferBadge}</span>
                    <span class="transaction-category">${escapeHtml(t.category || 'Non catégorisé')}</span>
                    <span class="transaction-amount ${amountClass}">${formatAmountWithSettings(t.amount, t.type)}</span>
                    <span class="transaction-date">${t.date || ''}</span>
                    <span class="transaction-account" style="font-size:0.65rem; color:var(--text-secondary);">${accountDisplay} ${targetDisplay}</span>
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
    const editBtn = document.getElementById('qaEditBtn');
    const deleteBtn = document.getElementById('qaDeleteBtn');
    const duplicateBtn = document.getElementById('qaDuplicateBtn');
    if (editBtn) editBtn.disabled = !id;
    if (deleteBtn) deleteBtn.disabled = !id;
    if (duplicateBtn) duplicateBtn.disabled = !id;
    document.querySelectorAll('.transaction-item').forEach(el => el.classList.toggle('selected-transaction', el.dataset.id === id));
}

function duplicateTransactionById(id) {
    const original = transactions.find(t => t.id === id);
    if (!original) return;
    const newT = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
        description: original.description,
        amount: original.amount,
        category: original.category || '',
        type: original.type,
        date: new Date().toISOString().slice(0, 10),
        recurring: original.recurring || false,
        account: original.account || 'general',
        source: original.source || 'general',
        target: original.target || '',
        isTransfer: original.isTransfer || false,
        linkedId: original.linkedId || null
    };
    transactions.push(newT);
    if (newT.account !== 'general') {
        updateBankAccountBalance(newT.account);
    }
    if (newT.target && newT.target !== 'general') {
        updateBankAccountBalance(newT.target);
    }
    fullRefresh();
    renderBankAccounts();
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
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    if (transaction.linkedId) {
        const linked = transactions.find(t => t.id === transaction.linkedId);
        transactions = transactions.filter(t => t.id !== transaction.id && t.id !== transaction.linkedId);
        if (transaction.account !== 'general') updateBankAccountBalance(transaction.account);
        if (transaction.target && transaction.target !== 'general') updateBankAccountBalance(transaction.target);
        if (linked && linked.account !== 'general') updateBankAccountBalance(linked.account);
        if (linked && linked.target && linked.target !== 'general') updateBankAccountBalance(linked.target);
    } else {
        transactions = transactions.filter(t => t.id !== id);
        if (transaction.account !== 'general') updateBankAccountBalance(transaction.account);
        if (transaction.target && transaction.target !== 'general') updateBankAccountBalance(transaction.target);
    }
    
    if (selectedTransactionId === id) selectTransaction(null);
    fullRefresh();
    renderBankAccounts();
}

function openAddModal() {
    currentEditId = null;
    if (modalTitle) modalTitle.textContent = 'Ajouter une transaction';
    if (descInput) descInput.value = '';
    if (amountInput) amountInput.value = '';
    if (typeSelect) typeSelect.value = 'expense';
    if (categoryInput) categoryInput.value = '';
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().slice(0, 10);
    }
    if (recurringCheckbox) recurringCheckbox.checked = false;
    
    updateTransactionSelects();
    if (transactionAccount) transactionAccount.value = 'general';
    if (transactionTarget) transactionTarget.value = '';
    
    if (modalOverlay) modalOverlay.classList.add('active');
}

function openEditModal(id) {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    
    const isLinked = t.linkedId && t.isTransfer;
    let mainTx = t;
    
    if (isLinked) {
        const linked = transactions.find(tx => tx.id === t.linkedId);
        if (linked) {
            mainTx = t.type === 'expense' ? t : linked;
        }
    }
    
    currentEditId = mainTx.id;
    if (modalTitle) modalTitle.textContent = 'Modifier la transaction';
    if (descInput) descInput.value = mainTx.description;
    if (amountInput) amountInput.value = mainTx.amount;
    if (typeSelect) typeSelect.value = mainTx.type;
    if (categoryInput) categoryInput.value = mainTx.category || '';
    if (dateInput) dateInput.value = mainTx.date || new Date().toISOString().slice(0, 10);
    if (recurringCheckbox) recurringCheckbox.checked = mainTx.recurring || false;
    
    updateTransactionSelects();
    if (transactionAccount) {
        transactionAccount.value = mainTx.source || mainTx.account || 'general';
    }
    if (transactionTarget) {
        transactionTarget.value = mainTx.target || '';
    }
    
    if (modalOverlay) modalOverlay.classList.add('active');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    currentEditId = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    const description = descInput ? descInput.value.trim() : '';
    const amount = amountInput ? parseFloat(amountInput.value) : 0;
    const type = typeSelect ? typeSelect.value : 'expense';
    const category = categoryInput ? categoryInput.value.trim() || 'Divers' : 'Divers';
    let date = dateInput ? dateInput.value : '';
    const recurring = recurringCheckbox ? recurringCheckbox.checked : false;
    const source = transactionAccount ? transactionAccount.value : 'general';
    const target = transactionTarget ? transactionTarget.value : '';
    
    if (!description || !amount || amount <= 0) {
        return alert('Veuillez remplir tous les champs.');
    }
    if (!date) date = new Date().toISOString().slice(0, 10);
    
    if (target && target !== '') {
        const tx1 = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            description: type === 'expense' 
                ? `${description} (vers ${getAccountName(target)})` 
                : `${description} (depuis ${getAccountName(target)})`,
            amount: amount,
            category: category,
            type: type,
            date: date,
            recurring: recurring,
            account: source,
            source: source,
            target: target,
            isTransfer: true,
            linkedId: null
        };
        
        const tx2 = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            description: type === 'expense'
                ? `${description} (depuis ${getAccountName(source)})`
                : `${description} (vers ${getAccountName(source)})`,
            amount: amount,
            category: category,
            type: type === 'expense' ? 'revenue' : 'expense',
            date: date,
            recurring: recurring,
            account: target,
            source: source,
            target: target,
            isTransfer: true,
            linkedId: null
        };
        
        tx1.linkedId = tx2.id;
        tx2.linkedId = tx1.id;
        
        transactions.push(tx1);
        transactions.push(tx2);
        
        if (source !== 'general') updateBankAccountBalance(source);
        if (target !== 'general') updateBankAccountBalance(target);
        
    } else {
        const newTx = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            description: description,
            amount: amount,
            category: category,
            type: type,
            date: date,
            recurring: recurring,
            account: source,
            source: source,
            target: '',
            isTransfer: false,
            linkedId: null
        };
        transactions.push(newTx);
        if (source !== 'general') updateBankAccountBalance(source);
    }
    
    closeModal();
    fullRefresh();
    renderBankAccounts();
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

function renderSavingsAccounts() {
    const container = document.getElementById('savingsAccountsList');
    if (!container) return;
    
    const savingsTypes = ['livret', 'pel', 'lds', 'epargne'];
    const savingsBankAccounts = bankAccounts.filter(acc => savingsTypes.includes(acc.type));
    
    if (savingsBankAccounts.length === 0) {
        container.innerHTML = `
            <div class="empty-savings">
                <i class="fas fa-info-circle" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem; color: var(--text-secondary);"></i>
                Aucun compte d'épargne. 
                Créez un compte de type <strong>"Livret"</strong>, <strong>"PEL"</strong>, <strong>"LDD"</strong> ou <strong>"Épargne"</strong> 
                dans l'onglet <strong>"Comptes bancaires"</strong>.
            </div>
        `;
        updateSavingsStats();
        return;
    }
    
    let html = '', total = 0, totalInterest = 0, goalsAchieved = 0, totalGoals = 0;
    savingsBankAccounts.forEach(acc => {
        total += acc.balance;
        
        const savingsGoal = savingsAccounts.find(s => s.id === acc.id)?.goal || null;
        
        let goalStatus = '';
        let goalProgress = 0;
        if (savingsGoal) {
            totalGoals++;
            const target = savingsGoal.target || 0;
            goalProgress = target > 0 ? Math.min((acc.balance / target) * 100, 100) : 0;
            if (goalProgress >= 100) goalsAchieved++;
            const goalClass = goalProgress >= 100 ? 'achieved' : 'not-achieved';
            const deadline = savingsGoal.deadline ? `📅 ${formatDate(savingsGoal.deadline)}` : '';
            const interestText = savingsGoal.interest > 0 ? `📈 ${savingsGoal.interest}%` : '';
            goalStatus = `
                <div class="goal-progress">
                    <div class="goal-header">
                        <span>🎯 ${escapeHtml(savingsGoal.name)}</span>
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
        
        const typeLabel = getBankTypeLabel(acc.type);
        const institutionDisplay = acc.institution ? ` • ${escapeHtml(acc.institution)}` : '';
        
        html += `
            <div class="savings-account-card" data-id="${acc.id}">
                <div class="savings-account-info">
                    <span class="savings-account-name">${escapeHtml(acc.name)}</span>
                    <span class="savings-account-balance ${acc.balance >= 0 ? 'positive' : 'negative'}">${acc.balance >= 0 ? '+' : ''}${acc.balance.toFixed(2)} ${appSettings.currency}</span>
                </div>
                <div class="savings-account-type">${typeLabel}${institutionDisplay}</div>
                ${goalStatus}
                <div class="savings-account-actions">
                    <button class="operation" data-id="${acc.id}"><i class="fas fa-eye"></i> Détail</button>
                    <button class="goal-btn" data-id="${acc.id}"><i class="fas fa-bullseye"></i> Objectif</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateSavingsStats(total, totalInterest, goalsAchieved, totalGoals);
    
    document.querySelectorAll('.operation').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            openAccountDetailModal(id, 'bank');
        });
    });
    
    document.querySelectorAll('.goal-btn').forEach(btn => btn.addEventListener('click', () => openGoalModal(btn.dataset.id)));
    
    document.querySelectorAll('.goal-remove').forEach(btn => btn.addEventListener('click', () => {
        if (confirm('Supprimer cet objectif ?')) {
            const acc = savingsAccounts.find(s => s.id === btn.dataset.account);
            if (acc) { acc.goal = null; saveSavingsAccounts(); renderSavingsAccounts(); }
        }
    }));
    
    renderDashboard();
}

function updateSavingsStats(total, totalInterest, goalsAchieved, totalGoals) {
    const totalSavingsEl = document.getElementById('totalSavings');
    const totalInterestEl = document.getElementById('totalInterest');
    const goalsAchievedEl = document.getElementById('goalsAchieved');
    
    const savingsTypes = ['livret', 'pel', 'lds', 'epargne'];
    let bankSavingsTotal = 0;
    let totalGoalsCount = 0;
    let goalsAchievedCount = 0;
    let totalInterestValue = 0;
    
    bankAccounts.forEach(acc => {
        if (savingsTypes.includes(acc.type)) {
            bankSavingsTotal += acc.balance;
            const goal = savingsAccounts.find(s => s.id === acc.id)?.goal;
            if (goal) {
                totalGoalsCount++;
                if (goal.target && acc.balance >= goal.target) goalsAchievedCount++;
                if (goal.interest) totalInterestValue += acc.balance * (goal.interest / 100);
            }
        }
    });
    
    if (totalSavingsEl) totalSavingsEl.textContent = `${bankSavingsTotal.toFixed(2)} ${appSettings.currency}`;
    if (totalInterestEl) totalInterestEl.textContent = `${totalInterestValue.toFixed(2)} ${appSettings.currency}`;
    if (goalsAchievedEl) {
        const goalsText = totalGoalsCount > 0 ? `${goalsAchievedCount}/${totalGoalsCount}` : '0/0';
        goalsAchievedEl.textContent = goalsText;
    }
}

function openSavingsOperationModal(id) {
    const acc = savingsAccounts.find(a => a.id === id);
    if (!acc) return;
    const opAccountId = document.getElementById('opAccountId');
    const operationModalTitle = document.getElementById('operationModalTitle');
    const opAmount = document.getElementById('opAmount');
    const opType = document.getElementById('opType');
    const opDescription = document.getElementById('opDescription');
    if (opAccountId) opAccountId.value = id;
    if (operationModalTitle) operationModalTitle.textContent = `Opération sur ${acc.name}`;
    if (opAmount) opAmount.value = '';
    if (opType) opType.value = 'credit';
    if (opDescription) opDescription.value = '';
    const modal = document.getElementById('savingsOperationModal');
    if (modal) modal.classList.add('active');
}

function handleSavingsOperationSubmit(e) {
    e.preventDefault();
    const opAccountId = document.getElementById('opAccountId');
    const opAmount = document.getElementById('opAmount');
    const opType = document.getElementById('opType');
    const opDescription = document.getElementById('opDescription');
    const id = opAccountId ? opAccountId.value : '';
    const amount = opAmount ? parseFloat(opAmount.value) : 0;
    const type = opType ? opType.value : 'credit';
    const desc = opDescription ? opDescription.value.trim() : '';
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
    const modal = document.getElementById('savingsOperationModal');
    if (modal) modal.classList.remove('active');
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
    if (document.getElementById('accountDetailModal').classList.contains('active') && currentDetailAccountId === accountId) {
        renderAccountDetail();
    }
}

function showHistoryModal(id) {
    const acc = savingsAccounts.find(a => a.id === id);
    if (!acc) return;
    const historyModalTitle = document.getElementById('historyModalTitle');
    const historyTableBody = document.getElementById('historyTableBody');
    if (historyModalTitle) historyModalTitle.textContent = `Historique - ${acc.name}`;
    if (!historyTableBody) return;
    if (!acc.history || acc.history.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Aucune opération</td></tr>';
    } else {
        historyTableBody.innerHTML = acc.history.map(op => `
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
                const modal = document.getElementById('deleteOperationModal');
                if (modal) modal.classList.add('active');
            });
        });
    }
    const modal = document.getElementById('savingsHistoryModal');
    if (modal) modal.classList.add('active');
}

// ===== OBJECTIF D'ÉPARGNE =====
function openGoalModal(accountId) {
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return;
    const goal = savingsAccounts.find(s => s.id === accountId)?.goal || null;
    
    document.getElementById('goalAccountId').value = accountId;
    document.getElementById('goalModalTitle').textContent = `🎯 Objectif pour ${acc.name}`;
    document.getElementById('goalName').value = goal?.name || '';
    document.getElementById('goalTarget').value = goal?.target || '';
    document.getElementById('goalDeadline').value = goal?.deadline || '';
    document.getElementById('goalInterest').value = goal?.interest || 0;
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
    
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return alert('Compte introuvable.');
    
    let existing = savingsAccounts.find(s => s.id === accountId);
    if (existing) {
        existing.goal = { name, target, deadline, interest };
    } else {
        savingsAccounts.push({
            id: accountId,
            name: acc.name,
            balance: acc.balance,
            history: [],
            goal: { name, target, deadline, interest },
            isBankAccount: true
        });
    }
    saveSavingsAccounts();
    renderSavingsAccounts();
    document.getElementById('savingsGoalModal').classList.remove('active');
}

// ===== TRANSFERT ENTRE COMPTES ÉPARGNE =====
function openTransferModal(sourceId) {
    const transferSource = document.getElementById('transferSource');
    const transferTarget = document.getElementById('transferTarget');
    if (!transferSource || !transferTarget) return;
    const options = savingsAccounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.balance.toFixed(2)} ${appSettings.currency})</option>`).join('');
    transferSource.innerHTML = options;
    transferTarget.innerHTML = options;
    if (sourceId) {
        transferSource.value = sourceId;
        const targets = savingsAccounts.filter(a => a.id !== sourceId);
        if (targets.length > 0) {
            transferTarget.value = targets[0].id;
        }
    }
    const transferAmount = document.getElementById('transferAmount');
    if (transferAmount) transferAmount.value = '';
    const modal = document.getElementById('savingsTransferModal');
    if (modal) modal.classList.add('active');
}

function handleTransferSubmit(e) {
    e.preventDefault();
    const transferSource = document.getElementById('transferSource');
    const transferTarget = document.getElementById('transferTarget');
    const transferAmount = document.getElementById('transferAmount');
    const sourceId = transferSource ? transferSource.value : '';
    const targetId = transferTarget ? transferTarget.value : '';
    const amount = transferAmount ? parseFloat(transferAmount.value) : 0;
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
    const modal = document.getElementById('savingsTransferModal');
    if (modal) modal.classList.remove('active');
}

// ===== DASHBOARD ÉPARGNE =====
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

// ===== COMPTES BANCAIRES - RENDU =====
function renderBankAccounts() {
    const container = document.getElementById('bankAccountsList');
    if (!container) return;
    if (bankAccounts.length === 0) {
        container.innerHTML = '<div class="empty-bank">Aucun compte bancaire. Cliquez sur "Nouveau compte" pour commencer.</div>';
        updateBankStats();
        updateTransactionSelects();
        updateAccountFilter();
        return;
    }
    let html = '';
    let total = 0;
    bankAccounts.forEach(acc => {
        total += acc.balance;
        const balanceClass = acc.balance >= 0 ? 'positive' : 'negative';
        const typeLabel = getBankTypeLabel(acc.type);
        html += `
            <div class="bank-account-card" data-id="${acc.id}">
                <div class="bank-account-header">
                    <span class="bank-account-name">${escapeHtml(acc.name)}</span>
                    <span class="bank-account-type">${typeLabel}</span>
                </div>
                <div class="bank-account-balance ${balanceClass}">${acc.balance >= 0 ? '+' : ''}${acc.balance.toFixed(2)} ${appSettings.currency}</div>
                <div class="bank-account-institution">${escapeHtml(acc.institution || '')}</div>
                <div class="bank-account-actions">
                    <button class="edit-bank" data-id="${acc.id}"><i class="fas fa-pen"></i> Modifier</button>
                    <button class="op-btn" data-id="${acc.id}"><i class="fas fa-eye"></i> Détail</button>
                    <button class="delete-bank" data-id="${acc.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateBankStats(total);
    updateTransactionSelects();
    updateAccountFilter();
    
    document.querySelectorAll('.edit-bank').forEach(btn => {
        btn.addEventListener('click', () => openEditBankModal(btn.dataset.id));
    });
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            openAccountDetailModal(id, 'bank');
        });
    });
    document.querySelectorAll('.delete-bank').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Supprimer ce compte bancaire ?')) {
                bankAccounts = bankAccounts.filter(a => a.id !== btn.dataset.id);
                saveBankAccounts();
                renderBankAccounts();
            }
        });
    });
}

function updateBankStats(total) {
    const totalEl = document.getElementById('totalBankBalance');
    const countEl = document.getElementById('bankCount');
    if (totalEl) totalEl.textContent = `${(total || 0).toFixed(2)} ${appSettings.currency}`;
    if (countEl) countEl.textContent = bankAccounts.length;
}

function openAddBankModal() {
    document.getElementById('editBankAccountId').value = '';
    document.getElementById('bankModalTitle').textContent = 'Ajouter un compte bancaire';
    document.getElementById('bankName').value = '';
    document.getElementById('bankType').value = 'courant';
    document.getElementById('bankInstitution').value = '';
    document.getElementById('bankAccountModal').classList.add('active');
}

function openEditBankModal(accountId) {
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return;
    
    document.getElementById('editBankAccountId').value = accountId;
    document.getElementById('bankModalTitle').textContent = 'Modifier le compte bancaire';
    document.getElementById('bankName').value = acc.name;
    document.getElementById('bankType').value = acc.type;
    document.getElementById('bankInstitution').value = acc.institution || '';
    document.getElementById('bankAccountModal').classList.add('active');
}

function handleBankFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editBankAccountId').value;
    const name = document.getElementById('bankName');
    const type = document.getElementById('bankType');
    const institution = document.getElementById('bankInstitution');
    const nameVal = name ? name.value.trim() : '';
    const typeVal = type ? type.value : 'courant';
    const institutionVal = institution ? institution.value.trim() : '';
    
    if (!nameVal) return alert('Veuillez donner un nom au compte.');
    
    if (editId) {
        const acc = bankAccounts.find(a => a.id === editId);
        if (acc) {
            acc.name = nameVal;
            acc.type = typeVal;
            acc.institution = institutionVal;
        }
    } else {
        bankAccounts.push({
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            name: nameVal,
            type: typeVal,
            balance: 0,
            institution: institutionVal
        });
    }
    
    saveBankAccounts();
    updateAllBankAccountsBalances();
    renderBankAccounts();
    document.getElementById('bankAccountModal').classList.remove('active');
}

function openBankOperationModal(accountId) {
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return;
    const opAccountId = document.getElementById('bankOpAccountId');
    const modalTitle = document.getElementById('bankOpModalTitle');
    const opType = document.getElementById('bankOpType');
    const opAmount = document.getElementById('bankOpAmount');
    const opDescription = document.getElementById('bankOpDescription');
    const targetSelect = document.getElementById('bankOpTarget');
    if (opAccountId) opAccountId.value = accountId;
    if (modalTitle) modalTitle.textContent = `Opération - ${acc.name}`;
    if (opType) opType.value = 'credit';
    if (opAmount) opAmount.value = '';
    if (opDescription) opDescription.value = '';
    if (targetSelect) {
        targetSelect.innerHTML = bankAccounts
            .filter(a => a.id !== accountId)
            .map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${a.balance.toFixed(2)} €)</option>`)
            .join('');
    }
    const group = document.getElementById('bankTransferTargetGroup');
    if (group) group.style.display = 'none';
    const modal = document.getElementById('bankOperationModal');
    if (modal) modal.classList.add('active');
}

function handleBankOperationSubmit(e) {
    e.preventDefault();
    const opAccountId = document.getElementById('bankOpAccountId');
    const opType = document.getElementById('bankOpType');
    const opAmount = document.getElementById('bankOpAmount');
    const opDescription = document.getElementById('bankOpDescription');
    const accountId = opAccountId ? opAccountId.value : '';
    const type = opType ? opType.value : 'credit';
    const amount = opAmount ? parseFloat(opAmount.value) : 0;
    const description = opDescription ? opDescription.value.trim() || 'Opération bancaire' : 'Opération bancaire';
    if (!amount || amount <= 0) return alert('Montant invalide.');
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return;
    
    if (type === 'credit') {
        acc.balance += amount;
    } else if (type === 'debit') {
        if (acc.balance < amount && !confirm('Le solde deviendra négatif. Continuer ?')) return;
        acc.balance -= amount;
    } else if (type === 'transfer') {
        const targetSelect = document.getElementById('bankOpTarget');
        const targetId = targetSelect ? targetSelect.value : '';
        const target = bankAccounts.find(a => a.id === targetId);
        if (!target) return alert('Compte destinataire introuvable.');
        if (acc.balance < amount) return alert('Solde insuffisant.');
        acc.balance -= amount;
        target.balance += amount;
    }
    saveBankAccounts();
    renderBankAccounts();
    const modal = document.getElementById('bankOperationModal');
    if (modal) modal.classList.remove('active');
}

// ===== MODALE DÉTAIL COMPTE =====
function openAccountDetailModal(accountId, type) {
    currentDetailAccountId = accountId;
    currentDetailAccountType = type;
    
    document.getElementById('accFilterDateFrom').value = '';
    document.getElementById('accFilterDateTo').value = '';
    document.getElementById('accFilterType').value = '';
    document.getElementById('accFilterMinAmount').value = '';
    document.getElementById('accFilterMaxAmount').value = '';
    document.getElementById('accFilterSearch').value = '';
    detailFilters = { dateFrom: null, dateTo: null, type: null, minAmount: null, maxAmount: null, search: null };
    
    renderAccountDetail();
    document.getElementById('accountDetailModal').classList.add('active');
}

function getAccountDetailData() {
    if (currentDetailAccountType === 'savings') {
        const acc = savingsAccounts.find(a => a.id === currentDetailAccountId);
        if (!acc) return null;
        return {
            name: acc.name,
            balance: acc.balance,
            transactions: acc.history || []
        };
    } else if (currentDetailAccountType === 'bank') {
        const acc = bankAccounts.find(a => a.id === currentDetailAccountId);
        if (!acc) return null;
        const tx = transactions.filter(t => t.account === currentDetailAccountId || t.target === currentDetailAccountId);
        const history = tx.map(t => ({
            id: t.id,
            date: t.date,
            type: t.type === 'revenue' ? 'credit' : 'debit',
            amount: t.amount,
            description: t.description,
            category: t.category || 'Non catégorisé'
        }));
        return {
            name: acc.name,
            balance: acc.balance,
            transactions: history
        };
    }
    return null;
}

function renderAccountDetail() {
    const data = getAccountDetailData();
    if (!data) return;
    
    document.getElementById('accountDetailTitle').textContent = `📊 Détail du compte - ${data.name}`;
    const balanceEl = document.getElementById('accountDetailBalance');
    balanceEl.textContent = `${data.balance >= 0 ? '+' : ''}${data.balance.toFixed(2)} ${appSettings.currency}`;
    balanceEl.className = `account-detail-balance ${data.balance < 0 ? 'negative' : ''}`;
    
    let transactions = data.transactions;
    const f = detailFilters;
    if (f.dateFrom) transactions = transactions.filter(t => t.date >= f.dateFrom);
    if (f.dateTo) transactions = transactions.filter(t => t.date <= f.dateTo);
    if (f.type) transactions = transactions.filter(t => t.type === f.type);
    if (f.minAmount) transactions = transactions.filter(t => t.amount >= f.minAmount);
    if (f.maxAmount) transactions = transactions.filter(t => t.amount <= f.maxAmount);
    if (f.search) {
        const search = f.search.toLowerCase();
        transactions = transactions.filter(t => 
            t.description.toLowerCase().includes(search) || 
            (t.category && t.category.toLowerCase().includes(search))
        );
    }
    
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('accDetailTableBody');
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--empty-color);">Aucune transaction trouvée</td></tr>';
    } else {
        let html = '';
        transactions.forEach(t => {
            const typeIcon = t.type === 'credit' ? '💰' : '💸';
            const typeClass = t.type === 'credit' ? 'credit' : 'debit';
            const amountSign = t.type === 'credit' ? '+' : '-';
            const dateFormatted = formatDate(t.date);
            html += `
                <tr>
                    <td>${dateFormatted}</td>
                    <td class="${typeClass}">${typeIcon} ${t.type === 'credit' ? 'Crédit' : 'Débit'}</td>
                    <td class="${typeClass}">${amountSign} ${t.amount.toFixed(2)} ${appSettings.currency}</td>
                    <td>${escapeHtml(t.description || '')}</td>
                    <td>${escapeHtml(t.category || '')}</td>
                    <td>
                        ${currentDetailAccountType === 'savings' ? 
                            `<button class="delete-op" data-id="${t.id}" title="Supprimer"><i class="fas fa-trash-alt"></i></button>` : 
                            ''}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
        if (currentDetailAccountType === 'savings') {
            document.querySelectorAll('#accDetailTableBody .delete-op').forEach(btn => {
                btn.addEventListener('click', () => {
                    const opId = btn.dataset.id;
                    if (confirm('Supprimer cette opération ?')) {
                        deleteOperationFromHistory(currentDetailAccountId, opId);
                        renderAccountDetail();
                        renderSavingsAccounts();
                    }
                });
            });
        }
    }
    
    let totalCredits = 0, totalDebits = 0;
    transactions.forEach(t => {
        if (t.type === 'credit') totalCredits += t.amount;
        else totalDebits += t.amount;
    });
    document.getElementById('accTransactionCount').textContent = `${transactions.length} transaction(s)`;
    document.getElementById('accTotalCredits').textContent = `+${totalCredits.toFixed(2)} ${appSettings.currency}`;
    document.getElementById('accTotalDebits').textContent = `-${totalDebits.toFixed(2)} ${appSettings.currency}`;
    const balance = totalCredits - totalDebits;
    const balanceEl2 = document.getElementById('accTotalBalance');
    balanceEl2.textContent = `${balance >= 0 ? '+' : ''}${balance.toFixed(2)} ${appSettings.currency}`;
    balanceEl2.className = `stat-value ${balance >= 0 ? 'positive' : 'negative'}`;
}

function applyAccountFilters() {
    detailFilters.dateFrom = document.getElementById('accFilterDateFrom').value || null;
    detailFilters.dateTo = document.getElementById('accFilterDateTo').value || null;
    detailFilters.type = document.getElementById('accFilterType').value || null;
    detailFilters.minAmount = parseFloat(document.getElementById('accFilterMinAmount').value) || null;
    detailFilters.maxAmount = parseFloat(document.getElementById('accFilterMaxAmount').value) || null;
    detailFilters.search = document.getElementById('accFilterSearch').value || null;
    renderAccountDetail();
}

function resetAccountFilters() {
    document.getElementById('accFilterDateFrom').value = '';
    document.getElementById('accFilterDateTo').value = '';
    document.getElementById('accFilterType').value = '';
    document.getElementById('accFilterMinAmount').value = '';
    document.getElementById('accFilterMaxAmount').value = '';
    document.getElementById('accFilterSearch').value = '';
    detailFilters = { dateFrom: null, dateTo: null, type: null, minAmount: null, maxAmount: null, search: null };
    renderAccountDetail();
}

function exportAccountDetailCSV() {
    const data = getAccountDetailData();
    if (!data) return;
    let csv = 'Date;Type;Montant;Description;Catégorie\n';
    data.transactions.forEach(t => {
        csv += `${formatDate(t.date)};${t.type === 'credit' ? 'Crédit' : 'Débit'};${t.amount};"${t.description || ''}";"${t.category || ''}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compte_${data.name}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

// ===== MODALE DÉTAIL DU JOUR (CALENDRIER) =====
function openDayDetailModal(date) {
    dayDetailDate = date;
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    document.getElementById('dayDetailTitle').textContent = `📅 ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
    
    renderDayDetailModal(date);
    document.getElementById('dayDetailModal').classList.add('active');
}

function closeDayDetailModal() {
    document.getElementById('dayDetailModal').classList.remove('active');
}

function renderDayDetailModal(date) {
    const tx = transactions.filter(t => t.date === date);
    const balanceContainer = document.getElementById('dayDetailBalance');
    const revenueContainer = document.getElementById('dayDetailRevenue');
    const expenseContainer = document.getElementById('dayDetailExpense');
    const transactionsContainer = document.getElementById('dayDetailTransactions');
    
    let cumulative = appSettings.initialAmount || 0;
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let totalRev = 0, totalExp = 0;
    
    const txUntilDate = transactions.filter(t => t.date <= date);
    txUntilDate.forEach(t => {
        if (t.type === 'revenue') {
            cumulative += t.amount;
            if (t.date === date) totalRev += t.amount;
        } else {
            cumulative -= t.amount;
            if (t.date === date) totalExp += t.amount;
        }
    });
    
    const balanceClass = cumulative >= 0 ? 'balance-positive' : 'balance-negative';
    balanceContainer.textContent = `${cumulative >= 0 ? '+' : ''}${cumulative.toFixed(2)} ${appSettings.currency}`;
    balanceContainer.className = `stat-value ${balanceClass}`;
    
    revenueContainer.textContent = `+${totalRev.toFixed(2)} ${appSettings.currency}`;
    revenueContainer.className = 'stat-value positive';
    
    expenseContainer.textContent = `-${totalExp.toFixed(2)} ${appSettings.currency}`;
    expenseContainer.className = 'stat-value negative';
    
    if (tx.length === 0) {
        transactionsContainer.innerHTML = '<div class="empty-detail">Aucune transaction ce jour</div>';
        return;
    }
    
    let html = '';
    const sortedTx = [...tx].sort((a, b) => {
        if (a.type === 'revenue' && b.type === 'expense') return -1;
        if (a.type === 'expense' && b.type === 'revenue') return 1;
        return 0;
    });
    
    sortedTx.forEach(t => {
        const amountClass = t.type === 'revenue' ? 'positive' : 'negative';
        const amountSign = t.type === 'revenue' ? '+' : '-';
        const icon = t.type === 'revenue' ? '💰' : '💸';
        const accountDisplay = t.account && t.account !== 'general' ? 
            `🏦 ${escapeHtml(bankAccounts.find(a => a.id === t.account)?.name || t.account)}` : '📊 Général';
        
        html += `
            <div class="day-transaction-item">
                <div class="day-tx-left">
                    <span class="day-tx-icon">${icon}</span>
                    <span class="day-tx-desc">${escapeHtml(t.description)}</span>
                </div>
                <div class="day-tx-right">
                    <span class="day-tx-category">${escapeHtml(t.category || 'Non catégorisé')}</span>
                    <span class="day-tx-account" style="font-size: 0.65rem; color: var(--text-secondary);">${accountDisplay}</span>
                    <span class="day-tx-amount ${amountClass}">${amountSign} ${t.amount.toFixed(2)} ${appSettings.currency}</span>
                </div>
            </div>
        `;
    });
    
    transactionsContainer.innerHTML = html;
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
        const transferBadge = t.isTransfer ? ' ↔' : '';
        html += `
            <div class="recurring-item" data-id="${t.id}">
                <span class="recurring-desc">${escapeHtml(t.description)}${transferBadge}</span>
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

// ===== DÉPENSES RÉCURRENTES AUTOMATISÉES =====
function processRecurringTransactions() {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const processedKey = `recurring_processed_${currentMonth}`;
    
    if (localStorage.getItem(processedKey) === 'true') {
        console.log('Transactions récurrentes déjà traitées pour ce mois');
        return;
    }
    
    const recurring = transactions.filter(t => t.recurring === true);
    if (recurring.length === 0) return;
    
    let count = 0;
    const accountsToUpdate = new Set();
    recurring.forEach(t => {
        const day = t.date ? t.date.substring(8, 10) : '01';
        const newDate = `${currentMonth}-${day}`;
        const exists = transactions.some(tr => 
            tr.description === t.description && 
            tr.amount === t.amount && 
            tr.type === t.type &&
            tr.date === newDate
        );
        if (!exists) {
            const account = t.account || 'general';
            const newTx = {
                id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
                description: t.description,
                amount: t.amount,
                category: t.category || '',
                type: t.type,
                date: newDate,
                recurring: true,
                account: account,
                source: t.source || account,
                target: t.target || '',
                isTransfer: t.isTransfer || false,
                linkedId: null,
                autoCreated: true
            };
            if (t.isTransfer && t.target && t.target !== '') {
                const tx2 = {
                    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
                    description: t.type === 'expense'
                        ? `${t.description} (depuis ${getAccountName(t.source || t.account)})`
                        : `${t.description} (vers ${getAccountName(t.source || t.account)})`,
                    amount: t.amount,
                    category: '',
                    type: t.type === 'expense' ? 'revenue' : 'expense',
                    date: newDate,
                    recurring: true,
                    account: t.target,
                    source: t.source || t.account,
                    target: t.target,
                    isTransfer: true,
                    linkedId: null,
                    autoCreated: true
                };
                newTx.linkedId = tx2.id;
                tx2.linkedId = newTx.id;
                transactions.push(tx2);
                if (t.target !== 'general') accountsToUpdate.add(t.target);
            }
            transactions.push(newTx);
            if (account !== 'general') accountsToUpdate.add(account);
            count++;
        }
    });
    
    if (count > 0) {
        accountsToUpdate.forEach(accId => updateBankAccountBalance(accId));
        saveToLocalStorage();
        fullRefresh();
        renderBankAccounts();
        console.log(`${count} transaction(s) récurrente(s) créée(s) pour ${currentMonth}`);
    }
    
    localStorage.setItem(processedKey, 'true');
}

function forceProcessRecurring() {
    const month = new Date().toISOString().slice(0, 7);
    const key = `recurring_processed_${month}`;
    localStorage.removeItem(key);
    processRecurringTransactions();
    renderRecurringList();
    alert('Transactions récurrentes traitées !');
}

function checkRecurringTransactions() {
    processRecurringTransactions();
}

// ===== CALENDRIER =====
function renderCalendar() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const monthName = new Date(year, month, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const calendarMonthYear = document.getElementById('calendarMonthYear');
    if (calendarMonthYear) calendarMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
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
    const dailyExpenses = {};
    const dailyRevenues = {};
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tx = dayTransactions[dateStr] || [];
        let dayExp = 0, dayRev = 0;
        tx.forEach(t => {
            if (t.type === 'revenue') {
                dayRev += t.amount;
                cumulative += t.amount;
            } else {
                dayExp += t.amount;
                cumulative -= t.amount;
            }
        });
        dailyBalances[dateStr] = cumulative;
        dailyExpenses[dateStr] = dayExp;
        dailyRevenues[dateStr] = dayRev;
    }
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tx = dayTransactions[dateStr] || [];
        const balance = dailyBalances[dateStr] || 0;
        const expenses = dailyExpenses[dateStr] || 0;
        const revenues = dailyRevenues[dateStr] || 0;
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
        const expensesDisplay = expenses > 0 ? `-${expenses.toFixed(0)}` : '';
        const revenuesDisplay = revenues > 0 ? `+${revenues.toFixed(0)}` : '';
        
        let dayInfo = '';
        if (tx.length > 0) {
            dayInfo = `<span class="day-balance ${balanceClass}">S: ${balanceDisplay}</span>`;
            if (expenses > 0) {
                dayInfo += `<span class="day-expense">D: ${expensesDisplay}</span>`;
            }
            if (revenues > 0 && expenses === 0) {
                dayInfo += `<span class="day-revenue">R: ${revenuesDisplay}</span>`;
            }
        }
        
        html += `
            <div class="${classes}" data-date="${dateStr}">
                <span class="day-number">${d}</span>
                ${dayInfo ? `<div class="day-info">${dayInfo}</div>` : ''}
            </div>
        `;
    }
    
    calendarGrid.innerHTML = html;
    
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            calendarSelectedDate = date;
            renderCalendar();
            openDayDetailModal(date);
        });
    });
    
    if (!calendarSelectedDate) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayInMonth = document.querySelector(`.calendar-day[data-date="${todayStr}"]`);
        if (todayInMonth) {
            calendarSelectedDate = todayStr;
        } else {
            const firstTx = document.querySelector('.calendar-day.has-transaction');
            if (firstTx) calendarSelectedDate = firstTx.dataset.date;
        }
        if (calendarSelectedDate) {
            renderCalendar();
            openDayDetailModal(calendarSelectedDate);
        }
    }
}

function initCalendar() {
    const prevBtn = document.getElementById('calendarPrevBtn');
    const nextBtn = document.getElementById('calendarNextBtn');
    const todayBtn = document.getElementById('calendarTodayBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        calendarSelectedDate = null;
        renderCalendar();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        calendarSelectedDate = null;
        renderCalendar();
    });
    if (todayBtn) todayBtn.addEventListener('click', () => {
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
    const sourceMonth = document.getElementById('sourceMonth');
    const targetMonth = document.getElementById('targetMonth');
    if (sourceMonth) sourceMonth.value = defaultSource;
    const nextMonth = today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2;
    const nextYear = today.getMonth() + 2 > 12 ? today.getFullYear() + 1 : today.getFullYear();
    if (targetMonth) targetMonth.value = `${nextYear}-${String(nextMonth).padStart(2,'0')}`;
    const modal = document.getElementById('duplicateModal');
    if (modal) modal.classList.add('active');
}

function handleDuplicateSubmit(e) {
    e.preventDefault();
    const sourceMonth = document.getElementById('sourceMonth');
    const targetMonth = document.getElementById('targetMonth');
    const overwriteTarget = document.getElementById('overwriteTarget');
    const onlyRecurring = document.getElementById('onlyRecurring');
    const source = sourceMonth ? sourceMonth.value : '';
    const target = targetMonth ? targetMonth.value : '';
    const overwrite = overwriteTarget ? overwriteTarget.checked : false;
    const onlyRec = onlyRecurring ? onlyRecurring.checked : false;
    if (!source || !target) return alert('Sélectionnez deux mois.');
    
    let sourceTx = transactions.filter(t => t.date && t.date.startsWith(source));
    if (onlyRec) {
        sourceTx = sourceTx.filter(t => t.recurring === true);
    }
    if (!sourceTx.length) {
        const msg = onlyRec ? 'Aucune transaction récurrente trouvée.' : `Aucune transaction en ${source}.`;
        return alert(msg);
    }
    
    if (overwrite) {
        const targetTx = transactions.filter(t => t.date && t.date.startsWith(target));
        const accountsToUpdate = new Set();
        targetTx.forEach(t => {
            if (t.account !== 'general') accountsToUpdate.add(t.account);
            if (t.target && t.target !== 'general') accountsToUpdate.add(t.target);
        });
        transactions = transactions.filter(t => !t.date.startsWith(target));
        accountsToUpdate.forEach(accId => updateBankAccountBalance(accId));
    }
    
    const accountsToUpdate = new Set();
    sourceTx.forEach(t => {
        const newDate = t.date.replace(source, target);
        const account = t.account || 'general';
        const newTx = {
            ...t,
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            date: newDate,
            recurring: t.recurring,
            account: account,
            source: t.source || account,
            target: t.target || '',
            isTransfer: t.isTransfer || false,
            linkedId: null
        };
        if (t.isTransfer && t.target && t.target !== '') {
            const tx2 = {
                ...t,
                id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
                description: t.type === 'expense'
                    ? `${t.description} (depuis ${getAccountName(t.source || t.account)})`
                    : `${t.description} (vers ${getAccountName(t.source || t.account)})`,
                date: newDate,
                recurring: t.recurring,
                account: t.target,
                source: t.source || t.account,
                target: t.target,
                isTransfer: true,
                linkedId: null
            };
            newTx.linkedId = tx2.id;
            tx2.linkedId = newTx.id;
            transactions.push(tx2);
            if (t.target !== 'general') accountsToUpdate.add(t.target);
        }
        transactions.push(newTx);
        if (account !== 'general') accountsToUpdate.add(account);
    });
    
    accountsToUpdate.forEach(accId => updateBankAccountBalance(accId));
    saveToLocalStorage();
    fullRefresh();
    renderBankAccounts();
    alert(`${sourceTx.length} transaction(s) dupliquée(s).`);
    const modal = document.getElementById('duplicateModal');
    if (modal) modal.classList.remove('active');
}

// ===== EXPORT PDF =====
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const btn = document.getElementById('exportPdfBtn');
    if (!btn) return;
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
    const addBtn = document.getElementById('qaAddBtn');
    const editBtn = document.getElementById('qaEditBtn');
    const deleteBtn = document.getElementById('qaDeleteBtn');
    const duplicateBtn = document.getElementById('qaDuplicateBtn');
    const saveBtn = document.getElementById('qaSaveBtn');
    
    if (addBtn) addBtn.addEventListener('click', openAddModal);
    if (editBtn) editBtn.addEventListener('click', () => { if (selectedTransactionId) openEditModal(selectedTransactionId); });
    if (deleteBtn) deleteBtn.addEventListener('click', () => { if (selectedTransactionId) deleteTransactionById(selectedTransactionId); });
    if (duplicateBtn) duplicateBtn.addEventListener('click', () => { if (selectedTransactionId) duplicateTransactionById(selectedTransactionId); });
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (modalOverlay && modalOverlay.classList.contains('active') && transactionForm) {
                transactionForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else {
                alert('Aucune transaction en cours.');
            }
        });
    }
}

// ===== NAVIGATION PAR MENU =====
function initNavigation() {
    const dropdownBtn = document.getElementById('dropdownBtn');
    const dropdownContent = document.getElementById('dropdownContent');
    const currentViewLabel = document.getElementById('currentViewLabel');
    const views = document.querySelectorAll('.view-content');
    const menuItems = dropdownContent ? dropdownContent.querySelectorAll('a') : [];

    if (!dropdownBtn || !dropdownContent) return;

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownBtn.classList.toggle('open');
        dropdownContent.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownBtn.classList.remove('open');
        dropdownContent.classList.remove('show');
    });

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
            dropdownBtn.classList.remove('open');
            dropdownContent.classList.remove('show');
        });
    });

    function switchView(viewId) {
        views.forEach(v => {
            v.classList.remove('active');
            v.style.display = 'none';
        });

        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
        }

        const activeItem = dropdownContent.querySelector(`a[data-view="${viewId}"]`);
        if (activeItem && currentViewLabel) {
            currentViewLabel.innerHTML = activeItem.innerHTML;
        }

        menuItems.forEach(i => i.classList.remove('active'));
        if (activeItem) activeItem.classList.add('active');

        if (viewId === 'calendar') {
            renderCalendar();
        } else if (viewId === 'monthly' && typeof renderMonthlyTable !== 'undefined') {
            renderMonthlyTable();
        } else if (viewId === 'savings') {
            renderSavingsAccounts();
            renderDashboard();
        } else if (viewId === 'recurring') {
            renderRecurringList();
        } else if (viewId === 'bank') {
            renderBankAccounts();
        } else if (viewId === 'charts') {
            renderFullCharts();
        } else if (viewId === 'dashboard') {
            renderCharts();
            renderBudgets();
            renderRecentTransactions();
            // Synchroniser le sélecteur de mois
            const select = document.getElementById('dashboardMonthSelect');
            if (select) {
                if (currentFilterMonth && select.querySelector(`option[value="${currentFilterMonth}"]`)) {
                    select.value = currentFilterMonth;
                } else {
                    select.value = '';
                }
            }
        } else if (viewId === 'transactions') {
            renderTransactionList();
            updateMonthSelect();
            updateCategoryFilter();
            updateAccountFilter();
        } else if (viewId === 'settings') {
            openSettingsModal();
        }
    }

    switchView('dashboard');
}

function openSettingsModal() {
    if (initialAmountInput) initialAmountInput.value = appSettings.initialAmount;
    if (currencySelect) currencySelect.value = appSettings.currency;
    if (displayFormatSelect) displayFormatSelect.value = appSettings.displayFormat;
    if (settingsModal) settingsModal.classList.add('active');
}

function renderRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return;
    const recent = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-list">Aucune transaction récente.</div>';
        return;
    }
    let html = '';
    recent.forEach(t => {
        const amountClass = t.type === 'expense' ? 'amount-expense' : 'amount-revenue';
        const accountDisplay = t.account && t.account !== 'general' ? 
            `🏦 ${escapeHtml(bankAccounts.find(a => a.id === t.account)?.name || t.account)}` : '📊 Général';
        const targetDisplay = t.target && t.target !== 'general' && t.target !== '' ? 
            `→ 🏦 ${escapeHtml(bankAccounts.find(a => a.id === t.target)?.name || t.target)}` : '';
        const transferBadge = t.isTransfer ? ' ↔' : '';
        html += `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-info">
                    <span class="transaction-desc">${escapeHtml(t.description)}${transferBadge}</span>
                    <span class="transaction-category">${escapeHtml(t.category || 'Non catégorisé')}</span>
                    <span class="transaction-amount ${amountClass}">${formatAmountWithSettings(t.amount, t.type)}</span>
                    <span class="transaction-date">${t.date || ''}</span>
                    <span class="transaction-account" style="font-size:0.65rem; color:var(--text-secondary);">${accountDisplay} ${targetDisplay}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ===== GRAPHIQUES AVEC POURCENTAGES =====
function renderCharts() {
    const monthKey = currentFilterMonth || new Date().toISOString().slice(0, 7);
    
    // Déterminer les couleurs en fonction du thème
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#e2e8f0' : '#4b5563';
    const primaryTextColor = isDark ? '#e2e8f0' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const emptyTextColor = isDark ? '#94a3b8' : '#4b5563';
    
    // Pie chart - Dépenses par catégorie avec pourcentages
    const categorySpending = {};
    const monthFiltered = currentFilterMonth ? 
        transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(currentFilterMonth)) :
        transactions.filter(t => t.type === 'expense');
    
    monthFiltered.forEach(t => {
        const cat = t.category || 'Divers';
        categorySpending[cat] = (categorySpending[cat] || 0) + t.amount;
    });
    
    const labels = Object.keys(categorySpending);
    const data = Object.values(categorySpending);
    const ctxPie = document.getElementById('pieChart')?.getContext('2d');
    if (ctxPie) {
        if (pieChartInstance) pieChartInstance.destroy();
        if (data.length > 0) {
            const colors = ['#15803d', '#2563eb', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];
            pieChartInstance = new Chart(ctxPie, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderWidth: 2,
                        borderColor: isDark ? '#1e293b' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: {
                                color: primaryTextColor,
                                font: { size: 11 },
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${context.parsed.toFixed(2)} € (${percentage}%)`;
                                }
                            }
                        },
                        datalabels: {
                            color: '#ffffff',
                            font: {
                                weight: 'bold',
                                size: 14
                            },
                            formatter: function(value, ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return percentage > 0 ? percentage + '%' : '';
                            },
                            display: function(ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((ctx.dataset.data[ctx.dataIndex] / total) * 100) : 0;
                                return percentage > 3;
                            },
                            anchor: 'center',
                            align: 'center',
                            offset: 0
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        } else {
            ctxPie.clearRect(0, 0, ctxPie.canvas.width, ctxPie.canvas.height);
            ctxPie.fillStyle = emptyTextColor;
            ctxPie.font = '14px system-ui';
            ctxPie.textAlign = 'center';
            ctxPie.fillText('Aucune dépense', ctxPie.canvas.width/2, ctxPie.canvas.height/2);
        }
    }

    // Bar chart - Évolution mensuelle
    const monthTotals = {};
    const last6Months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let startMonth, startYear;
    if (currentFilterMonth) {
        const [year, month] = currentFilterMonth.split('-').map(Number);
        startMonth = month - 1;
        startYear = year;
    } else {
        startMonth = currentMonth - 5;
        startYear = currentYear;
        if (startMonth < 0) {
            startMonth += 12;
            startYear--;
        }
    }
    
    for (let i = 0; i < 6; i++) {
        const m = (startMonth + i) % 12;
        const y = startYear + Math.floor((startMonth + i) / 12);
        const key = `${y}-${String(m + 1).padStart(2,'0')}`;
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
                        { 
                            label: 'Revenus', 
                            data: dataBarRev, 
                            backgroundColor: '#15803d',
                            borderRadius: 4,
                            maxBarThickness: 30
                        },
                        { 
                            label: 'Dépenses', 
                            data: dataBarExp, 
                            backgroundColor: '#dc2626',
                            borderRadius: 4,
                            maxBarThickness: 30
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            position: 'top',
                            labels: {
                                color: primaryTextColor,
                                font: { size: 11 },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                font: { size: 10 },
                                callback: function(value) {
                                    return value.toFixed(0) + ' €';
                                }
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: true
                            }
                        },
                        x: {
                            ticks: {
                                color: primaryTextColor,
                                font: { size: 10 }
                            },
                            grid: {
                                color: gridColor,
                                drawBorder: true
                            }
                        }
                    }
                }
            });
        } else {
            ctxBar.clearRect(0, 0, ctxBar.canvas.width, ctxBar.canvas.height);
            ctxBar.fillStyle = emptyTextColor;
            ctxBar.font = '14px system-ui';
            ctxBar.textAlign = 'center';
            ctxBar.fillText('Aucune donnée', ctxBar.canvas.width/2, ctxBar.canvas.height/2);
        }
    }
}

function renderFullCharts() {
    const monthKey = currentFilterMonth || new Date().toISOString().slice(0, 7);
    
    // Déterminer les couleurs en fonction du thème
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#e2e8f0' : '#4b5563';
    const primaryTextColor = isDark ? '#e2e8f0' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const borderColor = isDark ? '#1e293b' : '#ffffff';
    
    // Pie chart complet
    const categorySpending = {};
    transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(monthKey))
        .forEach(t => {
            const cat = t.category || 'Divers';
            categorySpending[cat] = (categorySpending[cat] || 0) + t.amount;
        });
    const ctxPieFull = document.getElementById('pieChartFull')?.getContext('2d');
    if (ctxPieFull) {
        const labels = Object.keys(categorySpending);
        const data = Object.values(categorySpending);
        if (data.length > 0) {
            const colors = ['#15803d', '#2563eb', '#7c3aed', '#dc2626', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];
            new Chart(ctxPieFull, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors.slice(0, data.length),
                        borderWidth: 2,
                        borderColor: borderColor
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: primaryTextColor,
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        datalabels: {
                            color: '#ffffff',
                            font: {
                                weight: 'bold',
                                size: 14
                            },
                            formatter: function(value, ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return percentage > 0 ? percentage + '%' : '';
                            },
                            display: function(ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((ctx.dataset.data[ctx.dataIndex] / total) * 100) : 0;
                                return percentage > 3;
                            },
                            anchor: 'center',
                            align: 'center',
                            offset: 0
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
        } else {
            ctxPieFull.clearRect(0, 0, ctxPieFull.canvas.width, ctxPieFull.canvas.height);
            ctxPieFull.fillStyle = textColor;
            ctxPieFull.font = '14px system-ui';
            ctxPieFull.textAlign = 'center';
            ctxPieFull.fillText('Aucune dépense', ctxPieFull.canvas.width/2, ctxPieFull.canvas.height/2);
        }
    }

    // Bar chart complet
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
    const ctxBarFull = document.getElementById('barChartFull')?.getContext('2d');
    if (ctxBarFull) {
        const labelsBar = last6Months.map(m => {
            const [year, month] = m.split('-');
            return new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'short' });
        });
        const dataBarRev = last6Months.map(m => monthTotals[m]?.rev || 0);
        const dataBarExp = last6Months.map(m => monthTotals[m]?.exp || 0);
        if (dataBarRev.some(v => v > 0) || dataBarExp.some(v => v > 0)) {
            new Chart(ctxBarFull, {
                type: 'bar',
                data: {
                    labels: labelsBar,
                    datasets: [
                        { 
                            label: 'Revenus', 
                            data: dataBarRev, 
                            backgroundColor: '#15803d', 
                            borderRadius: 4 
                        },
                        { 
                            label: 'Dépenses', 
                            data: dataBarExp, 
                            backgroundColor: '#dc2626', 
                            borderRadius: 4 
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { 
                        legend: { 
                            position: 'top',
                            labels: {
                                color: primaryTextColor,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                font: { size: 10 }
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: primaryTextColor,
                                font: { size: 10 }
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    }
                }
            });
        }
    }

    // Line chart complet
    const ctxLineFull = document.getElementById('lineChartFull')?.getContext('2d');
    if (ctxLineFull) {
        const sorted = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
        let balance = appSettings.initialAmount || 0;
        const balanceData = [];
        const dates = [];
        const cumulative = {};
        sorted.forEach(t => {
            if (t.type === 'revenue') balance += t.amount;
            else balance -= t.amount;
            cumulative[t.date] = balance;
        });
        const sortedDates = Object.keys(cumulative).sort();
        sortedDates.forEach(d => {
            dates.push(d);
            balanceData.push(cumulative[d]);
        });
        if (dates.length > 0) {
            const lineColor = isDark ? '#60a5fa' : '#2563eb';
            const lineFill = isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.1)';
            new Chart(ctxLineFull, {
                type: 'line',
                data: {
                    labels: dates.map(d => d.slice(5)),
                    datasets: [{
                        label: 'Solde cumulé',
                        data: balanceData,
                        borderColor: lineColor,
                        backgroundColor: lineFill,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: lineColor,
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { 
                        legend: { 
                            position: 'top',
                            labels: {
                                color: primaryTextColor,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                color: textColor,
                                font: { size: 10 }
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: primaryTextColor,
                                font: { size: 10 }
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    }
                }
            });
        }
    }
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
    updateAccountFilter();
    updateTransactionSelects();
    saveToLocalStorage();
    initSortable();
    
    // Mettre à jour le sélecteur du dashboard
    if (window._dashboardMonth) {
        window._dashboardMonth.populate();
        // Appliquer le filtre si nécessaire
        const select = document.getElementById('dashboardMonthSelect');
        if (select && select.value !== '' && currentFilterMonth === null) {
            // Si le filtre est actif dans le dashboard mais pas dans currentFilterMonth
            currentFilterMonth = select.value;
            window._dashboardMonth.apply();
        }
    }
    
    if (!document.querySelector('.transaction-item')) selectTransaction(null);
    const recurringView = document.getElementById('view-recurring');
    if (recurringView && recurringView.classList.contains('active')) {
        renderRecurringList();
    }
    const dashboardView = document.getElementById('view-dashboard');
    if (dashboardView && dashboardView.classList.contains('active')) {
        renderRecentTransactions();
    }
    const chartsView = document.getElementById('view-charts');
    if (chartsView && chartsView.classList.contains('active')) {
        renderFullCharts();
    }
    const bankView = document.getElementById('view-bank');
    if (bankView && bankView.classList.contains('active')) {
        renderBankAccounts();
    }
}

// ===== INIT =====
function initSortControls() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    sortSelect.addEventListener('change', (e) => {
        currentSortMode = e.target.value;
        saveSortMode();
        if (currentSortMode !== 'manual') applySorting();
        fullRefresh();
    });
}

function init() {
    loadTheme();
    loadThemeColor();
    loadSettings();
    loadInitialData();
    loadBudgets();
    loadSavingsAccounts();
    loadBankAccounts();
    loadSortMode();
    applySorting();
    fullRefresh();
    renderSavingsAccounts();
    renderDashboard();
    renderBankAccounts();
    initMonthFilter();
    initDashboardMonthFilter();
    initQuickActionBar();
    initCalendar();
    initSortControls();
    initNavigation();
    checkRecurringTransactions();

    // Événements
    if (openAddBtn) openAddBtn.addEventListener('click', openAddModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.classList.remove('active');
        });
    }
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
    
    const themeSelectorBtn = document.getElementById('themeSelectorBtn');
    if (themeSelectorBtn) {
        themeSelectorBtn.addEventListener('click', () => {
            const modal = document.getElementById('themeModal');
            if (modal) modal.classList.add('active');
        });
    }
    
    const closeThemeModalBtn = document.getElementById('closeThemeModalBtn');
    if (closeThemeModalBtn) {
        closeThemeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('themeModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    document.querySelectorAll('.theme-option').forEach(el => {
        el.addEventListener('click', () => { 
            applyThemeColor(el.dataset.theme); 
            const modal = document.getElementById('themeModal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => { 
            if (e.target === modalOverlay) closeModal(); 
        });
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => { 
            if (e.target === settingsModal) settingsModal.classList.remove('active'); 
        });
    }
    
    if (transactionForm) transactionForm.addEventListener('submit', handleFormSubmit);
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            appSettings.initialAmount = parseFloat(initialAmountInput?.value) || 0;
            appSettings.currency = currencySelect?.value || '€';
            appSettings.displayFormat = displayFormatSelect?.value || 'sign';
            saveSettingsToLocalStorage();
            updateInitialHintDisplay();
            fullRefresh();
            if (settingsModal) settingsModal.classList.remove('active');
        });
    }

    // Budget
    const addBudgetBtn = document.getElementById('addBudgetBtn');
    if (addBudgetBtn) {
        addBudgetBtn.addEventListener('click', () => {
            const modal = document.getElementById('budgetModal');
            const title = document.getElementById('budgetModalTitle');
            const category = document.getElementById('budgetCategory');
            const amount = document.getElementById('budgetAmount');
            if (title) title.textContent = 'Définir un budget';
            if (category) category.value = '';
            if (amount) amount.value = '';
            if (modal) modal.classList.add('active');
        });
    }
    
    const closeBudgetModalBtn = document.getElementById('closeBudgetModalBtn');
    if (closeBudgetModalBtn) {
        closeBudgetModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('budgetModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const category = document.getElementById('budgetCategory');
            const amount = document.getElementById('budgetAmount');
            const cat = category ? category.value.trim() : '';
            const amt = amount ? parseFloat(amount.value) : 0;
            if (!cat || !amt || amt <= 0) return alert('Veuillez remplir tous les champs.');
            const existing = budgets.find(b => b.category === cat);
            if (existing) existing.amount = amt;
            else budgets.push({ category: cat, amount: amt });
            saveBudgets();
            renderBudgets();
            const modal = document.getElementById('budgetModal');
            if (modal) modal.classList.remove('active');
        });
    }

    // Épargne
    const openSavingsBtn = document.getElementById('openSavingsBtn');
    if (openSavingsBtn) {
        openSavingsBtn.addEventListener('click', () => {
            const view = document.getElementById('view-savings');
            if (view && !view.classList.contains('active')) {
                switchView('savings');
            }
        });
    }
    
    const addSavingsBtn = document.getElementById('addSavingsAccountBtn');
    if (addSavingsBtn) {
        addSavingsBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsModal');
            if (modal) modal.classList.add('active');
        });
    }
    
    const closeSavingsModalBtn = document.getElementById('closeSavingsModalBtn');
    if (closeSavingsModalBtn) {
        closeSavingsModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) {
        savingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('savingsName');
            const balanceInput = document.getElementById('savingsInitialBalance');
            const name = nameInput ? nameInput.value.trim() : '';
            const balance = balanceInput ? parseFloat(balanceInput.value) || 0 : 0;
            if (!name) return alert('Donnez un nom.');
            savingsAccounts.push({ id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6), name, balance, history: [] });
            saveSavingsAccounts();
            renderSavingsAccounts();
            const modal = document.getElementById('savingsModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const closeOpModalBtn = document.getElementById('closeOpModalBtn');
    if (closeOpModalBtn) {
        closeOpModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsOperationModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const savingsOperationForm = document.getElementById('savingsOperationForm');
    if (savingsOperationForm) savingsOperationForm.addEventListener('submit', handleSavingsOperationSubmit);
    
    const savingsModal = document.getElementById('savingsModal');
    if (savingsModal) {
        savingsModal.addEventListener('click', (e) => { 
            if (e.target === savingsModal) savingsModal.classList.remove('active'); 
        });
    }
    
    const savingsOperationModal = document.getElementById('savingsOperationModal');
    if (savingsOperationModal) {
        savingsOperationModal.addEventListener('click', (e) => { 
            if (e.target === savingsOperationModal) savingsOperationModal.classList.remove('active'); 
        });
    }

    // Historique épargne
    const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
    if (closeHistoryModalBtn) {
        closeHistoryModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsHistoryModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const exportHistoryCsvBtn = document.getElementById('exportHistoryCsvBtn');
    if (exportHistoryCsvBtn) {
        exportHistoryCsvBtn.addEventListener('click', () => {
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
    }
    
    const savingsHistoryModal = document.getElementById('savingsHistoryModal');
    if (savingsHistoryModal) {
        savingsHistoryModal.addEventListener('click', (e) => { 
            if (e.target === savingsHistoryModal) savingsHistoryModal.classList.remove('active'); 
        });
    }
    
    const cancelDeleteOpBtn = document.getElementById('cancelDeleteOpBtn');
    if (cancelDeleteOpBtn) {
        cancelDeleteOpBtn.addEventListener('click', () => {
            const modal = document.getElementById('deleteOperationModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const confirmDeleteOpBtn = document.getElementById('confirmDeleteOpBtn');
    if (confirmDeleteOpBtn) {
        confirmDeleteOpBtn.addEventListener('click', () => {
            if (currentOperationToDelete) {
                deleteOperationFromHistory(currentOperationToDelete.accountId, currentOperationToDelete.opId);
                currentOperationToDelete = null;
                const modal = document.getElementById('deleteOperationModal');
                if (modal) modal.classList.remove('active');
                const historyModal = document.getElementById('savingsHistoryModal');
                if (historyModal && historyModal.classList.contains('active')) showHistoryModal(currentHistoryAccountId);
            }
        });
    }
    
    const deleteOperationModal = document.getElementById('deleteOperationModal');
    if (deleteOperationModal) {
        deleteOperationModal.addEventListener('click', (e) => { 
            if (e.target === deleteOperationModal) deleteOperationModal.classList.remove('active'); 
        });
    }

    // Objectif épargne
    const closeGoalModalBtn = document.getElementById('closeGoalModalBtn');
    if (closeGoalModalBtn) {
        closeGoalModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsGoalModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const savingsGoalForm = document.getElementById('savingsGoalForm');
    if (savingsGoalForm) savingsGoalForm.addEventListener('submit', handleGoalSubmit);
    
    const savingsGoalModal = document.getElementById('savingsGoalModal');
    if (savingsGoalModal) {
        savingsGoalModal.addEventListener('click', (e) => { 
            if (e.target === savingsGoalModal) savingsGoalModal.classList.remove('active'); 
        });
    }

    // Transfert épargne
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    if (closeTransferModalBtn) {
        closeTransferModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('savingsTransferModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const savingsTransferForm = document.getElementById('savingsTransferForm');
    if (savingsTransferForm) savingsTransferForm.addEventListener('submit', handleTransferSubmit);
    
    const savingsTransferModal = document.getElementById('savingsTransferModal');
    if (savingsTransferModal) {
        savingsTransferModal.addEventListener('click', (e) => { 
            if (e.target === savingsTransferModal) savingsTransferModal.classList.remove('active'); 
        });
    }
    
    const openTransferBtn = document.getElementById('openTransferBtn');
    if (openTransferBtn) openTransferBtn.addEventListener('click', () => openTransferModal());

    // Récurrentes
    const openRecurringBtn = document.getElementById('openRecurringBtn');
    if (openRecurringBtn) {
        openRecurringBtn.addEventListener('click', () => {
            const view = document.getElementById('view-recurring');
            if (view && !view.classList.contains('active')) {
                switchView('recurring');
            }
        });
    }
    
    const processRecurringBtn = document.getElementById('processRecurringBtn');
    if (processRecurringBtn) {
        processRecurringBtn.addEventListener('click', forceProcessRecurring);
    }

    // Comptes bancaires
    const openBankBtn = document.getElementById('openBankBtn');
    if (openBankBtn) {
        openBankBtn.addEventListener('click', () => {
            const view = document.getElementById('view-bank');
            if (view && !view.classList.contains('active')) {
                switchView('bank');
            }
        });
    }
    
    const addBankAccountBtn = document.getElementById('addBankAccountBtn');
    if (addBankAccountBtn) {
        addBankAccountBtn.addEventListener('click', openAddBankModal);
    }
    
    const closeBankModalBtn = document.getElementById('closeBankModalBtn');
    if (closeBankModalBtn) {
        closeBankModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('bankAccountModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const bankAccountForm = document.getElementById('bankAccountForm');
    if (bankAccountForm) bankAccountForm.addEventListener('submit', handleBankFormSubmit);
    
    const bankAccountModal = document.getElementById('bankAccountModal');
    if (bankAccountModal) {
        bankAccountModal.addEventListener('click', (e) => { 
            if (e.target === bankAccountModal) bankAccountModal.classList.remove('active'); 
        });
    }
    
    const closeBankOpModalBtn = document.getElementById('closeBankOpModalBtn');
    if (closeBankOpModalBtn) {
        closeBankOpModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('bankOperationModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const bankOperationForm = document.getElementById('bankOperationForm');
    if (bankOperationForm) bankOperationForm.addEventListener('submit', handleBankOperationSubmit);
    
    const bankOperationModal = document.getElementById('bankOperationModal');
    if (bankOperationModal) {
        bankOperationModal.addEventListener('click', (e) => { 
            if (e.target === bankOperationModal) bankOperationModal.classList.remove('active'); 
        });
    }

    // Modale de détail compte
    document.getElementById('closeAccountDetailModalBtn').addEventListener('click', () => {
        document.getElementById('accountDetailModal').classList.remove('active');
    });
    document.getElementById('accountDetailModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('accountDetailModal')) {
            document.getElementById('accountDetailModal').classList.remove('active');
        }
    });
    document.getElementById('accApplyFilters').addEventListener('click', applyAccountFilters);
    document.getElementById('accResetFilters').addEventListener('click', resetAccountFilters);
    document.getElementById('accExportCsvBtn').addEventListener('click', exportAccountDetailCSV);

    // Modale de détail du jour (calendrier)
    document.getElementById('closeDayDetailModalBtn').addEventListener('click', closeDayDetailModal);
    document.getElementById('closeDayDetailModalBtn2').addEventListener('click', closeDayDetailModal);
    document.getElementById('dayDetailModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('dayDetailModal')) {
            closeDayDetailModal();
        }
    });

    // Duplication
    const openDuplicateBtn = document.getElementById('openDuplicateBtn');
    if (openDuplicateBtn) openDuplicateBtn.addEventListener('click', openDuplicateModal);
    
    const closeDuplicateModalBtn = document.getElementById('closeDuplicateModalBtn');
    if (closeDuplicateModalBtn) {
        closeDuplicateModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('duplicateModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const duplicateForm = document.getElementById('duplicateForm');
    if (duplicateForm) duplicateForm.addEventListener('submit', handleDuplicateSubmit);
    
    const duplicateModal = document.getElementById('duplicateModal');
    if (duplicateModal) {
        duplicateModal.addEventListener('click', (e) => { 
            if (e.target === duplicateModal) duplicateModal.classList.remove('active'); 
        });
    }

    // Export/Import
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', () => {
            const modal = document.getElementById('importModal');
            if (modal) modal.classList.add('active');
        });
    }
    
    const closeImportModalBtn = document.getElementById('closeImportModalBtn');
    if (closeImportModalBtn) {
        closeImportModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('importModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('importFileInput');
            const file = fileInput ? fileInput.files[0] : null;
            if (file) importData(file);
            else alert('Sélectionnez un fichier.');
            const modal = document.getElementById('importModal');
            if (modal) modal.classList.remove('active');
        });
    }
    
    const importModal = document.getElementById('importModal');
    if (importModal) {
        importModal.addEventListener('click', (e) => { 
            if (e.target === importModal) importModal.classList.remove('active'); 
        });
    }

    // PDF
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
    
    const exportMonthlyPdfBtn = document.getElementById('exportMonthlyPdfBtn');
    if (exportMonthlyPdfBtn) {
        exportMonthlyPdfBtn.addEventListener('click', () => {
            if (typeof exportMonthlyToPDF !== 'undefined') exportMonthlyToPDF();
            else alert('Fonction non disponible.');
        });
    }

    // Vue mensuelle
    const openMonthlyBtn = document.getElementById('openMonthlyBtn');
    if (openMonthlyBtn) {
        openMonthlyBtn.addEventListener('click', () => {
            const view = document.getElementById('view-monthly');
            if (view && !view.classList.contains('active')) {
                switchView('monthly');
            }
        });
    }

    // Filtres avancés
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyAdvancedFilters);
    
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAdvancedFilters);

    // Refresh dashboard
    const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
    if (refreshDashboardBtn) {
        refreshDashboardBtn.addEventListener('click', () => { renderDashboard(); });
    }

    // Scroll top
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    window.addEventListener('scroll', () => {
        const scrollBtn = document.getElementById('scrollTopBtn');
        if (scrollBtn) {
            scrollBtn.style.display = window.scrollY > 300 ? 'flex' : 'none';
        }
    });
}

// ===== EXPORT DATA =====
function exportData() {
    const data = { transactions, settings: appSettings, savings: savingsAccounts, budgets, bankAccounts };
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
            if (data.bankAccounts) bankAccounts = data.bankAccounts;
            saveToLocalStorage();
            saveSavingsAccounts();
            saveBudgets();
            saveBankAccounts();
            saveSettingsToLocalStorage();
            updateAllBankAccountsBalances();
            fullRefresh();
            renderSavingsAccounts();
            renderBudgets();
            renderBankAccounts();
            alert('Import réussi !');
        } catch (err) {
            alert('Erreur: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ===== SWITCH VIEW =====
function switchView(viewId) {
    const dropdownContent = document.getElementById('dropdownContent');
    const views = document.querySelectorAll('.view-content');
    const currentViewLabel = document.getElementById('currentViewLabel');
    const menuItems = dropdownContent ? dropdownContent.querySelectorAll('a') : [];
    
    views.forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }

    const activeItem = dropdownContent ? dropdownContent.querySelector(`a[data-view="${viewId}"]`) : null;
    if (activeItem && currentViewLabel) {
        currentViewLabel.innerHTML = activeItem.innerHTML;
    }

    if (menuItems) {
        menuItems.forEach(i => i.classList.remove('active'));
    }
    if (activeItem) activeItem.classList.add('active');

    if (viewId === 'calendar') {
        renderCalendar();
    } else if (viewId === 'monthly' && typeof renderMonthlyTable !== 'undefined') {
        renderMonthlyTable();
    } else if (viewId === 'savings') {
        renderSavingsAccounts();
        renderDashboard();
    } else if (viewId === 'recurring') {
        renderRecurringList();
    } else if (viewId === 'bank') {
        renderBankAccounts();
    } else if (viewId === 'charts') {
        renderFullCharts();
    } else if (viewId === 'dashboard') {
        renderCharts();
        renderBudgets();
        renderRecentTransactions();
        // Synchroniser le sélecteur de mois
        const select = document.getElementById('dashboardMonthSelect');
        if (select) {
            if (currentFilterMonth && select.querySelector(`option[value="${currentFilterMonth}"]`)) {
                select.value = currentFilterMonth;
            } else {
                select.value = '';
            }
        }
    } else if (viewId === 'transactions') {
        renderTransactionList();
        updateMonthSelect();
        updateCategoryFilter();
        updateAccountFilter();
    } else if (viewId === 'settings') {
        openSettingsModal();
    }
}

// Gestionnaire pour l'affichage du champ de virement bancaire
document.addEventListener('DOMContentLoaded', function() {
    const bankOpType = document.getElementById('bankOpType');
    if (bankOpType) {
        bankOpType.addEventListener('change', function() {
            const group = document.getElementById('bankTransferTargetGroup');
            if (group) {
                group.style.display = this.value === 'transfer' ? 'block' : 'none';
            }
        });
    }
    
    const typeSelectEl = document.getElementById('typeSelect');
    const targetSelectEl = document.getElementById('transactionTarget');
    if (typeSelectEl) typeSelectEl.addEventListener('change', updateTransferInfo);
    if (targetSelectEl) targetSelectEl.addEventListener('change', updateTransferInfo);
});

// Démarrer l'application
init();
