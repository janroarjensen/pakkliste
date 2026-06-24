# Pakkliste Lag-NM Golf - Firebase stabil

Dette er neste steg etter clean-versjonen der Admin-knappen fungerer.

## Filer til GitHub
Legg disse i root/samme mappe:

- index.html
- app.js
- style.css
- firebase.js

## Firebase
Lim inn `database.rules.json` i:
Firebase Console → Realtime Database → Rules

Dette er åpne testregler:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Viktig
Admin-knappen bruker fortsatt enkel `onclick="toggleAdmin()"` og er ikke avhengig av Firebase.

## Test
1. Last opp filene til GitHub
2. Åpne GitHub Pages
3. Trykk Admin
4. Legg til spiller
5. Sjekk at spilleren dukker opp i Firebase Realtime Database
