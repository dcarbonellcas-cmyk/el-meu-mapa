// Membership rules are deliberately limited to verified names or institutional domains.
export const networkRules=[
 ['xarxa_fep',['FEP Bon Pastor','FEP Petit Santa Maria','FEP Sant Josep Oriol','FEP Mare de Déu de la Salut','FEP Santissima Trinitat','FEP Sant Medir','FEP Sant Ramon','FEP Mare Alfonsa Cavin','FEP Mare de Déu del Roser','FEP L’Esperança','FEP Santa Teresa de Lisieux','FEP Sant Jaume','FEP Tecla Sala'],[], 'https://fep.cat/escoles/'],
 ['xarxa_fedac',[],['fedac.cat'],'https://escoles.fedac.cat/escoles/'],
 ['xarxa_escolapia',[],['escolapia.cat'],'https://escolapia.cat/escoles/'],
 ['xarxa_vedruna',[],['vedruna.cat','vedrunacatalunya.cat'],'https://treballa.vedrunacatalunya.cat/troba-la-teva-escola/'],
 ['xarxa_jesuites',[],['fje.edu'],'https://www.fje.edu/ca/fje/treballa-la-fundacio-jesuites-educacio'],
 ['xarxa_maristes',[],['maristes.cat'],'https://www.maristes.cat/ca'],
 ['xarxa_lasalle',[],['lasalle.cat'],'https://lasalle.cat/'],
 ['xarxa_salesians',[],['salesians.cat'],'https://www.salesians.cat/'],
 ['xarxa_manyanet',[],['manyanet.org'],'https://manyanet.org/']
];
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().trim();
export function schoolNetwork(row){
 let host='';try{host=new URL(row.url).hostname.toLowerCase()}catch{}
 for(const [id,names,domains,source] of networkRules){
  if(names.some(n=>norm(n)===norm(row.denominaci_completa))||domains.some(d=>host===d||host.endsWith('.'+d)))return {networkId:id,networkSource:source};
 }
 return {};
}
