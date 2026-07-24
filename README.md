# BudgetFlow - Gestionnaire de budget personnel

Application web complète pour suivre vos revenus et dépenses, avec catégories, tableaux comparatifs, comptes épargne, budgets, graphiques, calendrier et bien plus.

![BudgetFlow](https://img.shields.io/badge/version-4.0-green.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Fonctionnalités

### Navigation
- ✅ **Menu déroulant** avec 8 vues intégrées
- ✅ Navigation fluide sans rechargement de page
- ✅ Vue active mise en évidence

### Gestion des transactions
- ✅ Ajout, modification, suppression de transactions (revenus/dépenses)
- ✅ Catégories personnalisables avec suggestions
- ✅ Date de transaction (par défaut la date du jour)
- ✅ **Transaction récurrente** : marquez une transaction comme récurrente
- ✅ **Vue récurrentes** : liste complète des transactions récurrentes
- ✅ Réorganisation par glisser-déposer (drag & drop)
- ✅ Tri par catégorie ou par date (récent → ancien / ancien → récent)
- ✅ Couleurs automatiques : **vert** pour les montants positifs, **rouge** pour les négatifs

### Vues disponibles

| Vue | Icône | Description |
|-----|-------|-------------|
| **Tableau de bord** | 📊 | Résumé général avec cartes, graphiques, budget et 10 dernières transactions |
| **Calendrier** | 📅 | Calendrier interactif des transactions avec solde journalier |
| **Vue 12 mois** | 📈 | Tableau croisé catégories × mois avec export PDF |
| **Transactions** | 💰 | Liste complète avec filtres avancés et actions rapides |
| **Épargne** | 🐷 | Comptes d'épargne, objectifs, transferts, historique |
| **Récurrentes** | 🔄 | Gestion des transactions récurrentes |
| **Graphiques** | 📊 | Analyse complète avec 3 graphiques interactifs |
| **Paramètres** | ⚙️ | Configuration de l'application |

### Filtres avancés
- ✅ Filtre par période (date de début → date de fin)
- ✅ Filtre par catégorie
- ✅ Filtre par type (Revenus / Dépenses)
- ✅ Filtre par montant (min / max)
- ✅ Filtre par mois (synchronisé avec toutes les vues)

### Visualisation et analyse
- ✅ **3 graphiques interactifs** (Chart.js) :
  - Camembert : répartition des dépenses par catégorie
  - Histogramme : évolution mensuelle des revenus et dépenses
  - Courbe : évolution du solde cumulé
- ✅ Cartes récapitulatives : Solde total, Revenus, Dépenses
- ✅ Solde fin de mois précédent (affiché automatiquement quand un mois est sélectionné)
- ✅ Résumé des totaux par catégorie (avec filtre par mois)
- ✅ Tableau comparatif mensuel sur 12 mois (année en cours)

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
- ✅ **Objectifs d'épargne** : définir un nom, montant cible, date limite et taux d'intérêt
- ✅ **Transferts entre comptes** : déplacer de l'argent d'un compte à un autre
- ✅ **Taux d'intérêt** : calcul automatique du rendement annuel estimé
- ✅ **Statistiques globales** : total épargné, rendement estimé, objectifs atteints
- ✅ Export CSV de l'historique
- ✅ Affichage en grille responsive

### Tableau de bord des comptes
- ✅ Vue synthétique de tous les comptes actifs
- ✅ Solde actuel de chaque compte
- ✅ 3 derniers mouvements avec date, description et montant
- ✅ Bouton rafraîchir

### Utilitaires
- ✅ Duplication des transactions d'un mois vers un autre
- ✅ Option "Dupliquer uniquement les transactions récurrentes"
- ✅ Export PDF de la vue principale
- ✅ Export PDF du tableau mensuel
- ✅ Export/Import des données (JSON) – sauvegarde complète
- ✅ Export CSV de l'historique épargne
- ✅ Paramètres avancés (montant initial, devise, format d'affichage)
- ✅ **4 thèmes de couleurs** prédéfinis (Vert, Bleu, Violet, Rouge)
- ✅ Thème clair/sombre persistant
- ✅ Bouton retour en haut de page
- ✅ Favicon (icône onglet)
- ✅ Progressive Web App (PWA) – installable et fonctionne hors ligne

### Interface utilisateur
- ✅ Responsive (mobile, tablette, desktop)
- ✅ Stockage local (LocalStorage) – aucune base de données requise
- ✅ Animations fluides et feedback visuel
