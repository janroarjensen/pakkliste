# Pakkliste Lag-NM Golf - Spillerlenker

Denne versjonen bygger på V3 og legger til direkte spillerlenke.

## Spillerlenke

Hver spiller får en direkte lenke på formatet:

```text
https://dittdomene.no/index.html?spiller=PLAYER_ID
```

I admin-panelet får hver spiller egen knapp:

- Kopier lenke
- Åpne
- Lagre
- Slett

Det finnes også knapp over pakkelisten: **Kopier spillerlenke** for valgt spiller.

## Firebase

- Bruk `database.rules.json` som rules.
- Importer `seed-admins.json` eller legg admin-UID-er manuelt under `/admins`.
- Aktiver Authentication: Email/Password og Anonymous.

## Viktig

Spillerlenken er ikke hemmelig sikkerhet. Den er laget for enkel direkte tilgang til riktig pakkliste. Alle som har lenken kan se og krysse av for denne spilleren så lenge Firebase rules tillater innloggede/anonymous brukere å skrive checks.
