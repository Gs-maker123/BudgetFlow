// ===== DÉCLARATIONS GLOBALES =====
let transactions = [];
let sortableInstance = null;
let currentEditId = null;
let isDarkMode = false;
let currentFilterMonth = null; // null = tous, sinon "YYYY-MM"

let appSettings = {
    initialAmount: 0,
    currency: '€',
    displayFormat: 'sign'
};
let currentSortMode = 'manual';

// Comptes épargne
let savingsAccounts = [];

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
const initialAmountInput = document.getElementById('initialAmountInput');
const currencySelect = document.getElementById('currencySelect');
const displayFormatSelect = document.getElementById('displayFormatSelect');
const initialHintSpan = document.getElementById('initialHint');

// ===== HELPER =====
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ===== GESTION THÈME =====
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        isDarkMode = true;
        localStorage.setItem('budgetTheme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        isDarkMode = false;
        localStorage.setItem('budgetTheme', 'light');
    }
    updateThemeIcon();
}

function loadTheme() {
    const saved = localStorage.getItem('budgetTheme');
    if (saved === 'dark') applyTheme('dark');
    else applyTheme('light');
}

function toggleTheme() {
    if (isDarkMode) applyTheme('light');
    else applyTheme('dark');
}

function updateThemeIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    if (isDarkMode) {
        btn.innerHTML = '<i class="fas fa-sun"></i>';
        btn.title = 'Mode clair';
    } else {
        btn.innerHTML = '<i class="fas fa-moon"></i>';
        btn.title = 'Mode sombre';
    }
}

// ===== PARAMÈTRES =====
function saveSettingsToLocalStorage() {
    localStorage.setItem('budgetSettings', JSON.stringify(appSettings));
}

function loadSettings() {
    const stored = localStorage.getItem('budgetSettings');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            appSettings = { ...appSettings, ...parsed };
        } catch(e) {}
    }
    if (initialAmountInput) initialAmountInput.value = appSettings.initialAmount;
    if (currencySelect) currencySelect.value = appSettings.currency;
    if (displayFormatSelect) displayFormatSelect.value = appSettings.displayFormat;
    updateInitialHintDisplay();
}

function updateInitialHintDisplay() {
    if (initialHintSpan) {
        if (appSettings.initialAmount !== 0) {
            initialHintSpan.textContent = `(départ: ${appSettings.initialAmount.toFixed(2)} ${appSettings.currency})`;
        } else {
            initialHintSpan.textContent = '';
        }
    }
}

function formatAmountWithSettings(amount, type) {
    const absAmount = Math.abs(amount).toFixed(2);
    if (appSettings.displayFormat === 'sign') {
        const prefix = (type === 'expense') ? '- ' : '+ ';
        return `${prefix}${absAmount} ${appSettings.currency}`;
    } else {
        if (type === 'expense') return `(${absAmount} ${appSettings.currency})`;
        else return `${absAmount} ${appSettings.currency}`;
    }
}

// ===== STOCKAGE TRANSACTIONS =====
function saveToLocalStorage() {
    localStorage.setItem('budgetTransactions', JSON.stringify(transactions));
}

// Migration pour garantir des IDs uniques (pour éviter les doublons après duplication)
function repairDuplicateIds() {
    let ids = new Set();
    let changed = false;
    transactions = transactions.map(t => {
        while (ids.has(t.id)) {
            t.id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
            changed = true;
        }
        ids.add(t.id);
        return t;
    });
    if (changed) {
        saveToLocalStorage();
        console.log("IDs réparés : toutes les transactions ont maintenant un identifiant unique.");
    }
}

function loadInitialData() {
    const stored = localStorage.getItem('budgetTransactions');
    if (stored) {
        transactions = JSON.parse(stored);
    } else {
        transactions = [
            { id: '1', description: 'Salaire NET', amount: 2450, category: 'Salaire', type: 'revenue', date: '2025-03-01' },
            { id: '2', description: 'Courses supermarché', amount: 89.5, category: 'Alimentation', type: 'expense', date: '2025-03-05' },
            { id: '3', description: 'Netflix / Spotify', amount: 25.99, category: 'Abonnements', type: 'expense', date: '2025-03-10' },
            { id: '4', description: 'Transport essence', amount: 45.2, category: 'Transport', type: 'expense', date: '2025-02-15' },
            { id: '5', description: 'Freelance design', amount: 380, category: 'Freelance', type: 'revenue', date: '2025-02-20' },
            { id: '6', description: 'Restaurant', amount: 37.4, category: 'Loisirs', type: 'expense', date: '2025-01-25' }
        ];
    }
    // Migration : ajouter une date si absente
    transactions = transactions.map(t => {
        if (!t.date) t.date = new Date().toISOString().slice(0,10);
        return t;
    });
    // Réparer les IDs en double potentiels
    repairDuplicateIds();
    saveToLocalStorage();
}

