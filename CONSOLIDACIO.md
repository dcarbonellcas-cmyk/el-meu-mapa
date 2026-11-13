# Aplicació unificada · 13 de novembre de 2026

Aplicació de referència: https://dcarbonellcas-cmyk.github.io/el-meu-mapa/
Repositori: https://github.com/dcarbonellcas-cmyk/el-meu-mapa · branca main.

## Funcions integrades

- Educació: Bressol, Infantil i Primària; directori, filtres, xarxes, borses i mini mapes.
- Lleure: entitats, serveis i cerca per proximitat.
- Ofertes: dades públiques diàries, filtres de vigència i estat de cada font.
- Candidatures: enviaments confirmats, respostes, notes, historial i renovacions.
- Calendari: entrevistes amb resultat, notes i seguiment mensual sense inventar dies. Les entrevistes es mostren també independentment del mes seleccionat.
- Documents: perfil, dos CV, carta de presentació i recomanació; còpia privada opcional a Drive. El currículum digital anterior es conserva com a enllaç extern.
- Portals: accessos agrupats per xarxa i estat privat d’inscripció; una alta no equival a un enviament a una vacant.
- Actualització al mòbil: comprovació de versió i botó «Actualitzar app», sense esborrar dades del navegador.

## Revisió de versions

S’han contrastat el repositori actual i les còpies locals el-meu-mapa, reparacions-mapa i mapa-actualitzacio-mobil. Les dues darreres contenen canvis ja publicats a main abans d’aquesta consolidació. La còpia més antiga no s’ha utilitzat per substituir fitxers actuals.

S’han comparat les branques remotes de calendari, adjunts, privacitat, sessió Google, mini mapes, textos de Primària i publicació. S’han mantingut com a historial: hi ha canvis incorporats mitjançant altres commits, de manera que una branca no fusionada no implica una funció absent. No s’han fusionat a cegues versions que retornarien codi antic.

Context revisat: «Problemes i automatització dels projectes», «Actualització mòbil del projecte», els darrers deu torns de «Búsqueda de feina · chat principal», «Repara la cerca de feina» i els informes locals de continuïtat. No és una lectura exhaustiva de tots els xats històrics ni de tots els serveis externs.

## Dades i sincronització

Les claus de localStorage, la base IndexedDB i els identificadors del directori es conserven. Les actualitzacions públiques no introdueixen entrevistes ni inscripcions personals per defecte. La fusió de seguiment conserva els esdeveniments diferents i les notes editades. A partir d’aquesta versió, corregir la data o el nom d’una entrevista manté la seva identitat, inclosos els registres antics editats des d’aquesta versió.

Drive sincronitza perfil, quatre documents i registres history_, status_, note_ i jobPortal_. Les còpies exactes dels correus i altres preferències locals no formen part d’aquesta sincronització. Cal utilitzar el mateix compte i comprovar la confirmació de sincronització abans de canviar de dispositiu. Un domini antic de Netlify té emmagatzematge diferent i necessita migració expressa; publicar una web no el transfereix.

La sessió persistent externa no ha completat la prova real d’autorització. La resposta inicial del servei és correcta, però això no acredita la connexió completa ni la renovació del token. La via directa de sessió continua disponible. No s’ha comprovat físicament un iPhone ni s’han modificat credencials de Google o Cloudflare.

## Automatització i límits

GitHub Actions comprova, actualitza i publica una vegada al dia a les 17:31 Europe/Madrid; també quan canvia main i sota execució manual. Pot haver-hi retards. El procés no crida cap model d’OpenAI. Requereix que GitHub i les fonts segueixin disponibles i respectar les quotes del servei.

Feina Activa i el directori oficial tenen una còpia conservada; si una font falla, s’indica l’error. SEPE continua amb error en la darrera còpia consultada. Les alertes privades diàries de Gmail estan pendents de credencials al workflow. Els portals externs no tenen cobertura exhaustiva i les inscripcions poden exigir passos propis. No s’envien candidatures automàticament.

Els recordatoris mensuals es mostren a l’app; no constitueixen avisos push ni esdeveniments creats a Google Calendar. No s’ha afegit una automatització nova de ChatGPT.

## Validació

63 proves automatitzades superades, compilació i comprovacions de sintaxi, rutes, coherència de dades i privacitat. Inclou regressions de fusió d’entrevistes editades en les dues direccions i de recordatoris sense dia conegut. La publicació conté únicament els recursos públics permesos; els informes personals es mantenen fora del repositori.
