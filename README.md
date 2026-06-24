# Pakkliste Lag-NM Golf V6

Denne pakken er klar for GitHub Pages + Firebase.

## Filer og hvor de skal ligge

### GitHub repo - root / toppnivå
Disse filene skal ligge rett i repoet, samme sted som `index.html`:

```text
index.html
style.css
app.js
firebase.js
manifest.webmanifest
service-worker.js
README.md
```

Eksempel:

```text
pakkliste-lagnm/
├── index.html
├── style.css
├── app.js
├── firebase.js
├── manifest.webmanifest
├── service-worker.js
└── README.md
```

### Firebase Console - Realtime Database → Rules
Innholdet fra denne fila limes inn under Rules:

```text
database.rules.json
```

### Firebase Console - Realtime Database → Data
Dette er datafiler som kan importeres i Firebase:

```text
seed-admins.json
seed-example-data.json
```

- `seed-admins.json` inneholder bare admin UID-er.
- `seed-example-data.json` inneholder admin UID-er, eksempelspillere og eksempel-pakkeliste.

## Firebase-oppsett

1. Opprett eller åpne Firebase-prosjektet.
2. Gå til Authentication → Sign-in method.
3. Aktiver Email/Password.
4. Aktiver Anonymous.
5. Gå til Realtime Database.
6. Opprett database hvis den ikke finnes.
7. Lim inn rules fra `database.rules.json`.
8. Importer `seed-admins.json` under Data, eller legg inn admin manuelt:

```json
{
  "admins": {
    "DIN_UID": true
  }
}
```

## GitHub Pages

1. Last opp alle GitHub-filene i root.
2. Gå til Settings → Pages.
3. Velg branch `main` og folder `/root`.
4. Åpne GitHub Pages-lenken.

## Admin

Admin-bruker må være opprettet i Firebase Authentication med Email/Password.
Etter innlogging må UID ligge under `/admins` i Realtime Database.

## Spillerlenke

Appen lager lenker slik:

```text
https://din-side.no/index.html?spiller=PLAYER_ID
```

I admin-panelet kan du kopiere én spillerlenke eller alle lenker med PIN.

## Viktig om PIN

PIN beskytter i brukergrensesnittet og er praktisk for foreldre/juniorer. PIN ligger i Realtime Database sammen med spillerdata, så dette er ikke bank-sikkerhet. For dette formålet gir det enkel og fin kontroll på at foreldre/juniorer åpner riktig liste.
