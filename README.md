# Pakkliste Lag-NM Golf - V8 PIN og spillerlenker

Dette bygger videre på versjonen der Admin-knappen og Firebase fungerer.

## GitHub-filer
Legg disse i root:
- index.html
- app.js
- style.css
- firebase.js
- README.md

## Firebase rules
Lim inn `database.rules.json` i Firebase Console → Realtime Database → Rules.

## Nytt i denne versjonen
- PIN-lås på spillerliste
- Spillerlenke via ?spiller=PLAYER_ID
- Kopier spillerlenke med PIN
- Endre navn/PIN i admin
- Generer ny PIN i admin
- Admin-knappen er fortsatt enkel og stabil: onclick="toggleAdmin()"
