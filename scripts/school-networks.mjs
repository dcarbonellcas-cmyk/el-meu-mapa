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

// Official centre IDs disambiguate shared names and obsolete directory domains.
// Membership in an educational network does not necessarily mean common ownership.
const verifiedRosters=[
 ['xarxa_manyanet','https://manyanet.org/colegios/',['08009673','08008462','08014590','08021417','08031401','17000512','43002429']],
 ['xarxa_betlem','https://escolesbetlem.com/en/work-with-us/',['08036986','08063655']],
 ['xarxa_nordanglia','https://www.hamelinschool.com/careers',['08051239']],
 ['xarxa_maristes','https://www.maristes.cat/ca/noticies/acord-entre-la-caseta-dels-infants-i-fundacio-champagnat-maristes-catalunya',['17007646']],
 ['xarxa_escolapies','https://fundacioescolapies.org/oferta-educativa/',['08005382','08007858','08019575','08020772','08022410','08024613','17001206']],
 ['xarxa_lasalle','https://lasalle.cat/educacio/educacio-obligatoria/',['08005102','08007032','08025745']],
 ['xarxa_fedac','https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4',['08015272','08070520']],
 ['xarxa_vedruna','https://vedruna.cat/oferta-educativa/',[
 '08000220','08005618','08006908','08010341','08014656','08015545','08016203','08019915','08019976','08020383','08022276','08022288','08024248','08024339','08024984','08025459','08027353','08029611','08030111','08030431','08030509','08030546','08030947','08031381','17000184','17001553','17002511','17002570','17002594','17002892','17003021','25000821','25001023','25003196','25004486','43001048','43003021','43003549','43004591','43000755']],
 ['xarxa_maristes','https://www.maristes.cat/ca/escoles',[
 '08000700','08003361','08005564','08006532','08019541','08019903','08021144','08023724','17001589','25002313']],
 ['xarxa_escolapia','https://escolapia.cat/escoles/',[
 '08004286','08005242','08005746','08007445','08009636','08011941','08015041','08015120','08017785','08019502','08021107','08022100','08024297','08029076','08029647','08031538','17002341','17010281','25000811','25004474']]
];

const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLowerCase().trim();
export function schoolNetwork(row){
 const centreId=String(row.codi_centre||'').replace(/^0+/, '');
 for(const [networkId,networkSource,ids] of verifiedRosters){if(ids.some(x=>x.replace(/^0+/, '')===centreId))return {networkId,networkSource};}
 let host='';try{host=new URL(row.url).hostname.toLowerCase()}catch{}
 for(const [id,names,domains,source] of networkRules){
  if(names.some(n=>norm(n)===norm(row.denominaci_completa))||domains.some(d=>host===d||host.endsWith('.'+d)))return {networkId:id,networkSource:source};
 }
 return {};
}
