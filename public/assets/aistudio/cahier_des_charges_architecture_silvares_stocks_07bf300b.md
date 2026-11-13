# Spécifications Fonctionnelles & Architecture - Silvares Stocks (SaaS Multi-boutiques)

## 1. Vision & Identité
- **Nom du SaaS** : Silvares Stocks
- **Cible** : Commerces de détail, supérettes, boutiques de prêt-à-porter, quincailleries, grossistes et réseaux multi-boutiques (Afrique francophone & international avec support Mobile Money & multidevise).
- **Positionnement** : SaaS Cloud moderne, rapide, utilisable au tactile ou clavier/douchette, avec isolation stricte des données (multi-tenant RLS).

---

## 2. Les 5 Modules Fondamentaux

### Module 1 : Vente & Comptoir (Point de Vente - POS)
- **Recherche & Scan** : Interface rapide avec recherche textuelle instantanée, lecture code-barres, sélecteur rapide par catégories et favoris.
- **Panier & Remises** : Gestion dynamique des quantités, remises en pourcentage ou montant fixe, gestion des taxes/TVA.
- **Paiements Multiples** : Espèces avec calcul de rendu, Mobile Money (Orange Money, Wave, MTN MoMo), Carte bancaire, Crédit client (dette/compte courant).
- **Tickets & Clôture** : Impression ticket 80mm/58mm et envoi WhatsApp/email, clôture journalière X et Z avec comptage physique des espèces.
- **Retours & Annulations** : Historique des tickets, retours avec motif obligatoire et réintégration automatique en stock.

### Module 2 : Gestion de Stocks & Entrepôts
- **Fiches Produits** : Code-barres/SKU, prix d'achat, prix de vente, marge calculée, TVA, seuil d'alerte critique, fournisseur principal, unité de mesure.
- **Mouvements Automatiques** : Décrémentation temps réel lors des ventes, entrées sur réceptions fournisseurs avec contrôle du coût unitaire moyen pondéré (CUMP).
- **Inventaire Physique** : Sessions d'inventaire périodique, pointage douchette, calcul automatique des écarts et régularisation traçable.
- **Transferts Multi-boutiques** : Bons d'expédition et bons de réception entre dépôts/points de vente.
- **Alertes de Rupture** : Badge d'alerte et notifications visuelles immédiates pour commande de réapprovisionnement.

### Module 3 : Analytics & Business Intelligence
- **Indicateurs Clés (KPIs)** : Chiffre d'Affaires (CA), Marge brute, Panier moyen, Volume de transactions, Rotation de stock.
- **Analyses Produits** : Matrice Pareto (Top 20% générant 80% du CA), produits dormants/morts, valorisation totale du stock.
- **Comparatifs Multi-boutiques** : Benchmark des performances par magasin et par période (J-1, M-1, N-1).

### Module 4 : Suivi des Commerciaux & Vendeurs
- **Performances par Vendeur** : CA réalisé, nombre de tickets, panier moyen individuel.
- **Objectifs & Commissions** : Définition des quotas mensuels, taux d'atteinte en temps réel, calcul des primes/commissions.
- **Sécurité Caisse** : Suivi des écarts de caisse individuels à chaque clôture de shift.
- **Classement & Gamification** : Leaderboard des meilleurs vendeurs du mois.

### Module 5 : Gestion des Dépenses & Rentabilité Nette
- **Saisie des Frais** : Catégories paramétrables (loyer, salaires, transport, factures eau/électricité, fournitures).
- **Circuit d'Approbation** : Workflow de validation (Brouillon -> En attente de validation gérant -> Validé/Payé).
- **Rapprochement Financier** : Vue synthétique Marge Brute vs Dépenses d'exploitation = Résultat net d'exploitation.

---

## 3. Architecture Technique & Modèle de Données

- **Multi-tenancy** : Architecture partagée avec `org_id` sur chaque table et Row Level Security (RLS) Supabase / PostgreSQL.
- **Tables Principales** :
  - `organisations`, `boutiques`, `utilisateurs`, `produits`, `mouvements_stock`
  - `ventes`, `lignes_vente`, `clients`, `fournisseurs`, `achats`, `depenses`, `objectifs`, `clotures_caisse`
- **Rôles & Permissions (RBAC)** :
  - *Propriétaire/Directrice* : Accès complet, analytics globaux, abonnements, suppression.
  - *Gérant* : Gestion de sa boutique, validation dépenses, réapprovisionnement, inventaires.
  - *Vendeur/Caissier* : Module caisse, recherche produit, tickets, consultation de son shift.
  - *Comptable* : Dépenses, marges, clôtures, exports fiscaux.

---

## 4. Feuille de Route & Écrans Proposés

Pour concrétiser l'application SaaS **Silvares Stocks**, nous créons une suite complète de 5 écrans professionnels interconnectés :
1. **Comptoir de Vente (POS / Caisse)** : Écran ultra-optimisé avec catalogue tactile, panier, multi-paiement rapide (Cash, Mobile Money Wave/Orange, CB), clavier numérique et gestion de ticket.
2. **Gestion de Stock & Fiche Produit** : Table de stock en temps réel, indicateurs d'alerte de rupture, filtres multi-boutiques, modal de mouvement/réception et valorisation.
3. **Tableau de Bord & Analytics (BI)** : Vue directionnelle avec KPIs (CA, Marge, Panier moyen), graphiques de tendances, comparatif inter-boutiques et Top produits.
4. **Performance Vendeurs & Commissions** : Suivi individuel des commerciaux, objectifs du mois, taux d'atteinte, leaderboard et suivi des écarts de caisse.
5. **Gestion des Dépenses & Résultat Net** : Journal des dépenses catégorisées, statut d'approbation et calcul instantané du compte de résultat simplifié (Marge - Dépenses = Net).