// ===== RÉSUMÉ CARTES =====
function updateSummary() {
    const previousCard = document.getElementById('previousBalanceCard');
    const previousSpan = document.getElementById('previousBalance');
    let totalRev = 0, totalExp = 0;

    // Calcule le solde cumulé jusqu'à une date donnée
    function getCumulativeBalance(untilDate) {
        let balance = appSettings.initialAmount;
        const sorted = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
        for (let t of sorted) {
            if (t.date <= untilDate) {
                if (t.type === 'revenue') balance += t.amount;
                else balance -= t.amount;
            }
        }
        return balance;
    }

    // Formate un montant (peut être négatif) selon les préférences d'affichage
    function formatSignedAmount(amount) {
        if (appSettings.displayFormat === 'sign') {
            let sign = amount >= 0 ? '+ ' : '- ';
            return `${sign}${Math.abs(amount).toFixed(2)} ${appSettings.currency}`;
        } else {
            if (amount < 0) {
                return `(${Math.abs(amount).toFixed(2)} ${appSettings.currency})`;
            } else {
                return `${amount.toFixed(2)} ${appSettings.currency}`;
            }
        }
    }

    // Applique la classe de couleur selon le signe
    function setColorClass(element, amount) {
        if (amount >= 0) {
            element.classList.remove('negative');
            element.classList.add('positive');
        } else {
            element.classList.remove('positive');
            element.classList.add('negative');
        }
    }

    if (currentFilterMonth && currentFilterMonth !== '') {
        const [year, month] = currentFilterMonth.split('-');
        const yearNum = parseInt(year), monthNum = parseInt(month);
        
        // Dernier jour du mois courant
        const lastDayCurrent = new Date(yearNum, monthNum, 0).getDate();
        const endCurrentDate = `${currentFilterMonth}-${String(lastDayCurrent).padStart(2,'0')}`;
        
        // Mois précédent
        let prevYear = yearNum, prevMonth = monthNum - 1;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear--;
        }
        const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2,'0')}`;
        const lastDayPrev = new Date(prevYear, prevMonth, 0).getDate();
        const endPrevDate = `${prevMonthStr}-${String(lastDayPrev).padStart(2,'0')}`;
        
        // Solde fin mois précédent
        const balancePrevMonth = getCumulativeBalance(endPrevDate);
        previousSpan.innerText = formatSignedAmount(balancePrevMonth);
        setColorClass(previousSpan, balancePrevMonth);
        previousCard.style.display = 'flex';
        
        // Solde fin mois courant
        const balanceCurrent = getCumulativeBalance(endCurrentDate);
        
        // Revenus et dépenses du mois courant uniquement
        totalRev = transactions.reduce((sum, t) => {
            if (t.date && t.date.startsWith(currentFilterMonth) && t.type === 'revenue') return sum + t.amount;
            return sum;
        }, 0);
        totalExp = transactions.reduce((sum, t) => {
            if (t.date && t.date.startsWith(currentFilterMonth) && t.type === 'expense') return sum + t.amount;
            return sum;
        }, 0);
        
        totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        // Revenus toujours verts, dépenses toujours rouges
        totalRevenueSpan.classList.remove('negative');
        totalRevenueSpan.classList.add('positive');
        totalExpenseSpan.classList.remove('positive');
        totalExpenseSpan.classList.add('negative');
        
        totalBalanceSpan.innerText = formatSignedAmount(balanceCurrent);
        setColorClass(totalBalanceSpan, balanceCurrent);
    } else {
        // Vue globale (tous les mois)
        previousCard.style.display = 'none';
        transactions.forEach(t => {
            if (t.type === 'revenue') totalRev += t.amount;
            else totalExp += t.amount;
        });
        const balanceFromFlow = totalRev - totalExp;
        const totalBalance = appSettings.initialAmount + balanceFromFlow;
        totalRevenueSpan.innerText = formatAmountWithSettings(totalRev, 'revenue');
        totalExpenseSpan.innerText = formatAmountWithSettings(totalExp, 'expense');
        totalRevenueSpan.classList.remove('negative');
        totalRevenueSpan.classList.add('positive');
        totalExpenseSpan.classList.remove('positive');
        totalExpenseSpan.classList.add('negative');
        totalBalanceSpan.innerText = formatSignedAmount(totalBalance);
        setColorClass(totalBalanceSpan, totalBalance);
    }
}

// ===== RÉSUMÉ PAR CATÉGORIE =====
function renderCategorySummary() {
    const categoryMap = new Map();
    
    // Filtrer les transactions selon le mois sélectionné (ou toutes si pas de filtre)
    let filteredTransactions = transactions;
    if (currentFilterMonth && currentFilterMonth !== '') {
        filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(currentFilterMonth));
    }
    
    filteredTransactions.forEach(t => {
        const cat = t.category || 'Divers';
        if (!categoryMap.has(cat)) categoryMap.set(cat, { revenue: 0, expense: 0 });
        const entry = categoryMap.get(cat);
        if (t.type === 'revenue') entry.revenue += t.amount;
        else entry.expense += t.amount;
    });
    
    const container = document.getElementById('categoryList');
    if (!container) return;
    
    // Mettre à jour le titre de la carte pour indiquer le mois filtré
    const titleElement = document.querySelector('#categorySummaryContainer h3');
    if (titleElement) {
        if (currentFilterMonth && currentFilterMonth !== '') {
            const [year, month] = currentFilterMonth.split('-');
            const monthName = new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' });
            titleElement.innerHTML = `<i class="fas fa-chart-pie"></i> Totaux par catégorie - ${monthName} ${year}`;
        } else {
            titleElement.innerHTML = `<i class="fas fa-chart-pie"></i> Totaux par catégorie (tous les mois)`;
        }
    }
    
    if (categoryMap.size === 0) {
        container.innerHTML = '<div class="empty-cats">Aucune catégorie pour cette période</div>';
        return;
    }
    
    let html = '';
    for (let [cat, totals] of categoryMap.entries()) {
        const net = totals.revenue - totals.expense;
        const netClass = net >= 0 ? 'amount-revenue' : 'amount-expense';
        const netText = `${net >= 0 ? '+' : ''}${net.toFixed(2)} ${appSettings.currency}`;
        html += `
            <div class="category-item">
                <span class="category-name">${escapeHtml(cat)}</span>
                <span class="category-total ${netClass}">${netText}</span>
                <small style="color:var(--text-secondary)">(R:${totals.revenue.toFixed(2)} D:${totals.expense.toFixed(2)})</small>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ===== FILTRE PAR MOIS =====
