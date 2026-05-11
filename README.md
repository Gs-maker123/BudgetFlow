# BudgetFlow - Gestionnaire de budget personnel

Application web complète pour suivre vos revenus et dépenses, avec catégories, tableaux comparatifs, comptes épargne, barre d'actions rapide et bien plus.

![BudgetFlow](https://img.shields.io/badge/version-2.0-green.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Fonctionnalités

### Gestion des transactions
- ✅ Ajout, modification, suppression de transactions (revenus/dépenses)
- ✅ Catégories personnalisables avec suggestions
- ✅ Date de transaction (par défaut la date du jour)
- ✅ Réorganisation par glisser-déposer (drag & drop)
- ✅ Tri par catégorie ou par date (récent → ancien / ancien → récent)

### Visualisation et analyse
- ✅ Cartes récapitulatives : Solde total, Revenus, Dépenses
- ✅ Solde fin de mois précédent (affiché automatiquement quand un mois est sélectionné)
- ✅ Résumé des totaux par catégorie (avec filtre par mois)
- ✅ Tableau comparatif mensuel sur 12 mois (année en cours)
- ✅ Filtrage par mois (synchronisé avec toutes les vues)

### Barre d'actions rapide (nouvelle)
- ✅ Barre flottante (sticky) avec 5 boutons icônes :
  - ➕ Ajouter une transaction
  - ✏️ Modifier la transaction sélectionnée
  - 🗑️ Supprimer la transaction sélectionnée
  - 📋 Dupliquer la transaction sélectionnée
  - 💾 Enregistrer (soumet la modale d'édition)

### Comptes épargne
- ✅ Création de comptes d'épargne personnalisés
- ✅ Opérations crédit/débit sur chaque compte
- ✅ Affichage en grille responsive
- ✅ Total général de l'épargne

### Utilitaires
- ✅ Duplication des transactions d'un mois vers un autre
- ✅ Export PDF de la vue principale
- ✅ Export PDF du tableau mensuel
- ✅ Paramètres avancés (montant initial, devise, format d'affichage)
- ✅ Thème clair/sombre persistant
- ✅ Bouton retour en haut de page
- ✅ Favicon (icône onglet)
- ✅ Progressive Web App (PWA) – installable et fonctionne hors ligne

### Interface utilisateur
- ✅ Responsive (mobile, tablette, desktop)
- ✅ Stockage local (LocalStorage) – aucune base de données requise
- ✅ Animations fluides et feedback visuel

## 🚀 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Edge, Safari)
- Aucun serveur requis (fonctionne 100% en local)

### Méthode 1 : Téléchargement direct
1. Téléchargez tous les fichiers dans un même dossier
2. Ouvrez `index.html` dans votre navigateur

### Méthode 2 : Cloner le dépôt
```bash
git clone https://github.com/votre-utilisateur/BudgetFlow.git
cd BudgetFlow
open index.html
