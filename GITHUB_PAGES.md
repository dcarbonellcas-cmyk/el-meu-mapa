# Publicació a GitHub Pages

Branca pages-release, basada en 51d3efd60aa3b4a689a2023432eed030bad54e60 (última versió de main).

El workflow .github/workflows/pages.yml compila i comprova el projecte i publica només public/. Cal configurar Settings → Pages → Source: GitHub Actions. El connector utilitzat no permet canviar la visibilitat del repositori ni activar Pages.

URL prevista (pendent de publicació): https://dcarbonellcas-cmyk.github.io/el-meu-mapa/

Comprovacions locals superades: npm run build i npm run check. 3.745 centres, 18 gestores i 64 entitats de lleure. Revisats els tres commits i els blobs històrics diferents: no s'han detectat CV, candidatures personals, tokens ni claus privades. El Client ID de Google és públic. L'historial de commits conté el correu de l'autora.

Les rutes dels recursos i JSON són relatives i compatibles amb /el-meu-mapa/. La prova real de navegació, mapes i capes externes al navegador queda pendent: aquest entorn no disposa d'un Chromium executable.

GitHub Pages no executa netlify/functions/jobs-feed.mjs. La versió Pages mostra un avís i evita consultar una ruta de servidor inexistent. Les ofertes inicials daten del 29/09/2026 i poden haver caducat.

L'enviament Gmail i la importació d'alertes es fan al navegador via OAuth i Gmail API; no requereixen servidor propi en la implementació actual. Cal autoritzar l'origen https://dcarbonellcas-cmyk.github.io a Google Cloud, tenir Gmail API habilitada i disposar dels permisos OAuth corresponents. No s'ha enviat cap correu ni llegit Gmail. Una sincronització desatesa amb refresh tokens necessitaria un servidor segur.

Els CV, cartes, notes i perfil es guarden al navegador. El canvi d'origen no transfereix les dades del domini Netlify.

No s'ha modificat main ni el projecte Netlify.