function updateMonthSelect() {
    const monthSet = new Set();
    transactions.forEach(t => {
        if (t.date && t.date.length >= 7) {
            monthSet.add(t.date.substring(0, 7));
        }
    });
    const months = Array.from(monthSet).sort().reverse();
    const select = document.getElementById('monthSelect');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Tous les mois --</option>';
    months.forEach(m => {
        const [year, month] = m.split('-');
        const monthName = new Date(year, month-1, 1).toLocaleString('fr-FR', { month: 'long' });
        const option = document.createElement('option');
        option.value = m;
        option.textContent = `${monthName} ${year}`;
        select.appendChild(option);
    });
    if (currentFilterMonth && months.includes(currentFilterMonth)) select.value = currentFilterMonth;
    else if (currentValue && months.includes(currentValue)) select.value = currentValue;
    else select.value = '';
}

function setMonthFilter(month) {
    currentFilterMonth = month;
    const select = document.getElementById('monthSelect');
    if (select) select.value = month || '';
    fullRefresh();
}

function initMonthFilter() {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    select.addEventListener('change', () => {
        const value = select.value;
        if (value === '') setMonthFilter(null);
        else setMonthFilter(value);
    });
    const resetBtn = document.getElementById('resetMonthFilter');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => setMonthFilter(null));
    }
}

