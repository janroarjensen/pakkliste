# Pakkliste Lag-NM Golf - Firebase Produksjon v1.3.0

## Filer som skal ligge i GitHub root
- index.html
- app.js
- style.css
- firebase.js
- README.md

## Filer som brukes i Firebase
- database.rules.json → Firebase Console → Realtime Database → Rules
- seed-admins.json → Firebase Console → Realtime Database → Data → Import JSON

## Firebase-oppsett
1. Authentication → Sign-in method → aktiver Email/Password.
2. Authentication → Sign-in method → aktiver Anonymous.
3. Realtime Database → Rules → lim inn database.rules.json.
4. Realtime Database → Data → importer seed-admins.json, eller legg inn egen UID under /admins.

## Funksjoner
- Firebase sync
- Admin via UID
- PIN per spiller
- Spillerlenker
- Import tekstliste
- Import JSON backup
- Export JSON backup
- Progress bar per spiller i Admin
- Versjonsnummer i footer fra app.js
