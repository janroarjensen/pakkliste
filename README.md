# Pakkliste Lag-NM Golf - V15 Firebase Edit

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

## Nytt i v1.5.0
- Redigering av pakkepunkter i admin
- Lagre/slett pakkepunkter
- Firebase sync beholdt
- Progress bar per spiller i admin
- Import/export beholdt
- Versjon i footer fra app.js
