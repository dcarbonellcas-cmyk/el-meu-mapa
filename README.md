# El meu mapa d’escoles

Aplicació unificada de Buscar feina: [obrir la web](https://dcarbonellcas-cmyk.github.io/el-meu-mapa/). Consulta [la consolidació i els límits comprovats](CONSOLIDACIO.md). La branca de referència és `main`.

Mapa de centres d’educació infantil i primària i entitats de lleure de Catalunya, amb seguiment local de candidatures, documents, ofertes i connexió opcional a Gmail.

## Estructura

```text
index.html
assets/
  scss/styles.scss            # Fuente SCSS por secciones y variables
  css/styles.css              # CSS generado para el navegador
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

Amb Node.js 20 o superior, instal·la les dependències amb `pnpm install --frozen-lockfile` (o `npm install`). Executa `npm run build` després de canviar les dades JSON o els estils SCSS. Això compila el SCSS, actualitza la còpia local i prepara `public/`, que només conté l’HTML i els recursos de la web. `npm run check` comprova sintaxi, rutes, estructura de dades i absència de secrets coneguts.

## Estils SCSS

Edita `assets/scss/styles.scss` i els parcials de la mateixa carpeta: base, ofertes, lleure, gestores, infantil-tabs, inici, infantil i perfil. `_variables.scss` centralitza els colors compartits. L’ordre dels mòduls manté la cascada original.

- `npm run styles`: genera `assets/css/styles.css`.
- `npm run styles:watch`: recompila els estils mentre els edites.
- `npm run build`: compila els estils i prepara la web.

El navegador continua carregant CSS. El CSS generat es conserva al repositori perquè també funcioni la vista directa amb `index.html`. No l’editis manualment: els canvis es fan al SCSS. La carpeta `public/` rep només CSS, JavaScript i dades; els fonts SCSS no es copien a la web. `pnpm-lock.yaml` fixa les dependències de Sass. La compilació no necessita el complement natiu opcional de vigilància de fitxers.

## Privacitat i migració

Els estats, notes, ofertes importades de Gmail i dades del perfil es guarden en `localStorage`; els CV i les cartes, en IndexedDB. Es conserven les claus i els identificadors originals. Aquest emmagatzematge pertany al navegador i a l’origen de la web: canviar de domini no transfereix les dades automàticament.

Les còpies antigues poden contenir `private/candidatures-legacy.json` i `private/perfil.json`, exclosos de GitHub i de `public/`. Si disposes d’aquests fitxers, importa el perfil a **Els meus documents** i l’historial a **El meu Excel antic**. El repositori nou no inclou cap historial, nom de candidata, qualificació personal, CV ni carta.

`work/` conserva la versió original només com a còpia local i està exclosa del repositori. No pugis la carpeta completa manualment a cap allotjament: conté còpies i dades privades. La compilació prepara únicament els fitxers permesos a `public/`.

## Gmail

El Client ID OAuth de Google del projecte original es conserva a `assets/js/gmail.js`. És un identificador públic, no un secret. No hi ha Client Secret ni tokens guardats al codi. Els tokens només s’utilitzen durant l’autorització del navegador. Per fer servir Gmail en un domini nou, cal afegir l’origen HTTPS autoritzat a la configuració OAuth de Google i mantenir habilitada l’API de Gmail. L’enviament continua requerint la confirmació de l’usuari.

## Netlify

La configuració queda preparada amb `npm run build`, directori de publicació `public` i funcions a `netlify/functions`. **No s’ha fet cap desplegament ni s’ha connectat el repositori a Netlify.** El servidor local estàtic no executa la funció `jobs-feed`; aquesta necessita l’entorn Netlify. Les ofertes inicials provenen de la versió del 29 de setembre de 2026 i poden haver caducat.

## Dades

La versió automatitzada consulta el directori oficial i Feina Activa una vegada al dia a les 17:31 (Europe/Madrid). El nombre de centres i ofertes varia segons les fonts. Les entitats i els canals de candidatura es revisen per separat; no es considera que totes les webs continguin una borsa pròpia. Consulta GITHUB_PAGES.md per veure la cobertura, l’estat de SEPE i la connexió privada de Gmail.

## Cerca docent i xarxes

Educació separa Bressol, Infantil i Primària, amb escoles per proximitat a Teià, xarxes amb els centres vinculats i accessos a les borses. El directori oficial del curs 2026/2027 inclou 3.760 centres amb alguna d’aquestes etapes; 2.347 imparteixen Primària. No és una garantia de cobertura en temps real.

Les relacions de xarxa són parcials: només s’assignen quan coincideixen amb una llista contrastada o un domini institucional. Les fonts són a `scripts/school-networks.mjs`. La FEP utilitza la borsa FECC; la FECC no és la titular de totes les escoles adherides. Un web de centre no implica que s’hi hagi verificat una borsa pròpia.

Els esborranys no queden buits si falta l’experiència privada del dispositiu: es prepara un text complet que no inventa trajectòria ni titulacions. El perfil i els documents continuen sent privats; recuperar-los entre dispositius requereix autoritzar la sincronització. Una inscripció a una borsa no equival a una candidatura enviada ni a un compte confirmat.

Revisió de xarxes de novembre de 2026: 153 centres vinculats amb fonts explícites, inclosos els centres de Vedruna, Maristes, Escola Pia i Escolàpies contrastats. SalleJob i Salesians SMX tenen accessos directes al seu portal de feina. Els estats personals d’inscripció es desen al navegador i opcionalment a la còpia privada de Drive; no hi ha inscripcions predefinides al codi públic.

La còpia privada de Drive inclou el perfil, els quatre documents, els estats de les borses, l’historial, els estats i les notes de seguiment. Les dates dels canvis es comparen per registre i els historials es fusionen sense eliminar enviaments de l’altre dispositiu. Requereix connectar el mateix compte en cada navegador. Les còpies exactes dels correus arxivats continuen locals.

## Mòbil i còpia privada sense Google

Documents ofereix una còpia portàtil xifrada amb contrasenya (mínim 12 caràcters). Inclou perfil, quatre documents, seguiment, entrevistes, inscripcions i historial antic. Exclou credencials i sessions OAuth. La importació valida el contingut abans d’escriure, combina els historials i conserva els documents més recents; un error de la base de dades retorna els valors previs del seguiment. La contrasenya no es desa ni es pot recuperar. No és sincronització automàtica: cal passar i importar una còpia nova quan es vulguin traslladar canvis.

A l’iPhone, cal importar dins de l’espai que s’utilitzarà: si es farà servir la icona de la pantalla d’inici, crear-la primer amb l’adreça de GitHub i carregar la còpia des d’aquella icona. Les dades del navegador poden quedar separades de les de l’app instal·lada. La connexió antiga amb Google es conserva com a opció; aquesta via manual no la necessita.

La capçalera es mesura automàticament; els controls i Documents s’adapten a pantalles petites. Revisades Inici, Educació, Documents, Candidatures i Calendari a 320 px sense desbordament horitzontal, i Educació i Documents a 375 px. Aquesta simulació no acredita una prova física d’iPhone ni de la icona instal·lada.
