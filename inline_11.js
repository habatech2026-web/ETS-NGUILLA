
/*DOUBLONS-V9 : détection + garde-fous anti-doublons*/
(function(){
'use strict';
function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function tel8(s){var d=String(s==null?'':s).replace(/\D+/g,'');return d.length>=8?d.slice(-8):'';}
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function group(arr,keyFn){var m={};arr.forEach(function(x){var k=keyFn(x);if(!k)return;(m[k]=m[k]||[]).push(x);});return Object.keys(m).filter(function(k){return m[k].length>1;}).map(function(k){return {key:k,items:m[k]};});}
window.findDuplicates=function(){
  var out=[];
  function add(sev,table,why,g,label){g.forEach(function(x){out.push({sev:sev,table:table,why:why,items:x.items.map(label)});});}
  var T=['produits','mouvements','ventes','commandes','fournisseurs','clients','depenses','utilisateurs','categories','journal'];
  T.forEach(function(t){add(3,t,'ID identique',group(D[t]||[],function(x){return x.id==null?'':String(x.id);}),function(x){return '#'+x.id+' '+(x.designation||x.nom||x.num||x.libelle||x.email||x.detail||'');});});
  add(2,'produits','Même désignation',group(D.produits,function(x){return norm(x.designation);}),function(x){return '#'+x.id+' '+x.code+' · '+x.designation+' (stock '+x.stock+')';});
  add(2,'produits','Même code',group(D.produits,function(x){return String(x.code||'').toUpperCase();}),function(x){return '#'+x.id+' '+x.code+' · '+x.designation;});
  add(2,'clients','Même nom',group(D.clients,function(x){return norm(x.nom);}),function(x){return '#'+x.id+' '+x.nom+' '+(x.tel||'')+' (dette '+(x.dette||0)+')';});
  add(2,'clients','Même téléphone',group(D.clients,function(x){return tel8(x.tel);}),function(x){return '#'+x.id+' '+x.nom+' '+(x.tel||'');});
  add(2,'fournisseurs','Même nom',group(D.fournisseurs,function(x){return norm(x.nom);}),function(x){return '#'+x.id+' '+x.nom;});
  add(2,'utilisateurs','Même e-mail',group(D.utilisateurs,function(x){return String(x.email||'').toLowerCase();}),function(x){return '#'+x.id+' '+x.nom+' <'+x.email+'>';});
  add(2,'categories','Même slug ou nom',group(D.categories,function(x){return norm(x.nom);}).concat(group(D.categories,function(x){return x.slug;})),function(x){return '#'+x.id+' '+x.nom+' ('+x.slug+')';});
  add(2,'ventes','Même numéro',group(D.ventes,function(x){return String(x.num||'').toUpperCase();}),function(x){return '#'+x.id+' '+x.num+' · '+x.montant+' GNF · '+x.date;});
  add(2,'commandes','Même numéro',group(D.commandes,function(x){return String(x.num||'').toUpperCase();}),function(x){return '#'+x.id+' '+x.num+' · '+x.fourn;});
  add(1,'ventes','Vente identique à la même minute (double clic ?)',group(D.ventes,function(x){return [String(x.date||'').slice(0,16),x.montant,x.paiement,x.articles].join('|');}),function(x){return '#'+x.id+' '+x.num+' · '+x.montant+' GNF · '+x.date;});
  add(1,'mouvements','Mouvement identique à la même minute (double clic ?)',group(D.mouvements,function(x){return [String(x.date||'').slice(0,16),x.type,x.produit_id,x.qte,x.ref].join('|');}),function(x){return '#'+x.id+' '+x.type+' '+x.qte+' × '+x.produit+' · '+x.date;});
  add(1,'depenses','Dépense identique le même jour',group(D.depenses,function(x){return [x.date,norm(x.libelle),x.montant].join('|');}),function(x){return '#'+x.id+' '+x.libelle+' · '+x.montant+' GNF · '+x.date;});
  out.sort(function(a,b){return b.sev-a.sev;});
  return out;
};
window.runDupScan=function(){
  var el=document.getElementById('dup-result');if(!el)return;
  var r=findDuplicates();
  if(!r.length){el.innerHTML='<div style="color:var(--green,#10b981);font-weight:700">✅ Aucun doublon détecté.</div>';return;}
  var col={3:'var(--red,#ef4444)',2:'var(--orange,#f59e0b)',1:'var(--text3,#94a3b8)'},lab={3:'CRITIQUE',2:'À VÉRIFIER',1:'SUSPECT'};
  el.innerHTML='<div style="font-weight:700;margin-bottom:8px">'+r.length+' groupe(s) de doublons</div>'+r.map(function(g){
    return '<div style="border-left:3px solid '+col[g.sev]+';padding:6px 10px;margin-bottom:8px;background:rgba(255,255,255,.03);border-radius:6px"><div style="font-size:11px;font-weight:700;color:'+col[g.sev]+'">'+lab[g.sev]+' · '+E(g.table)+' · '+E(g.why)+'</div>'+g.items.map(function(i){return '<div style="font-size:12px;margin-top:3px">'+E(i)+'</div>';}).join('')+'</div>';
  }).join('');
};
/* ── garde-fous : confirmation si doublon probable + anti double clic ── */
var busy={};
function guard(name,check){
  var orig=window[name];if(typeof orig!=='function')return;
  window[name]=function(){
    if(busy[name])return;
    try{if(check&&check()===false)return;}catch(e){console.warn('garde-fou',e);}
    busy[name]=true;var out;
    try{out=orig.apply(this,arguments);}catch(e){busy[name]=false;throw e;}
    Promise.resolve(out).then(function(){setTimeout(function(){busy[name]=false;},700);},function(){busy[name]=false;});
    return out;
  };
}
function val(id){var e=document.getElementById(id);return e?e.value:'';}
guard('saveProduit',function(){
  var des=norm(val('p-des'));if(!des)return true;var id=val('p-id');
  var d=D.produits.find(function(x){return norm(x.designation)===des&&String(x.id)!==String(id);});
  if(d)return confirm('Un produit « '+d.designation+' » existe déjà (code '+d.code+', stock '+d.stock+').\n\nEnregistrer quand même ce doublon ?');
  return true;
});
guard('saveClient',function(){
  var nom=norm(val('cl-nom')),t=tel8(val('cl-tel')),id=val('cl-id');if(!nom)return true;
  var d=D.clients.find(function(x){return String(x.id)!==String(id)&&(norm(x.nom)===nom||(t&&tel8(x.tel)===t));});
  if(d)return confirm('Un client similaire existe déjà : « '+d.nom+' » '+(d.tel||'')+'.\n\nEnregistrer quand même ce doublon ?');
  return true;
});
guard('saveFourn',function(){
  var nom=norm(val('f-nom'));if(!nom)return true;
  var d=D.fournisseurs.find(function(x){return norm(x.nom)===nom;});
  if(d)return confirm('Le fournisseur « '+d.nom+' » existe déjà.\n\nL’ajouter quand même ?');
  return true;
});
guard('saveCmd');
})();
