# Publicació a GitHub Pages

Publicat: https://dcarbonellcas-cmyk.github.io/el-meu-mapa/

El repositori és públic. Settings → Pages → Source: GitHub Actions. El workflow .github/workflows/pages.yml compila i comprova main, publica només public/ i respecta la regla existent que autoritza main a l’entorn github-pages.

La versió parteix de 51d3efd60aa3b4a689a2023432eed030bad54e60 i incorpora la preparació de pages-release, sense utilitzar la versió antiga de Netlify.

Comprovacions del 12/10/2026: compilació SCSS i npm run check superats localment i a GitHub Actions; 3.745 centres, 18 gestores i 64 entitats de lleure. Revisats els fitxers de les dues branques i els blobs històrics diferents: no s’han detectat CV, candidatures personals, tokens ni claus privades. El Client ID de Google és públic. L’historial conté el correu de l’autora dels commits.

Comprovada la pàgina publicada al navegador: navegació entre Inici, Infantil, Lleure, Ofertes, Candidatures, Per renovar i Documents; cerca de Badalona (43 centres amb els filtres inicials), fitxa de centre en vista local, mapa infantil amb punts i capes OpenStreetMap, 64 entitats de lleure i filtre de direcció/coordinació (22 resultats). Sense errors de consola en les comprovacions de producció. Les dades i els recursos es carreguen amb rutes relatives compatibles amb /el-meu-mapa/.

## Actualització automàtica

El workflow comprova i publica dades cada 6 hores (00:31, 06:31, 12:31 i 18:31 UTC, amb possibles retards de GitHub). L’execució es fa a GitHub Actions i funciona amb la pàgina tancada. Conserva la darrera còpia verificada al repositori; això també manté activitat i evita la desactivació del cron per 60 dies d’inactivitat. No s’han modificat les funcions ni la configuració del projecte actual de Netlify.

Fonts: directori anual oficial kvmv-ahh4, darrer curs disponible; concerts oficials 8spq-9nx7, darrer curs disponible (actualment 2024-2025, que no acredita la situació actual de cada concert); Feina Activa categoria educativa, totes les pàgines de 20 resultats. Les absències del directori d’infantil s’arxiven i es conserva el seguiment local: no s’interpreten com un tancament confirmat. Les 82 entitats sectorials no tenen sincronització automàtica.

Les ofertes es filtren per infantil i lleure, es descarten inscripcions tancades i caducitats conegudes. Un fallo de font conserva la còpia anterior i mostra l’error. El RSS de SEPE no ha respost a la prova inicial; es tornarà a provar a cada execució. LinkedIn, Indeed, InfoJobs i B4work només s’integren mitjançant alertes autoritzades de Gmail; no es garanteix exhaustivitat dels portals. Els exemples del 29/09/2026 ja no es mostren com ofertes vigents.

## Gmail privat

Preparat però pendent d’autorització de Google i Secrets de GitHub Actions: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN i GMAIL_FEED_KEY (32 bytes aleatoris en base64). Mai s’afegeixen al codi, als fitxers públics ni als logs. L’autorització només demana gmail.readonly; aquest procés no envia candidatures ni adjunts. Les alertes dels darrers 30 dies s’importen durant el cron i es publica exclusivament un sobre AES-256-GCM, sense correus, capçaleres o cossos en clar. La clau personal s’introdueix a “Obrir alertes privades” i només es manté en memòria durant la sessió.

Cal habilitar Gmail API, configurar OAuth amb accés offline i obtenir un refresh token. Si Google manté l’aplicació externa en mode de prova, l’autorització amb gmail.readonly pot caducar als 7 dies: configurar l’estat adequat abans de considerar-la desatesa. L’origen de Pages és https://dcarbonellcas-cmyk.github.io. No substituir ni retirar l’origen Netlify existent.

Validació: node --test scripts/sync.test.mjs, npm run build i npm run check. Es proven l’arxiu i la reaparició dels centres, els ID estables, l’error de font, les ofertes caducades i el xifrat autenticat de les alertes.
