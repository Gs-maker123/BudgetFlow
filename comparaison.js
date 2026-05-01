// comparaison.js - Tableau comparatif sur 12 mois (janvier à décembre de l'année en cours)

function getLast12Months() {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        const monthName = date.toLocaleString('fr-FR', { month: 'short' }).replace('.', '');
        months.push({
            label: `${monthName} ${currentYear}`,
            year: currentYear,
            month: i,
            key: `${currentYear}-${String(i + 1).padStart(2, '0')}`
        });
    }
    return months;
}

function loadTransactionsForMonthly() {
    const stored = localStorage.getItem('budgetTransactions');
    if (stored) {
        const transactions = JSON.parse(stored);
        return transactions.map(t => {
            if (!t.date) t.date = new Date().toISOString().slice(0, 10);
            return t;
        });
    }
    return [];
}

function computeMonthlyTotals(transactions) {
    const totalsByMonth = new Map();
    transactions.forEach(t => {
        if (!t.date) return;
        const [year, month] = t.date.split('-');
        const key = `${year}-${month}`;
        if (!totalsByMonth.has(key)) totalsByMonth.set(key, { revenues: 0, expenses: 0 });
        const data = totalsByMonth.get(key);
        if (t.type === 'revenue') data.revenues += t.amount;
        else data.expenses += t.amount;
    });
    return totalsByMonth;
}

function renderMonthlyTable() {
    const container = document.getElementById('monthlyTableContainer');
    if (!container) return;

    const transactions = loadTransactionsForMonthly();
    const months = getLast12Months();
    const totalsByMonth = computeMonthlyTotals(transactions);

    // Regrouper par catégorie
    const categoriesMap = new Map(); // cat -> Map(monthKey -> { rev, exp })
    transactions.forEach(t => {
        if (!t.date) return;
        const cat = t.category || 'Divers';
        const monthKey = t.date.substring(0, 7);
        if (!categoriesMap.has(cat)) categoriesMap.set(cat, new Map());
        const catData = categoriesMap.get(cat);
        if (!catData.has(monthKey)) catData.set(monthKey, { rev: 0, exp: 0 });
        const entry = catData.get(monthKey);
        if (t.type === 'revenue') entry.rev += t.amount;
        else entry.exp += t.amount;
    });

    const sortedCats = Array.from(categoriesMap.keys()).sort();

    let html = `<div class="table-responsive">
        <table class="monthly-table">
            <thead>
                <tr><th>Catégorie</th>${months.map(m => `<th>${m.label}</th>`).join('')}<th>Total (12 mois)</th></tr>
            </thead>
            <tbody>`;

    for (let cat of sortedCats) {
        let totalNet = 0;
        let row = `<tr><td class="category-label"><strong>${escapeHtml(cat)}</strong></td>`;
        for (let m of months) {
            const key = m.key;
            const data = categoriesMap.get(cat).get(key) || { rev: 0, exp: 0 };
            const net = data.rev - data.exp;
            totalNet += net;
            const cellClass = net >= 0 ? 'positive-cell' : 'negative-cell';
            row += `<td class="${cellClass}">${net >= 0 ? '+' : ''}${net.toFixed(2)} €</td>`;
        }
        row += `<td class="total-cell ${totalNet >= 0 ? 'positive-cell' : 'negative-cell'}">${totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)} €</td></tr>`;
        html += row;
    }

    // Lignes récapitulatives : revenus totaux, dépenses totales, solde global
    let totalsRev = new Map();
    let totalsExp = new Map();
    months.forEach(m => {
        totalsRev.set(m.key, 0);
        totalsExp.set(m.key, 0);
    });
    transactions.forEach(t => {
        if (!t.date) return;
        const key = t.date.substring(0, 7);
        if (totalsRev.has(key)) {
            if (t.type === 'revenue') totalsRev.set(key, totalsRev.get(key) + t.amount);
            else totalsExp.set(key, totalsExp.get(key) + t.amount);
        }
    });
    let totalRevAll = 0, totalExpAll = 0;
    let revRow = `<tr class="total-row"><td><strong>💰 Tous revenus</strong></td>`;
    let expRow = `<tr class="total-row"><td><strong>💸 Toutes dépenses</strong></td>`;
    let balRow = `<tr class="total-row"><td><strong>⚖️ Solde global</strong></td>`;
    for (let m of months) {
        const rev = totalsRev.get(m.key);
        const exp = totalsExp.get(m.key);
        totalRevAll += rev;
        totalExpAll += exp;
        revRow += `<td class="positive-cell">+${rev.toFixed(2)} €</td>`;
        expRow += `<td class="negative-cell">-${exp.toFixed(2)} €</td>`;
        const balance = rev - exp;
        balRow += `<td class="${balance >= 0 ? 'positive-cell' : 'negative-cell'}">${balance >= 0 ? '+' : ''}${balance.toFixed(2)} €</td>`;
    }
    revRow += `<td class="positive-cell">+${totalRevAll.toFixed(2)} €</td></tr>`;
    expRow += `<td class="negative-cell">-${totalExpAll.toFixed(2)} €</td></tr>`;
    balRow += `<td class="${(totalRevAll - totalExpAll) >= 0 ? 'positive-cell' : 'negative-cell'}">${(totalRevAll - totalExpAll) >= 0 ? '+' : ''}${(totalRevAll - totalExpAll).toFixed(2)} €</td></tr>`;

    html += revRow + expRow + balRow;
    html += `</tbody></table></div>`;

    container.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Export PDF du tableau mensuel
async function exportMonthlyToPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.querySelector('#monthlyView .monthly-table-wrapper');
    if (!element) {
        alert("Vue mensuelle non trouvée.");
        return;
    }
    const btn = document.getElementById('exportMonthlyPdfBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Génération...';
    btn.disabled = true;
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const imgWidth = 297; // A4 paysage largeur
        const pageHeight = 210;
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
        pdf.save('budgetflow_comparatif_mensuel.pdf');
    } catch (error) {
        console.error(error);
        alert("Erreur lors de l'export PDF.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}