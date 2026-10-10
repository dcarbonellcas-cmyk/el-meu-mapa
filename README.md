# El meu mapa d’escoles

Mapa de centres d’educació infantil i entitats de lleure de Catalunya, amb seguiment local de candidatures, documents, ofertes i connexió opcional a Gmail.

## Estructura

```text
index.html
assets/
  css/styles.css
  js/
    app.js                     # Càrrega ordenada de dades i scripts
    mapes.js                   # Mapa i filtres de centres
    infantil.js                # Entitats gestores
    lleure.js                  # Entitats i mapa de lleure
    ofertes.js                 # Ofertes, filtres i fonts públiques
    candidatures.js            # Tauler de centres
    candidatures-entitats.js   # Seguiment d’entitats
    documents.js               # Documents i esborranys locals
    gmail.js                   # Enviament i importació amb OAuth
    navegacio.js               # Navegació i resum
    historial.js               # Importació voluntària d’historial local
    perfil.js                  # Nom i formació guardats al navegador
    fonts.js                   # Comprovació de fonts
  data/
    centres.json
    entitats.json
    dades-local.js             # Còpia generada per a vista file://
netlify/functions/jobs-feed.mjs
netlify.toml
scripts/build.mjs
scripts/check.mjs
package.json
```

## Vista local

Pots obrir `index.html` directament: la còpia `dades-local.js` permet carregar les dades sense servidor. Cal Internet per a Leaflet, les capes del mapa i Google.

Amb Node.js 20 o superior, executa `npm run build` després de canviar les dades JSON. Això actualitza la còpia local i prepara `public/`, que només conté l’HTML i els recursos de la web. `npm run check` comprova sintaxi, rutes, estructura de dades i absència de secrets coneguts.

## Privacitat i migració

Els estats, notes, ofertes importades de Gmail i dades del perfil es guarden en `localStorage`; els CV i les cartes, en IndexedDB. Es conserven les claus i els identificadors originals. Aquest emmagatzematge pertany al navegador i a l’origen de la web: canviar de domini no transfereix les dades automàticament.

La còpia local conté `private/candidatures-legacy.json` i `private/perfil.json`, exclosos de GitHub i de `public/`. Per recuperar-los, importa el perfil a **Els meus documents** i l’historial a **El meu Excel antic**. El repositori nou no inclou cap historial, nom de candidata, qualificació personal, CV ni carta.

`work/` conserva la versió original només com a còpia local i està exclosa del repositori. No pugis la carpeta completa manualment a cap allotjament: conté còpies i dades privades. La compilació prepara únicament els fitxers permesos a `public/`.

## Gmail

El Client ID OAuth de Google del projecte original es conserva a `assets/js/gmail.js`. És un identificador públic, no un secret. No hi ha Client Secret ni tokens guardats al codi. Els tokens només s’utilitzen durant l’autorització del navegador. Per fer servir Gmail en un domini nou, cal afegir l’origen HTTPS autoritzat a la configuració OAuth de Google i mantenir habilitada l’API de Gmail. L’enviament continua requerint la confirmació de l’usuari.

## Netlify

La configuració queda preparada amb `npm run build`, directori de publicació `public` i funcions a `netlify/functions`. **No s’ha fet cap desplegament ni s’ha connectat el repositori a Netlify.** El servidor local estàtic no executa la funció `jobs-feed`; aquesta necessita l’entorn Netlify. Les ofertes inicials provenen de la versió del 29 de setembre de 2026 i poden haver caducat.

## Dades

La reorganització conserva 3.745 centres, 18 entitats gestores i 64 entitats de lleure, amb els contactes dels centres i entitats de la versió original. No s’ha fet una nova verificació externa dels contactes o de les ofertes.
