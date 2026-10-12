# Publicació a GitHub Pages

Publicat: https://dcarbonellcas-cmyk.github.io/el-meu-mapa/

El repositori és públic. Settings → Pages → Source: GitHub Actions. El workflow .github/workflows/pages.yml compila i comprova main, publica només public/ i respecta la regla existent que autoritza main a l’entorn github-pages.

La versió parteix de 51d3efd60aa3b4a689a2023432eed030bad54e60 i incorpora la preparació de pages-release, sense utilitzar la versió antiga de Netlify.

Comprovacions del 12/10/2026: compilació SCSS i npm run check superats localment i a GitHub Actions; 3.745 centres, 18 gestores i 64 entitats de lleure. Revisats els fitxers de les dues branques i els blobs històrics diferents: no s’han detectat CV, candidatures personals, tokens ni claus privades. El Client ID de Google és públic. L’historial conté el correu de l’autora dels commits.

Comprovada la pàgina publicada al navegador: navegació entre Inici, Infantil, Lleure, Ofertes, Candidatures, Per renovar i Documents; cerca de Badalona (43 centres amb els filtres inicials), fitxa de centre en vista local, mapa infantil amb punts i capes OpenStreetMap, 64 entitats de lleure i filtre de direcció/coordinació (22 resultats). Sense errors de consola en les comprovacions de producció. Les dades i els recursos es carreguen amb rutes relatives compatibles amb /el-meu-mapa/.

GitHub Pages no executa netlify/functions/jobs-feed.mjs. La versió Pages evita consultar aquesta ruta i ofereix un avís quan se sol·licita l’actualització. La consulta automàtica de Feina Activa/SEPE necessita un servidor compatible. Les ofertes inicials daten del 29/09/2026 i poden haver caducat.

L’enviament Gmail i la importació d’alertes funcionen al navegador via OAuth i Gmail API en la implementació actual. Cal autoritzar l’origen https://dcarbonellcas-cmyk.github.io a Google Cloud, habilitar Gmail API i disposar dels permisos OAuth corresponents. Aquestes operacions no s’han provat amb el compte personal: no s’ha llegit Gmail ni enviat cap candidatura. La sincronització desatesa amb refresh tokens requeriria un servidor segur.

Els CV, cartes, notes i perfil es guarden al navegador. Canviar d’origen no transfereix les dades del domini Netlify: cal importar-les voluntàriament si es vol recuperar el seguiment.

No s’ha modificat ni eliminat el projecte actual de Netlify.