// ===== TRI =====
function loadSortMode() {
    const saved = localStorage.getItem('budgetSortMode');
    currentSortMode = (saved === 'category' || saved === 'date_desc' || saved === 'date_asc') ? saved : 'manual';
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = currentSortMode;
}
function saveSortMode() { localStorage.setItem('budgetSortMode', currentSortMode); }
function applySorting() {
    if (currentSortMode === 'category') {
        transactions.sort((a,b) => {
            const catA = (a.category || 'Divers').toLowerCase();
            const catB = (b.category || 'Divers').toLowerCase();
            return catA.localeCompare(catB);
        });
    } else if (currentSortMode === 'date_desc') {
        transactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    } else if (currentSortMode === 'date_asc') {
        transactions.sort((a,b) => new Date(a.date) - new Date(b.date));
    }
    saveToLocalStorage();
}

// ===== RENDU LISTE (avec filtre) =====
function renderTransactionList() {
    if (!listContainer) return;
    let filteredTransactions = transactions;
    if (currentFilterMonth && currentFilterMonth !== '') {
        filteredTransactions = transactions.filter(t => t.date && t.date.startsWith(currentFilterMonth));
    }
    if (filteredTransactions.length === 0) {
        listContainer.innerHTML = `<div class="empty-list"><i class="fas fa-receipt"></i> Aucune transaction pour cette période.</div>`;
        return;
    }
    let html = '';
    filteredTransactions.forEach(transaction => {
        const amountClass = transaction.type === 'expense' ? 'amount-expense' : 'amount-revenue';
        const formattedAmount = formatAmountWithSettings(transaction.amount, transaction.type);
        html += `
            <div class="transaction-item" data-id="${transaction.id}">
                <div class="drag-area ${currentSortMode !== 'manual' ? 'disabled' : ''}"><i class="fas fa-grip-vertical"></i></div>
                <div class="transaction-info">
                    <span class="transaction-desc">${escapeHtml(transaction.description)}</span>
                    <span class="transaction-category"><i class="fas fa-tag"></i> ${escapeHtml(transaction.category || 'Non catégorisé')}</span>
                    <span class="transaction-amount ${amountClass}">${formattedAmount}</span>
                    <span class="transaction-date" style="font-size:0.7rem; color:var(--text-secondary);">${transaction.date || ''}</span>
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit" data-id="${transaction.id}" title="Modifier"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" data-id="${transaction.id}" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            openEditModal(id);
        });
    });
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            deleteTransactionById(id);
        });
    });
}

function syncOrderFromDOM() {
    if (currentSortMode !== 'manual') return;
    const items = document.querySelectorAll('#transactionListContainer .transaction-item');
    if (!items.length) return;
    const newOrderIds = Array.from(items).map(item => item.getAttribute('data-id'));
    const orderedTransactions = [];
    for (let id of newOrderIds) {
        const found = transactions.find(t => t.id === id);
        if (found) orderedTransactions.push(found);
    }
    for (let t of transactions) {
        if (!orderedTransactions.find(ot => ot.id === t.id)) orderedTransactions.push(t);
    }
    transactions = orderedTransactions;
    saveToLocalStorage();
    updateSummary();
}

function initSortable() {
    if (sortableInstance) sortableInstance.destroy();
    if (!listContainer) return;
    if (currentSortMode === 'manual') {
        sortableInstance = new Sortable(listContainer, {
            handle: '.drag-area',
            animation: 200,
            ghostClass: 'sortable-ghost',
            onEnd: () => syncOrderFromDOM()
        });
        document.querySelectorAll('.drag-area').forEach(el => el.classList.remove('disabled'));
    } else {
        document.querySelectorAll('.drag-area').forEach(el => el.classList.add('disabled'));
    }
}

// ===== CRUD TRANSACTIONS =====
function deleteTransactionById(id) {
    if (confirm('Supprimer cette transaction ?')) {
        transactions = transactions.filter(t => t.id !== id);
        fullRefresh();
    }
}

function openAddModal() {
    currentEditId = null;
    modalTitle.innerText = '➕ Nouvelle transaction';
    descInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
    typeSelect.value = 'expense';
    dateInput.value = new Date().toISOString().slice(0,10);
    modalOverlay.classList.add('active');
}

function openEditModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    currentEditId = id;
    modalTitle.innerText = '✏️ Modifier la transaction';
    descInput.value = transaction.description;
    amountInput.value = transaction.amount;
    categoryInput.value = transaction.category || '';
    typeSelect.value = transaction.type;
    dateInput.value = transaction.date || new Date().toISOString().slice(0,10);
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    currentEditId = null;
}

function handleFormSubmit(e) {
    e.preventDefault();
    let description = descInput.value.trim();
    let amountRaw = amountInput.value.trim();
    let categoryRaw = categoryInput.value.trim();
    let type = typeSelect.value;
    let date = dateInput.value;

    if (!description) { alert("Veuillez entrer une description."); return; }
    let amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) { alert("Montant invalide."); return; }
    if (!categoryRaw) categoryRaw = "Divers";
    if (!date) date = new Date().toISOString().slice(0,10);

    if (currentEditId === null) {
        const newTransaction = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            description, amount, category: categoryRaw, type, date
        };
        transactions.push(newTransaction);
    } else {
        const index = transactions.findIndex(t => t.id === currentEditId);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], description, amount, category: categoryRaw, type, date };
        }
    }
    closeModal();
    fullRefresh();
}

// ===== PARAMÈTRES AVANCÉS =====
function openSettingsModal() {
    initialAmountInput.value = appSettings.initialAmount;
    currencySelect.value = appSettings.currency;
    displayFormatSelect.value = appSettings.displayFormat;
    settingsModal.classList.add('active');
}
function closeSettingsModal() { settingsModal.classList.remove('active'); }
function saveSettings(e) {
    e.preventDefault();
    let newInitial = parseFloat(initialAmountInput.value);
    if (isNaN(newInitial)) newInitial = 0;
    appSettings.initialAmount = newInitial;
    appSettings.currency = currencySelect.value;
    appSettings.displayFormat = displayFormatSelect.value;
    saveSettingsToLocalStorage();
    updateInitialHintDisplay();
    fullRefresh();
    closeSettingsModal();
}

// ===== GESTION COMPTES ÉPARGNE =====
function loadSavingsAccounts() {
    const stored = localStorage.getItem('savingsAccounts');
    if (stored) savingsAccounts = JSON.parse(stored);
    else savingsAccounts = [];
}
function saveSavingsAccounts() { localStorage.setItem('savingsAccounts', JSON.stringify(savingsAccounts)); }
function renderSavingsAccounts() {
    const container = document.getElementById('savingsAccountsList');
    if (!container) return;
    if (savingsAccounts.length === 0) {
        container.innerHTML = '<div class="empty-savings">Aucun compte épargne. Cliquez sur "Nouveau compte" pour commencer.</div>';
        document.getElementById('totalSavings').innerText = `0.00 ${appSettings.currency}`;
        return;
    }
    let html = '';
    let total = 0;
    savingsAccounts.forEach(acc => {
        total += acc.balance;
        html += `
            <div class="savings-account-card" data-id="${acc.id}">
                <div class="savings-account-info">
                    <div class="savings-account-name">${escapeHtml(acc.name)}</div>
                    <div class="savings-account-balance">${acc.balance.toFixed(2)} ${appSettings.currency}</div>
                </div>
                <div class="savings-account-actions">
                    <button class="operation" data-id="${acc.id}" title="Crédit/Débit"><i class="fas fa-exchange-alt"></i> Opération</button>
                    <button class="delete-savings" data-id="${acc.id}" title="Supprimer"><i class="fas fa-trash"></i> Supprimer</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('totalSavings').innerText = `${total.toFixed(2)} ${appSettings.currency}`;
    document.querySelectorAll('.operation').forEach(btn => {
        btn.addEventListener('click', (e) => openSavingsOperationModal(btn.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-savings').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm('Supprimer ce compte épargne ?')) {
                savingsAccounts = savingsAccounts.filter(a => a.id !== id);
                saveSavingsAccounts();
                renderSavingsAccounts();
            }
        });
    });
}
function openAddSavingsModal() {
    currentEditSavingsId = null;
    document.getElementById('savingsModalTitle').innerText = 'Ajouter un compte épargne';
    document.getElementById('savingsName').value = '';
    document.getElementById('savingsInitialBalance').value = '0';
    document.getElementById('savingsModal').classList.add('active');
}
function openSavingsOperationModal(accountId) {
    const account = savingsAccounts.find(a => a.id === accountId);
    if (!account) return;
    document.getElementById('opAccountId').value = accountId;
    document.getElementById('operationModalTitle').innerText = `Opération sur ${account.name}`;
    document.getElementById('opAmount').value = '';
    document.getElementById('opType').value = 'credit';
    document.getElementById('opDescription').value = '';
    document.getElementById('savingsOperationModal').classList.add('active');
}
function handleSavingsFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('savingsName').value.trim();
    const initialBalance = parseFloat(document.getElementById('savingsInitialBalance').value) || 0;
    if (!name) { alert('Veuillez donner un nom au compte.'); return; }
    const newAccount = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
        name: name,
        balance: initialBalance
    };
    savingsAccounts.push(newAccount);
    saveSavingsAccounts();
    renderSavingsAccounts();
    closeSavingsModal();
}
function handleSavingsOperationSubmit(e) {
    e.preventDefault();
    const accountId = document.getElementById('opAccountId').value;
    const amount = parseFloat(document.getElementById('opAmount').value);
    const type = document.getElementById('opType').value;
    if (isNaN(amount) || amount <= 0) { alert('Montant invalide.'); return; }
    const account = savingsAccounts.find(a => a.id === accountId);
    if (!account) return;
    if (type === 'credit') account.balance += amount;
    else {
        if (account.balance - amount < 0 && !confirm('Le solde deviendra négatif. Continuer ?')) return;
        account.balance -= amount;
    }
    saveSavingsAccounts();
    renderSavingsAccounts();
    closeSavingsOperationModal();
}
function closeSavingsModal() { document.getElementById('savingsModal').classList.remove('active'); }
function closeSavingsOperationModal() { document.getElementById('savingsOperationModal').classList.remove('active'); }
let currentEditSavingsId = null;

