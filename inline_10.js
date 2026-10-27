
/*LOCAL-V8 : stockage durable (IndexedDB), sauvegarde/restauration, comptes locaux*/
(function(){
'use strict';
var MIR=function(k){return /^db_/.test(k)||k==='sync_outbox'||k==='local_users';};
var TBL=Object.assign({},SYNC_T,{journal:'db_j'});
var KEY2T={};Object.keys(TBL).forEach(function(t){KEY2T[TBL[t]]=t;});
var IDB_OK=false,dbp=null;
function idb(){
  if(dbp)return dbp;
  dbp=new Promise(function(res,rej){
    if(!window.indexedDB){rej(new Error('IndexedDB indisponible'));return;}
    var r=indexedDB.open('ets_local',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
    r.onsuccess=function(){IDB_OK=true;res(r.result);};
    r.onerror=function(){rej(r.error);};
  });
  dbp.catch(function(){});
  return dbp;
}
function tx(mode,fn){
  return idb().then(function(db){return new Promise(function(res,rej){
    var t=db.transaction('kv',mode),out=fn(t.objectStore('kv'));
    t.oncomplete=function(){res(out&&out.result);};
    t.onerror=t.onabort=function(){rej(t.error);};
  });});
}
/* appelé par le patch de Storage.setItem : renvoie l'horodatage si la clé est dupliquée dans IndexedDB */
window.idbMirror=function(k,v){
  if(!MIR(k)||!IDB_OK)return 0;
  var ts=Date.now();
  tx('readwrite',function(s){return s.put({v:v,ts:ts},k);}).catch(function(e){console.warn('IndexedDB',e);try{toast('Écriture IndexedDB impossible','warning');}catch(_){}});
  return ts;
};
var _ri=Storage.prototype.removeItem;
Storage.prototype.removeItem=function(k){
  _ri.call(this,k);
  if(this===localStorage&&MIR(k)){
    try{_ri.call(this,'ts_'+k);localStorage.setItem('tomb_'+k,String(Date.now()));}catch(_){}
    tx('readwrite',function(s){return s.delete(k);}).catch(function(){});
  }
};
function hydrate(){
  return idb().then(function(){
    return new Promise(function(res,rej){
      var rows=[];
      var t=indexedDB.open('ets_local',1);
      t.onsuccess=function(){
        var c=t.result.transaction('kv','readonly').objectStore('kv').openCursor();
        c.onsuccess=function(){var cur=c.result;if(cur){rows.push({k:cur.key,v:cur.value.v,ts:cur.value.ts||0});cur.continue();}else{t.result.close();res(rows);}};
        c.onerror=function(){rej(c.error);};
      };
      t.onerror=function(){rej(t.error);};
    });
  }).then(function(rows){
    var restored=0;
    rows.forEach(function(r){
      if(!MIR(r.k))return;
      var tomb=+localStorage.getItem('tomb_'+r.k)||0;
      if(tomb&&tomb>=r.ts){tx('readwrite',function(s){return s.delete(r.k);}).catch(function(){});return;}
      var has=localStorage.getItem(r.k)!==null,lsTs=+localStorage.getItem('ts_'+r.k)||0;
      if(has&&r.ts<=lsTs)return;
      var val;try{val=JSON.parse(r.v);}catch(e){return;}
      try{localStorage.setItem(r.k,r.v);}catch(e){window.__lsFull=true;}
      if(KEY2T[r.k]&&Array.isArray(val)){D[KEY2T[r.k]]=val;restored++;}
      else if(r.k==='sync_outbox'&&Array.isArray(val)){OUT=val;}
    });
    if(restored){
      try{if(CU){recalcEtats();rdAll();computeAlerts();updateKPIs();}}catch(e){}
      try{toast('Données récupérées depuis la mémoire interne ('+restored+' table(s))','info');}catch(e){}
    }
  }).catch(function(e){console.warn('Hydratation IndexedDB',e);});
}
hydrate();
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}

/* ───── Sauvegarde / restauration ───── */
function stamp(){var d=new Date(),p=function(n){return String(n).padStart(2,'0');};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
window.exportBackup=function(){
  try{
    var tables={};Object.keys(TBL).forEach(function(t){tables[t]=D[t]||[];});
    var p={app:'ETS-NGUILLA',v:1,date:new Date().toISOString(),mode:ACCESS_MODE,tables:tables,outbox:OUT};
    if(ACCESS_MODE!=='cloud'){try{p.local_users=JSON.parse(localStorage.getItem('local_users')||'[]');}catch(e){}}
    var blob=new Blob([JSON.stringify(p)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ETS-NGUILLA-sauvegarde-'+stamp()+'.json';
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
    localStorage.setItem('last_backup',String(Date.now()));badge();
    toast('Sauvegarde téléchargée. Conservez le fichier hors du téléphone (WhatsApp, e-mail, clé USB).','success');
  }catch(e){toast('Sauvegarde impossible : '+e.message,'error');}
};
window.restoreBackup=function(input){
  var f=input.files&&input.files[0];input.value='';if(!f)return;
  if(!CU||CU.role!=='admin'){toast('Réservé aux administrateurs','error');return;}
  var r=new FileReader();
  r.onerror=function(){toast('Lecture du fichier impossible','error');};
  r.onload=function(){
    var p;try{p=JSON.parse(r.result);}catch(e){toast('Fichier invalide (JSON illisible)','error');return;}
    if(!p||p.app!=='ETS-NGUILLA'||!p.tables||typeof p.tables!=='object'){toast('Ce fichier n’est pas une sauvegarde ETS N’GUILLA','error');return;}
    var names=Object.keys(TBL).filter(function(t){return Array.isArray(p.tables[t]);});
    if(!names.length){toast('Sauvegarde vide','error');return;}
    var resume=names.map(function(t){return t+' : '+p.tables[t].length;}).join('\n');
    var msg='Restaurer la sauvegarde du '+String(p.date||'?').slice(0,16).replace('T',' ')+' ?\n\n'+resume+'\n\nLes données actuelles seront REMPLACÉES.'+(ACCESS_MODE==='cloud'?'\nMode Cloud : les écarts seront aussi envoyés à Firestore.':'')+'\nExportez d’abord une sauvegarde si besoin.';
    if(!confirm(msg))return;
    names.forEach(function(t){D[t]=p.tables[t];try{sv(TBL[t],t);}catch(e){}});
    if(ACCESS_MODE!=='cloud'&&Array.isArray(p.local_users)){try{localStorage.setItem('local_users',JSON.stringify(p.local_users));}catch(e){}}
    try{recalcEtats();rdAll();computeAlerts();updateKPIs();}catch(e){}
    try{logAction('UPDATE','Restauration sauvegarde '+(p.date||''));}catch(e){}
    toast('Sauvegarde restaurée','success');
  };
  r.readAsText(f);
};

/* ───── Pastille « Local » + rappel de sauvegarde ───── */
var warned=false;
function badge(){
  var b=document.getElementById('local-badge');
  if(ACCESS_MODE!=='local'||!CU){if(b)b.remove();return;}
  if(!b){
    b=document.createElement('div');b.id='local-badge';
    b.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9998;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:var(--card,#1e293b);border:1px solid var(--border,#334155);box-shadow:0 2px 10px rgba(0,0,0,.3)';
    b.title='Cliquer pour télécharger une sauvegarde';b.onclick=function(){exportBackup();};
    document.body.appendChild(b);
  }
  var last=+localStorage.getItem('last_backup')||0,days=last?Math.floor((Date.now()-last)/864e5):null;
  var old=last===0||days>=7;
  b.textContent='💾 Local · '+(last?(days===0?'sauvegardé aujourd’hui':'sauvegarde il y a '+days+' j'):'jamais sauvegardé')+(window.__lsFull?' · ⚠ stockage plein':'');
  b.style.color=old||window.__lsFull?'var(--orange,#f59e0b)':'var(--green,#10b981)';
  if(old&&!warned&&CU.role==='admin'){warned=true;toast('💾 Pensez à sauvegarder : touchez la pastille en bas à gauche.','warning');}
}
setInterval(badge,4000);setTimeout(badge,1500);
function info(){
  var el=document.getElementById('local-storage-info');if(!el||!navigator.storage||!navigator.storage.estimate)return;
  navigator.storage.estimate().then(function(e){
    var mo=function(n){return (n/1048576).toFixed(1);};
    el.textContent='Stockage utilisé : '+mo(e.usage||0)+' Mo sur '+mo(e.quota||0)+' Mo disponibles'+(window.__lsFull?' · ⚠ localStorage plein, IndexedDB prend le relais':'');
  }).catch(function(){});
}
setInterval(info,6000);

/* ───── Comptes locaux (mot de passe haché PBKDF2) ───── */
var IT=150000,fails=0,lock=0;
function b64(u){var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s);}
function unb64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function hasCrypto(){return !!(window.crypto&&crypto.subtle);}
function pbk(pw,salt,it){
  return crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']).then(function(km){
    return crypto.subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:it||IT,hash:'SHA-256'},km,256);
  }).then(function(bits){return b64(new Uint8Array(bits));});
}
function lu(){try{return JSON.parse(localStorage.getItem('local_users')||'[]');}catch(e){return[];}}
function slu(a){localStorage.setItem('local_users',JSON.stringify(a));}
function mk(em,nom,role,pw){
  var salt=crypto.getRandomValues(new Uint8Array(16));
  return pbk(pw,salt,IT).then(function(h){return {email:em,nom:nom,role:role,salt:b64(salt),hash:h,it:IT};});
}
window.localAddAccount=function(em,nom,role,pw){
  if(!hasCrypto())return Promise.reject(new Error('Chiffrement indisponible : ouvrez l’application en HTTPS'));
  em=String(em).toLowerCase();
  return mk(em,nom,role,pw).then(function(acc){var a=lu().filter(function(x){return x.email!==em;});a.push(acc);slu(a);});
};
window.localLogin=function(em,pw){
  em=String(em).toLowerCase();
  if(!hasCrypto()){toast('Connexion locale impossible : ouvrez l’application en HTTPS','error');return Promise.resolve(null);}
  var now=Date.now();
  if(now<lock){toast('Trop d’essais. Réessayez dans '+Math.ceil((lock-now)/1000)+' s','error');return Promise.resolve(null);}
  var a=lu(),first=Promise.resolve();
  if(!a.length){
    if(ALLOW_DEMO)return Promise.resolve(null);
    if(pw.length<8){toast('Premier lancement : choisissez un mot de passe de 8 caractères minimum','warning');return Promise.resolve(null);}
    if(!confirm('Premier lancement : aucun compte sur cet appareil.\n\nCréer l’administrateur local « '+em+' » avec ce mot de passe ?\nNotez-le : il ne peut pas être récupéré.'))return Promise.resolve(null);
    first=localAddAccount(em,em.split('@')[0],'admin',pw).then(function(){
      var p=D.utilisateurs.find(function(u){return String(u.email||'').toLowerCase()===em;});
      if(p){p.role='admin';p.statut='actif';}
      else D.utilisateurs.push({id:nid('utilisateurs'),nom:em.split('@')[0],email:em,role:'admin',statut:'actif'});
      sv('db_u','utilisateurs');
    });
  }
  return first.then(function(){
    var acc=lu().find(function(x){return x.email===em;});
    if(!acc){fails++;if(fails>=5){lock=Date.now()+30000;fails=0;}return null;}
    return pbk(pw,unb64(acc.salt),acc.it).then(function(h){
      if(h!==acc.hash){fails++;if(fails>=5){lock=Date.now()+30000;fails=0;}return null;}
      fails=0;
      var prof=D.utilisateurs.find(function(u){return String(u.email||'').toLowerCase()===em;});
      if(!prof&&acc.role==='admin'){prof={id:nid('utilisateurs'),nom:acc.nom,email:em,role:'admin',statut:'actif'};D.utilisateurs.push(prof);sv('db_u','utilisateurs');}
      if(!prof){toast('Compte supprimé : contactez un administrateur','error');return null;}
      if((prof.statut||'actif')==='inactif'){toast('Compte désactivé : contactez un administrateur','error');return null;}
      return {id:prof.id,nom:prof.nom||acc.nom,email:em,role:prof.role||acc.role,statut:'actif'};
    });
  });
};
window.localChangePassword=function(){
  if(!CU){return;}
  var em=String(CU.email||'').toLowerCase(),a=lu(),acc=a.find(function(x){return x.email===em;});
  if(!acc){toast('Compte démo : mot de passe non modifiable','warning');return;}
  var old=prompt('Mot de passe actuel :');if(!old)return;
  var nw=prompt('Nouveau mot de passe (6 caractères min.) :');if(!nw)return;
  if(nw.length<6){toast('6 caractères minimum','error');return;}
  if(nw!==prompt('Confirmez le nouveau mot de passe :')){toast('Les mots de passe diffèrent','error');return;}
  pbk(old,unb64(acc.salt),acc.it).then(function(h){
    if(h!==acc.hash){toast('Mot de passe actuel incorrect','error');return;}
    return mk(em,acc.nom,acc.role,nw).then(function(n){a=a.map(function(x){return x.email===em?n:x;});slu(a);toast('Mot de passe modifié','success');});
  }).catch(function(e){toast('Échec : '+e.message,'error');});
};
window.localResetPassword=function(id){
  var u=D.utilisateurs.find(function(x){return +x.id===+id;});if(!u||!u.email)return;
  var nw=prompt('Nouveau mot de passe pour '+u.email+' (6 caractères min.) :');if(!nw)return;
  if(nw.length<6){toast('6 caractères minimum','error');return;}
  localAddAccount(u.email,u.nom,u.role,nw).then(function(){toast('Mot de passe de '+u.email+' réinitialisé','success');}).catch(function(e){toast('Échec : '+e.message,'error');});
};
})();
