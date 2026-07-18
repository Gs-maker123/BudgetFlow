# BudgetFlow - Gestionnaire de budget personnel

Application web complète pour suivre vos revenus et dépenses, avec catégories, tableaux comparatifs, comptes épargne, budgets, graphiques et bien plus.

![BudgetFlow](https://img.shields.io/badge/version-3.0-green.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Fonctionnalités

### Gestion des transactions
- ✅ Ajout, modification, suppression de transactions (revenus/dépenses)
- ✅ Catégories personnalisables avec suggestions
- ✅ Date de transaction (par défaut la date du jour)
- ✅ Réorganisation par glisser-déposer (drag & drop)
- ✅ Tri par catégorie ou par date (récent → ancien / ancien → récent)
- ✅ Couleurs automatiques : **vert** pour les montants positifs, **rouge** pour les négatifs

### Visualisation et analyse
- ✅ **Graphiques interactifs** (Chart.js) :
  - Camembert : répartition des dépenses par catégorie
  - Histogramme : évolution mensuelle des revenus et dépenses
- ✅ Cartes récapitulatives : Solde total, Revenus, Dépenses
- ✅ Solde fin de mois précédent (affiché automatiquement quand un mois est sélectionné)
- ✅ Résumé des totaux par catégorie (avec filtre par mois)
- ✅ Tableau comparatif mensuel sur 12 mois (année en cours)

### Filtres avancés
- ✅ Filtre par période (date de début → date de fin)
- ✅ Filtre par catégorie
- ✅ Filtre par type (Revenus / Dépenses)
- ✅ Filtre par montant (min / max)

### Budgets par catégorie
- ✅ Définition d'un budget mensuel par catégorie
- ✅ Barre de progression visuelle
- ✅ Indicateur de dépassement (alerte visuelle)
- ✅ Suppression d'un budget

### Barre d'actions rapide
- ✅ Barre flottante (sticky) avec 5 boutons icônes :
  - ➕ Ajouter une transaction
  - ✏️ Modifier la transaction sélectionnée
  - 🗑️ Supprimer la transaction sélectionnée
  - 📋 Dupliquer la transaction sélectionnée
  - 💾 Enregistrer (soumet la modale d'édition)

### Comptes épargne
- ✅ Création de comptes d'épargne personnalisés
- ✅ Opérations crédit/débit sur chaque compte
- ✅ Historique complet des opérations
- ✅ Suppression d'une opération avec recalcul automatique du solde
- ✅ Export CSV de l'historique
- ✅ Affichage en grille responsive
- ✅ Total général de l'épargne

### Tableau de bord des comptes
- ✅ Vue synthétique de tous les comptes actifs
- ✅ Solde actuel de chaque compte
- ✅ 3 derniers mouvements avec date, description et montant
- ✅ Bouton rafraîchir

### Utilitaires
- ✅ Duplication des transactions d'un mois vers un autre
- ✅ Export PDF de la vue principale
- ✅ Export PDF du tableau mensuel
- ✅ Export/Import des données (JSON) – sauvegarde complète
- ✅ Paramètres avancés (montant initial, devise, format d'affichage)
- ✅ Thème clair/sombre persistant
- ✅ 4 thèmes de couleurs prédéfinis (Vert, Bleu, Violet, Rouge)
- ✅ Bouton retour en haut de page
- ✅ Favicon (icône onglet)
- ✅ Progressive Web App (PWA) – installable et fonctionne hors ligne

### Interface utilisateur
- ✅ Responsive (mobile, tablette, desktop)
- ✅ Stockage local (LocalStorage) – aucune base de données requise
- ✅ Animations fluides et feedback visuel