// ===== DUPLICATION DE MOIS =====
function openDuplicateModal() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    let defaultSource = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    if (transactions.length > 0) {
        const dates = transactions.map(t => t.date).filter(d => d).sort();
        const lastDate = dates[dates.length - 1];
        if (lastDate) defaultSource = lastDate.slice(0, 7);
    }
    let [sYear, sMonth] = defaultSource.split('-').map(Number);
    let nextYear = sYear, nextMonth = sMonth + 1;
    if (nextMonth > 12) { nextMonth = 1; nextYear++; }
    const defaultTarget = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    document.getElementById('sourceMonth').value = defaultSource;
    document.getElementById('targetMonth').value = defaultTarget;
    document.getElementById('duplicateModal').classList.add('active');
}
function closeDuplicateModal() { document.getElementById('duplicateModal').classList.remove('active'); }
function handleDuplicateSubmit(e) {
    e.preventDefault();
    const sourceMonth = document.getElementById('sourceMonth').value;
    const targetMonth = document.getElementById('targetMonth').value;
    const overwrite = document.getElementById('overwriteTarget').checked;
    if (!sourceMonth || !targetMonth) { alert("Veuillez sélectionner les deux mois."); return; }
    const sourceTransactions = transactions.filter(t => t.date && t.date.startsWith(sourceMonth));
    if (sourceTransactions.length === 0) { alert(`Aucune transaction trouvée pour le mois ${sourceMonth}.`); return; }
    let newTransactions = [...transactions];
    if (overwrite) newTransactions = newTransactions.filter(t => !t.date.startsWith(targetMonth));
    const duplicated = sourceTransactions.map(t => {
        let newDate = t.date.replace(sourceMonth, targetMonth);
        const [year, month, day] = newDate.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
        if (dateObj.getMonth() !== parseInt(month)-1) {
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            newDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        }
        return {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
            description: t.description,
            amount: t.amount,
            category: t.category,
            type: t.type,
            date: newDate
        };
    });
    newTransactions.push(...duplicated);
    transactions = newTransactions;
    saveToLocalStorage();
    fullRefresh();
    alert(`${duplicated.length} transaction(s) dupliquée(s) vers ${targetMonth}.`);
    closeDuplicateModal();
}

