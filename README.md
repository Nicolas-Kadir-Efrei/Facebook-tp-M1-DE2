# Lien PostMan

https://documenter.getpostman.com/view/43464791/2sBYHbrbJF

# My Social Networks API v2.0.0

API REST de refonte des services Facebook (événements, groupes, discussions, albums, sondages, billetterie, shopping list, covoiturage).

## Stack

- Node.js + Express
- Prisma + SQLite
- Tests Jest + Supertest
- Collection Postman (`postman/`)

## Démarrage

```bash
npm install
npx prisma db push
npm run db:seed   # optionnel
npm start         # http://localhost:3000
```

Mode développement (reload) :

```bash
npm run dev
```

## Tests

```bash
npm test
```

Les tests couvrent tous les modules CRUDS du cahier des charges (y compris le bonus covoiturage), sans frontend.

## Endpoints

| Ressource           | Base path          |
| ------------------- | ------------------ |
| Utilisateurs        | `/api/users`       |
| Événements          | `/api/events`      |
| Groupes             | `/api/groups`      |
| Discussions         | `/api/discussions` |
| Albums photo        | `/api/albums`      |
| Sondages            | `/api/polls`       |
| Billetterie         | `/api/tickets`     |
| Shopping list       | `/api/shopping`    |
| Covoiturage (bonus) | `/api/carpools`    |

Index : `GET /api`

## Documentation Postman

1. Ouvrir Postman → Import → `postman/My_Social_Networks_API.postman_collection.json`
2. Lancer le serveur (`npm start`)
3. Exécuter les requêtes dans l’ordre (créer users → groupe → événement → …)
4. Publier la collection : _Share_ → _Publish Docs_ → copier l’URL publique

## Règles métier principales

- Email utilisateur unique
- Événement : ≥1 organisateur, N participants
- Groupe : ≥1 admin, N membres ; types `PUBLIC` / `PRIVATE` / `SECRET`
- Fil de discussion lié à **1 groupe OU 1 événement**
- Sondage créé par un organisateur ; 1 réponse par question et par participant
- Billetterie : événements `PUBLIC` + `ticketingEnabled` ; 1 billet / email / événement
- Shopping list : nom unique par événement ; `shoppingListEnabled` requis
- Covoiturage : `carpoolingEnabled` requis