// ===== EXPORT PDF =====
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const btn = document.getElementById('exportPdfBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Génération...';
    btn.disabled = true;
    try {
        const element = document.querySelector('.app-container');
        if (!element) throw new Error('Conteneur introuvable');
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'visible';
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
        document.body.style.overflow = originalOverflow;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        pdf.save('budgetflow_export.pdf');
    } catch (error) {
        console.error(error);
        alert('Erreur lors de la génération du PDF.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== RAFRAÎCHISSEMENT GLOBAL =====
function fullRefresh() {
    renderTransactionList();
    updateSummary();
    renderCategorySummary();
    updateMonthSelect();
    saveToLocalStorage();
    initSortable();
}

// ===== INITIALISATION =====
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
    loadSettings();
    loadInitialData();
    loadSortMode();
    applySorting();
    fullRefresh();
    initSortControls();
    initMonthFilter();
    loadSavingsAccounts();
    renderSavingsAccounts();

    // Événements principaux
    openAddBtn.addEventListener('click', openAddModal);
    openSettingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtn.addEventListener('click', closeModal);
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });
    transactionForm.addEventListener('submit', handleFormSubmit);
    settingsForm.addEventListener('submit', saveSettings);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const monthlyBtn = document.getElementById('openMonthlyBtn');
    const monthlyView = document.getElementById('monthlyView');
    if (monthlyBtn && monthlyView) {
        monthlyBtn.addEventListener('click', () => {
            if (monthlyView.style.display === 'none') {
                if (typeof renderMonthlyTable !== 'undefined') renderMonthlyTable();
                monthlyView.style.display = 'block';
            } else {
                monthlyView.style.display = 'none';
            }
        });
    }

    const duplicateBtn = document.getElementById('openDuplicateBtn');
    if (duplicateBtn) duplicateBtn.addEventListener('click', openDuplicateModal);
    const closeDuplicateModalBtn = document.getElementById('closeDuplicateModalBtn');
    if (closeDuplicateModalBtn) closeDuplicateModalBtn.addEventListener('click', closeDuplicateModal);
    const duplicateForm = document.getElementById('duplicateForm');
    if (duplicateForm) duplicateForm.addEventListener('submit', handleDuplicateSubmit);
    const duplicateModalOverlay = document.getElementById('duplicateModal');
    if (duplicateModalOverlay) {
        duplicateModalOverlay.addEventListener('click', (e) => { if (e.target === duplicateModalOverlay) closeDuplicateModal(); });
    }

    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToPDF);

    // Épargne
    const openSavingsBtn = document.getElementById('openSavingsBtn');
    const savingsView = document.getElementById('savingsView');
    if (openSavingsBtn && savingsView) {
        openSavingsBtn.addEventListener('click', () => {
            if (savingsView.style.display === 'none') {
                renderSavingsAccounts();
                savingsView.style.display = 'block';
            } else {
                savingsView.style.display = 'none';
            }
        });
    }
    const addSavingsBtn = document.getElementById('addSavingsAccountBtn');
    if (addSavingsBtn) addSavingsBtn.addEventListener('click', openAddSavingsModal);
    const closeSavingsModalBtn = document.getElementById('closeSavingsModalBtn');
    if (closeSavingsModalBtn) closeSavingsModalBtn.addEventListener('click', closeSavingsModal);
    const closeOpModalBtn = document.getElementById('closeOpModalBtn');
    if (closeOpModalBtn) closeOpModalBtn.addEventListener('click', closeSavingsOperationModal);
    const savingsForm = document.getElementById('savingsForm');
    if (savingsForm) savingsForm.addEventListener('submit', handleSavingsFormSubmit);
    const savingsOpForm = document.getElementById('savingsOperationForm');
    if (savingsOpForm) savingsOpForm.addEventListener('submit', handleSavingsOperationSubmit);
    const savingsModalOverlay = document.getElementById('savingsModal');
    if (savingsModalOverlay) {
        savingsModalOverlay.addEventListener('click', (e) => { if (e.target === savingsModalOverlay) closeSavingsModal(); });
    }
    const savingsOpOverlay = document.getElementById('savingsOperationModal');
    if (savingsOpOverlay) {
        savingsOpOverlay.addEventListener('click', (e) => { if (e.target === savingsOpOverlay) closeSavingsOperationModal(); });
    }

    // Bouton retour en haut
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) scrollBtn.style.display = 'flex';
            else scrollBtn.style.display = 'none';
        });
        scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        if (window.scrollY > 300) scrollBtn.style.display = 'flex';
    }
}

init();