
// ═══════════════════════════════════════════════════════════════
// FIREBASE AUTH + FIRESTORE ADAPTER — Cloud / Local
// ═══════════════════════════════════════════════════════════════
const DEFAULT_FB_CONFIG={apiKey:"AIzaSyAB9sgeD-PupCQgUCG0BdrvAasfZxszk70",authDomain:"mpdv-nguila.firebaseapp.com",projectId:"mpdv-nguila",storageBucket:"mpdv-nguila.firebasestorage.app",messagingSenderId:"421316195621",appId:"1:421316195621:web:94dae72c83ba4d3cb656cc"};
let FB_CONFIG={};try{FB_CONFIG=JSON.parse(localStorage.getItem('firebase_config')||'{}');}catch(e){FB_CONFIG={};}
if(!(FB_CONFIG&&FB_CONFIG.apiKey&&FB_CONFIG.projectId&&FB_CONFIG.appId)){FB_CONFIG=Object.assign({},DEFAULT_FB_CONFIG);try{localStorage.setItem('firebase_config',JSON.stringify(FB_CONFIG));}catch(e){}}
let sb=null, CU=null, firebaseApp=null, firestoreDB=null, firebaseAuth=null;
let ACCESS_MODE=localStorage.getItem('access_mode')||'local';
const ALLOW_DEMO=['','localhost','127.0.0.1'].includes(location.hostname);if(!ALLOW_DEMO)document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.demos').forEach(e=>e.remove()));const DEMOS=[{email:'admin@habatech.com',pass:'admin123',nom:'Honoris HABA',role:'admin'},{email:'caissier@habatech.com',pass:'caisse123',nom:'Agent Caisse',role:'caissier'},{email:'stock@habatech.com',pass:'stock123',nom:'Magasinier 1',role:'magasinier'}];
function firebaseReadyFor(c){return !!(c&&c.apiKey&&c.projectId&&c.appId);}
function firebaseReady(){return firebaseReadyFor(FB_CONFIG);}
function initFirebase(config=FB_CONFIG){if(!firebaseReadyFor(config))throw new Error('Configuration Firebase incomplète : apiKey, projectId et appId sont requis.');if(!window.firebase)throw new Error('SDK Firebase non chargé. Vérifiez votre connexion Internet.');try{firebaseApp=(firebase.apps&&firebase.apps.length)?firebase.app():firebase.initializeApp(config);}catch(e){firebaseApp=firebase.app();}firebaseAuth=firebase.auth(firebaseApp);firestoreDB=firebase.firestore(firebaseApp);sb={auth:{signInWithPassword:async({email,password})=>{try{const c=await firebaseAuth.signInWithEmailAndPassword(email,password);return {data:{user:c.user},error:null};}catch(error){return {data:{user:null},error};}},signOut:async()=>{try{await firebaseAuth.signOut();return {error:null};}catch(error){return {error};}}},from:collection=>new FirestoreQuery(collection)};return sb;}
class FirestoreQuery{
 constructor(collection){this.collection=collection;this.action='select';this.payload=null;this.filters=[];this.max=null;this.singleResult=false;}
 select(){return this;} limit(n){this.max=n;return this;} eq(field,value){this.filters.push([field,value]);return this;} single(){this.singleResult=true;return this;}
 insert(payload){this.action='insert';this.payload=payload;return this;} upsert(payload){this.action='upsert';this.payload=payload;return this;} update(payload){this.action='update';this.payload=payload;return this;} delete(){this.action='delete';return this;}
 async execute(){try{if(!firestoreDB)throw new Error('Firebase non configuré.');const ref=firestoreDB.collection(this.collection);const rows=Array.isArray(this.payload)?this.payload:(this.payload?[this.payload]:[]);if(this.action==='insert'||this.action==='upsert'){const batch=firestoreDB.batch();rows.forEach(row=>{const data={...row};const id=data.id!=null?String(data.id):ref.doc().id;data.id=data.id??id;const doc=ref.doc(id);if(this.action==='insert')batch.set(doc,data);else batch.set(doc,data,{merge:true});});await batch.commit();return {data:rows,error:null};}let q=ref;this.filters.forEach(([f,v])=>{if(v!==undefined)q=q.where(f,'==',v);});let snap=await q.get();let docs=snap.docs.filter(doc=>this.filters.every(([f,v])=>doc.get(f)===v));if(this.max!=null)docs=docs.slice(0,this.max);if(this.action==='update'||this.action==='delete'){const batch=firestoreDB.batch();docs.forEach(doc=>{if(this.action==='delete')batch.delete(doc.ref);else batch.set(doc.ref,this.payload,{merge:true});});await batch.commit();return {data:docs.map(d=>({id:d.id,...d.data(),...(this.action==='update'?this.payload:{})})),error:null};}const data=docs.map(doc=>({id:doc.id,...doc.data()}));return {data:this.singleResult?(data[0]||null):data,error:null};}catch(error){return {data:null,error};}}
 then(resolve,reject){return this.execute().then(resolve,reject);} catch(reject){return this.execute().catch(reject);}
}
function readFirebaseJson(value){let c;try{c=JSON.parse(value);}catch(e){throw new Error('JSON invalide. Copiez la configuration Web depuis Firebase Console.');}if(!firebaseReadyFor(c))throw new Error('Champs obligatoires manquants : apiKey, projectId et appId.');return c;}
function loadFirebaseConfig(){const json=JSON.stringify(FB_CONFIG,null,2);['cfg-firebase','qcfg-json','prod-firebase-json'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=json==='{}'?'':json;});const h=document.getElementById('lcfg-url');if(h)h.value=json==='{}'?'':json;updateLoginSBStatus();}
function initSB(){loadFirebaseConfig();setLoginMode(ACCESS_MODE,false);updateLoginSBStatus();if(ACCESS_MODE==='cloud'&&firebaseReady())try{initFirebase();}catch(e){console.warn(e);}}
function setLoginMode(mode,save=true){ACCESS_MODE=mode;if(save)localStorage.setItem('access_mode',mode);const isCloud=mode==='cloud';const bl=document.getElementById('login-mode-local'),bc=document.getElementById('login-mode-cloud');if(bl)bl.className='mode-select-btn'+(isCloud?'':' sel-local');if(bc)bc.className='mode-select-btn'+(isCloud?' sel-cloud':'');const cfgBtn=document.getElementById('login-cloud-btn');if(cfgBtn)cfgBtn.style.display=isCloud?'block':'none';updateLoginSBStatus();const demos=document.querySelector('.demos');if(demos)demos.style.display=isCloud?'none':'block';updateModeUI();}
function updateLoginSBStatus(){const dot=document.getElementById('login-sb-indicator'),lbl=document.getElementById('login-sb-label');if(!dot||!lbl)return;const ok=firebaseReady();dot.style.background=ok?'var(--green)':'var(--orange)';lbl.textContent=ok?'Configuré ✓':'Non configuré';lbl.style.color=ok?'var(--green)':'var(--orange)';}
function openLoginCloudModal(){if(!document.getElementById('m-cloud-quick'))buildQuickCloudModal();const el=document.getElementById('qcfg-json');if(el)el.value=JSON.stringify(FB_CONFIG,null,2)==='{}'?'':JSON.stringify(FB_CONFIG,null,2);const st=document.getElementById('qcfg-st');if(st)st.textContent='';document.getElementById('m-cloud-quick').classList.add('open');}
function buildQuickCloudModal(){const div=document.createElement('div');div.className='overlay';div.id='m-cloud-quick';div.onclick=e=>{if(e.target===div)div.classList.remove('open');};div.innerHTML=`<div class="modal" style="max-width:460px"><div class="modal-head"><h3>🔥 Configuration Firebase / Firestore</h3><span class="modal-close" onclick="document.getElementById('m-cloud-quick').classList.remove('open')">×</span></div><div class="modal-body"><p style="font-size:12px;color:var(--text3);margin-bottom:16px;line-height:1.5">Collez la configuration Web JSON de votre projet Firebase.</p><div class="fgrp"><label>Configuration Firebase — JSON</label><textarea id="qcfg-json" rows="8" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'></textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" onclick="testQuickCloud()">🔌 Tester</button><button class="btn btn-primary btn-sm" onclick="saveQuickCloud()">💾 Sauvegarder</button></div><div id="qcfg-st" style="margin-top:10px;font-size:12px;color:var(--text3)"></div></div><div class="modal-foot"><button class="btn btn-outline" onclick="document.getElementById('m-cloud-quick').classList.remove('open')">Fermer</button></div></div>`;document.body.appendChild(div);}
async function testQuickCloud(){const st=document.getElementById('qcfg-st');try{const c=readFirebaseJson(document.getElementById('qcfg-json')?.value||'');initFirebase(c);await firestoreDB.collection('produits').limit(1).get();FB_CONFIG=c;st.innerHTML='<span style="color:var(--green)">✅ Firestore accessible. Vérifiez les règles de sécurité.</span>';}catch(e){st.innerHTML='<span style="color:var(--red)">❌ '+e.message+'</span>';}}
function saveQuickCloud(){try{FB_CONFIG=readFirebaseJson(document.getElementById('qcfg-json')?.value||'');localStorage.setItem('firebase_config',JSON.stringify(FB_CONFIG));initFirebase();loadFirebaseConfig();toast('Configuration Firebase enregistrée','success');setTimeout(()=>document.getElementById('m-cloud-quick')?.classList.remove('open'),1000);}catch(e){toast(e.message,'error');}}
async function switchMode(mode){if(mode===ACCESS_MODE)return;if(mode==='cloud'){try{if(!firebaseReady())throw new Error('Configurez Firebase dans Administration.');if(!sb)initFirebase();showSync('Connexion à Firebase…','Chargement Firestore…');await firestoreDB.collection('produits').limit(1).get();ACCESS_MODE='cloud';localStorage.setItem('access_mode','cloud');await syncFromCloud();hideSync();updateModeUI();toast('☁️ Mode Cloud activé — Firestore connecté','success');logAction('UPDATE','Basculement en mode Cloud');}catch(e){hideSync();toast('Erreur Firebase : '+e.message,'error');}}else{ACCESS_MODE='local';localStorage.setItem('access_mode','local');sb=null;updateModeUI();toast('💾 Mode Local activé','info');logAction('UPDATE','Basculement en mode Local');rdAll();updateKPIs();computeAlerts();}}
function updateModeUI(){const isCloud=ACCESS_MODE==='cloud';const pill=document.getElementById('mode-pill');if(pill){pill.textContent=isCloud?'☁️ Cloud':'💾 Local';pill.className=isCloud?'cloud':'local';}const tl=document.getElementById('tb-mode-local'),tc=document.getElementById('tb-mode-cloud');if(tl)tl.className='mode-btn'+(isCloud?'':' active-local');if(tc)tc.className='mode-btn'+(isCloud?' active-cloud':'');const banner=document.getElementById('cfg-banner');if(banner)banner.classList.toggle('hidden',isCloud||firebaseReady()||ACCESS_MODE==='local');const lbl=document.getElementById('sse-lbl');if(lbl)lbl.textContent=isCloud?'Firestore OK':'Local';}
function showSync(msg,sub=''){document.getElementById('sync-msg').textContent=msg;document.getElementById('sync-sub').textContent=sub;document.getElementById('sync-overlay').classList.add('open');}function hideSync(){document.getElementById('sync-overlay').classList.remove('open');}
async function pushToCloud(){if(!sb||ACCESS_MODE!=='cloud'){toast('Mode Cloud requis','warning');return;}showSync('Envoi vers Firestore…','Synchronisation en cours…');try{for(const t of ['produits','mouvements','ventes','commandes','fournisseurs','clients','depenses','retours'])if(D[t]&&D[t].length)await sb.from(t).upsert(D[t],{onConflict:'id'});OUT=[];saveOut();rebuildSnap();hideSync();toast('✅ Données envoyées vers Firestore','success');logAction('UPDATE','Push local → Firestore réussi');}catch(e){hideSync();toast('Erreur sync : '+e.message,'error');}}
async function pullFromCloud(){if(!sb){toast('Configurez Firebase d’abord','warning');return;}showSync('Récupération depuis Firestore…','Téléchargement des données…');try{await syncFromCloud();hideSync();toast('✅ Données Firestore récupérées','success');logAction('UPDATE','Pull Firestore → local réussi');}catch(e){hideSync();toast('Erreur : '+e.message,'error');}}
function syncCfgFromLogin(){const raw=document.getElementById('lcfg-url')?.value.trim()||'';if(raw)FB_CONFIG=readFirebaseJson(raw);}
async function testLoginCloud(){try{syncCfgFromLogin();initFirebase();await firestoreDB.collection('produits').limit(1).get();document.getElementById('lcfg-st').innerHTML='<span style="color:var(--green)">✅ Firestore accessible</span>';}catch(e){document.getElementById('lcfg-st').innerHTML='<span style="color:var(--red)">❌ '+e.message+'</span>';}}
function saveLoginCloud(){try{syncCfgFromLogin();localStorage.setItem('firebase_config',JSON.stringify(FB_CONFIG));initFirebase();loadFirebaseConfig();toast('Configuration Firebase enregistrée','success');}catch(e){toast(e.message,'error');}}
function sv(k,t){try{localStorage.setItem(k,JSON.stringify(D[t]));}catch(e){console.error('localStorage',e);toast('Stockage local plein : supprimez des photos produits ou synchronisez le cloud.','error');}}
/*SYNC-ENGINE-V2 : file d'attente hors-ligne + diff par ligne + stock en incréments atomiques*/
const SYNC_T={produits:'db_p',mouvements:'db_m',ventes:'db_v',commandes:'db_c',fournisseurs:'db_f',utilisateurs:'db_u',clients:'db_cl',depenses:'db_dp',retours:'db_rt',categories:'db_cats'};
const SYNC_K=Object.fromEntries(Object.entries(SYNC_T).map(([t,k])=>[k,t]));
const _jp=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;}};
let OUT=_jp('sync_outbox',[]),DEAD=_jp('sync_dead',[]),SNAP=_jp('sync_snap',null),LASTERR='',_pull=false,_busy=false,_tm=null;
let HAS_SNAP=!!SNAP;if(!SNAP)SNAP={};
const _dirty=new Set();
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const hsh=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36);};
const split=(t,r)=>{if(t!=='produits')return[r,null];const{stock,...rest}=r;return[rest,+stock||0];};
const sig=(t,r)=>{const[a,s]=split(t,r);return[hsh(JSON.stringify(a)),s];};
const saveOut=()=>{try{localStorage.setItem('sync_outbox',JSON.stringify(OUT));localStorage.setItem('sync_dead',JSON.stringify(DEAD));}catch(e){}};
const saveSnap=()=>{try{localStorage.setItem('sync_snap',JSON.stringify(SNAP));}catch(e){}};
function pushOp(o){
  o.opid=uid();const k=String(o.id);
  if(o.data)o.data=JSON.parse(JSON.stringify(o.data));
  if(o.op==='del')OUT=OUT.filter(x=>!(x.t===o.t&&String(x.id)===k));
  else if(o.op==='set'){const p=OUT.find(x=>x.t===o.t&&String(x.id)===k&&x.op==='set');if(p){p.data={...p.data,...o.data};return;}}
  OUT.push(o);
}
function enqueueDiff(t){
  const snap=SNAP[t];if(!snap)return;
  const cur={};(D[t]||[]).forEach(r=>{if(r&&r.id!=null)cur[r.id]=r;});
  for(const id in cur){
    const r=cur[id],[h,s]=sig(t,r),o=snap[id];
    if(!o)pushOp({op:'set',t,id,data:r});
    else{
      if(o[0]!==h)pushOp({op:'set',t,id,data:split(t,r)[0]});
      if(t==='produits'&&s!==o[1])pushOp({op:'inc',t,id,field:'stock',delta:s-o[1]});
    }
    snap[id]=[h,s];
  }
  for(const id in snap)if(!(id in cur)){pushOp({op:'del',t,id});delete snap[id];}
  saveOut();
}
function rebuildSnap(){SNAP={};Object.keys(SYNC_T).forEach(t=>{SNAP[t]={};(D[t]||[]).forEach(r=>{if(r&&r.id!=null)SNAP[t][r.id]=sig(t,r);});});HAS_SNAP=true;saveSnap();}
function syncSoon(t){
  if(_pull||ACCESS_MODE!=='cloud'||!sb||!SNAP[t])return;
  _dirty.add(t);clearTimeout(_tm);
  _tm=setTimeout(()=>{_dirty.forEach(enqueueDiff);_dirty.clear();saveSnap();flushOutbox();},300);
}
async function applyOp(o){
  const ref=firestoreDB.collection(o.t).doc(String(o.id));
  if(o.op==='set')return ref.set(o.data,{merge:true});
  if(o.op==='del')return ref.delete();
  const mk=firestoreDB.collection('_ops').doc(o.opid);
  const nv=await firestoreDB.runTransaction(async tx=>{
    const [m,d]=await Promise.all([tx.get(mk),tx.get(ref)]);
    if(m.exists)return null;                                   // déjà appliqué (réessai après coupure)
    const v=(d.exists?(+d.data()[o.field]||0):0)+o.delta;
    tx.set(ref,{[o.field]:v},{merge:true});
    tx.set(mk,{t:o.t,id:String(o.id),exp:new Date(Date.now()+30*864e5)});
    return v;
  });
  if(nv!==null&&nv<0){const p=D.produits.find(x=>String(x.id)===String(o.id));toast('⚠ Stock négatif ('+nv+') : '+esc(p?p.designation:o.id)+' — vérifiez le stock','warning');}
}
async function flushOutbox(){
  if(_busy||!sb||!firestoreDB||ACCESS_MODE!=='cloud'||navigator.onLine===false){syncBadge();return;}
  _busy=true;
  try{
    while(OUT.length){
      const o=OUT[0];
      try{await applyOp(o);OUT.shift();LASTERR='';}
      catch(e){
        if(e&&(e.code==='permission-denied'||e.code==='invalid-argument')){DEAD.push({...o,err:e.code});OUT.shift();}
        else{LASTERR=(e&&(e.code||e.message))||'erreur';break;}
      }
      saveOut();
    }
  }finally{_busy=false;saveOut();syncBadge();}
}
function rebase(t,rows){
  OUT.filter(o=>o.t===t).forEach(o=>{
    const i=rows.findIndex(x=>String(x.id)===String(o.id));
    if(o.op==='del'){if(i>=0)rows.splice(i,1);}
    else if(o.op==='set'){if(i>=0)Object.assign(rows[i],o.data);else rows.push({...o.data});}
    else if(i>=0)rows[i][o.field]=(+rows[i][o.field]||0)+o.delta;
  });
  return rows;
}
async function syncFromCloud(){
  if(!sb)return;
  await flushOutbox();                                          // 1) envoyer d'abord le local
  const ts=Object.keys(SYNC_T),rs=await Promise.all(ts.map(t=>sb.from(t).select('*')));
  if(!HAS_SNAP){                                                // première synchro de cet appareil
    const cnt={},miss=['clients','depenses','retours'].filter(t=>{
      const ids=new Set((rs[ts.indexOf(t)].data||[]).map(x=>String(x.id)));
      cnt[t]=(D[t]||[]).filter(x=>!ids.has(String(x.id)));return cnt[t].length;});
    if(miss.length){
      try{localStorage.setItem('backup_pre_sync',JSON.stringify({d:new Date().toISOString(),clients:D.clients,depenses:D.depenses,retours:D.retours}));}catch(e){}
      if(confirm('Données locales absentes du cloud : '+miss.map(t=>t+' '+cnt[t].length).join(', ')+'.\nOK = les envoyer au cloud · Annuler = les ignorer (copie conservée sur cet appareil).'))
        miss.forEach(t=>cnt[t].forEach(r=>pushOp({op:'set',t,id:r.id,data:r})));
    }
  }
  _pull=true;
  try{
    ts.forEach((t,i)=>{
      const r=rs[i];if(r.error||!r.data)return;
      if(t==='categories'&&!r.data.length)(D.categories||[]).forEach(c=>pushOp({op:'set',t,id:c.id,data:c}));
      D[t]=rebase(t,r.data.map(x=>({...x})));
      localStorage.setItem(SYNC_T[t],JSON.stringify(D[t]));
      SNAP[t]={};D[t].forEach(x=>{if(x&&x.id!=null)SNAP[t][x.id]=sig(t,x);});
    });
    HAS_SNAP=true;saveSnap();saveOut();
  }finally{_pull=false;}
  recalcEtats();rdAll();computeAlerts();updateKPIs();initDashCharts();
  flushOutbox();
}
function syncBadge(){
  let b=document.getElementById('sync-badge');
  if(ACCESS_MODE!=='cloud'||!CU){if(b)b.remove();return;}
  if(!b){b=document.createElement('div');b.id='sync-badge';
    b.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9998;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;background:var(--card,#1e293b);border:1px solid var(--border,#334155);box-shadow:0 2px 10px rgba(0,0,0,.3)';
    b.onclick=()=>{if(DEAD.length)toast('Opérations refusées par Firestore ('+DEAD[0].err+') : vérifiez les règles de sécurité','error');flushOutbox();};
    document.body.appendChild(b);}
  const n=OUT.length;
  b.textContent=DEAD.length?'⚠ '+DEAD.length+' refusée(s)':navigator.onLine===false?'📴 Hors-ligne · '+n+' en attente':LASTERR?'⚠ Sync en échec · '+n:n?'⏳ '+n+' en attente':'☁ Synchronisé';
  b.style.color=DEAD.length||LASTERR?'var(--red,#ef4444)':(n||navigator.onLine===false)?'var(--orange,#f59e0b)':'var(--green,#10b981)';
}
{const _si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){let er=null;try{_si.call(this,k,v);}catch(e){er=e;}if(this===localStorage&&typeof idbMirror==='function'){let ts=0;try{ts=idbMirror(k,v);}catch(_){}if(ts){if(!er){try{_si.call(this,'ts_'+k,String(ts));}catch(_){}}else{window.__lsFull=true;er=null;}}}if(er)throw er;if(this===localStorage&&SYNC_K[k])syncSoon(SYNC_K[k]);};}
addEventListener('online',()=>flushOutbox());addEventListener('offline',()=>syncBadge());
addEventListener('pagehide',()=>{_dirty.forEach(enqueueDiff);_dirty.clear();saveSnap();});
setInterval(()=>{if(ACCESS_MODE==='cloud'&&sb)flushOutbox();},30000);setInterval(syncBadge,5000);
/*END-SYNC-ENGINE-V2*/
function setDemo(e,p){document.getElementById('l-email').value=e;document.getElementById('l-pass').value=p;}
async function doLogin(){try{const em=document.getElementById('l-email').value.trim(),pw=document.getElementById('l-pass').value;if(!em||!pw){toast('Remplissez tous les champs','error');return;}if(ACCESS_MODE==='cloud'){try{if(!sb){if(!firebaseReady())throw new Error('Configurez Firebase pour le mode Cloud.');initFirebase();}showSync('Authentification Firebase…','');const{data,error}=await sb.auth.signInWithPassword({email:em,password:pw});if(error)throw error;let _boot=false;{const _uid=data.user.uid,_mb=await firestoreDB.collection('members').doc(_uid).get();
if(!_mb.exists){const _bs=await firestoreDB.collection('config').doc('bootstrap').get();
if(_bs.exists){await sb.auth.signOut();hideSync();toast('Compte non autorisé : demandez à un administrateur de vous créer','error');return;}
hideSync();if(!confirm('Aucun administrateur n\'est encore défini.\nDevenir administrateur de ce système avec '+em+' ?')){await sb.auth.signOut();return;}
showSync('Création du premier administrateur…','');const _b=firestoreDB.batch();const _d=firestoreDB.collection.bind(firestoreDB);
_b.set(_d('config').doc('bootstrap'),{uid:_uid,email:em,at:new Date().toISOString()});_b.set(_d('admins').doc(_uid),{email:em});_b.set(_d('members').doc(_uid),{email:em});await _b.commit();_boot=true;}}
const pr=await sb.from('utilisateurs').select('*').eq('email',em).single();CU=pr.data||(_boot?{nom:em.split('@')[0],role:'admin',email:em,uid:firebaseAuth.currentUser.uid,statut:'actif'}:{nom:em,role:'caissier',email:em});if((CU.statut||'actif')==='inactif'){await sb.auth.signOut();CU=null;hideSync();toast('Compte désactivé : contactez un administrateur','error');return;}await syncFromCloud();if(_boot&&!D.utilisateurs.some(u=>String(u.email||'').toLowerCase()===em.toLowerCase())){D.utilisateurs.push({id:nid('utilisateurs'),nom:CU.nom,email:em,role:'admin',statut:'actif',uid:CU.uid});sv('db_u','utilisateurs');try{syncSoon('utilisateurs');}catch(_){}}hideSync();afterLogin();return;}catch(e){hideSync();toast('Erreur cloud : '+e.message,'error');return;}}const d=ALLOW_DEMO?DEMOS.find(u=>u.email===em&&u.pass===pw):null;if(d){CU=d;afterLogin();return;}const lu_=await localLogin(em,pw);if(lu_){CU=lu_;afterLogin();return;}toast('Identifiants incorrects','error');}catch(e){toast('Erreur : '+e.message,'error');}}
let _sessT=0;
function saveSess(force){if(!CU)return;const n=Date.now();if(!force&&n-_sessT<5000)return;_sessT=n;try{sessionStorage.setItem('ets_sess',JSON.stringify({u:CU,t:n}));}catch(e){}}
function restoreSession(){
  let s=null;try{s=JSON.parse(sessionStorage.getItem('ets_sess')||'null');}catch(e){}
  if(!s||!s.u||!s.u.nom||Date.now()-s.t>TIMEOUT){try{sessionStorage.removeItem('ets_sess');}catch(e){}return;}
  CU=s.u;afterLogin(true);
  let pg='dashboard';try{pg=localStorage.getItem('ets_last_page')||'dashboard';}catch(e){}
  const el=[...document.querySelectorAll('.nav-item')].find(n=>(n.getAttribute('onclick')||'').includes("goPage('"+pg+"'"));
  if(el&&!el.closest('.admin-only')||(el&&CU.role==='admin'))goPage(pg,el);
}
function afterLogin(restored){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('u-nm').textContent=CU.nom;
  document.getElementById('u-rl').textContent=CU.role;
  document.getElementById('u-av').textContent=CU.nom.charAt(0).toUpperCase();
  document.querySelectorAll('.admin-only').forEach(el=>el.style.display=CU.role==='admin'?'':'none');
  if(!restored)logAction('LOGIN','Connexion: '+CU.nom+' ('+CU.role+')');
  saveSess();
  resetTimeout();
  reqNotifPerm();
  loadAll();
}
function doLogout(){try{sessionStorage.removeItem('ets_sess');}catch(e){}logAction('LOGOUT','Déconnexion: '+(CU?.nom||'?'));if(sb)sb.auth.signOut();CU=null;document.getElementById('login-screen').style.display='flex';document.getElementById('l-pass').value='';}

function doReset(){
  if(!confirm('⚠️ Réinitialiser toutes les données ?\n\nCeci effacera ventes, produits, mouvements, dépenses, clients et retours. Les données démo seront restaurées.\n\nCette action est irréversible.'))return;
  ['db_p','db_m','db_v','db_c','db_f','db_u','db_cl','db_dp','db_rt','db_j','db_cats'].forEach(k=>localStorage.removeItem(k));
  // Recharger la page pour réinitialiser D avec les données démo
  logAction('UPDATE','Réinitialisation complète des données');
  toast('✅ Données réinitialisées — rechargement…','success');
  setTimeout(()=>location.reload(),1200);
}

// ── Passage en mode production ──
function openModalProd(){const el=document.getElementById('prod-firebase-json');if(el)el.value=JSON.stringify(FB_CONFIG,null,2)==='{}'?'':JSON.stringify(FB_CONFIG,null,2);const ci=document.getElementById('prod-confirm-input');if(ci)ci.value='';checkProdConfirm();openM('m-prod-mode');}

function checkProdConfirm(){
  const val=(document.getElementById('prod-confirm-input')?.value||'').trim();
  const btn=document.getElementById('btn-prod-confirm');
  const inp=document.getElementById('prod-confirm-input');
  const ok=(val==='PRODUCTION');
  if(btn){
    btn.disabled=!ok;
    btn.style.opacity=ok?'1':'0.45';
    btn.style.cursor=ok?'pointer':'not-allowed';
    btn.style.background=ok?'var(--green-glow)':'var(--green-glow)';
    btn.style.color=ok?'var(--green)':'var(--green)';
    if(ok){btn.style.background='var(--green)';btn.style.color='#fff';btn.style.borderColor='var(--green)';}
    else{btn.style.background='var(--green-glow)';btn.style.color='var(--green)';btn.style.borderColor='rgba(16,185,129,.35)';}
  }
  if(inp)inp.style.borderColor=val&&!ok?'var(--red)':ok?'var(--green)':'var(--border)';
}

function doProdReset(){if((document.getElementById('prod-confirm-input')?.value||'').trim()!=='PRODUCTION'){toast('Confirmation incorrecte','error');return;}let config={};const raw=(document.getElementById('prod-firebase-json')?.value||'').trim();if(raw){try{config=readFirebaseJson(raw);}catch(e){toast(e.message,'error');return;}}const keys=['db_p','db_m','db_v','db_c','db_f','db_u','db_cl','db_dp','db_rt','db_j','db_cats','firebase_config','access_mode'];keys.forEach(k=>localStorage.removeItem(k));if(firebaseReadyFor(config))localStorage.setItem('firebase_config',JSON.stringify(config));localStorage.setItem('access_mode',firebaseReadyFor(config)?'cloud':'local');closeM('m-prod-mode');toast('🚀 Mode production préparé — rechargement…','success');setTimeout(()=>location.reload(),1400);}

// ═══════════════════════════════
//  DATA
// ═══════════════════════════════
let D={
  produits:JSON.parse(localStorage.getItem('db_p')||'null')||[
    {id:1,code:'RIZ-25K',designation:'Riz Parfumé 25kg',categorie:'alimentaire',unite:'sac',stock:12,min:10,max:80,achat:95000,vente:120000,etat:'critique',fournisseur:'SOGUIDIS Conakry',description:''},
    {id:2,code:'HUI-5L',designation:'Huile Végétale 5L',categorie:'alimentaire',unite:'bidon',stock:0,min:8,max:50,achat:38000,vente:45000,etat:'rupture',fournisseur:'SOGUIDIS Conakry',description:''},
    {id:3,code:'SUC-1K',designation:'Sucre Cristal 1kg',categorie:'alimentaire',unite:'kg',stock:45,min:20,max:200,achat:14000,vente:18000,etat:'normal',fournisseur:'CFAO Distribution',description:''},
    {id:4,code:'VEN-3P',designation:'Ventilateur 3 pales',categorie:'electromenager',unite:'unité',stock:7,min:5,max:30,achat:120000,vente:165000,etat:'normal',fournisseur:'CFAO Distribution',description:''},
    {id:5,code:'SAV-400',designation:'Savon Bloc 400g',categorie:'accessoire',unite:'bloc',stock:320,min:50,max:300,achat:8000,vente:12000,etat:'surstock',fournisseur:'Fournisseur Local',description:''},
    {id:6,code:'FAR-1K',designation:'Farine de Blé 1kg',categorie:'alimentaire',unite:'kg',stock:28,min:15,max:100,achat:12000,vente:16000,etat:'normal',fournisseur:'SOGUIDIS Conakry',description:''},
    {id:7,code:'REF-250',designation:'Réfrigérateur 250L',categorie:'electromenager',unite:'unité',stock:3,min:2,max:10,achat:1800000,vente:2400000,etat:'normal',fournisseur:'CFAO Distribution',description:''},
    {id:8,code:'PIL-AA',designation:'Piles AA (pack 4)',categorie:'accessoire',unite:'pack',stock:95,min:20,max:150,achat:15000,vente:22000,etat:'normal',fournisseur:'Fournisseur Local',description:''},
  ],
  mouvements:JSON.parse(localStorage.getItem('db_m')||'null')||[
    {id:1,date:'2026-06-04 14:32',type:'sortie',produit_id:1,produit:'Riz Parfumé 25kg',qte:5,ref:'VTE-001',user:'Caissier'},
    {id:2,date:'2026-06-04 13:10',type:'entree',produit_id:3,produit:'Sucre Cristal 1kg',qte:50,ref:'BON-2026-042',user:'Magasinier'},
    {id:3,date:'2026-06-04 11:45',type:'perte',produit_id:3,produit:'Sucre Cristal 1kg',qte:2,ref:'PERTE-006',user:'Gestionnaire'},
    {id:4,date:'2026-06-04 09:20',type:'sortie',produit_id:2,produit:'Huile Végétale 5L',qte:8,ref:'VTE-002',user:'Caissier'},
    {id:5,date:'2026-06-03 17:00',type:'transfert',produit_id:5,produit:'Savon Bloc 400g',qte:100,ref:'TRF-012',user:'Magasinier'},
  ],
  ventes:JSON.parse(localStorage.getItem('db_v')||'null')||[
    {id:1,num:'VTE-2026-018',date:'2026-06-05 14:32',articles:3,montant:245000,paiement:'Espèces',statut:'finalisee',lignes:[{produit:'Riz Parfumé 25kg',qte:2,prix:120000}]},
    {id:2,num:'VTE-2026-017',date:'2026-06-05 13:15',articles:1,montant:120000,paiement:'Orange Money',statut:'finalisee',lignes:[]},
    {id:3,num:'VTE-2026-016',date:'2026-06-05 11:50',articles:5,montant:380000,paiement:'MTN Money',statut:'finalisee',lignes:[]},
    {id:4,num:'VTE-2026-015',date:'2026-06-04 09:30',articles:2,montant:90000,paiement:'Espèces',statut:'finalisee',lignes:[]},
  ],
  commandes:JSON.parse(localStorage.getItem('db_c')||'null')||[
    {id:1,num:'CMD-2026-008',fourn:'SOGUIDIS Conakry',date:'2026-06-01',prevue:'2026-06-05',montant:1850000,statut:'confirmee'},
    {id:2,num:'CMD-2026-007',fourn:'CFAO Distribution',date:'2026-05-28',prevue:'2026-06-02',montant:960000,statut:'livree'},
  ],
  fournisseurs:JSON.parse(localStorage.getItem('db_f')||'null')||[
    {id:1,nom:'SOGUIDIS Conakry',pays:'Guinée',delai:3,tel:'+224 622 000 001'},
    {id:2,nom:'CFAO Distribution',pays:'Guinée',delai:5,tel:'+224 622 000 002'},
    {id:3,nom:'Fournisseur Local',pays:'Siguiri',delai:1,tel:'+224 622 000 003'},
  ],
  clients:JSON.parse(localStorage.getItem('db_cl')||'null')||[
    {id:1,nom:'Mamadou Diallo',tel:'+224 622 111 001',adresse:'Siguiri Centre',dette:85000,created_at:'2026-05-10'},
    {id:2,nom:'Fatoumata Camara',tel:'+224 622 111 002',adresse:'Quartier Gbèdè',dette:0,created_at:'2026-05-20'},
  ],
  depenses:JSON.parse(localStorage.getItem('db_dp')||'null')||[
    {id:1,date:'2026-06-05',libelle:'Achat riz SOGUIDIS',categorie:'achat_stock',montant:570000,paiement:'Espèces',ref:'FAC-2026-089',notes:'',user:'Honoris HABA'},
    {id:2,date:'2026-06-05',libelle:'Carburant livraison',categorie:'transport',montant:85000,paiement:'Espèces',ref:'',notes:'',user:'Honoris HABA'},
    {id:3,date:'2026-06-04',libelle:'Salaire journalier magasinier',categorie:'salaires',montant:120000,paiement:'Orange Money',ref:'',notes:'',user:'Honoris HABA'},
  ],
  retours:JSON.parse(localStorage.getItem('db_rt')||'null')||[],
  journal:JSON.parse(localStorage.getItem('db_j')||'null')||[
    {id:1,date:'2026-06-05 08:00',action:'LOGIN',detail:'Connexion admin',user:'Honoris HABA',ip:'192.168.1.1'},
  ],
  utilisateurs:JSON.parse(localStorage.getItem('db_u')||'null')||[
    {id:1,nom:'Honoris HABA',email:'admin@habatech.com',role:'admin',statut:'actif'},
    {id:2,nom:'Agent Caisse',email:'caissier@habatech.com',role:'caissier',statut:'actif'},
    {id:3,nom:'Magasinier 1',email:'stock@habatech.com',role:'magasinier',statut:'actif'},
  ],
  categories:JSON.parse(localStorage.getItem('db_cats')||'null')||[
    {id:1,slug:'alimentaire',   nom:'Alimentaire',    emoji:'🥫', couleur:'#10B981', perishable:true },
    {id:2,slug:'electromenager',nom:'Électroménager', emoji:'⚡', couleur:'#3B82F6', perishable:false},
    {id:3,slug:'accessoire',   nom:'Accessoires',    emoji:'🔧', couleur:'#8B5CF6', perishable:false},
    {id:4,slug:'autre',        nom:'Autres',          emoji:'📦', couleur:'#64748B', perishable:false},
  ],
};
// Catalogue alimentaire complémentaire (prix indicatifs à ajuster selon vos tarifs).
const EMBEDDED_PRODUCT_IMAGES = {
  1: 'data:image/jpeg;base64,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',
  2: 'data:image/jpeg;base64,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',
  3: 'data:image/jpeg;base64,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',
  4: 'data:image/jpeg;base64,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',
  5: 'data:image/jpeg;base64,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',
  6: 'data:image/jpeg;base64,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'
};
const EXTRA_FOOD_PRODUCTS = [('RIZ-5K', 'Riz parfumé 5 kg', 'sac', 5, 4, 30000, 42000, ''), ('RIZ-10K', 'Riz long grain 10 kg', 'sac', 8, 4, 55000, 72000, ''), ('HUI-1L', 'Huile végétale 1 L', 'bouteille', 24, 8, 9000, 12000, ''), ('HUI-2L', 'Huile végétale 2 L', 'bouteille', 15, 5, 16000, 21000, ''), ('SUC-5K', 'Sucre cristal 5 kg', 'sac', 12, 4, 65000, 80000, ''), ('FAR-5K', 'Farine de blé 5 kg', 'sac', 10, 4, 50000, 65000, ''), ('PATE-500', 'Spaghetti 500 g', 'paquet', 50, 15, 5000, 7000, ''), ('PATE-1K', 'Macaroni 1 kg', 'paquet', 30, 10, 9000, 12000, ''), ('TOM-400', 'Concentré de tomate 400 g', 'boîte', 36, 12, 6000, 8500, ''), ('LAIT-400', 'Lait en poudre 400 g', 'boîte', 20, 8, 18000, 23000, ''), ('LAIT-1L', 'Lait UHT 1 L', 'brique', 24, 8, 10000, 13000, ''), ('HAR-1K', 'Haricots rouges 1 kg', 'kg', 25, 8, 12000, 16000, ''), ('LENT-1K', 'Lentilles 1 kg', 'kg', 18, 6, 14000, 18000, ''), ('SEL-1K', 'Sel de cuisine 1 kg', 'paquet', 40, 12, 2500, 4000, ''), ('CAFE-100', 'Café soluble 100 g', 'pot', 20, 6, 16000, 21000, ''), ('BISC-200', 'Biscuits 200 g', 'paquet', 45, 15, 4000, 6000, ''), ('SARD-125', 'Sardines en boîte 125 g', 'boîte', 48, 12, 6000, 8500, ''), ('THON-160', 'Thon en boîte 160 g', 'boîte', 30, 10, 10000, 14000, ''), ('OEUF-30', 'Œufs frais plateau de 30', 'plateau', 12, 4, 35000, 45000, ''), ('EAU-15L', 'Eau minérale 1,5 L', 'bouteille', 60, 20, 2500, 4000, ''), ('JUS-1L', 'Jus de fruits 1 L', 'brique', 24, 8, 9000, 12000, ''), ('MAIS-1K', 'Farine de maïs 1 kg', 'paquet', 20, 8, 9000, 12000, ''), ('HUI-AR', 'Huile de palme 1 L', 'bouteille', 20, 6, 11000, 15000, ''), ('EPIC-100', 'Épices assorties 100 g', 'sachet', 35, 10, 3000, 5000, '')];

// Ajoute les produits alimentaires de démonstration sans doublonner les références.
(function seedFoodCatalog(){
  let nextId=Math.max(0,...D.produits.map(p=>Number(p.id)||0))+1;
  EXTRA_FOOD_PRODUCTS.forEach(([code,designation,unite,stock,min,achat,vente,photo])=>{
    if(!D.produits.some(p=>p.code===code)){D.produits.push({id:nextId++,code,designation,categorie:'alimentaire',unite,stock,min,max:Math.max(stock*3,30),achat,vente,etat:stock<=min?'critique':'normal',fournisseur:'Fournisseur alimentaire',description:'',photo});}
  });
  try{localStorage.setItem('db_p',JSON.stringify(D.produits));}catch(e){}
})();
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function nid(t){if(ACCESS_MODE==='cloud')return Date.now()*1000+Math.floor(Math.random()*1000);return D[t].length?Math.max(...D[t].map(x=>+x.id||0))+1:1;}
function nseq(t){let m=0;D[t].forEach(x=>{const n=parseInt((String(x.num||'').match(/(\d+)$/)||[])[1]||0,10);if(n>m)m=n;});return String(m+1).padStart(3,'0');}
// ── Génération automatique de référence ──
function autoRef(prefix,table){
  const d=new Date().toISOString().slice(0,10).replace(/-/g,'');
  const n=String(nid(table)).padStart(3,'0');
  return prefix+'-'+d+'-'+n;
}

async function loadAll(){
  if(ACCESS_MODE==='cloud'&&sb){
    try{await syncFromCloud();}catch(e){toast('Erreur sync Cloud: '+e.message,'warning');}
  }
  updateModeUI();
  recalcEtats();rdAll();computeAlerts();updateKPIs();initDashCharts();populateSQL();
  // Initialiser les dates de la section Rapports
  const todayR=new Date().toISOString().slice(0,10);
  const fEl=document.getElementById('rpt-date-from'),tEl=document.getElementById('rpt-date-to');
  if(fEl)fEl.value=todayR.slice(0,7)+'-01';
  if(tEl)tEl.value=todayR;
}
function rdAll(){rdProduits();rdMvt();rdVentes();rdCmds();rdInv();rdAlerts();rdFourn();rdUsers();rdClients();rdJournal();rdDepenses();rdRetours();fillSelects();rdCategories();}

// ═══════════════════════════════
//  THÈME CLAIR / SOMBRE
// ═══════════════════════════════
function toggleTheme(){
  const isLight=document.body.classList.toggle('light-mode');
  localStorage.setItem('theme',isLight?'light':'dark');
  // Mise à jour des graphiques Chart.js si existants
  try{
    const gridColor=isLight?'rgba(15,23,42,.08)':'rgba(255,255,255,.06)';
    const tickColor=isLight?'#94A3B8':'#64748B';
    Object.values(Chart.instances||{}).forEach(ch=>{
      if(ch.options?.scales){
        ['x','y'].forEach(ax=>{
          if(ch.options.scales[ax]){
            ch.options.scales[ax].grid={color:gridColor};
            ch.options.scales[ax].ticks={color:tickColor};
          }
        });
      }
      ch.update('none');
    });
  }catch(e){}
  toast(isLight?'☀️ Thème clair activé':'🌙 Thème sombre activé','info');
}
function initTheme(){
  const saved=localStorage.getItem('theme');
  if(saved==='light')document.body.classList.add('light-mode');
}
// Appel immédiat pour éviter le flash
initTheme();

// ═══════════════════════════════
//  NAVIGATION
// ═══════════════════════════════
function goPage(pg,el){try{localStorage.setItem('ets_last_page',pg);}catch(e){}
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const s=document.getElementById('s-'+pg);if(s)s.classList.add('active');
  if(el)el.classList.add('active');
  document.getElementById('page-title').textContent={dashboard:'Dashboard',produits:'Produits',mouvements:'Mouvements',ventes:'Ventes',facturation:'Facturation',commandes:'Commandes',fournisseurs:'Fournisseurs',inventaire:'Inventaire',alertes:'Alertes',rapports:'Rapports',admin:'Administration',clients:'Clients / Crédit',journal:'Journal d\'audit',depenses:'Dépenses',retours:'Retours / Remboursements'}[pg]||pg;
  if(pg==='rapports')setTimeout(()=>refreshRapports(),100);
  if(pg==='facturation')rdFactures();
  if(pg==='admin'){const l=document.getElementById('admin-mode-label');if(l)l.textContent=ACCESS_MODE==='cloud'?'☁️ Cloud':'💾 Local';}
  if(window.innerWidth<=768)closeSB();
}
function openSB(){document.getElementById('sidebar').classList.add('open');document.getElementById('sbdrop').classList.add('open');document.body.style.overflow='hidden';}
function closeSB(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbdrop').classList.remove('open');document.body.style.overflow='';}
function bnav(el){document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');}

// ═══════════════════════════════
//  PAGINATION
// ═══════════════════════════════
const PS=10,PG={p:1,m:1,v:1};
function pg(arr,p){return arr.slice((p-1)*PS,p*PS);}
function gf(t){
  if(t==='p'){
    const q=(document.getElementById('sp-q').value||'').toLowerCase(),cat=document.getElementById('sp-cat').value,et=document.getElementById('sp-etat').value;
    return D.produits.filter(p=>(!q||p.designation.toLowerCase().includes(q)||p.code.toLowerCase().includes(q))&&(!cat||p.categorie===cat)&&(!et||p.etat===et));
  }
  if(t==='m'){const tp=document.getElementById('sm-type').value,dt=document.getElementById('sm-date').value;return D.mouvements.filter(m=>(!tp||m.type===tp)&&(!dt||(m.date||'').startsWith(dt)));}
  if(t==='v'){const dt=document.getElementById('sv-date').value,py=document.getElementById('sv-pay').value;return D.ventes.filter(v=>(!dt||(v.date||'').startsWith(dt))&&(!py||v.paiement===py));}
  return[];
}
function rdPag(id,t,tot){
  const c=document.getElementById(id);if(!c)return;
  const tp=Math.max(1,Math.ceil(tot/PS)),cur=PG[t];
  let b='';for(let i=1;i<=Math.min(tp,7);i++)b+=`<button class="pag-btn${i===cur?' active':''}" onclick="goPg('${t}',${i})">${i}</button>`;
  c.innerHTML=`<span class="pag-info">Affichage ${Math.min((cur-1)*PS+1,tot)}–${Math.min(cur*PS,tot)} sur ${tot}</span><button class="pag-btn" onclick="goPg('${t}',${cur-1})" ${cur<=1?'disabled':''}>‹</button>${b}<button class="pag-btn" onclick="goPg('${t}',${cur+1})" ${cur>=tp?'disabled':''}>›</button>`;
}
function goPg(t,p){const a=gf(t);PG[t]=Math.max(1,Math.min(p,Math.ceil(a.length/PS)));if(t==='p')rdProduits();else if(t==='m')rdMvt();else if(t==='v')rdVentes();}

// ═══════════════════════════════
//  RENDER HELPERS
// ═══════════════════════════════
// ── Helpers catégories dynamiques ──
function getCat(slug){return D.categories.find(c=>c.slug===slug)||{slug,nom:slug,emoji:'📦',couleur:'#64748B',perishable:false};}
function ctag(slug){
  const hex=getCat(slug).couleur;
  return 'dyn-cat-'+slug;
}
function clbl(slug){const c=getCat(slug);return c.emoji+' '+c.nom;}
function catStyle(slug){
  const c=getCat(slug);
  return `background:${c.couleur}22;color:${c.couleur};border:1px solid ${c.couleur}55`;
}
// Génère le HTML d'un tag catégorie dynamique
function catTag(slug){const c=getCat(slug);return `<span class="tag" style="${catStyle(slug)}">${c.emoji} ${esc(c.nom)}</span>`;}
const gnf=n=>(n||0).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF';
const fdt=d=>d?String(d).slice(0,16):'—';

function rdProduits(){
  const fil=gf('p'),page=pg(fil,PG.p);
  // Tableau desktop
  document.getElementById('tb-prod').innerHTML=page.length?page.map(p=>{
    const pc=Math.min(100,Math.round((p.stock/(p.max||1))*100));
    const bc=p.etat==='rupture'?'var(--red)':p.etat==='critique'?'var(--orange)':p.etat==='surstock'?'var(--purple)':'var(--green)';
    return`<tr>
      <td><code>${esc(p.code)}</code></td>
      <td><b style="color:var(--text)">${esc(p.designation)}</b><br><span style="font-size:10.5px;color:var(--text3)">${esc(p.unite||'')}</span></td>
      <td>${catTag(p.categorie)}</td>
      <td><b style="font-size:14px;font-family:'DM Mono',monospace">${p.stock}</b></td>
      <td style="min-width:76px"><div style="font-size:10px;color:var(--text3)">${pc}%</div><div class="sbar"><div class="sbar-fill" style="width:${pc}%;background:${bc}"></div></div></td>
      <td style="color:var(--text3);font-size:11px">${p.min}/${p.max}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px">${gnf(p.achat)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${gnf(p.vente)}</td>
      <td><span class="tag ${p.etat}">${p.etat}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="showHist(${p.id})" title="Historique">📋</button>
        <button class="btn btn-outline btn-sm" onclick="openBarcode(${p.id})" title="QR / Étiquette">🏷️</button>
        <button class="btn btn-outline btn-sm" onclick="editProd(${p.id})" title="Modifier">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="delProd(${p.id})" title="Supprimer">🗑️</button>
      </td>
    </tr>`;
  }).join(''):`<tr><td colspan="10"><div class="empty"><div class="ico">📦</div><p>Aucun produit trouvé</p></div></td></tr>`;
  rdPag('pg-prod','p',fil.length);
  // Cartes mobile
  const mc=document.getElementById('mc-prod');
  if(!mc)return;
  const etcol={normal:'var(--green)',critique:'var(--orange)',rupture:'var(--red)',surstock:'var(--purple)'};
  mc.innerHTML=page.length?page.map(p=>{
    const pc=Math.min(100,Math.round((p.stock/(p.max||1))*100));
    const bc=etcol[p.etat]||'var(--green)';
    const photoMarkup=p.photo?`<img class="mcard-product-photo" src="${esc(p.photo)}" alt="Photo de ${esc(p.designation)}" loading="lazy" onerror="this.style.display='none'">`:p.id>=1&&p.id<=6?`<img class="mcard-product-photo" src="${EMBEDDED_PRODUCT_IMAGES[p.id]||''}" alt="Photo de ${esc(p.designation)}" loading="lazy" onerror="this.style.display='none'">`:'';
    return`<div class="mcard" style="--mc:${bc}">
      ${photoMarkup}
      <div class="mcard-top">
        <div>
          <div class="mcard-title">${esc(p.designation)}</div>
          <div class="mcard-sub"><code style="font-size:11px">${esc(p.code)}</code> · ${esc(p.unite||'')}</div>
        </div>
        <span class="tag ${p.etat}" style="font-size:12px">${p.etat}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Catégorie</span>
        ${catTag(p.categorie)}
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Stock actuel</span>
        <span class="mcard-val" style="font-size:20px;color:${bc}">${p.stock} <span style="font-size:12px;color:var(--text3)">${esc(p.unite||'u.')}</span></span>
      </div>
      <div style="margin:4px 0 8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:3px"><span>Min: ${p.min}</span><span>${pc}%</span><span>Max: ${p.max}</span></div>
        <div class="mcard-sbar"><div class="mcard-sbar-fill" style="width:${pc}%;background:${bc}"></div></div>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Prix achat</span>
        <span class="mcard-val">${gnf(p.achat)}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Prix vente</span>
        <span class="mcard-val" style="color:var(--green)">${gnf(p.vente)}</span>
      </div>
      <div class="mcard-actions">
        <button class="btn btn-outline" onclick="showHist(${p.id})">📋</button>
        <button class="btn btn-outline" onclick="openBarcode(${p.id})">🏷️</button>
        <button class="btn btn-outline" onclick="editProd(${p.id})">✏️</button>
        <button class="btn btn-danger" onclick="delProd(${p.id})">🗑️</button>
      </div>
    </div>`;
  }).join(''):`<div class="empty"><div class="ico">📦</div><p>Aucun produit trouvé</p></div>`;
}

function rdMvt(){
  const fil=[...gf('m')].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),page=pg(fil,PG.m);
  document.getElementById('tb-mvt').innerHTML=page.length?page.map(m=>`<tr>
    <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3)">${fdt(m.date)}</td>
    <td><span class="tag ${m.type}">${m.type}</span></td>
    <td><b>${esc(m.produit||m.produit_id)}</b></td>
    <td><b style="font-family:'DM Mono',monospace">${m.qte}</b></td>
    <td><code>${esc(m.ref||'—')}</code></td>
    <td style="color:var(--text3)">${esc(m.user||'—')}</td>
    <td><button class="btn btn-danger btn-sm" onclick="delMvt(${m.id})">🗑️</button></td>
  </tr>`).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">🔄</div><p>Aucun mouvement</p></div></td></tr>`;
  rdPag('pg-mvt','m',fil.length);
  // Cartes mobile
  const mc=document.getElementById('mc-mvt');if(!mc)return;
  const tycol={entree:'var(--green)',sortie:'var(--red)',perte:'var(--orange)',transfert:'var(--blue)',ajustement:'var(--purple)'};
  mc.innerHTML=page.length?page.map(m=>`
    <div class="mcard" style="--mc:${tycol[m.type]||'var(--blue)'}">
      <div class="mcard-top">
        <div>
          <div class="mcard-title">${esc(m.produit||m.produit_id)}</div>
          <div class="mcard-sub">${fdt(m.date)}</div>
        </div>
        <span class="tag ${m.type}" style="font-size:13px">${m.type}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Quantité</span>
        <span class="mcard-val" style="font-size:22px;color:${tycol[m.type]||'var(--blue)'}">${m.qte}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Référence</span>
        <span><code>${esc(m.ref||'—')}</code></span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Opérateur</span>
        <span class="mcard-val" style="font-family:'DM Sans',sans-serif">${esc(m.user||'—')}</span>
      </div>
      <div class="mcard-actions">
        <button class="btn btn-danger" onclick="delMvt(${m.id})">🗑️ Supprimer</button>
      </div>
    </div>`).join(''):`<div class="empty"><div class="ico">🔄</div><p>Aucun mouvement</p></div>`;
}

function rdVentes(){
  const fil=[...gf('v')].sort((a,b)=>(b.date||'').localeCompare(a.date||'')),page=pg(fil,PG.v);
  document.getElementById('tb-ventes').innerHTML=page.length?page.map(v=>`<tr>
    <td><code>${esc(v.num)}</code></td>
    <td style="font-size:11px;color:var(--text3)">${fdt(v.date)}</td>
    <td>${v.articles} art.</td>
    <td style="font-family:'DM Mono',monospace;color:var(--green);font-weight:700">${gnf(v.montant)}</td>
    <td>${v.paiement}</td>
    <td><span class="tag normal">${v.statut}</span></td>
    <td><button class="btn btn-outline btn-sm" onclick="printFacture(${v.id})" title="Facture PDF">🧾</button>
        <button class="btn btn-outline btn-sm" onclick="printTicket(${v.id})" title="Reçu thermique">🖨️</button>
        <button class="btn btn-outline btn-sm" onclick="openNewRetourFromVente(${v.id})" title="Retour">🔁</button></td>
  </tr>`).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">🛒</div><p>Aucune vente</p></div></td></tr>`;
  rdPag('pg-ventes','v',fil.length);
  // Cartes mobile
  const mc=document.getElementById('mc-ventes');if(!mc)return;
  mc.innerHTML=page.length?page.map(v=>`
    <div class="mcard" style="--mc:var(--green)">
      <div class="mcard-top">
        <div>
          <div class="mcard-title" style="color:var(--accent)">${esc(v.num)}</div>
          <div class="mcard-sub">${fdt(v.date)}</div>
        </div>
        <span class="tag normal" style="font-size:12px">${v.statut}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Montant TTC</span>
        <span class="mcard-val" style="font-size:20px;color:var(--green)">${gnf(v.montant)}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Articles</span>
        <span class="mcard-val">${v.articles} article${v.articles>1?'s':''}</span>
      </div>
      <div class="mcard-row">
        <span class="mcard-lbl">Paiement</span>
        <span class="mcard-val" style="font-family:'DM Sans',sans-serif">${v.paiement}</span>
      </div>
      <div class="mcard-actions">
        <button class="btn btn-outline" onclick="printFacture(${v.id})">🧾 Facture</button>
        <button class="btn btn-outline" onclick="printTicket(${v.id})">🖨️ Reçu</button>
        <button class="btn btn-outline" onclick="openNewRetourFromVente(${v.id})">🔁</button>
      </div>
    </div>`).join(''):`<div class="empty"><div class="ico">🛒</div><p>Aucune vente</p></div>`;
  updVKpi();
}

function rdCmds(){
  const col={brouillon:'autre',envoyee:'alim',confirmee:'acc',livree:'normal',annulee:'rupture'};
  document.getElementById('tb-cmd').innerHTML=D.commandes.length?D.commandes.map(c=>`<tr>
    <td><code>${esc(c.num)}</code></td><td><b>${esc(c.fourn)}</b></td>
    <td style="font-size:11px">${c.date}</td><td style="font-size:11px">${c.prevue}</td>
    <td style="font-family:'DM Mono',monospace;font-weight:600">${gnf(c.montant)}</td>
    <td><span class="tag ${col[c.statut]||'autre'}">${c.statut}</span></td>
    <td style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="printBonCommande(${c.id})" title="Imprimer bon de commande">📄 BC</button>
      <button class="btn btn-success btn-sm" onclick="updCmd(${c.id},'livree')">✅</button>
      <button class="btn btn-danger btn-sm" onclick="delCmd(${c.id})">🗑️</button>
    </td>
  </tr>`).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">📋</div><p>Aucune commande</p></div></td></tr>`;
}

function rdInv(){
  document.getElementById('tb-inv').innerHTML=`
    <tr><td><code>INV-2026-003</code></td><td>Magasin Principal</td><td style="font-size:11px">2026-06-01 08:00</td><td style="font-size:11px">2026-06-01 17:30</td><td><span class="tag normal">Validé</span></td><td style="color:var(--red);font-family:'DM Mono',monospace">-45 000 GNF</td></tr>
    <tr><td><code>INV-2026-002</code></td><td>Dépôt Secondaire</td><td style="font-size:11px">2026-05-15 08:00</td><td style="font-size:11px">2026-05-15 14:00</td><td><span class="tag normal">Validé</span></td><td style="color:var(--green);font-family:'DM Mono',monospace">+12 000 GNF</td></tr>`;
}

function rdAlerts(){
  const al=computeAlerts();
  document.getElementById('alerts-list').innerHTML=al.length?al.map((a,i)=>`
    <div class="alert-item" id="al-${i}">
      <div class="alert-ico ${a.niv}">${a.niv==='critique'?'🚨':'⚠️'}</div>
      <div style="flex:1"><div style="font-size:12.5px;color:var(--text)"><b>${esc(a.prod)}</b> — ${esc(a.msg)}</div><div style="font-size:11px;color:var(--text3)">${a.time}</div></div>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('al-${i}').remove()">✓</button>
    </div>`).join(''):`<div class="empty"><div class="ico">✅</div><p>Aucune alerte active</p></div>`;
}

function rdFourn(){
  document.getElementById('tb-fourn').innerHTML=D.fournisseurs.map(f=>`<tr>
    <td><b>${esc(f.nom)}</b></td><td>${f.pays}</td><td>${f.delai}j</td>
    <td><button class="btn btn-danger btn-sm" onclick="delFourn(${f.id})">🗑️</button></td>
  </tr>`).join('');

  const pageBody=document.getElementById('tb-fournisseurs-page');
  const empty=document.getElementById('fournisseurs-empty');
  if(pageBody){
    pageBody.innerHTML=(D.fournisseurs||[]).map(f=>`<tr><td><strong>${esc(f.nom||'')}</strong></td><td>${esc(f.pays||'—')}</td><td>${Number(f.delai)||3}</td><td>${esc(f.tel||'—')}</td><td><button class="btn btn-danger btn-sm" onclick="delFourn(${f.id})">🗑️ Supprimer</button></td></tr>`).join('');
    if(empty)empty.style.display=(D.fournisseurs||[]).length?'none':'block';
  }
}

function rdUsers(){
  const adm=CU&&CU.role==='admin';
  document.getElementById('tb-users').innerHTML=D.utilisateurs.map(u=>{
    const off=(u.statut||'actif')==='inactif';
    return `<tr><td><b>${esc(u.nom)}</b></td><td>${esc(u.role)}</td><td>${esc(u.email||'')}</td>
    <td><span class="tag ${off?'critique':'normal'}">${esc(u.statut||'actif')}</span></td>
    <td style="white-space:nowrap">${adm?`<button class="btn btn-outline btn-sm" title="Changer le rôle" onclick="userEditRole(${+u.id})">✏️</button>
    <button class="btn btn-outline btn-sm" title="Envoyer un lien de réinitialisation du mot de passe" onclick="userResetMail(${+u.id})">🔑</button>
    <button class="btn btn-outline btn-sm" title="${off?'Réactiver':'Désactiver'}" onclick="userToggle(${+u.id})">${off?'✅':'⛔'}</button>`:''}</td></tr>`;}).join('');
}
// ═══════════════════════════════
//  KPIs & ALERTS
// ═══════════════════════════════
function recalcEtats(){
  D.produits.forEach(p=>{
    if(p.stock<=0)p.etat='rupture';
    else if(p.stock<=p.min)p.etat='critique';
    else if(p.stock>=p.max)p.etat='surstock';
    else p.etat='normal';
  });
}
function computeAlerts(){
  const al=[];
  D.produits.forEach(p=>{
    if(p.stock<=0){
      al.push({niv:'critique',prod:p.designation,msg:'Rupture de stock totale',time:'maintenant'});
      sendNotification('🚨 Rupture stock',p.designation+' — Stock épuisé');
    }
    else if(p.stock<=p.min){
      al.push({niv:'warning',prod:p.designation,msg:`Stock minimum atteint (${p.stock} ${esc(p.unite||'u.')})`,time:'maintenant'});
      sendNotification('⚠️ Stock critique',p.designation+' — '+p.stock+' '+( p.unite||'u.')+' restant(s)');
    }
    if(p.stock>=p.max)al.push({niv:'warning',prod:p.designation,msg:`Surstock (${p.stock}/${p.max})`,time:'maintenant'});
  });
  const nb=al.length,b=document.getElementById('nbadge');
  b.textContent=nb;b.style.display=nb?'':'none';
  const da=document.getElementById('dash-alerts');
  if(da)da.innerHTML=al.slice(0,4).map(a=>`
    <div class="alert-item"><div class="alert-ico ${a.niv}">${a.niv==='critique'?'🚨':'⚠️'}</div>
    <div><div style="font-size:12.5px;color:var(--text)"><b>${esc(a.prod)}</b> — ${esc(a.msg)}</div><div style="font-size:11px;color:var(--text3)">${a.time}</div></div></div>`).join('')||'<div class="empty"><div class="ico">✅</div><p>Aucune alerte</p></div>';
  return al;
}
function updateKPIs(){
  const val=D.produits.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.achat)||0),0);
  const rup=D.produits.filter(p=>p.etat==='rupture').length;
  const al=computeAlerts();
  document.getElementById('k-prod').textContent=D.produits.length;
  // Delta produits actifs : normal vs critique/rupture
  const nbOk=D.produits.filter(p=>p.etat==='normal'||p.etat==='surstock').length;
  const nbKo=D.produits.filter(p=>p.etat==='critique'||p.etat==='rupture').length;
  const deltaEl=document.getElementById('k-prod-delta');
  if(deltaEl){
    if(nbKo===0){deltaEl.textContent='✅ Tous en stock';deltaEl.className='kpi-delta delta-up';}
    else{deltaEl.textContent=nbKo+' en alerte, '+nbOk+' OK';deltaEl.className='kpi-delta delta-dn';}
  }
  document.getElementById('k-val').textContent=Math.round(val).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ');
  document.getElementById('k-al').textContent=al.length;
  document.getElementById('k-rup').textContent=rup;
  document.getElementById('r-val').textContent=Math.round(val).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF';
  const curMonth=new Date().toISOString().slice(0,7);
  const ca=D.ventes.filter(v=>(v.date||'').startsWith(curMonth)).reduce((s,v)=>s+v.montant,0);
  document.getElementById('r-vnt').textContent=Math.round(ca).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF';
  // Marge brute dynamique dans ventes
  const mgEl=document.getElementById('vk-mg');
  if(mgEl){
    const vj=D.ventes.filter(v=>(v.date||'').startsWith(new Date().toISOString().slice(0,10)));
    let caVJ=0,coutVJ=0;
    vj.forEach(v=>(v.lignes||[]).forEach(l=>{
      caVJ+=l.qte*l.prix;
      const p=D.produits.find(x=>x.id===l.produit_id);
      if(p)coutVJ+=l.qte*p.achat;
    }));
    mgEl.textContent=caVJ>0?Math.round((caVJ-coutVJ)/caVJ*100)+'%':'0%';
  }
  updTop5();
  updAppro();
}
function updTop5(){
  const s={};D.mouvements.filter(m=>m.type==='sortie').forEach(m=>{const k=m.produit||m.produit_id;s[k]=(s[k]||0)+m.qte;});
  const sd=Object.entries(s).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById('top5').innerHTML=sd.length?`<table><thead><tr><th>Produit</th><th>Sorties</th></tr></thead><tbody>${sd.map(([p,q])=>`<tr><td>${esc(p)}</td><td><b style="font-family:'DM Mono',monospace">${q}</b></td></tr>`).join('')}</tbody></table>`:`<div class="empty"><div class="ico">📊</div><p>Aucune donnée</p></div>`;
}

function updAppro(){
  const el=document.getElementById('dash-appro');if(!el)return;
  // Produits en rupture ou critique → suggérer commande
  const besoins=D.produits.filter(p=>p.etat==='rupture'||p.etat==='critique').sort((a,b)=>{
    if(a.etat==='rupture'&&b.etat!=='rupture')return -1;
    if(b.etat==='rupture'&&a.etat!=='rupture')return 1;
    return a.stock-b.stock;
  });
  if(!besoins.length){
    el.innerHTML='<div class="empty"><div class="ico">✅</div><p>Tous les stocks sont suffisants</p></div>';
    return;
  }
  el.innerHTML=`<table><thead><tr>
    <th>Produit</th><th>Stock actuel</th><th>Minimum</th><th>À commander</th><th>Fournisseur</th><th>Action</th>
  </tr></thead><tbody>${besoins.map(p=>{
    const qteCmd=Math.max(p.max-p.stock, p.min*2);
    const isRup=p.etat==='rupture';
    return`<tr>
      <td><b style="color:var(--text)">${esc(p.designation)}</b><br><code style="font-size:10px">${esc(p.code)}</code></td>
      <td><span class="tag ${p.etat}" style="font-size:12px">${p.stock} ${esc(p.unite||'u.')}</span></td>
      <td style="color:var(--text3);font-size:12px">${p.min} ${esc(p.unite||'u.')}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:700;color:var(--blue)">${qteCmd} ${esc(p.unite||'u.')}</td>
      <td style="font-size:12px;color:var(--text2)">${esc(p.fournisseur||'—')}</td>
      <td><button class="btn btn-sm ${isRup?'btn-danger':'btn-outline'}" onclick="openCmdPrefill(${p.id})" title="Créer commande">
        ${isRup?'🚨 Commander':'📋 Commander'}
      </button></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function openCmdPrefill(pid){
  const p=D.produits.find(x=>x.id===pid);if(!p)return;
  goPage('commandes',document.querySelector('[onclick*=commandes]'));
  setTimeout(()=>{
    openM('m-cmd');
    const sel=document.getElementById('c-fourn');
    if(sel){for(let o of sel.options){if(o.value===p.fournisseur||o.text===p.fournisseur){sel.value=o.value;break;}}}
    const note=document.getElementById('c-note');
    if(note)note.value=`Réapprovisionnement ${esc(p.designation)} (${esc(p.code)}) — Stock actuel: ${p.stock} ${esc(p.unite||'u.')}, À commander: ${Math.max(p.max-p.stock,p.min*2)} ${esc(p.unite||'u.')}`;
    const mnt=document.getElementById('c-mnt');
    if(mnt)mnt.value=Math.max(p.max-p.stock,p.min*2)*p.achat;
  },200);
}
function updVKpi(){
  const td=new Date().toISOString().slice(0,10),tv=D.ventes.filter(v=>(v.date||'').startsWith(td));
  const ca=tv.reduce((s,v)=>s+v.montant,0),nb=tv.length,mm=tv.filter(v=>v.paiement==='Orange Money'||v.paiement==='MTN Money').length;
  document.getElementById('vk-ca').textContent=gnf(ca);
  document.getElementById('vk-nb').textContent=nb;
  document.getElementById('vk-mm').textContent=nb?Math.round(mm/nb*100)+'%':'0%';
}
function markAllRead(){document.getElementById('alerts-list').innerHTML='<div class="empty"><div class="ico">✅</div><p>Toutes les alertes lues</p></div>';document.getElementById('nbadge').style.display='none';}

// Photo produit : aperçu et stockage local dans les données de l'application
let currentProduitPhoto='';
function previewProduitPhoto(input){
  const file=input.files&&input.files[0];if(!file)return;
  const LIMITE_PHOTO_PRODUIT=8*1024*1024; // fichier source max 8 Mo ; l'image est ensuite compressée (~100 Ko)
  if(!file.type.startsWith('image/')){
    toast('Veuillez choisir un fichier image','error');input.value='';return;
  }
  if(file.size>LIMITE_PHOTO_PRODUIT){
    toast('Photo refusée : 8 Mo maximum avant compression.','error');
    input.value='';return;
  }
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const MAX=720,r=Math.min(1,MAX/Math.max(img.width,img.height));
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*r));c.height=Math.max(1,Math.round(img.height*r));
        const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
        let q=.8,out=c.toDataURL('image/jpeg',q);
        while(out.length>180000&&q>.4){q-=.1;out=c.toDataURL('image/jpeg',q);}
        currentProduitPhoto=out;renderProduitPhotoPreview();
      }catch(err){toast('Compression impossible : '+err.message,'error');input.value='';}
    };
    img.onerror=()=>{toast('Image illisible. Essayez un autre fichier.','error');input.value='';};
    img.src=e.target.result;
  };
  reader.onerror=()=>{toast('Impossible de lire cette photo. Réessayez.','error');input.value='';};
  reader.readAsDataURL(file);
}
function renderProduitPhotoPreview(){
  const el=document.getElementById('p-photo-preview');if(!el)return;
  el.innerHTML=currentProduitPhoto?`<img src="${currentProduitPhoto}" alt="Aperçu de la photo du produit">`:'<span class="photo-placeholder">📷</span><span>Aperçu de la photo</span>';
}
function clearProduitPhoto(){currentProduitPhoto='';const input=document.getElementById('p-photo-file');if(input)input.value='';renderProduitPhotoPreview();}

// ═══════════════════════════════
//  CRUD PRODUITS
// ═══════════════════════════════
function openNewProduit(){
  currentProduitPhoto='';const photoInput=document.getElementById('p-photo-file');if(photoInput)photoInput.value='';renderProduitPhotoPreview();
  document.getElementById('p-id').value='';
  document.getElementById('m-prod-title').textContent='📦 Nouveau Produit';
  ['p-des','p-unit','p-achat','p-vente','p-desc','p-dlc','p-temp'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('p-stk').value='0';
  document.getElementById('p-min').value='5';
  document.getElementById('p-max').value='100';
  document.getElementById('p-cat').value='alimentaire';
  togPerish();openM('m-prod');
}
function editProd(id){
  const p=D.produits.find(x=>x.id===id);if(!p)return;
  currentProduitPhoto=p.photo||'';const photoInput=document.getElementById('p-photo-file');if(photoInput)photoInput.value='';renderProduitPhotoPreview();
  document.getElementById('p-id').value=id;
  document.getElementById('m-prod-title').textContent='✏️ Modifier Produit';
  document.getElementById('p-des').value=p.designation;
  document.getElementById('p-cat').value=p.categorie;
  document.getElementById('p-unit').value=p.unite||'';
  document.getElementById('p-achat').value=p.achat;
  document.getElementById('p-vente').value=p.vente;
  document.getElementById('p-stk').value=p.stock;
  document.getElementById('p-min').value=p.min;
  document.getElementById('p-max').value=p.max;
  document.getElementById('p-desc').value=p.description||'';
  const sel=document.getElementById('p-fourn');
  for(let o of sel.options){if(o.value===p.fournisseur||o.text===p.fournisseur){sel.value=o.value;break;}}
  togPerish();openM('m-prod');
}
async function saveProduit(){
  const des=document.getElementById('p-des').value.trim();
  if(!des){toast('Désignation requise','error');return;}
  const id=document.getElementById('p-id').value;
  const data={designation:des,categorie:document.getElementById('p-cat').value,unite:document.getElementById('p-unit').value,
    achat:+document.getElementById('p-achat').value||0,vente:+document.getElementById('p-vente').value||0,
    stock:+document.getElementById('p-stk').value||0,min:document.getElementById('p-min').value===''?5:Math.max(0,+document.getElementById('p-min').value),
    max:document.getElementById('p-max').value===''?100:Math.max(0,+document.getElementById('p-max').value),fournisseur:document.getElementById('p-fourn').value,
    description:document.getElementById('p-desc').value,
    photo:currentProduitPhoto||''};
  if(id){
    const i=D.produits.findIndex(x=>x.id==id);if(i>=0)D.produits[i]={...D.produits[i],...data};
    if(sb)await sb.from('produits').update(data).eq('id',id);
    logAction('UPDATE','Produit modifié: '+des);
    toast('Produit mis à jour','success');
  }else{
    const catSlug=data.categorie||'aut';let code,_ct=0;do{code=catSlug.substring(0,3).toUpperCase()+'-'+(Date.now()+_ct++).toString(36).toUpperCase().slice(-4);}while(D.produits.some(x=>x.code===code));
    D.produits.unshift({id:nid('produits'),code,...data,etat:'rupture'});
    if(sb)await sb.from('produits').insert(D.produits[0]);
    logAction('CREATE','Produit créé: '+des);
    toast('Produit "'+des+'" créé','success');
  }
  sv('db_p','produits');recalcEtats();closeM('m-prod');rdProduits();updateKPIs();computeAlerts();
}
async function delProd(id){
  if(!confirm('Supprimer ce produit ?'))return;
  D.produits=D.produits.filter(p=>p.id!==id);
  if(sb)await sb.from('produits').delete().eq('id',id);
  sv('db_p','produits');rdProduits();updateKPIs();computeAlerts();logAction('DELETE','Produit supprimé id:'+id);toast('Produit supprimé','warning');
}
function togPerish(){const slug=document.getElementById('p-cat').value;const cat=getCat(slug);document.getElementById('pf').style.display=cat.perishable?'grid':'none';}

// ═══════════════════════════════
//  MOUVEMENTS
// ═══════════════════════════════
async function saveMvt(){
  const qte=+document.getElementById('mv-qte').value,type=document.getElementById('mv-type').value;
  if(!qte||qte<=0){toast('Quantité invalide','error');return;}
  const sel=document.getElementById('mv-prod'),pid=+sel.value,pnm=sel.selectedOptions[0].text;
  const now=new Date().toISOString().slice(0,16).replace('T',' ');
  const nm={id:nid('mouvements'),date:now,type,produit_id:pid,produit:pnm,qte,
    prix:+document.getElementById('mv-prix').value||0,ref:document.getElementById('mv-ref').value.trim()||autoRef(({entree:'ENT',sortie:'SOR',perte:'PRT',transfert:'TRF',ajustement:'AJT'}[type]||'MVT'),'mouvements'),
    user:CU?.nom||'Admin',notes:document.getElementById('mv-note').value};
  D.mouvements.unshift(nm);
  const p=D.produits.find(x=>String(x.id)===String(pid));
  if(p&&(type==='sortie'||type==='perte')&&qte>Number(p.stock||0)){toast('Stock insuffisant : disponible '+(p.stock||0),'error');return;}
  if(p){
    if(type==='entree')p.stock=Number(p.stock||0)+qte;
    else if(type==='sortie'||type==='perte')p.stock=Number(p.stock||0)-qte;
    else if(type==='ajustement')p.stock=qte;
    recalcEtats();if(sb)await sb.from('produits').update({stock:p.stock,etat:p.etat}).eq('id',p.id);sv('db_p','produits');
  }
  if(sb)await sb.from('mouvements').insert(nm);sv('db_m','mouvements');
  closeM('m-mvt');toast(`Mouvement "${type}" — ${qte} × ${pnm}`,'success');
  document.getElementById('mv-qte').value='';document.getElementById('mv-ref').value='';document.getElementById('mv-note').value='';
  rdMvt();rdProduits();updateKPIs();computeAlerts();
}
function delMvt(id){
  if(!confirm('Supprimer l’historique de ce mouvement ? Le stock ne sera PAS recalculé automatiquement. Continuer ?'))return;
  D.mouvements=D.mouvements.filter(m=>m.id!==id);
  sv('db_m','mouvements');rdMvt();toast('Mouvement supprimé','warning');
}

// ═══════════════════════════════
//  VENTES
// ═══════════════════════════════
let LV=[];
function addLigne(){
  const sel=document.getElementById('vl-prod'),pid=+sel.value,p=D.produits.find(x=>x.id===pid);
  if(!p)return;
  const qte=+document.getElementById('vl-qte').value||1;
  const ex=LV.find(l=>l.produit_id===pid);
  if(ex)ex.qte+=qte;else LV.push({produit_id:pid,produit:p.designation,qte,prix:p.vente});
  rdLV();
}
function rdLV(){
  if(!LV.length){document.getElementById('vl-list').innerHTML='<p style="color:var(--text3);font-size:12px;text-align:center;padding:8px">Aucun article</p>';document.getElementById('v-tot').textContent='0 GNF';return;}
  document.getElementById('vl-list').innerHTML=LV.map((l,i)=>`
    <div class="hitem">
      <span>${esc(l.produit)} × <b>${l.qte}</b></span>
      <span style="font-family:'DM Mono',monospace;color:var(--green)">${gnf(l.qte*l.prix)}</span>
      <button class="btn btn-danger btn-sm" onclick="rmLigne(${i})">✕</button>
    </div>`).join('');
  calcTotal();
}
function rmLigne(i){LV.splice(i,1);rdLV();}
function calcTotal(){
  const rem=+document.getElementById('v-rem').value||0,tot=Math.max(0,LV.reduce((s,l)=>s+l.qte*l.prix,0)-rem);
  document.getElementById('v-tot').textContent=gnf(tot);
}
async function saveVente(){
  if(!LV.length){toast('Ajoutez au moins un article','error');return;}
  const subtotal=LV.reduce((s,l)=>s+(Number(l.qte)||0)*(Number(l.prix)||0),0);
  const rem=Number(document.getElementById('v-rem').value);
  if(!Number.isFinite(rem)||rem<0||rem>subtotal){toast('Remise invalide : elle doit être comprise entre 0 et le sous-total','error');return;}
  for(const l of LV){
    const p=D.produits.find(x=>String(x.id)===String(l.produit_id));
    if(!p){toast('Un produit du panier est introuvable','error');return;}
    if(!Number.isInteger(Number(l.qte))||Number(l.qte)<=0){toast('Quantité invalide pour '+l.produit,'error');return;}
    if(Number(l.qte)>Number(p.stock||0)){toast('Stock insuffisant pour '+l.produit+' (disponible : '+(p.stock||0)+')','error');return;}
    if(!Number.isFinite(Number(l.prix))||Number(l.prix)<0){toast('Prix invalide pour '+l.produit,'error');return;}
  }
  const tot=subtotal-rem;
  if(tot<=0){toast('Le total de la vente doit être supérieur à zéro','error');return;}
  const paiement=document.getElementById('v-pay').value;
  const clientId=Number(document.getElementById('v-client')?.value)||null;
  const acompte=paiement==='credit'?Number(document.getElementById('v-acompte')?.value||0):0;
  if(paiement==='credit'&&!clientId){toast('Sélectionnez un client pour une vente à crédit','error');return;}
  if(!Number.isFinite(acompte)||acompte<0||acompte>tot){toast('Acompte invalide : il doit être compris entre 0 et le total','error');return;}
  const now=new Date().toISOString().slice(0,16).replace('T',' ');
  const lignes=LV.map(l=>{const p=D.produits.find(x=>String(x.id)===String(l.produit_id));return {...l,cout_achat:Number(p?.achat)||0};});
  const nv={id:nid('ventes'),num:'VTE-'+new Date().getFullYear()+'-'+nseq('ventes'),date:now,
    articles:lignes.length,montant:tot,paiement,client_id:clientId,statut:'finalisee',lignes};
  D.ventes.unshift(nv);
  for(const l of lignes){
    const p=D.produits.find(x=>String(x.id)===String(l.produit_id));
    if(p)p.stock=Number(p.stock||0)-Number(l.qte);
    D.mouvements.unshift({id:nid('mouvements'),date:now,type:'sortie',produit_id:l.produit_id,produit:l.produit,qte:l.qte,ref:nv.num,user:CU?.nom||'Caissier'});
  }
  recalcEtats();if(sb)await sb.from('ventes').insert(nv);
  sv('db_v','ventes');sv('db_m','mouvements');sv('db_p','produits');
  if(paiement==='credit'&&clientId){const c=D.clients.find(x=>String(x.id)===String(clientId));if(c){c.dette=(Number(c.dette)||0)+(tot-acompte);c.last_vente=now.slice(0,10);localStorage.setItem('db_cl',JSON.stringify(D.clients));rdClients();}}
  logAction('VENTE','Vente '+nv.num+' — '+gnf(tot)+' — '+nv.paiement);
  LV=[];document.getElementById('vl-list').innerHTML='<p style="color:var(--text3);font-size:12px;text-align:center;padding:8px">Aucun article</p>';
  document.getElementById('v-tot').textContent='0 GNF';document.getElementById('v-rem').value='0';
  const acompEl=document.getElementById('v-acompte');if(acompEl)acompEl.value='0';
  closeM('m-vente');toast('Vente encaissée — '+gnf(tot),'success');rdVentes();rdProduits();updateKPIs();computeAlerts();
}

// ═══════════════════════════════
//  COMMANDES
// ═══════════════════════════════
async function saveCmd(){
  const fo=document.getElementById('c-fourn').value;if(!fo){toast('Fournisseur requis','error');return;}
  const nc={id:nid('commandes'),num:'CMD-'+new Date().getFullYear()+'-'+nseq('commandes'),fourn:fo,
    date:document.getElementById('c-date').value,prevue:document.getElementById('c-prev').value,
    montant:+document.getElementById('c-mnt').value||0,statut:'envoyee',notes:document.getElementById('c-note').value};
  D.commandes.unshift(nc);if(sb)await sb.from('commandes').insert(nc);
  sv('db_c','commandes');closeM('m-cmd');rdCmds();toast('Commande envoyée','success');
}
function updCmd(id,st){const c=D.commandes.find(x=>x.id===id);if(c){c.statut=st;sv('db_c','commandes');rdCmds();toast('Commande mise à jour','success');}}
function delCmd(id){if(!confirm('Supprimer ?'))return;D.commandes=D.commandes.filter(c=>c.id!==id);sv('db_c','commandes');rdCmds();toast('Commande supprimée','warning');}

// ═══════════════════════════════
//  BON DE COMMANDE PDF
// ═══════════════════════════════
function printBonCommande(id){
  const cmd=D.commandes.find(x=>x.id===id);if(!cmd){toast('Commande introuvable','error');return;}
  const fourn=D.fournisseurs.find(f=>f.nom===cmd.fourn||f.id===cmd.fourn)||{nom:cmd.fourn||'—',pays:'Guinée',tel:'—'};
  const {jsPDF}=window.jspdf,doc=new jsPDF();
  const TEAL=[0,174,199],DARK=[15,23,42],GREY=[100,116,139],LIGHT=[248,250,252],WHITE=[255,255,255],BLACK=[30,40,60];
  const dateStr=cmd.date?new Date(cmd.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
  const W=210,H=297;

  // ── TITRE ──
  doc.setFillColor(...WHITE);doc.rect(0,0,W,H,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(26);doc.setTextColor(...TEAL);
  doc.text('Bon de commande',14,22);
  // Logo placeholder (cercle orange)
  doc.setFillColor(245,158,11);doc.circle(190,18,11,'F');
  doc.setFillColor(...WHITE);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...WHITE);
  doc.text('N’GUILLA',190,15.5,{align:'center'});doc.text('& FRÈRES',190,19,{align:'center'});
  // Ligne teal sous le titre
  doc.setDrawColor(...TEAL);doc.setLineWidth(1.5);doc.line(14,28,196,28);

  // ── INFOS ÉMETTEUR ──
  let y=38;
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...BLACK);
  doc.text('ETS N’GUILLA & FRÈRES',14,y);y+=5;
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...GREY);
  doc.text('Conakry, Guinée',14,y);y+=4.5;
  doc.text('Tél : +224 6xx xxx xxx',14,y);y+=4.5;
  doc.text('habatech@gmail.com',14,y);

  // ── TABLEAU INFOS COMMANDE (gauche) ──
  y=60;
  const infoRows=[
    ['Date :', dateStr],
    ['Bon de commande N° :', cmd.num||'—'],
    ['Fournisseur :', fourn.nom],
    ['Livraison prévue :', cmd.prevue||'—'],
    ['Mode paiement :', '30 jours'],
    ['Émis par :', CU?.nom||'Admin'],
    ['Tél. fournisseur :', fourn.tel||'—'],
  ];
  doc.setDrawColor(220,225,235);doc.setLineWidth(0.3);
  doc.setFillColor(245,248,252);doc.roundedRect(13,y-5,88,infoRows.length*7+4,2,2,'F');
  doc.rect(13,y-5,88,infoRows.length*7+4,'S');
  infoRows.forEach(([lbl,val])=>{
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...GREY);
    doc.text(lbl,16,y);
    doc.setFont('helvetica','bold');doc.setTextColor(...BLACK);
    doc.text(String(val),62,y);
    y+=7;
  });

  // ── DESTINATAIRE (droite) ──
  const dY=60;
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...BLACK);
  doc.text('Destinataire',112,dY);
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...BLACK);
  doc.text(fourn.nom,112,dY+7);
  doc.setFont('helvetica','italic');doc.setFontSize(8.5);doc.setTextColor(...GREY);
  doc.text(fourn.pays||'Guinée',112,dY+13);
  if(fourn.tel&&fourn.tel!=='—'){doc.text('Tél : '+fourn.tel,112,dY+18);}
  doc.text('Délai livraison : '+(fourn.delai||3)+' jours',112,dY+24);

  // ── NOTES ──
  let ny=y+8;
  if(cmd.notes){
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...BLACK);
    doc.text('Informations additionnelles',14,ny);ny+=5;
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...GREY);
    const lines=doc.splitTextToSize(cmd.notes,180);
    lines.forEach(l=>{doc.text(l,14,ny);ny+=4.5;});
    ny+=3;
  } else { ny+=4; }

  // ── TABLEAU ARTICLES ──
  // Construire les lignes depuis les notes ou une ligne générique
  const lignesCmd=[];
  if(cmd.notes){
    // Parser si les notes contiennent des produits listés
    const m=cmd.notes.match(/Réapprovisionnement (.+?) \((.+?)\).*À commander: ([\d.]+)/);
    if(m){
      const qte=parseFloat(m[3])||1;
      const prod=D.produits.find(p=>p.designation===m[1]||p.code===m[2]);
      const pu=prod?.achat||0;
      lignesCmd.push({ref:m[2],desc:m[1],qte,unite:prod?.unite||'u.',pu,tva:0,totalTva:0,totalTTC:qte*pu});
    }
  }
  // Si pas de ligne parsée, ligne générique
  if(!lignesCmd.length){
    lignesCmd.push({ref:'—',desc:cmd.notes||'Commande fournisseur',qte:1,unite:'u.',pu:cmd.montant,tva:0,totalTva:0,totalTTC:cmd.montant});
  }

  const COL={ref:14,desc:40,qte:98,unit:113,pu:125,tva:147,tvaTot:162,ttc:177};
  const colW=196-14;
  // En-tête tableau
  doc.setFillColor(...DARK);doc.roundedRect(13,ny-5,colW,10,1,1,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...WHITE);
  doc.text('Réf. produit',COL.ref+1,ny);
  doc.text('Description',COL.desc,ny);
  doc.text('Qté',COL.qte,ny);
  doc.text('Unité',COL.unit,ny);
  doc.text('Prix unit. HT',COL.pu,ny);
  doc.text('% TVA',COL.tva,ny);
  doc.text('Total TVA',COL.tvaTot,ny);
  doc.text('Total TTC',COL.ttc,ny);
  ny+=9;

  // Lignes articles
  let totalHT=0,totalTVA=0,totalTTC=0;
  lignesCmd.forEach((l,i)=>{
    if(i%2===0){doc.setFillColor(...LIGHT);doc.rect(13,ny-4,colW,8.5,'F');}
    doc.setDrawColor(220,225,235);doc.setLineWidth(0.2);doc.line(13,ny+4.5,196,ny+4.5);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...BLACK);
    doc.text(String(l.ref),COL.ref+1,ny);
    doc.text(l.desc.substring(0,28),COL.desc,ny);
    doc.text(String(l.qte),COL.qte+2,ny);
    doc.text(l.unite,COL.unit,ny);
    doc.text(l.pu.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF',COL.pu,ny);
    doc.text(l.tva+'%',COL.tva+1,ny);
    doc.text(l.totalTva.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '),COL.tvaTot,ny);
    doc.text(l.totalTTC.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF',COL.ttc,ny);
    totalHT+=l.pu*l.qte;totalTVA+=l.totalTva;totalTTC+=l.totalTTC;
    ny+=9;
  });
  ny+=4;

  // ── TOTAUX ──
  doc.setDrawColor(...TEAL);doc.setLineWidth(0.5);doc.line(120,ny,196,ny);ny+=5;
  const totRows=[
    ['Total HT',totalHT.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF',false],
    ['Total TVA',totalTVA.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF',false],
    ['Frais de livraison','0 GNF',false],
    ['Total TTC',cmd.montant.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF',true],
  ];
  totRows.forEach(([lbl,val,bold])=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(bold?9.5:8.5);
    doc.setTextColor(...(bold?TEAL:GREY));
    doc.text(lbl,133,ny,{align:'right'});
    doc.setTextColor(...(bold?TEAL:BLACK));
    doc.text(val,196,ny,{align:'right'});
    if(bold){doc.setDrawColor(...TEAL);doc.setLineWidth(0.5);doc.line(120,ny+2,196,ny+2);}
    ny+=6;
  });

  // ── SIGNATURE ──
  ny+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...GREY);
  doc.text('Signature :',14,ny);
  doc.setDrawColor(180,190,200);doc.setLineWidth(0.3);doc.line(35,ny,100,ny);

  // ── PIED DE PAGE (3 colonnes) ──
  const footY=H-28;
  doc.setDrawColor(220,225,235);doc.setLineWidth(0.5);doc.line(14,footY-4,196,footY-4);
  const foot=[
    {title:'Siège social',lines:['ETS N’GUILLA & FRÈRES','Conakry, Guinée','N° Siren : HABATECH-2026']},
    {title:'Coordonnées',lines:['Admin : '+( CU?.nom||'Admin'),'Tél : +224 6xx xxx xxx','E-mail : habatech@gmail.com','www.habatech.com']},
    {title:'Informations commande',lines:['N° : '+cmd.num,'Statut : '+cmd.statut,'Livraison : '+(cmd.prevue||'—')]},
  ];
  foot.forEach((col,ci)=>{
    const fx=14+ci*61;
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...BLACK);
    doc.text(col.title,fx,footY+1);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...GREY);
    col.lines.forEach((ln,li)=>doc.text(ln,fx,footY+6+li*4));
  });

  doc.save('BonCommande_'+cmd.num+'_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 Bon de commande téléchargé','success');
  logAction('CREATE','Bon de commande PDF : '+cmd.num);
}

// ═══════════════════════════════
//  FOURNISSEURS & USERS
// ═══════════════════════════════
async function saveFourn(){
  const nom=document.getElementById('f-nom').value.trim();if(!nom){toast('Nom requis','error');return;}
  const nf={id:nid('fournisseurs'),nom,pays:document.getElementById('f-pays').value,
    delai:+document.getElementById('f-del').value||3,tel:document.getElementById('f-tel').value};
  D.fournisseurs.push(nf);if(sb)await sb.from('fournisseurs').insert(nf);
  sv('db_f','fournisseurs');closeM('m-fourn');rdFourn();fillSelects();toast('Fournisseur ajouté','success');
}
function delFourn(id){if(!confirm('Supprimer ?'))return;D.fournisseurs=D.fournisseurs.filter(f=>f.id!==id);sv('db_f','fournisseurs');rdFourn();fillSelects();}
async function saveUser(){
  const nom=document.getElementById('uu-nom').value.trim(),em=document.getElementById('uu-email').value.trim().toLowerCase(),
        role=document.getElementById('uu-role').value,pw=document.getElementById('uu-pass').value;
  if(!nom||!em){toast('Nom et email requis','error');return;}
  if(D.utilisateurs.some(u=>String(u.email||'').toLowerCase()===em)){toast('Cet email existe déjà','error');return;}
  const rec={id:nid('utilisateurs'),nom,email:em,role,statut:'actif'};
  if(ACCESS_MODE==='cloud'&&sb&&firebaseApp){
    if(!CU||CU.role!=='admin'){toast('Réservé aux administrateurs','error');return;}
    if(pw.length<6){toast('Mot de passe : 6 caractères minimum','error');return;}
    let sec=null;
    try{
      showSync('Création du compte…','');
      // 2e instance Firebase : évite de déconnecter l'administrateur courant
      sec=firebase.initializeApp(firebaseApp.options,'sec'+Date.now());
      const c=await sec.auth().createUserWithEmailAndPassword(em,pw);
      rec.uid=c.user.uid;
      await sec.auth().signOut();
      await firestoreDB.collection('members').doc(rec.uid).set({email:em,nom});
      if(role==='admin')await firestoreDB.collection('admins').doc(rec.uid).set({email:em,nom});
    }catch(e){
      hideSync();
      const m={'auth/email-already-in-use':'Compte Firebase déjà existant pour cet email','auth/weak-password':'Mot de passe trop faible','auth/invalid-email':'Email invalide','auth/operation-not-allowed':'Activez Email/Mot de passe dans Firebase Authentication'}[e.code]||e.message;
      toast('Création impossible : '+m,'error');
      if(sec)try{await sec.delete();}catch(_){}
      return;
    }
    try{await sec.delete();}catch(_){}
    hideSync();
  }
  if(ACCESS_MODE!=='cloud'){
    if(pw.length<6){toast('Mot de passe : 6 caractères minimum','error');return;}
    try{await localAddAccount(em,nom,role,pw);}catch(e){toast('Création impossible : '+e.message,'error');return;}
  }
  D.utilisateurs.push(rec);
  sv('db_u','utilisateurs');try{syncSoon('utilisateurs');}catch(_){}
  ['uu-nom','uu-email','uu-pass'].forEach(i=>document.getElementById(i).value='');
  closeM('m-user');rdUsers();
  toast(ACCESS_MODE==='cloud'?'Utilisateur créé (compte + rôle)':'Utilisateur ajouté (local)','success');
}

// ── Gestion des utilisateurs (rôles, activation, mot de passe) ──
function _cloudOn(){return ACCESS_MODE==='cloud'&&sb&&firebaseApp&&firestoreDB;}
function _uById(id){return D.utilisateurs.find(u=>+u.id===+id);}
function _activeAdmins(){return D.utilisateurs.filter(u=>u.role==='admin'&&(u.statut||'actif')==='actif');}
function _isSelf(u){return CU&&String(CU.email||'').toLowerCase()===String(u.email||'').toLowerCase();}
function _needAdmin(){if(!CU||CU.role!=='admin'){toast('Réservé aux administrateurs','error');return false;}return true;}
function _saveUsers(){sv('db_u','utilisateurs');try{syncSoon('utilisateurs');}catch(_){}rdUsers();}
function userEditRole(id){
  if(!_needAdmin())return;const u=_uById(id);if(!u)return;
  document.getElementById('ur-id').value=u.id;document.getElementById('ur-nom').textContent=u.nom+' — '+(u.email||'');
  document.getElementById('ur-role').value=u.role;openM('m-urole');
}
async function userSaveRole(){
  if(!_needAdmin())return;const u=_uById(document.getElementById('ur-id').value);if(!u)return;
  const nr=document.getElementById('ur-role').value;if(nr===u.role){closeM('m-urole');return;}
  if(u.role==='admin'&&nr!=='admin'){
    if(_isSelf(u)){toast('Vous ne pouvez pas retirer votre propre rôle admin','error');return;}
    if(_activeAdmins().length<=1){toast('Il doit rester au moins un admin actif','error');return;}
  }
  try{
    if(_cloudOn()){
      if(nr==='admin'&&!u.uid){toast('Compte sans UID : recréez cet utilisateur pour lui donner le rôle admin','error');return;}
      showSync('Mise à jour du rôle…','');
      if(u.uid){if(nr==='admin')await firestoreDB.collection('admins').doc(u.uid).set({email:u.email,nom:u.nom});else await firestoreDB.collection('admins').doc(u.uid).delete();}
      hideSync();
    }
    u.role=nr;_saveUsers();closeM('m-urole');toast('Rôle mis à jour','success');
  }catch(e){hideSync();toast('Échec : '+e.message,'error');}
}
async function userToggle(id){
  if(!_needAdmin())return;const u=_uById(id);if(!u)return;
  const off=(u.statut||'actif')==='inactif';
  if(!off){
    if(_isSelf(u)){toast('Vous ne pouvez pas désactiver votre propre compte','error');return;}
    if(u.role==='admin'&&_activeAdmins().length<=1){toast('Il doit rester au moins un admin actif','error');return;}
  }
  if(!confirm((off?'Réactiver ':'Désactiver ')+u.nom+' ?'))return;
  try{
    if(_cloudOn()){
      if(!u.uid){toast('Compte sans UID : recréez cet utilisateur pour pouvoir le désactiver','error');return;}
      showSync(off?'Réactivation…':'Désactivation…','');
      if(off){await firestoreDB.collection('members').doc(u.uid).set({email:u.email,nom:u.nom});if(u.role==='admin')await firestoreDB.collection('admins').doc(u.uid).set({email:u.email,nom:u.nom});}
      else{await firestoreDB.collection('members').doc(u.uid).delete();await firestoreDB.collection('admins').doc(u.uid).delete();}
      hideSync();
    }
    u.statut=off?'actif':'inactif';_saveUsers();toast(off?'Compte réactivé':'Compte désactivé (accès Firestore bloqué)','success');
  }catch(e){hideSync();toast('Échec : '+e.message,'error');}
}
async function userResetMail(id){
  if(!_needAdmin())return;const u=_uById(id);if(!u)return;
  if(ACCESS_MODE!=='cloud'&&typeof localResetPassword==='function'){localResetPassword(id);return;}
  if(!_cloudOn()){toast('Disponible en mode Cloud uniquement','warning');return;}
  if(!u.email||!confirm('Envoyer un lien de réinitialisation à '+u.email+' ?'))return;
  try{await firebaseAuth.sendPasswordResetEmail(u.email);toast('Lien envoyé à '+u.email,'success');}
  catch(e){toast('Échec : '+(e.code==='auth/user-not-found'?'aucun compte Firebase pour cet email':e.message),'error');}
}
async function myPassword(){
  if(ACCESS_MODE!=='cloud'&&typeof localChangePassword==='function'){localChangePassword();return;}
  if(!_cloudOn()||!firebaseAuth.currentUser){toast('Disponible en mode Cloud, connecté','warning');return;}
  const old=prompt('Mot de passe actuel :');if(!old)return;
  const nw=prompt('Nouveau mot de passe (6 caractères min.) :');if(!nw)return;
  if(nw.length<6){toast('6 caractères minimum','error');return;}
  if(nw!==prompt('Confirmez le nouveau mot de passe :')){toast('Les mots de passe diffèrent','error');return;}
  try{const usr=firebaseAuth.currentUser;
    await usr.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(usr.email,old));
    await usr.updatePassword(nw);toast('Mot de passe modifié','success');
  }catch(e){toast('Échec : '+(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'?'mot de passe actuel incorrect':e.message),'error');}
}
let inventoryDraft=null;
function openInv(){
  inventoryDraft=null;
  const c=document.getElementById('i-counts');if(c){c.style.display='none';c.innerHTML='';}
  const b=document.getElementById('i-save-btn');if(b)b.textContent='🔍 Lancer';
  const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const deb=document.getElementById('i-deb');if(deb&&!deb.value)deb.value=local;
  openM('m-inv');
}
function saveInv(){
  const depot=document.getElementById('i-dep').value.trim()||'Magasin Principal';
  const container=document.getElementById('i-counts');
  if(!inventoryDraft){
    if(!D.produits.length){toast('Aucun produit à inventorier','error');return;}
    inventoryDraft={id:Date.now(),depot,date_debut:document.getElementById('i-deb').value||new Date().toISOString(),date_fin_prevue:document.getElementById('i-fin').value||null,items:D.produits.map(p=>({produit_id:p.id,designation:p.designation,stock_theorique:Number(p.stock)||0,cout_achat:Number(p.achat)||0}))};
    container.innerHTML='<div style="font-size:12px;color:var(--text2);margin-bottom:10px">Saisissez le stock physiquement compté pour chaque produit. Les écarts seront enregistrés comme ajustements.</div><div class="tw"><table><thead><tr><th>Produit</th><th>Stock système</th><th>Compté physiquement</th></tr></thead><tbody>'+inventoryDraft.items.map((it,i)=>'<tr><td>'+esc(it.designation)+'</td><td>'+it.stock_theorique+'</td><td><input type="number" min="0" step="1" id="i-count-'+i+'" value="'+it.stock_theorique+'" style="width:110px"></td></tr>').join('')+'</tbody></table></div>';
    container.style.display='block';document.getElementById('i-save-btn').textContent='✅ Valider le comptage';toast('Inventaire préparé : comptez les produits puis validez','success');return;
  }
  const counts=[];
  for(let i=0;i<inventoryDraft.items.length;i++){
    const input=document.getElementById('i-count-'+i);const n=Number(input?.value);
    if(!Number.isInteger(n)||n<0){toast('Stock compté invalide pour '+inventoryDraft.items[i].designation,'error');return;}
    counts.push(n);
  }
  const now=new Date().toISOString().slice(0,16).replace('T',' ');let ecarts=0;
  inventoryDraft.items.forEach((it,i)=>{
    const counted=counts[i],delta=counted-it.stock_theorique;const prod=D.produits.find(p=>String(p.id)===String(it.produit_id));
    if(!prod)return;
    if(delta!==0){ecarts++;prod.stock=counted;D.mouvements.unshift({id:nid('mouvements'),date:now,type:'ajustement',produit_id:prod.id,produit:prod.designation,qte:counted,ref:'INV-'+String(inventoryDraft.id),user:CU?.nom||'Admin',notes:'Inventaire '+depot+' ; théorique '+it.stock_theorique+' ; compté '+counted+' ; écart '+(delta>0?'+':'')+delta});}
    it.stock_compte=counted;it.ecart=delta;
  });
  inventoryDraft.date_cloture=now;inventoryDraft.statut='termine';inventoryDraft.nb_ecarts=ecarts;
  const hist=JSON.parse(localStorage.getItem('db_inventaires')||'[]');hist.unshift(inventoryDraft);localStorage.setItem('db_inventaires',JSON.stringify(hist));
  recalcEtats();sv('db_p','produits');sv('db_m','mouvements');logAction('INVENTAIRE','Inventaire '+depot+' clôturé — '+ecarts+' produit(s) avec écart');
  inventoryDraft=null;closeM('m-inv');toast('Inventaire clôturé — '+ecarts+' écart(s) détecté(s)','success');rdProduits();rdMvt();updateKPIs();computeAlerts();
}

// ═══════════════════════════════
//  HISTORIQUE
// ═══════════════════════════════
function showHist(pid){
  const p=D.produits.find(x=>x.id===pid);
  document.getElementById('h-title').textContent=`📋 Historique — ${esc(p?.designation||pid)}`;
  const mv=D.mouvements.filter(m=>m.produit_id===pid||m.produit===p?.designation);
  document.getElementById('tb-hist').innerHTML=mv.length?mv.map(m=>`<tr>
    <td style="font-size:11px;color:var(--text3)">${fdt(m.date)}</td>
    <td><span class="tag ${m.type}">${m.type}</span></td>
    <td><b style="font-family:'DM Mono',monospace">${m.qte}</b></td>
    <td><code>${esc(m.ref||'—')}</code></td>
    <td>${esc(m.user||'—')}</td>
  </tr>`).join(''):`<tr><td colspan="5"><div class="empty"><p>Aucun mouvement pour ce produit</p></div></td></tr>`;
  openM('m-hist');
}

// ═══════════════════════════════
//  EXPORTS
// ═══════════════════════════════
function xExcel(type){
  let data,sn;
  if(type==='produits'){data=D.produits.map(p=>({Code:p.code,Désignation:p.designation,Catégorie:p.categorie,Stock:p.stock,'Px Achat':p.achat,'Px Vente':p.vente,État:p.etat}));sn='Produits';}
  else if(type==='mouvements'){data=D.mouvements.map(m=>({Date:m.date,Type:m.type,Produit:m.produit,Quantité:m.qte,Réf:m.ref,Opérateur:m.user}));sn='Mouvements';}
  else if(type==='ventes'){data=D.ventes.map(v=>({Numéro:v.num,Date:v.date,Articles:v.articles,Montant:v.montant,Paiement:v.paiement}));sn='Ventes';}
  else{data=D.produits.map(p=>({Code:p.code,Désignation:p.designation,Stock:p.stock,'Valeur':p.stock*p.achat}));sn='Rapport';}
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,sn);XLSX.writeFile(wb,`HABATECH_${sn}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Export Excel téléchargé','success');
}
function xPDF(){
  const{jsPDF}=window.jspdf,doc=new jsPDF();
  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('HABATECH — Rapport Stock',20,20);
  doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`,20,28);
  doc.line(20,32,190,32);let y=42;
  doc.setFontSize(9);
  D.produits.forEach(p=>{
    if(y>270){doc.addPage();y=20;}
    doc.text(`${esc(p.code)} — ${esc(p.designation)}`,20,y);
    doc.text(`Stock: ${p.stock}  État: ${p.etat}  Valeur: ${gnf(p.stock*p.achat)}`,20,y+5);y+=12;
  });
  doc.save(`HABATECH_Rapport_${new Date().toISOString().slice(0,10)}.pdf`);
  toast('Rapport PDF téléchargé','success');
}
// printTicket définie plus bas (version améliorée avec reçu PDF)

// ═══════════════════════════════
//  DÉPENSES
// ═══════════════════════════════
const DP_CAT_LBL={achat_stock:'Achat stock',salaires:'Salaires',loyer:'Loyer',transport:'Transport',charges:'Charges',maintenance:'Maintenance',autre:'Autre'};
// Labels avec emojis pour l'UI uniquement
const DP_CAT_UI={achat_stock:'📦 Achat stock',salaires:'👷 Salaires',loyer:'🏠 Loyer',transport:'🚛 Transport',charges:'⚡ Charges',maintenance:'🔧 Maintenance',autre:'📋 Autre'};
const PGD={d:1};
function rdDepenses(){
  const dt=document.getElementById('sd-date')?.value||'',cat=document.getElementById('sd-cat')?.value||'';
  const fil=[...D.depenses].filter(d=>(!dt||d.date===dt)&&(!cat||d.categorie===cat)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const cur=PGD.d,page=fil.slice((cur-1)*PS,cur*PS);
  document.getElementById('tb-dep').innerHTML=page.length?page.map(d=>`<tr>
    <td style="font-size:11px;color:var(--text3)">${d.date||'—'}</td>
    <td><b style="color:var(--text)">${esc(d.libelle)}</b></td>
    <td><span class="tag autre">${DP_CAT_UI[d.categorie]||d.categorie}</span></td>
    <td style="font-family:'DM Mono',monospace;font-weight:700;color:var(--red)">${gnf(d.montant)}</td>
    <td style="font-size:11px">${d.paiement||'—'}</td>
    <td><code>${esc(d.ref||'—')}</code></td>
    <td style="white-space:nowrap">
      <button class="btn btn-outline btn-sm" onclick="editDepense(${d.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="delDepense(${d.id})">🗑️</button>
    </td>
  </tr>`).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">💸</div><p>Aucune dépense</p></div></td></tr>`;
  // KPIs dépenses
  const today=new Date().toISOString().slice(0,10),curMonth=today.slice(0,7);
  const dpJ=D.depenses.filter(d=>d.date===today).reduce((s,d)=>s+d.montant,0);
  const dpM=D.depenses.filter(d=>(d.date||'').startsWith(curMonth)).reduce((s,d)=>s+d.montant,0);
  const caM=D.ventes.filter(v=>(v.date||'').startsWith(curMonth)).reduce((s,v)=>s+v.montant,0);
  const ben=caM-dpM;
  document.getElementById('dp-jour').textContent=gnf(dpJ);
  document.getElementById('dp-mois').textContent=gnf(dpM);
  document.getElementById('dp-ca').textContent=gnf(caM);
  const benEl=document.getElementById('dp-ben');
  if(benEl){benEl.textContent=gnf(ben);benEl.style.color=ben>=0?'var(--green)':'var(--red)';}
  // Pagination
  const tp=Math.max(1,Math.ceil(fil.length/PS));
  let b='';for(let i=1;i<=Math.min(tp,7);i++)b+=`<button class="pag-btn${i===cur?' active':''}" onclick="PGD.d=${i};rdDepenses()">${i}</button>`;
  document.getElementById('pg-dep').innerHTML=`<span class="pag-info">${fil.length} dépenses</span><button class="pag-btn" onclick="PGD.d=Math.max(1,PGD.d-1);rdDepenses()" ${cur<=1?'disabled':''}>‹</button>${b}<button class="pag-btn" onclick="PGD.d=Math.min(${tp},PGD.d+1);rdDepenses()" ${cur>=tp?'disabled':''}>›</button>`;
  // Cartes mobile
  const mc=document.getElementById('mc-dep');if(!mc)return;
  mc.innerHTML=page.length?page.map(d=>`<div class="mcard" style="--mc:var(--red)">
    <div class="mcard-top"><div><div class="mcard-title">${esc(d.libelle)}</div><div class="mcard-sub">${d.date}</div></div>
    <span class="tag rupture" style="font-size:13px">${gnf(d.montant)}</span></div>
    <div class="mcard-row"><span class="mcard-lbl">Catégorie</span><span>${DP_CAT_UI[d.categorie]||d.categorie}</span></div>
    <div class="mcard-row"><span class="mcard-lbl">Paiement</span><span class="mcard-val">${d.paiement||'—'}</span></div>
    <div class="mcard-actions">
      <button class="btn btn-outline" onclick="editDepense(${d.id})">✏️ Modifier</button>
      <button class="btn btn-danger" onclick="delDepense(${d.id})">🗑️</button>
    </div>
  </div>`).join(''):`<div class="empty"><div class="ico">💸</div><p>Aucune dépense</p></div>`;
}
function openNewDepense(){
  document.getElementById('dep-id').value='';
  document.getElementById('m-dep-title').textContent='💸 Nouvelle Dépense';
  ['dep-lib','dep-ref','dep-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('dep-mnt').value='';
  document.getElementById('dep-date').value=new Date().toISOString().slice(0,10);
  openM('m-depense');
}
function editDepense(id){
  const d=D.depenses.find(x=>x.id===id);if(!d)return;
  document.getElementById('dep-id').value=id;
  document.getElementById('m-dep-title').textContent='✏️ Modifier Dépense';
  document.getElementById('dep-lib').value=d.libelle;
  document.getElementById('dep-cat').value=d.categorie;
  document.getElementById('dep-mnt').value=d.montant;
  document.getElementById('dep-date').value=d.date;
  document.getElementById('dep-pay').value=d.paiement||'Espèces';
  document.getElementById('dep-ref').value=d.ref||'';
  document.getElementById('dep-note').value=d.notes||'';
  openM('m-depense');
}
async function saveDepense(){
  const lib=document.getElementById('dep-lib').value.trim(),mnt=+document.getElementById('dep-mnt').value||0;
  if(!lib){toast('Libellé requis','error');return;}
  if(!mnt||mnt<=0){toast('Montant invalide','error');return;}
  const id=document.getElementById('dep-id').value;
  const data={libelle:lib,categorie:document.getElementById('dep-cat').value,montant:mnt,
    date:document.getElementById('dep-date').value,paiement:document.getElementById('dep-pay').value,
    ref:document.getElementById('dep-ref').value.trim()||autoRef('DEP','depenses'),notes:document.getElementById('dep-note').value,user:CU?.nom||'Admin'};
  if(id){const i=D.depenses.findIndex(x=>x.id==id);if(i>=0)D.depenses[i]={...D.depenses[i],...data};logAction('UPDATE','Dépense modifiée: '+lib);}
  else{D.depenses.unshift({id:nid('depenses'),...data});logAction('CREATE','Dépense: '+lib+' '+gnf(mnt));}
  localStorage.setItem('db_dp',JSON.stringify(D.depenses));
  if(sb&&ACCESS_MODE==='cloud')sb.from('depenses').upsert(D.depenses,{onConflict:'id'}).catch(()=>{});
  closeM('m-depense');rdDepenses();toast('Dépense enregistrée','success');
}
function delDepense(id){
  if(!confirm('Supprimer cette dépense ?'))return;
  D.depenses=D.depenses.filter(d=>d.id!==id);
  localStorage.setItem('db_dp',JSON.stringify(D.depenses));rdDepenses();logAction('DELETE','Dépense supprimée id:'+id);toast('Dépense supprimée','warning');
}
function xExcelDepenses(){
  const data=D.depenses.map(d=>({Date:d.date,Libellé:d.libelle,Catégorie:d.categorie,Montant:d.montant,Paiement:d.paiement,Réf:d.ref||''}));
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Dépenses');XLSX.writeFile(wb,'HABATECH_Depenses_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('Export dépenses téléchargé','success');
}

// ═══════════════════════════════
//  RETOURS / REMBOURSEMENTS
// ═══════════════════════════════
function rdRetours(){
  const dt=document.getElementById('sr-date')?.value||'',stat=document.getElementById('sr-stat')?.value||'';
  const fil=[...D.retours].filter(r=>(!dt||(r.date||'').startsWith(dt))&&(!stat||r.statut===stat)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const statTag={en_attente:'critique',traite:'normal',annule:'rupture'};
  document.getElementById('tb-ret').innerHTML=fil.length?fil.map(r=>`<tr>
    <td><code>${esc(r.num)}</code></td>
    <td><code style="color:var(--blue)">${r.vente_num||'—'}</code></td>
    <td style="font-size:11px;color:var(--text3)">${(r.date||'').slice(0,16)}</td>
    <td>${esc(r.client||'Comptoir')}</td>
    <td>${esc(r.produit)}</td>
    <td style="font-family:'DM Mono',monospace">${r.qte}</td>
    <td style="font-family:'DM Mono',monospace;color:var(--red);font-weight:700">${gnf(r.montant)}</td>
    <td><span style="font-size:11px">${esc(r.motif?.replace(/_/g,' ')||'—')}</span></td>
    <td><span class="tag ${statTag[r.statut]||'autre'}">${r.statut?.replace(/_/g,' ')||'—'}</span></td>
    <td style="white-space:nowrap">
      ${r.statut==='en_attente'?`<button class="btn btn-success btn-sm" onclick="traiterRetour(${r.id})">✅ Traiter</button>`:''}
      <button class="btn btn-danger btn-sm" onclick="delRetour(${r.id})">🗑️</button>
    </td>
  </tr>`).join(''):`<tr><td colspan="10"><div class="empty"><div class="ico">🔁</div><p>Aucun retour enregistré</p></div></td></tr>`;
  // KPIs
  document.getElementById('rt-nb').textContent=D.retours.length;
  document.getElementById('rt-mnt').textContent=gnf(D.retours.filter(r=>r.statut==='traite').reduce((s,r)=>s+r.montant,0));
  document.getElementById('rt-att').textContent=D.retours.filter(r=>r.statut==='en_attente').length;
  document.getElementById('rt-ok').textContent=D.retours.filter(r=>r.statut==='traite').length;
  // Cartes mobile
  const mc=document.getElementById('mc-ret');if(!mc)return;
  mc.innerHTML=fil.length?fil.map(r=>`<div class="mcard" style="--mc:var(--orange)">
    <div class="mcard-top"><div><div class="mcard-title">${esc(r.num)}</div><div class="mcard-sub">${esc(r.produit)} × ${r.qte}</div></div>
    <span class="tag ${statTag[r.statut]||'autre'}">${r.statut?.replace(/_/g,' ')}</span></div>
    <div class="mcard-row"><span class="mcard-lbl">Vente</span><span class="mcard-val">${esc(r.vente_num)}</span></div>
    <div class="mcard-row"><span class="mcard-lbl">Remboursement</span><span class="mcard-val" style="color:var(--red)">${gnf(r.montant)}</span></div>
    <div class="mcard-actions">
      ${r.statut==='en_attente'?`<button class="btn btn-success" onclick="traiterRetour(${r.id})">✅ Traiter</button>`:''}
      <button class="btn btn-danger" onclick="delRetour(${r.id})">🗑️</button>
    </div>
  </div>`).join(''):`<div class="empty"><div class="ico">🔁</div><p>Aucun retour</p></div>`;
}
function openNewRetour(){
  // Remplir select ventes
  const opts='<option value="">— Sélectionner une vente —</option>'+D.ventes.map(v=>`<option value="${v.id}">${esc(v.num)} — ${gnf(v.montant)} — ${v.date?.slice(0,10)||''}</option>`).join('');
  document.getElementById('ret-vente').innerHTML=opts;
  document.getElementById('ret-prod').innerHTML='<option value="">— Sélectionnez d\'abord la vente —</option>';
  document.getElementById('ret-client').value='';
  document.getElementById('ret-prix').value='';
  document.getElementById('ret-mnt').value='';
  document.getElementById('ret-qte').value='1';
  document.getElementById('ret-note').value='';
  openM('m-retour');
}
function openNewRetourFromVente(vid){
  openNewRetour();
  document.getElementById('ret-vente').value=vid;
  loadVenteForRetour();
}
function loadVenteForRetour(){
  const vid=+document.getElementById('ret-vente').value;
  const v=D.ventes.find(x=>x.id===vid);if(!v){document.getElementById('ret-prod').innerHTML='<option>—</option>';return;}
  const c=v.client_id?D.clients.find(x=>x.id===v.client_id):null;
  document.getElementById('ret-client').value=c?c.nom:'Comptoir';
  const lignes=(v.lignes||[]);
  if(lignes.length){
    document.getElementById('ret-prod').innerHTML=lignes.map((l,i)=>`<option value="${i}" data-prix="${l.prix}" data-max="${l.qte}">${esc(l.produit)} (qté vendue: ${l.qte})</option>`).join('');
    const first=lignes[0];
    document.getElementById('ret-prix').value=first.prix;
    calcRetour();
  } else {
    document.getElementById('ret-prod').innerHTML='<option value="">— Pas de lignes détail —</option>';
  }
}
function calcRetour(){
  const sel=document.getElementById('ret-prod'),prix=+document.getElementById('ret-prix').value||0;
  if(sel.selectedOptions[0]){const p=+sel.selectedOptions[0].dataset.prix||prix;document.getElementById('ret-prix').value=p;}
  const qte=+document.getElementById('ret-qte').value||0,px=+document.getElementById('ret-prix').value||0;
  document.getElementById('ret-mnt').value=gnf(qte*px);
}
document.addEventListener('change',function(e){
  if(e.target.id==='ret-prod'){
    const opt=e.target.selectedOptions[0];
    if(opt&&opt.dataset.prix)document.getElementById('ret-prix').value=opt.dataset.prix;
    calcRetour();
  }
});
async function saveRetour(){
  const vid=Number(document.getElementById('ret-vente').value);
  const v=D.ventes.find(x=>String(x.id)===String(vid));
  if(!v){toast('Vente non trouvée','error');return;}
  const selProd=document.getElementById('ret-prod');
  const idx=Number(selProd.value);const ligne=(v.lignes||[])[idx];
  if(!Number.isInteger(idx)||!ligne){toast('Sélectionnez un article de la vente d’origine','error');return;}
  const qte=Number(document.getElementById('ret-qte').value),prix=Number(document.getElementById('ret-prix').value);
  if(!Number.isInteger(qte)||qte<=0){toast('La quantité retournée doit être un entier positif','error');return;}
  if(!Number.isFinite(prix)||prix<0){toast('Prix de retour invalide','error');return;}
  const dejaRetourne=D.retours.filter(r=>String(r.vente_id)===String(vid)&&(r.produit_id!=null?String(r.produit_id)===String(ligne.produit_id):String(r.produit)===String(ligne.produit))).reduce((n,r)=>n+(Number(r.qte)||0),0);
  if(qte>Number(ligne.qte||0)-dejaRetourne){toast('Quantité supérieure au solde retournable ('+Math.max(0,Number(ligne.qte||0)-dejaRetourne)+')','error');return;}
  const montant=qte*prix;const now=new Date().toISOString().slice(0,16).replace('T',' ');
  const nr={id:nid('retours'),num:'RET-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+nseq('retours'),
    vente_id:vid,vente_num:v.num,date:now,client:document.getElementById('ret-client').value||'Comptoir',
    produit:ligne.produit||'—',produit_id:ligne.produit_id,qte,prix,montant,motif:document.getElementById('ret-motif').value,
    remboursement:document.getElementById('ret-remb').value,stock:document.getElementById('ret-stock').value,
    notes:document.getElementById('ret-note').value,statut:'en_attente',user:CU?.nom||'Admin'};
  D.retours.unshift(nr);localStorage.setItem('db_rt',JSON.stringify(D.retours));
  if(sb&&ACCESS_MODE==='cloud')try{await sb.from('retours').insert(nr);}catch(e){console.error('Retour non synchronisé',e);toast('Retour enregistré localement ; synchronisation à vérifier','warning');}
  logAction('CREATE','Retour '+nr.num+' — '+nr.produit+' × '+qte);
  closeM('m-retour');rdRetours();toast('Retour enregistré — En attente de traitement','success');
}
async function traiterRetour(id){
  const r=D.retours.find(x=>String(x.id)===String(id));if(!r)return;
  if(r.statut!=='en_attente'){toast('Ce retour a déjà été traité','warning');return;}
  if(r.stock==='oui'){
    const vente=D.ventes.find(x=>String(x.id)===String(r.vente_id));
    const ligne=(vente?.lignes||[]).find(l=>String(l.produit_id)===String(r.produit_id)||(!r.produit_id&&l.produit===r.produit));
    const pid=r.produit_id||ligne?.produit_id;const p=D.produits.find(x=>String(x.id)===String(pid));
    if(!p){toast('Produit d’origine introuvable : retour non traité','error');return;}
    p.stock=Number(p.stock||0)+Number(r.qte||0);recalcEtats();
    D.mouvements.unshift({id:nid('mouvements'),date:new Date().toISOString().slice(0,16).replace('T',' '),type:'entree',produit_id:p.id,produit:r.produit,qte:r.qte,ref:r.num,user:CU?.nom||'Admin'});
    sv('db_p','produits');sv('db_m','mouvements');
  }
  r.statut='traite';r.date_traitement=new Date().toISOString().slice(0,10);localStorage.setItem('db_rt',JSON.stringify(D.retours));
  if(sb&&ACCESS_MODE==='cloud')try{await sb.from('retours').update({statut:'traite',date_traitement:r.date_traitement}).eq('id',id);}catch(e){console.error('Mise à jour cloud du retour échouée',e);toast('Traitement local effectué ; synchronisation à vérifier','warning');}
  logAction('UPDATE','Retour traité: '+r.num+(r.stock==='oui'?' + stock réintégré':''));
  rdRetours();rdProduits();updateKPIs();computeAlerts();toast(`Retour ${r.num} traité — ${r.stock==='oui'?'Stock réintégré':''}`,'success');
}
function delRetour(id){
  if(!confirm('Supprimer ce retour ?'))return;
  D.retours=D.retours.filter(r=>r.id!==id);
  localStorage.setItem('db_rt',JSON.stringify(D.retours));rdRetours();toast('Retour supprimé','warning');
}
function xExcelRetours(){
  const data=D.retours.map(r=>({Numéro:r.num,'Vente origine':r.vente_num,Date:r.date,Client:r.client,Produit:r.produit,Qté:r.qte,Montant:r.montant,Motif:r.motif,Statut:r.statut}));
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Retours');XLSX.writeFile(wb,'HABATECH_Retours_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('Export retours téléchargé','success');
}

// ═══════════════════════════════
//  FACTURE PDF
// ═══════════════════════════════
function rdFactures(){
  const q=(document.getElementById('fac-q')?.value||'').trim().toLowerCase();
  const dt=document.getElementById('fac-date')?.value||'';
  const rows=[...(D.ventes||[])].filter(v=>{
    const client=v.client_id?D.clients.find(c=>c.id===v.client_id):null;
    const hay=[v.num,v.paiement,client?.nom,...(v.lignes||[]).map(l=>l.produit)].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!dt||(v.date||'').startsWith(dt));
  }).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const total=rows.reduce((sum,v)=>sum+(Number(v.montant)||0),0);
  const count=document.getElementById('fac-count'),sum=document.getElementById('fac-total'),tb=document.getElementById('tb-factures');
  if(count)count.textContent=rows.length;if(sum)sum.textContent=gnf(total);
  if(tb)tb.innerHTML=rows.length?rows.map(v=>{const c=v.client_id?D.clients.find(x=>x.id===v.client_id):null;return `<tr><td><code>FAC-${esc(String(v.num||v.id))}</code></td><td>${fdt(v.date)}</td><td>${esc(c?.nom||'Client comptoir')}</td><td>${Number(v.articles)||((v.lignes||[]).length)} art.</td><td style="font-weight:700;color:var(--green)">${gnf(v.montant)}</td><td>${esc(v.paiement||'—')}</td><td><button class="btn btn-primary btn-sm" onclick="printFacture(${Number(v.id)})">📄 PDF</button> <button class="btn btn-outline btn-sm" onclick="printTicket(${Number(v.id)})">🖨️ Reçu</button></td></tr>`}).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">🧾</div><p>Aucune facture pour ces critères</p></div></td></tr>`;
  const mc=document.getElementById('mc-factures');if(mc)mc.innerHTML=rows.map(v=>{const c=v.client_id?D.clients.find(x=>x.id===v.client_id):null;return `<div class="mcard" style="--mc:var(--blue)"><div class="mcard-top"><div><div class="mcard-title">FAC-${esc(String(v.num||v.id))}</div><div class="mcard-sub">${fdt(v.date)} · ${esc(c?.nom||'Client comptoir')}</div></div></div><div class="mcard-row"><span class="mcard-lbl">Total</span><span class="mcard-val">${gnf(v.montant)}</span></div><div class="mcard-row"><span class="mcard-lbl">Paiement</span><span class="mcard-val">${esc(v.paiement||'—')}</span></div><div class="mcard-actions"><button class="btn btn-primary" onclick="printFacture(${Number(v.id)})">📄 Générer PDF</button></div></div>`}).join('');
}

function printFacture(id){
  const v=(D.ventes||[]).find(x=>Number(x.id)===Number(id));if(!v)return;
  if(!window.jspdf?.jsPDF){toast('Le module PDF est indisponible. Vérifiez votre connexion puis réessayez.','error');return;}
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});
  const c=v.client_id?(D.clients||[]).find(x=>Number(x.id)===Number(v.client_id)):null;
  const money=n=>`${(Number(n)||0).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')} GNF`;
  const safeText=t=>String(t??'—').replace(/[\r\n]+/g,' ').trim();
  const pageW=210,left=15,right=195,usable=right-left;
  const lines=Array.isArray(v.lignes)?v.lignes:[];
  const dateTxt=typeof fdt==='function'?fdt(v.date):safeText(v.date);
  const invoiceNo=`FAC-${safeText(v.num||v.id)}`;
  const drawHeader=()=>{
    doc.setFillColor(15,23,42);doc.rect(0,0,pageW,43,'F');
    doc.setFillColor(37,99,235);doc.rect(0,41,pageW,2,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(17);
    doc.text('ETS N’GUILLA & FRÈRES',left,17);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(203,213,225);
    doc.text('COMMERCE • DISTRIBUTION • SERVICES',left,23);
    doc.text('Conakry, République de Guinée',left,29);
    doc.text('Tél. : +224 622 000 000  |  admin@habatech.com',left,35);
    doc.setTextColor(147,197,253);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('FACTURE',right,17,{align:'right'});
    doc.setTextColor(255,255,255);doc.setFontSize(10);doc.text(invoiceNo,right,25,{align:'right'});
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(203,213,225);doc.text('Émise le '+safeText(dateTxt),right,32,{align:'right'});
  };
  const drawTableHead=y=>{
    doc.setFillColor(30,41,59);doc.roundedRect(left,y,usable,9,1.5,1.5,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(255,255,255);
    doc.text('DÉSIGNATION',left+3,y+5.8);doc.text('QTÉ',120,y+5.8,{align:'right'});
    doc.text('PRIX UNITAIRE',157,y+5.8,{align:'right'});doc.text('MONTANT',right-3,y+5.8,{align:'right'});
  };
  drawHeader();
  // Encadrés client et règlement
  let y=54;
  doc.setFillColor(239,246,255);doc.roundedRect(left,y,89,31,2,2,'F');
  doc.setFillColor(248,250,252);doc.roundedRect(109,y,86,31,2,2,'F');
  doc.setTextColor(37,99,235);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('FACTURÉ À',left+4,y+6);
  doc.setTextColor(30,41,59);doc.setFontSize(10);doc.text(doc.splitTextToSize(safeText(c?.nom||'Client comptoir'),80).slice(0,2),left+4,y+13);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(71,85,105);
  if(c?.tel)doc.text('Tél. : '+safeText(c.tel),left+4,y+22);
  if(c?.adresse)doc.text(doc.splitTextToSize(safeText(c.adresse),80)[0]||'',left+4,y+27);
  doc.setFont('helvetica','bold');doc.setTextColor(37,99,235);doc.text('INFORMATIONS DE PAIEMENT',113,y+6);
  doc.setFont('helvetica','normal');doc.setTextColor(51,65,85);doc.text('Mode : '+safeText(v.paiement||'Non précisé'),113,y+14);
  doc.text('Statut : ENREGISTRÉE',113,y+21);
  doc.text('Devise : GNF',113,y+27);
  y=95;drawTableHead(y);y+=13;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  if(!lines.length){doc.setTextColor(100,116,139);doc.text('Aucun détail d’article disponible.',left+3,y);y+=8;}
  lines.forEach((l,idx)=>{
    const name=safeText(l.produit||l.designation||'Article');
    const wrapped=doc.splitTextToSize(name,88);
    const rowH=Math.max(9,wrapped.length*4.2+4);
    if(y+rowH>255){doc.addPage();drawHeader();y=53;drawTableHead(y);y+=13;}
    if(idx%2===0){doc.setFillColor(248,250,252);doc.rect(left,y-5,usable,rowH,'F');}
    doc.setTextColor(30,41,59);doc.text(wrapped.slice(0,3),left+3,y);
    doc.text(String(Number(l.qte)||0),120,y,{align:'right'});
    doc.text(money(l.prix),157,y,{align:'right'});
    doc.setFont('helvetica','bold');doc.text(money((Number(l.qte)||0)*(Number(l.prix)||0)),right-3,y,{align:'right'});doc.setFont('helvetica','normal');
    y+=rowH;
  });
  y+=5;doc.setDrawColor(203,213,225);doc.setLineWidth(.35);doc.line(left,y,right,y);y+=9;
  if(y>255){doc.addPage();drawHeader();y=55;}
  doc.setFillColor(239,246,255);doc.roundedRect(112,y-5,83,21,2,2,'F');
  doc.setTextColor(71,85,105);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('TOTAL À PAYER',117,y+1);
  doc.setTextColor(29,78,216);doc.setFontSize(13);doc.text(money(v.montant),190,y+10,{align:'right'});
  y+=28;
  if(y>272){doc.addPage();drawHeader();y=55;}
  doc.setDrawColor(226,232,240);doc.line(left,y,right,y);y+=7;
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(30,41,59);doc.text('Merci pour votre confiance !',pageW/2,y,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,116,139);
  doc.text('Veuillez conserver cette facture comme justificatif de votre achat.',pageW/2,y+5,{align:'center'});
  doc.text('ETS N’GUILLA & FRÈRES • Conakry, Guinée',pageW/2,287,{align:'center'});
  // Numéro de page sur toutes les pages
  const pages=doc.internal.getNumberOfPages();
  for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(148,163,184);doc.text(`Document ${invoiceNo}  •  Page ${i}/${pages}`,right,292,{align:'right'});}
  doc.save('Facture_'+String(v.num||v.id)+'_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('Facture PDF générée','success');
  if(typeof logAction==='function')logAction('CREATE','Facture PDF : '+(v.num||v.id));
}

// ═══════════════════════════════
//  QR CODE / ÉTIQUETTE PRODUIT
// ═══════════════════════════════
let currentQRProd=null;
function openBarcode(pid){
  const p=D.produits.find(x=>x.id===pid);if(!p)return;
  currentQRProd=p;
  document.getElementById('bc-title').textContent='🏷️ '+p.designation;
  renderQR(p,180);
  openM('m-barcode');
}
let _qrLibLoading=null;
function ensureQRCode(){
  if(typeof QRCode!=='undefined' && typeof QRCode.toCanvas==='function')return Promise.resolve(true);
  if(_qrLibLoading)return _qrLibLoading;
  _qrLibLoading=new Promise(resolve=>{
    const urls=[
      'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js'
    ];
    let i=0;
    const tryNext=()=>{
      if(typeof QRCode!=='undefined' && typeof QRCode.toCanvas==='function'){resolve(true);return;}
      if(i>=urls.length){_qrLibLoading=null;resolve(false);return;}
      const script=document.createElement('script');script.src=urls[i++];script.onload=()=>resolve(typeof QRCode!=='undefined'&&typeof QRCode.toCanvas==='function');script.onerror=tryNext;document.head.appendChild(script);
    };
    tryNext();
  });
  return _qrLibLoading;
}
async function renderQR(p,size=180){
  if(!p)return;
  const canvas=document.getElementById('bc-canvas');
  const qrData=JSON.stringify({id:p.id,code:p.code,nom:p.designation,prix:p.vente,unite:p.unite||'u'});
  canvas.width=size;canvas.height=size;
  const ready=await ensureQRCode();
  if(ready){
    try{
      await QRCode.toCanvas(canvas,qrData,{width:size,margin:3,errorCorrectionLevel:'H',color:{dark:'#000000',light:'#ffffff'}});
      canvas.style.width=size+'px';canvas.style.height=size+'px';
    }catch(err){
      console.error('Échec de génération du QR code',err);
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
      ctx.fillStyle='#b91c1c';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('Erreur QR code',size/2,size/2);
      toast('Impossible de générer le QR code. Vérifiez la connexion Internet.','error');
    }
  }else{
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
    ctx.fillStyle='#b91c1c';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('QR indisponible',size/2,size/2);
    toast('Bibliothèque QR indisponible : connectez-vous à Internet puis réouvrez l’étiquette.','error');
  }
  document.getElementById('bc-code').textContent=p.code;
  document.getElementById('bc-name').textContent=p.designation;
  document.getElementById('bc-price').textContent=gnf(p.vente);
  document.getElementById('bc-info').innerHTML=`<b style="color:var(--text)">${esc(p.designation)}</b><br><span style="color:var(--text3)">Code: <code>${esc(p.code)}</code> — Stock: ${p.stock} ${esc(p.unite||'u.')}</span>`;
}
async function printLabel(){
  const p=currentQRProd;if(!p)return;
  await renderQR(p,+(document.getElementById('bc-canvas').width||180));
  const canvas=document.getElementById('bc-canvas');
  const img=canvas.toDataURL('image/png');
  const w=window.open('','_blank','width=320,height=420');
  w.document.write(`<!DOCTYPE html><html><head><title>Étiquette ${esc(p.code)}</title>
  <style>body{font-family:monospace;padding:20px;text-align:center;max-width:300px;margin:0 auto;}
  .lbl{border:2px solid #000;padding:12px;border-radius:6px;display:inline-block;}
  .name{font-size:14px;font-weight:bold;margin-bottom:6px;max-width:220px;word-wrap:break-word;}
  .code{font-size:12px;letter-spacing:2px;color:#333;margin:4px 0;}
  .price{font-size:20px;font-weight:bold;margin-top:6px;}
  .sub{font-size:10px;color:#666;margin-top:3px;}
  @media print{button{display:none!important;}}</style></head><body>
  <div class="lbl">
    <div class="name">${esc(p.designation)}</div>
    <img src="${img}" style="width:160px;height:160px;display:block;margin:6px auto;">
    <div class="code">${esc(p.code)}</div>
    <div class="price">${gnf(p.vente)}</div>
    <div class="sub">ETS N’GUILLA &amp; FRÈRES</div>
  </div>
  <br>
  <button onclick="window.print()" style="padding:8px 20px;background:#0F172A;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;">🖨️ Imprimer</button>
  
</body></html>`);
  w.document.close();
  toast('Étiquette prête à imprimer','success');
}
function downloadQR(){
  const canvas=document.getElementById('bc-canvas'),p=currentQRProd;if(!canvas||!p)return;
  const link=document.createElement('a');link.download='QR_'+p.code+'.png';link.href=canvas.toDataURL('image/png');link.click();
  toast('QR Code téléchargé','success');
}

// ═══════════════════════════════
//  NOTIFICATIONS BROWSER
// ═══════════════════════════════
let _notifSent={};
function reqNotifPerm(){
  if('Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission().then(p=>{if(p==='granted')toast('🔔 Notifications activées pour les alertes stock','success');});
  }
}
function sendNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const key=title+body;
  if(_notifSent[key]&&(Date.now()-_notifSent[key]<5*60*1000))return; // anti-spam 5min
  _notifSent[key]=Date.now();
  try{
    const n=new Notification(title,{body,icon:'data:image/jpeg;base64,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'});
    setTimeout(()=>n.close(),7000);
  }catch(e){}
}

// ═══════════════════════════════════
//  FIREBASE / FIRESTORE CONFIG
// ═══════════════════════════════
function saveSBCfg(){try{FB_CONFIG=readFirebaseJson(document.getElementById('cfg-firebase').value.trim());localStorage.setItem('firebase_config',JSON.stringify(FB_CONFIG));initFirebase();loadFirebaseConfig();const b=document.getElementById('cfg-banner');if(b)b.classList.add('hidden');updateModeUI();toast('Configuration Firebase enregistrée — activez le mode Cloud pour synchroniser','success');}catch(e){toast(e.message,'error');}}
async function testSB(){const st=document.getElementById('conn-st');try{const c=readFirebaseJson(document.getElementById('cfg-firebase').value.trim());initFirebase(c);await firestoreDB.collection('produits').limit(1).get();FB_CONFIG=c;st.innerHTML='<span style="color:var(--green)">✅ Firestore accessible. Vérifiez les règles de sécurité.</span>';toast('Connexion Firestore réussie','success');}catch(e){st.innerHTML='<span style="color:var(--red)">❌ '+e.message+'</span>';toast('Test Firestore échoué','error');}}
function populateSQL(){const el=document.getElementById('sql-out');if(el)el.value='Firestore utilise des collections et des documents, pas un script SQL. Créez les collections utilisées par l’application et configurez les règles de sécurité dans Firebase Console.';}
function cpSQL(){navigator.clipboard.writeText(document.getElementById('sql-out').value);toast('SQL copié','success');}


// ═══════════════════════════════
//  GLOBAL SEARCH
// ═══════════════════════════════
function globalSearch(q){
  const box=document.getElementById('gs-results');
  if(!q||q.length<2){box.style.display='none';return;}
  const res=[];
  D.produits.filter(p=>p.designation.toLowerCase().includes(q.toLowerCase())||p.code.toLowerCase().includes(q.toLowerCase())).slice(0,4).forEach(p=>res.push({type:'📦 Produit',label:p.designation,sub:p.code+' — '+gnf(p.vente),action:`goPage('produits',document.querySelector('[onclick*=produits]'))`}));
  D.ventes.filter(v=>v.num.toLowerCase().includes(q.toLowerCase())).slice(0,3).forEach(v=>res.push({type:'🛒 Vente',label:v.num,sub:gnf(v.montant)+' — '+v.date,action:`goPage('ventes',document.querySelector('[onclick*=ventes]'))`}));
  D.clients.filter(c=>c.nom.toLowerCase().includes(q.toLowerCase())||c.tel.includes(q)).slice(0,3).forEach(c=>res.push({type:'👥 Client',label:c.nom,sub:c.tel,action:`goPage('clients',document.querySelector('[onclick*=clients]'))`}));
  if(!res.length){box.innerHTML='<div class="gs-item" style="color:var(--text3)">Aucun résultat</div>';box.style.display='block';return;}
  box.innerHTML=res.map(r=>`<div class="gs-item" onclick="${r.action};hideGS()"><span class="gs-badge">${r.type}</span><div><div style="font-weight:600">${esc(r.label)}</div><div style="font-size:10.5px;color:var(--text3)">${esc(r.sub)}</div></div></div>`).join('');
  box.style.display='block';
}
function showGS(){if(document.getElementById('global-search').value.length>=2)document.getElementById('gs-results').style.display='block';}
function hideGS(){setTimeout(()=>{document.getElementById('gs-results').style.display='none';},200);}
document.addEventListener('click',e=>{if(!e.target.closest('#gs-results')&&!e.target.closest('#global-search'))hideGS();});

// ═══════════════════════════════
//  RACCOURCIS CLAVIER
// ═══════════════════════════════
document.addEventListener('keydown',e=>{
  if(!CU)return;
  resetTimeout();
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();document.getElementById('global-search').focus();return;}
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
  if(e.key==='F2'){e.preventDefault();openM('m-vente');}
  else if(e.key==='F3'){e.preventDefault();openM('m-mvt');}
  else if(e.key==='F4'){e.preventDefault();openNewProduit();}
  else if(e.key==='F5'){e.preventDefault();openPOS();}
  else if(e.key==='Escape'){document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));closePOS();}
});

// ═══════════════════════════════
//  SESSION TIMEOUT
// ═══════════════════════════════
let _tout,_warnT;
const TIMEOUT=15*60*1000,WARN=60*1000;
function resetTimeout(){
  clearTimeout(_tout);clearTimeout(_warnT);
  document.getElementById('timeout-warn').style.display='none';
  if(!CU)return;
  saveSess();
  _warnT=setTimeout(()=>{document.getElementById('timeout-warn').style.display='block';document.getElementById('timeout-warn').textContent='⏳ Session expirée dans 60 secondes — Cliquez pour rester connecté';},TIMEOUT-WARN);
  _tout=setTimeout(()=>{toast('Session expirée — Reconnexion requise','warning');doLogout();},TIMEOUT);
}
document.addEventListener('mousemove',resetTimeout);
document.addEventListener('click',resetTimeout);

// ═══════════════════════════════
//  JOURNAL D'AUDIT
// ═══════════════════════════════
function logAction(action,detail){
  const entry={id:nid('journal'),date:new Date().toISOString().slice(0,16).replace('T',' '),action,detail,user:CU?.nom||'Système',ip:'192.168.1.x'};
  D.journal.unshift(entry);if(D.journal.length>500)D.journal=D.journal.slice(0,500);
  localStorage.setItem('db_j',JSON.stringify(D.journal));
}
const PGJ={j:1};
function rdJournal(){
  const dt=document.getElementById('sj-date')?.value||'',act=document.getElementById('sj-act')?.value||'';
  const fil=D.journal.filter(j=>(!dt||j.date.startsWith(dt))&&(!act||j.action===act));
  const page=fil.slice((PGJ.j-1)*10,PGJ.j*10);
  const acColors={LOGIN:'normal',LOGOUT:'autre',CREATE:'entree',UPDATE:'ajustement',DELETE:'rupture',VENTE:'normal',MOUVEMENT:'transfert'};
  document.getElementById('tb-journal').innerHTML=page.length?page.map(j=>`<tr>
    <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3)">${j.date}</td>
    <td><span class="tag ${acColors[j.action]||'autre'}">${j.action}</span></td>
    <td style="font-size:12px">${esc(j.detail)}</td>
    <td style="color:var(--text2);font-size:12px">${esc(j.user)}</td>
    <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3)">${esc(j.ip)}</td>
  </tr>`).join(''):`<tr><td colspan="5"><div class="empty"><div class="ico">🗒️</div><p>Aucune entrée</p></div></td></tr>`;
  const tp=Math.max(1,Math.ceil(fil.length/10)),cur=PGJ.j;
  let b='';for(let i=1;i<=Math.min(tp,7);i++)b+=`<button class="pag-btn${i===cur?' active':''}" onclick="PGJ.j=${i};rdJournal()">${i}</button>`;
  document.getElementById('pg-journal').innerHTML=`<span class="pag-info">${fil.length} entrées</span><button class="pag-btn" onclick="PGJ.j=Math.max(1,PGJ.j-1);rdJournal()" ${cur<=1?'disabled':''}>‹</button>${b}<button class="pag-btn" onclick="PGJ.j=Math.min(${tp},PGJ.j+1);rdJournal()" ${cur>=tp?'disabled':''}>›</button>`;
}
function clearJournal(){if(!confirm('Vider tout le journal ?'))return;D.journal=[];localStorage.setItem('db_j','[]');rdJournal();toast('Journal vidé','warning');}

// ═══════════════════════════════
//  CLIENTS / CRÉDIT
// ═══════════════════════════════
function rdClients(){
  const q=(document.getElementById('sc-q')?.value||'').toLowerCase();
  const sol=document.getElementById('sc-sol')?.value||'';
  const fil=D.clients.filter(c=>{
    const mq=!q||c.nom.toLowerCase().includes(q)||c.tel.includes(q);
    const ms=!sol||(sol==='debiteur'&&c.dette>0)||(sol==='solde'&&c.dette<=0);
    return mq&&ms;
  });
  document.getElementById('tb-clients').innerHTML=fil.length?fil.map(c=>`<tr>
    <td><b>${esc(c.nom)}</b><br><span style="font-size:10.5px;color:var(--text3)">${esc(c.adresse||'—')}</span></td>
    <td style="font-family:'DM Mono',monospace;font-size:12px">${esc(c.tel||'—')}</td>
    <td style="font-family:'DM Mono',monospace;font-weight:700;color:${c.dette>0?'var(--red)':'var(--green)'};">${gnf(c.dette||0)}</td>
    <td style="font-size:11px;color:var(--text3)">${c.last_vente||'—'}</td>
    <td><span class="tag ${c.dette>0?'rupture':'normal'}">${c.dette>0?'Débiteur':'Soldé'}</span></td>
    <td style="white-space:nowrap">
      ${c.dette>0?`<button class="btn btn-success btn-sm" onclick="openRemb(${c.id})">💵 Rembourser</button>`:''}
      <button class="btn btn-outline btn-sm" onclick="editClient(${c.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="delClient(${c.id})">🗑️</button>
    </td>
  </tr>`).join(''):`<tr><td colspan="6"><div class="empty"><div class="ico">👥</div><p>Aucun client</p></div></td></tr>`;
  // KPIs
  const total=D.clients.length,dette=D.clients.reduce((s,c)=>s+((c.dette||0)),0),deb=D.clients.filter(c=>c.dette>0).length;
  document.getElementById('cl-nb').textContent=total;
  document.getElementById('cl-dette').textContent=(dette/1000).toFixed(0)+' K';
  document.getElementById('cl-nb-deb').textContent=deb;
  document.getElementById('cl-soldé').textContent=D.clients.filter(c=>c.dette<=0).length;
}
function openNewClient(){
  const el=document.getElementById('cl-id');if(el)el.value='';
  const t=document.getElementById('m-client-title');if(t)t.textContent='👤 Nouveau Client';
  ['cl-nom','cl-tel','cl-adr','cl-note'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  openM('m-client');
}
function editClient(id){const c=D.clients.find(x=>x.id===id);if(!c)return;document.getElementById('cl-id').value=id;document.getElementById('m-client-title').textContent='✏️ Modifier Client';document.getElementById('cl-nom').value=c.nom;document.getElementById('cl-tel').value=c.tel||'';document.getElementById('cl-adr').value=c.adresse||'';document.getElementById('cl-note').value=c.notes||'';openM('m-client');}
function saveClient(){
  const nom=document.getElementById('cl-nom').value.trim();if(!nom){toast('Nom requis','error');return;}
  const id=document.getElementById('cl-id').value;
  const data={nom,tel:document.getElementById('cl-tel').value,adresse:document.getElementById('cl-adr').value,notes:document.getElementById('cl-note').value};
  if(id){const i=D.clients.findIndex(x=>x.id==id);if(i>=0)D.clients[i]={...D.clients[i],...data};logAction('UPDATE','Client modifié: '+nom);}
  else{D.clients.push({id:nid('clients'),dette:0,created_at:new Date().toISOString().slice(0,10),...data});logAction('CREATE','Nouveau client: '+nom);}
  localStorage.setItem('db_cl',JSON.stringify(D.clients));closeM('m-client');rdClients();fillClientSelects();toast('Client enregistré','success');
}
function delClient(id){if(!confirm('Supprimer ce client ?'))return;const c=D.clients.find(x=>x.id===id);D.clients=D.clients.filter(x=>x.id!==id);localStorage.setItem('db_cl',JSON.stringify(D.clients));rdClients();logAction('DELETE','Client supprimé: '+(c?.nom||id));toast('Client supprimé','warning');}
function openRemb(cid){
  const c=D.clients.find(x=>x.id===cid);if(!c)return;
  document.getElementById('remb-cid').value=cid;
  document.getElementById('remb-nom').value=c.nom;
  document.getElementById('remb-dette').value=gnf(c.dette||0);
  document.getElementById('remb-mnt').value='';
  document.getElementById('remb-reste').value=gnf(c.dette||0);
  document.getElementById('remb-date').value=new Date().toISOString().slice(0,10);
  openM('m-remb');
}
function calcRemb(){
  const cid=+document.getElementById('remb-cid').value,c=D.clients.find(x=>x.id===cid);if(!c)return;
  const mnt=+document.getElementById('remb-mnt').value||0,reste=Math.max(0,(c.dette||0)-mnt);
  document.getElementById('remb-reste').value=gnf(reste);
  document.getElementById('remb-reste').style.color=reste<=0?'var(--green)':'var(--orange)';
}
function saveRemb(){
  const cid=+document.getElementById('remb-cid').value,mnt=+document.getElementById('remb-mnt').value||0;
  if(!mnt||mnt<=0){toast('Montant invalide','error');return;}
  const c=D.clients.find(x=>x.id===cid);if(!c)return;
  c.dette=Math.max(0,(c.dette||0)-mnt);
  localStorage.setItem('db_cl',JSON.stringify(D.clients));
  logAction('UPDATE',`Remboursement ${gnf(mnt)} de ${esc(c.nom)} — Reste: ${gnf(c.dette)}`);
  closeM('m-remb');rdClients();toast(`Remboursement de ${gnf(mnt)} enregistré — Reste: ${gnf(c.dette)}`,'success');
}
function fillClientSelects(){
  const opts='<option value="">— Comptoir (anonyme) —</option>'+D.clients.map(c=>`<option value="${c.id}">${esc(c.nom)}${c.dette>0?' (dette: '+gnf(c.dette)+')':''}</option>`).join('');
  const vc=document.getElementById('v-client');if(vc)vc.innerHTML=opts;
  const pc=document.getElementById('pos-client');if(pc)pc.innerHTML=opts;
}
function togCredit(){
  const pay=document.getElementById('v-pay').value,row=document.getElementById('v-credit-row');
  if(row)row.style.display=pay==='credit'?'block':'none';
}

// ═══════════════════════════════
//  POS PLEIN ÉCRAN
// ═══════════════════════════════
let POS_CART=[];
function openPOS(){
  POS_CART=[];document.getElementById('pos-screen').style.display='flex';
  posRenderGrid(D.produits);posRenderCart();fillClientSelects();
  document.getElementById('pos-search').focus();
  document.body.style.overflow='hidden';
}
function closePOS(){document.getElementById('pos-screen').style.display='none';document.body.style.overflow='';}
function posSearch(q){
  const fil=q?D.produits.filter(p=>p.designation.toLowerCase().includes(q.toLowerCase())||p.code.toLowerCase().includes(q.toLowerCase())):D.produits;
  posRenderGrid(fil);
}
function posRenderGrid(prods){
  document.getElementById('pos-grid').innerHTML=prods.map(p=>`
    <div class="pos-card ${p.stock<=0?'rupture':''}" onclick="posAdd(${p.id})">
      ${p.photo?`<img class="pos-product-photo" src="${esc(p.photo)}" alt="Photo illustrative de ${esc(p.designation)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div style=&quot;font-size:26px;margin-bottom:6px&quot;>🥫</div>'">`:p.id>=1&&p.id<=6?`<img class="pos-product-photo" src="${EMBEDDED_PRODUCT_IMAGES[p.id]||''}" alt="Photo de ${esc(p.designation)}" loading="lazy" onerror="this.outerHTML='<div style=&quot;font-size:26px;margin-bottom:6px&quot;>${getCat(p.categorie).emoji}</div>'">`:`<div style="font-size:26px;margin-bottom:6px">${getCat(p.categorie).emoji}</div>`}
      <div class="pos-card-name">${esc(p.designation)}</div>
      <div class="pos-card-price">${gnf(p.vente)}</div>
      <div class="pos-card-stock">${p.stock<=0?'<span style="color:#F87171;font-weight:700">❌ Rupture</span>':'Stock: '+p.stock+' '+(p.unite||'u.')}</div>
    </div>`).join('');
}
function posAdd(pid){
  const p=D.produits.find(x=>x.id===pid);if(!p||p.stock<=0)return;
  const ex=POS_CART.find(l=>l.produit_id===pid);
  if(ex){if(ex.qte>=p.stock){toast('Stock insuffisant','error');return;}ex.qte++;}
  else POS_CART.push({produit_id:pid,produit:p.designation,qte:1,prix:p.vente});
  posRenderCart();
}
function posRm(i){POS_CART.splice(i,1);posRenderCart();}
function posQte(i,delta){
  const l=POS_CART[i];if(!l)return;
  const p=D.produits.find(x=>x.id===l.produit_id);
  l.qte=Math.max(1,Math.min(l.qte+delta,p?.stock||999));
  posRenderCart();
}
function posCalc(){
  const rem=+document.getElementById('pos-rem').value||0;
  const tot=Math.max(0,POS_CART.reduce((s,l)=>s+l.qte*l.prix,0)-rem);
  document.getElementById('pos-total').textContent=gnf(tot);
  return tot;
}
function posTogCredit(){
  const r=document.getElementById('pos-acompte-row');
  r.style.display=document.getElementById('pos-pay').value==='credit'?'flex':'none';
}
function posRenderCart(){
  const el=document.getElementById('pos-cart');
  el.innerHTML=POS_CART.length?POS_CART.map((l,i)=>`
    <div style="padding:7px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
      <div style="flex:1;font-size:12px;font-weight:600">${esc(l.produit)}</div>
      <div style="display:flex;align-items:center;gap:4px;">
        <button onclick="posQte(${i},-1)" style="width:22px;height:22px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);font-size:13px;display:flex;align-items:center;justify-content:center;">−</button>
        <span style="font-family:'DM Mono',monospace;font-weight:700;min-width:24px;text-align:center">${l.qte}</span>
        <button onclick="posQte(${i},1)" style="width:22px;height:22px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);font-size:13px;display:flex;align-items:center;justify-content:center;">+</button>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green);min-width:80px;text-align:right">${gnf(l.qte*l.prix)}</div>
      <button onclick="posRm(${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;">✕</button>
    </div>`).join(''):`<div class="empty" style="padding:24px"><div class="ico">🛒</div><p>Panier vide</p></div>`;
  posCalc();
}
async function posEncaisser(){
  if(!POS_CART.length){toast('Panier vide','error');return;}
  const subtotal=POS_CART.reduce((s,l)=>s+(Number(l.qte)||0)*(Number(l.prix)||0),0);
  const rem=Number(document.getElementById('pos-rem').value);
  if(!Number.isFinite(rem)||rem<0||rem>subtotal){toast('Remise invalide : elle doit être comprise entre 0 et le sous-total','error');return;}
  for(const l of POS_CART){
    const p=D.produits.find(x=>String(x.id)===String(l.produit_id));
    if(!p){toast('Produit introuvable : '+l.produit,'error');return;}
    if(!Number.isInteger(Number(l.qte))||Number(l.qte)<=0){toast('Quantité invalide pour '+l.produit,'error');return;}
    if(Number(l.qte)>Number(p.stock||0)){toast('Stock insuffisant : '+l.produit+' (disponible : '+(p.stock||0)+')','error');return;}
    if(!Number.isFinite(Number(l.prix))||Number(l.prix)<0){toast('Prix invalide pour '+l.produit,'error');return;}
  }
  const tot=subtotal-rem;if(tot<=0){toast('Le total de la vente doit être supérieur à zéro','error');return;}
  const pay=document.getElementById('pos-pay').value;
  const acompte=pay==='credit'?Number(document.getElementById('pos-acompte').value||0):0;
  const clientId=Number(document.getElementById('pos-client').value)||null;
  if(pay==='credit'&&!clientId){toast('Sélectionnez un client pour une vente à crédit','error');return;}
  if(!Number.isFinite(acompte)||acompte<0||acompte>tot){toast('Acompte invalide : il doit être compris entre 0 et le total','error');return;}
  const now=new Date().toISOString().slice(0,16).replace('T',' ');
  const lignes=POS_CART.map(l=>{const p=D.produits.find(x=>String(x.id)===String(l.produit_id));return {...l,cout_achat:Number(p?.achat)||0};});
  const nv={id:nid('ventes'),num:'VTE-'+new Date().getFullYear()+'-'+nseq('ventes'),date:now,
    articles:lignes.length,montant:tot,paiement:pay==='credit'?'Crédit':pay,statut:'finalisee',lignes,client_id:clientId};
  D.ventes.unshift(nv);
  for(const l of lignes){
    const p=D.produits.find(x=>String(x.id)===String(l.produit_id));if(p)p.stock=Number(p.stock||0)-Number(l.qte);
    D.mouvements.unshift({id:nid('mouvements'),date:now,type:'sortie',produit_id:l.produit_id,produit:l.produit,qte:l.qte,ref:nv.num,user:CU?.nom||'Caissier'});
  }
  if(pay==='credit'&&clientId){const c=D.clients.find(x=>String(x.id)===String(clientId));if(c){c.dette=(Number(c.dette)||0)+(tot-acompte);c.last_vente=now.slice(0,10);localStorage.setItem('db_cl',JSON.stringify(D.clients));rdClients();}}
  recalcEtats();sv('db_v','ventes');sv('db_m','mouvements');sv('db_p','produits');
  logAction('VENTE',`Vente ${nv.num} — ${gnf(tot)} — ${pay}`);
  const w=window.open('','_blank','width=400,height=500');
  if(w){const c=clientId?D.clients.find(x=>String(x.id)===String(clientId)):null;
    w.document.write(`<!DOCTYPE html><html><head><title>${esc(nv.num)}</title><style>body{font-family:monospace;font-size:12px;padding:20px;}hr{border:1px dashed #000;}.c{text-align:center;}.b{font-weight:bold;}.r{text-align:right;}</style></head><body>
    <div class="c b" style="font-size:16px">ETS N’GUILLA &amp; FRÈRES</div><div class="c">HABATECH &copy; 2026</div><hr>
    <div>N° : ${esc(nv.num)}</div><div>Date : ${esc(nv.date)}</div><div>Caissier : ${esc(CU?.nom||'—')}</div>${c?`<div>Client : ${esc(c.nom)}</div>`:''}
    <div>Paiement : ${esc(nv.paiement)}</div><hr>
    ${lignes.map(l=>`<div>${esc(String(l.produit||'').substring(0,24))} x${l.qte} ... ${gnf(l.qte*l.prix)}</div>`).join('')}
    ${rem>0?`<div>Remise : -${gnf(rem)}</div>`:''}${acompte>0?`<div>Acompte : ${gnf(acompte)}</div><div>À crédit : ${gnf(tot-acompte)}</div>`:''}
    <hr><div class="r b" style="font-size:14px">TOTAL : ${gnf(tot)}</div><hr><div class="c">Merci pour votre achat !</div></body></html>`);w.print();}
  POS_CART=[];posRenderCart();document.getElementById('pos-rem').value='0';document.getElementById('pos-acompte').value='0';
  toast('✅ Vente encaissée — '+gnf(tot),'success');rdVentes();rdProduits();updateKPIs();computeAlerts();
}

// ═══════════════════════════════
//  RAPPORT JOURNALIER PDF
// ═══════════════════════════════
function xPDFJournalier(){
  const{jsPDF}=window.jspdf,doc=new jsPDF();
  const today=new Date().toLocaleDateString('fr-FR'),todayISO=new Date().toISOString().slice(0,10);
  // En-tête
  doc.setFillColor(15,23,42);doc.rect(0,0,210,38,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('ETS N’GUILLA & FRÈRES — Rapport Journalier',15,16);
  doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('HABATECH — '+today,15,24);doc.text('Généré par: '+( CU?.nom||'Admin'),15,30);
  doc.setDrawColor(59,130,246);doc.setLineWidth(0.8);doc.line(0,39,210,39);
  let y=48;
  const sec=(title,color=[30,41,59])=>{doc.setFillColor(...color);doc.rect(14,y-5,182,9,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(title,17,y);y+=8;doc.setTextColor(30,40,60);doc.setFont('helvetica','normal');doc.setFontSize(9);};
  const row=(lbl,val,color=null)=>{if(color)doc.setTextColor(...color);else doc.setTextColor(30,40,60);doc.text(lbl,20,y);doc.setFont('helvetica','bold');doc.text(val,130,y);doc.setFont('helvetica','normal');y+=5.5;};
  // VENTES DU JOUR
  const vj=D.ventes.filter(v=>(v.date||'').startsWith(todayISO));
  const caJ=vj.reduce((s,v)=>s+v.montant,0);
  sec('>> VENTES DU JOUR');
  row('Nombre de transactions :',String(vj.length));
  row('CA total du jour :',gnf(caJ),[16,185,129]);
  const byPay={};vj.forEach(v=>{byPay[v.paiement]=(byPay[v.paiement]||0)+v.montant;});
  Object.entries(byPay).forEach(([k,v])=>{row('  '+k+' :',gnf(v));});
  y+=3;doc.setDrawColor(220,225,235);doc.line(14,y,196,y);y+=6;
  // DÉPENSES DU JOUR
  const dj=D.depenses.filter(d=>d.date===todayISO);
  const depJ=dj.reduce((s,d)=>s+d.montant,0);
  sec('>> DEPENSES DU JOUR',[239,68,68]);
  row('Nombre de dépenses :',String(dj.length));
  row('Total dépenses du jour :',gnf(depJ),[239,68,68]);
  const byDCat={};dj.forEach(d=>{byDCat[d.categorie]=(byDCat[d.categorie]||0)+d.montant;});
  Object.entries(byDCat).forEach(([k,v])=>{row('  '+( DP_CAT_LBL[k]||k)+' :',gnf(v));});
  y+=3;doc.setDrawColor(220,225,235);doc.line(14,y,196,y);y+=6;
  // BÉNÉFICE NET
  const ben=caJ-depJ;
  sec('>> RESULTAT NET DU JOUR',[16,185,129]);
  row('CA du jour :',gnf(caJ),[16,185,129]);
  row('Dépenses du jour :','-'+gnf(depJ),[239,68,68]);
  doc.setFillColor(ben>=0?16:239,ben>=0?185:68,ben>=0?129:68);doc.rect(14,y-4,182,9,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(11);
  doc.text('BÉNÉFICE NET DU JOUR :',17,y+1);doc.text(gnf(ben),170,y+1,{align:'right'});
  y+=12;doc.setTextColor(30,40,60);doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.setDrawColor(220,225,235);doc.line(14,y,196,y);y+=6;
  // ALERTES STOCK
  if(y>240){doc.addPage();y=20;}
  const alP=D.produits.filter(p=>p.etat==='rupture'||p.etat==='critique');
  sec('[!] ALERTES STOCK ('+alP.length+')',[245,158,11]);
  alP.forEach(p=>{if(y>270){doc.addPage();y=20;}row(p.etat.toUpperCase()+' — '+p.designation,'Stk: '+p.stock+'/'+p.min,p.etat==='rupture'?[239,68,68]:[245,158,11]);});
  if(!alP.length)row('Aucune alerte','OK',[16,185,129]);
  y+=3;doc.setDrawColor(220,225,235);doc.line(14,y,196,y);y+=6;
  // MARGES PRODUITS
  if(y>240){doc.addPage();y=20;}
  sec('>> MARGES PAR PRODUIT',[59,130,246]);
  doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text('Produit',20,y);doc.text('Px Achat',90,y);doc.text('Px Vente',125,y);doc.text('Marge GNF',158,y);doc.text('%',188,y);
  y+=4;doc.setLineWidth(0.3);doc.line(14,y,196,y);y+=4;
  doc.setFont('helvetica','normal');
  D.produits.forEach((p,i)=>{
    if(y>272){doc.addPage();y=20;}
    if(i%2===0){doc.setFillColor(248,250,252);doc.rect(14,y-3,182,6,'F');}
    const mg=p.vente-p.achat,pct=p.vente?Math.round(mg/p.vente*100):0;
    doc.setTextColor(30,40,60);doc.text(p.designation.substring(0,32),20,y);
    doc.text(p.achat.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '),90,y);doc.text(p.vente.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '),125,y);
    if(mg>=0)doc.setTextColor(16,185,129);else doc.setTextColor(239,68,68);
    doc.text(mg.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' '),158,y);doc.text(pct+'%',188,y);
    y+=6;
  });
  // Pied de page
  const tp=doc.getNumberOfPages();for(let i=1;i<=tp;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(150);doc.text('ETS N’GUILLA & FRÈRES — Logiciel HABATECH © 2026 — Rapport journalier du '+today+' — Page '+i+'/'+tp,105,290,{align:'center'});}
  doc.save('NGUILLA_Journalier_'+todayISO+'.pdf');
  toast('Rapport journalier amélioré téléchargé','success');
  logAction('CREATE','Export rapport journalier PDF');
}

// ═══════════════════════════════
//  REÇU DE VENTE PDF amélioré
// ══════════════════════════════
function printTicket(id){
  const v=D.ventes.find(x=>x.id===id);if(!v)return;
  const c=v.client_id?D.clients.find(x=>x.id===v.client_id):null;
  const w=window.open('','_blank','width=400,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(v.num)}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;padding:18px;max-width:340px;margin:0 auto;color:#172033;background:#fff;}
    hr{border:none;border-top:1px dashed #94a3b8;margin:11px 0;}
    .c{text-align:center;}.b{font-weight:700;}.r{text-align:right;}
    .row{display:flex;justify-content:space-between;gap:12px;margin:5px 0;align-items:flex-start;}.row span:last-child{text-align:right;}
    .ttl{font-size:10px;color:#64748b;}.receipt-brand{background:#0f172a;color:#fff;padding:14px 8px;border-radius:8px;margin-bottom:10px;}
    .receipt-total{background:#eff6ff;border:1px solid #bfdbfe;padding:10px;border-radius:7px;margin-top:10px;color:#1d4ed8;}
    button{font-family:inherit;font-weight:700;}
    @media print{body{padding:4mm;max-width:none;}button{display:none!important;}.receipt-brand,.receipt-total{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head><body>
  <div class="receipt-brand"><div class="c b" style="font-size:17px;letter-spacing:.4px">ETS N’GUILLA &amp; FRÈRES</div>
  <div class="c ttl" style="color:#cbd5e1;margin-top:5px">FACTURETTE / PREUVE D’ACHAT</div><div class="c ttl" style="color:#cbd5e1">Conakry, Guinée · Tél. +224 622 000 000</div></div>
  <hr>
  <div class="row"><span>N° :</span><span class="b">${esc(v.num)}</span></div>
  <div class="row"><span>Date :</span><span>${v.date}</span></div>
  ${c?`<div class="row"><span>Client :</span><span class="b">${esc(c.nom)}</span></div>`:''}
  <div class="row"><span>Paiement :</span><span>${v.paiement}</span></div>
  <hr>
  <div class="b ttl" style="margin-bottom:4px">ARTICLES</div>
  ${(v.lignes||[]).map(l=>`
    <div class="row"><span>${esc(l.produit)}</span></div>
    <div class="row ttl"><span>  x${l.qte} × ${gnf(l.prix)}</span><span>${gnf(l.qte*l.prix)}</span></div>
  `).join('')}
  <hr>
  <div class="receipt-total"><div class="row b" style="font-size:12px"><span>TOTAL À PAYER</span><span style="font-size:17px">${gnf(v.montant)}</span></div></div>
  <hr>
  <div class="c ttl" style="margin-top:8px">Merci pour votre confiance !</div>
  <div class="c ttl">Conservez ce reçu</div>
  <br>
  <button onclick="window.print()" style="width:100%;padding:8px;background:#000;color:#fff;border:none;cursor:pointer;font-size:13px;border-radius:4px;margin-top:8px">🖨️ Imprimer</button>
  </body></html>`);
  w.document.close();
  toast('Reçu généré','success');
  logAction('VENTE','Impression reçu '+v.num);
}

// ═══════════════════════════════
//  SELECTS
// ═══════════════════════════════
// ═══════════════════════════════
//  CRUD CATÉGORIES
// ═══════════════════════════════
function rdCategories(){
  const list=document.getElementById('cat-list');
  if(!list)return;
  const CHART_COLORS=['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#38BDF8','#F472B6','#A3E635','#FB923C','#A78BFA'];
  list.innerHTML=D.categories.map((c,i)=>{
    const nb=D.produits.filter(p=>p.categorie===c.slug).length;
    return`<div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 14px">
      <span style="font-size:22px;width:30px;text-align:center">${c.emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;color:var(--text)">${esc(c.nom)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px"><code style="font-size:10px">${c.slug}</code> &nbsp;·&nbsp; ${nb} produit${nb!==1?'s':''} &nbsp;·&nbsp; ${c.perishable?'<span style="color:var(--green)">périssable</span>':'non périssable'}</div>
      </div>
      <div style="width:14px;height:14px;border-radius:50%;background:${c.couleur};flex-shrink:0"></div>
      <button class="btn btn-outline btn-sm" onclick="editCat(${c.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="delCat(${c.id})" ${nb>0?'title="Impossible : des produits utilisent cette catégorie" style="opacity:.4;pointer-events:none"':''}}>🗑️</button>
    </div>`;
  }).join('')||'<div class="empty"><div class="ico">🏷️</div><p>Aucune catégorie</p></div>';
}

function openMCats(){
  resetCatForm();
  rdCategories();
  openM('m-categories');
}

function resetCatForm(){
  document.getElementById('cat-edit-id').value='';
  document.getElementById('cat-emoji').value='';
  document.getElementById('cat-nom').value='';
  document.getElementById('cat-slug').value='';
  document.getElementById('cat-color').value='#3B82F6';
  document.getElementById('cat-perishable').checked=false;
  document.getElementById('cat-form-title').textContent='➕ Nouvelle catégorie';
  document.getElementById('cat-cancel-btn').style.display='none';
}

function editCat(id){
  const c=D.categories.find(x=>x.id===id);if(!c)return;
  document.getElementById('cat-edit-id').value=id;
  document.getElementById('cat-emoji').value=c.emoji;
  document.getElementById('cat-nom').value=c.nom;
  document.getElementById('cat-slug').value=c.slug;
  document.getElementById('cat-color').value=c.couleur||'#3B82F6';
  document.getElementById('cat-perishable').checked=!!c.perishable;
  document.getElementById('cat-form-title').textContent='✏️ Modifier : '+c.nom;
  document.getElementById('cat-cancel-btn').style.display='';
}

function saveCat(){
  const nom=(document.getElementById('cat-nom').value||'').trim();
  let slug=(document.getElementById('cat-slug').value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const emoji=document.getElementById('cat-emoji').value.trim()||'📦';
  const couleur=document.getElementById('cat-color').value||'#3B82F6';
  const perishable=document.getElementById('cat-perishable').checked;
  const editId=+document.getElementById('cat-edit-id').value||0;

  if(!nom){toast('Nom de catégorie requis','error');return;}
  if(!slug)slug=nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_');

  // Vérifier unicité du slug
  const dupSlug=D.categories.find(c=>c.slug===slug&&c.id!==editId);
  if(dupSlug){toast('Ce slug existe déjà : '+slug,'error');return;}

  if(editId){
    const i=D.categories.findIndex(c=>c.id===editId);
    if(i>=0)D.categories[i]={...D.categories[i],nom,slug,emoji,couleur,perishable};
    toast('Catégorie "'+nom+'" modifiée','success');
    logAction('UPDATE','Catégorie modifiée: '+nom);
  } else {
    D.categories.push({id:nid('categories'),nom,slug,emoji,couleur,perishable});
    toast('Catégorie "'+nom+'" créée','success');
    logAction('CREATE','Catégorie créée: '+nom);
  }
  localStorage.setItem('db_cats',JSON.stringify(D.categories));
  resetCatForm();
  rdCategories();
  fillCatSelects();
  initDashCharts();
}

function delCat(id){
  const c=D.categories.find(x=>x.id===id);if(!c)return;
  const nb=D.produits.filter(p=>p.categorie===c.slug).length;
  if(nb>0){toast('Impossible : '+nb+' produit(s) utilisent cette catégorie','error');return;}
  if(!confirm('Supprimer la catégorie "'+c.nom+'" ?'))return;
  D.categories=D.categories.filter(x=>x.id!==id);
  localStorage.setItem('db_cats',JSON.stringify(D.categories));
  rdCategories();
  fillCatSelects();
  initDashCharts();
  toast('Catégorie supprimée','warning');
  logAction('DELETE','Catégorie supprimée: '+c.nom);
}

function fillSelects(){
  fillClientSelects();
  fillCatSelects();
  const opts=D.produits.map(p=>`<option value="${p.id}">${esc(p.designation)}</option>`).join('');
  document.getElementById('mv-prod').innerHTML=opts;
  document.getElementById('vl-prod').innerHTML=D.produits.map(p=>`<option value="${p.id}">${esc(p.designation)} — ${gnf(p.vente)}</option>`).join('');
  document.getElementById('p-fourn').innerHTML='<option value="">— Sélectionner —</option>'+D.fournisseurs.map(f=>`<option value="${esc(f.nom)}">${esc(f.nom)}</option>`).join('');
  document.getElementById('c-fourn').innerHTML=D.fournisseurs.map(f=>`<option value="${esc(f.nom)}">${esc(f.nom)}</option>`).join('');
}
function fillCatSelects(){
  const opts=D.categories.map(c=>`<option value="${c.slug}">${c.emoji} ${esc(c.nom)}</option>`).join('');
  const allOpt='<option value="">Toutes catégories</option>'+opts;
  // Filtre produits
  const spCat=document.getElementById('sp-cat');
  if(spCat)spCat.innerHTML=allOpt;
  // Formulaire produit
  const pCat=document.getElementById('p-cat');
  if(pCat){const prev=pCat.value;pCat.innerHTML=opts;if(prev)pCat.value=prev;}
}

// ═══════════════════════════════
//  CHARTS
// ═══════════════════════════════
let DC={};
function initDashCharts(){
  Object.values(DC).forEach(c=>{try{c.destroy();}catch(e){}});DC={};
  const go={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94A3B8',font:{size:11,family:'DM Sans'}}}}};
  const c1=document.getElementById('ch-mvt');
  if(c1){
    // Données réelles 7 derniers jours
    const days7=[];const d7=new Date();
    for(let i=6;i>=0;i--){const d=new Date(d7);d.setDate(d.getDate()-i);days7.push(d.toISOString().slice(0,10));}
    const dayLabels=days7.map(d=>{const j=new Date(d);return['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][j.getDay()];});
    const entrees=days7.map(d=>D.mouvements.filter(m=>m.type==='entree'&&(m.date||'').startsWith(d)).reduce((s,m)=>s+m.qte,0));
    const sorties=days7.map(d=>D.mouvements.filter(m=>m.type==='sortie'&&(m.date||'').startsWith(d)).reduce((s,m)=>s+m.qte,0));
    DC.mvt=new Chart(c1,{type:'bar',data:{labels:dayLabels,
      datasets:[{label:'Entrées',data:entrees,backgroundColor:'rgba(16,185,129,.6)',borderRadius:5},
                {label:'Sorties',data:sorties,backgroundColor:'rgba(239,68,68,.5)',borderRadius:5}]},
      options:{...go,scales:{x:{ticks:{color:'#64748B'},grid:{color:'rgba(255,255,255,.04)'}},y:{beginAtZero:true,ticks:{color:'#64748B'},grid:{color:'rgba(255,255,255,.04)'}}}}});
  }
  const c2=document.getElementById('ch-cat');
  if(c2){
    const cats=D.categories;
    const vals=cats.map(c=>D.produits.filter(p=>p.categorie===c.slug).reduce((s,p)=>s+p.stock*p.achat,0));
    const hasData=vals.some(v=>v>0);
    DC.cat=new Chart(c2,{type:'doughnut',data:{labels:cats.map(c=>c.emoji+' '+c.nom),
      datasets:[{data:hasData?vals:cats.map(()=>Math.random()*30+10),backgroundColor:cats.map(c=>c.couleur),borderWidth:0,hoverOffset:5}]},
      options:{...go,plugins:{legend:{position:'bottom',labels:{color:'#94A3B8',font:{size:11}}}}}});
  }
}
// ═══════════════════════════════
//  RAPPORTS — PÉRIODE & KPIs DYNAMIQUES
// ═══════════════════════════════
let RPT_PERIOD='month';
let RPT_FROM='',RPT_TO='';

function getRptDates(){
  const now=new Date(),todayISO=now.toISOString().slice(0,10);
  if(RPT_PERIOD==='today') return {from:todayISO,to:todayISO};
  if(RPT_PERIOD==='week'){
    const d=new Date(now);d.setDate(d.getDate()-6);
    return {from:d.toISOString().slice(0,10),to:todayISO};
  }
  if(RPT_PERIOD==='month'){
    return {from:todayISO.slice(0,7)+'-01',to:todayISO};
  }
  if(RPT_PERIOD==='quarter'){
    const d=new Date(now);d.setMonth(d.getMonth()-2);d.setDate(1);
    return {from:d.toISOString().slice(0,10),to:todayISO};
  }
  if(RPT_PERIOD==='year'){
    return {from:now.getFullYear()+'-01-01',to:todayISO};
  }
  if(RPT_PERIOD==='custom'){
    const f=document.getElementById('rpt-date-from')?.value;
    const t=document.getElementById('rpt-date-to')?.value||todayISO;
    return {from:f||todayISO.slice(0,7)+'-01',to:t};
  }
  return {from:todayISO.slice(0,7)+'-01',to:todayISO};
}

function setRptPeriod(per,btn){
  RPT_PERIOD=per;
  document.querySelectorAll('.rpt-per').forEach(b=>b.classList.remove('active-rpt'));
  if(btn)btn.classList.add('active-rpt');
  const cr=document.getElementById('rpt-custom-range');
  if(cr)cr.style.display=per==='custom'?'flex':'none';
  refreshRapports();
}

function refreshRapports(){
  const {from,to}=getRptDates();
  // Label période
  const lbl=document.getElementById('rpt-period-label');
  if(lbl)lbl.textContent=`Données du ${from} au ${to}`;

  // Filtres sur la période
  const inPeriod=(dateStr)=>{const d=(dateStr||'').slice(0,10);return d>=from&&d<=to;};
  const vP=D.ventes.filter(v=>inPeriod(v.date));
  const dP=D.depenses.filter(d=>inPeriod(d.date));
  const mP=D.mouvements.filter(m=>inPeriod(m.date));
  const rP=D.retours.filter(r=>inPeriod(r.date));

  // CA période
  const retMnt=rP.filter(r=>r.statut==='traite').reduce((s,r)=>s+(Number(r.montant)||0),0);
  const caBrut=vP.reduce((s,v)=>s+(Number(v.montant)||0),0);
  const caP=caBrut-retMnt;
  document.getElementById('r-ca').textContent=gnf(caP);
  document.getElementById('r-ca-nb').textContent=vP.length+' vente'+(vP.length>1?'s':'');

  // Marge brute sur la période
  let caLignes=0,coutLignes=0;
  vP.forEach(v=>{
    const lignes=v.lignes||[];
    // Le montant de la vente inclut déjà la remise éventuelle : l’utiliser évite de surestimer la marge.
    caLignes+=Number(v.montant)||0;
    lignes.forEach(l=>{
      const p=D.produits.find(x=>String(x.id)===String(l.produit_id));
      const cout=(l.cout_achat!==undefined&&l.cout_achat!==null)?Number(l.cout_achat):(Number(p?.achat)||0);
      coutLignes+=Number(l.qte||0)*cout;
    });
  });
  const mgBrute=caLignes-coutLignes-retMnt;
  const mgPct=caLignes>0?Math.round(mgBrute/caLignes*100):0;
  document.getElementById('r-mg').textContent=gnf(mgBrute);
  const mgEl2=document.getElementById('r-mg-pct');
  if(mgEl2){mgEl2.textContent='Taux: '+mgPct+'%';mgEl2.className='kpi-delta '+(mgPct>=20?'delta-up':mgPct>=10?'delta-ne':'delta-dn');}

  // Dépenses
  const depP=dP.reduce((s,d)=>s+d.montant,0);
  document.getElementById('r-dep').textContent=gnf(depP);
  const benNet=mgBrute-depP;
  const benEl=document.getElementById('r-ben-net');
  if(benEl){benEl.textContent='Marge après dépenses: '+(gnf(benNet));benEl.className='kpi-delta '+(benNet>=0?'delta-up':'delta-dn');}

  // Pertes réelles
  const prtMvt=mP.filter(m=>m.type==='perte');
  let prtVal=0;
  prtMvt.forEach(m=>{
    const p=D.produits.find(x=>x.id===m.produit_id||x.designation===m.produit);
    prtVal+=m.qte*(p?.achat||m.prix||0);
  });
  document.getElementById('r-prt').textContent=gnf(prtVal);
  const prtNb=document.getElementById('r-prt-nb');
  if(prtNb)prtNb.textContent=prtMvt.length+' entrée'+(prtMvt.length>1?'s':'');

  // Valeur stock
  const val=D.produits.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.achat)||0),0);
  document.getElementById('r-val').textContent=Math.round(val).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF';

  // Rotation stock = sorties période / stock moyen actuel
  const sortiesQte=mP.filter(m=>m.type==='sortie').reduce((s,m)=>s+m.qte,0);
  const stockMoyen=D.produits.reduce((s,p)=>s+p.stock,0)||1;
  const rot=sortiesQte/stockMoyen;
  document.getElementById('r-rot').textContent=rot.toFixed(2);
  const rotLbl=document.getElementById('r-rot-lbl');
  if(rotLbl)rotLbl.textContent=sortiesQte+' sorties / '+stockMoyen+' stk moy.';

  // Retours
  document.getElementById('r-ret').textContent=gnf(retMnt);
  const retNb=document.getElementById('r-ret-nb');
  if(retNb)retNb.textContent=rP.length+' retour'+(rP.length>1?'s':'');

  // Ventes mois courant (KPI fixe)
  const cm=new Date().toISOString().slice(0,7);
  const caM=D.ventes.filter(v=>(v.date||'').startsWith(cm)).reduce((s,v)=>s+v.montant,0);
  document.getElementById('r-vnt').textContent=Math.round(caM).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')+' GNF';

  // Tableau marges
  rdMarges();

  // Graphiques
  initRptCharts(vP,dP,mP);
}

function rdMarges(){
  const sorted=[...D.produits].sort((a,b)=>{
    const ma=(a.vente?((a.vente-a.achat)/a.vente)*100:0);
    const mb=(b.vente?((b.vente-b.achat)/b.vente)*100:0);
    return mb-ma;
  });
  document.getElementById('tb-marges').innerHTML=sorted.length?sorted.map(p=>{
    const mg=p.vente-p.achat,pct=p.vente?Math.round(mg/p.vente*100):0;
    const col=pct>=30?'var(--green)':pct>=15?'var(--orange)':'var(--red)';
    return `<tr>
      <td><b>${esc(p.designation)}</b><br><code style="font-size:10px">${esc(p.code)}</code></td>
      <td style="font-family:'DM Mono',monospace;color:var(--text2)">${gnf(p.achat)}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--green)">${gnf(p.vente)}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:700;color:${col}">${gnf(mg)}</td>
      <td><span class="tag" style="background:${col}22;color:${col};border-color:${col}44">${pct}%</span></td>
      <td style="font-family:'DM Mono',monospace">${p.stock} ${esc(p.unite||'u.')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--blue)">${gnf(p.stock*p.achat)}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="7"><div class="empty"><div class="ico">📦</div><p>Aucun produit</p></div></td></tr>`;
}

let RC={};
function initRptCharts(vP,dP,mP){
  Object.values(RC).forEach(c=>{try{c.destroy();}catch(e){}});RC={};
  const go={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94A3B8',font:{size:11,family:'DM Sans'}}}}};

  // 1. Valorisation catégories (réelle)
  const c1=document.getElementById('ch-val');
  if(c1){
    const cats=D.categories;
    const vals=cats.map(c=>Math.round(D.produits.filter(p=>p.categorie===c.slug).reduce((s,p)=>s+p.stock*p.achat,0)));
    RC.val=new Chart(c1,{type:'bar',data:{labels:cats.map(c=>c.emoji+' '+c.nom),
      datasets:[{label:'Valeur stock (GNF)',data:vals,backgroundColor:cats.map(c=>c.couleur+'BB'),borderRadius:6}]},
      options:{...go,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748B'},grid:{color:'rgba(255,255,255,.04)'}},y:{beginAtZero:true,ticks:{color:'#64748B',callback:v=>Number(v).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')},grid:{color:'rgba(255,255,255,.04)'}}}}});
  }

  // 2. CA vs Dépenses par jour sur la période
  const c2=document.getElementById('ch-rpt');
  if(c2){
    const {from,to}=getRptDates();
    // Générer les dates de la période
    const days=[];let cur=new Date(from);const end=new Date(to);
    const maxDays=RPT_PERIOD==='year'?12:RPT_PERIOD==='quarter'?13:RPT_PERIOD==='month'?30:RPT_PERIOD==='week'?7:1;
    const useMonth=RPT_PERIOD==='year'||RPT_PERIOD==='quarter';
    if(useMonth){
      // Grouper par mois
      cur.setDate(1);
      while(cur<=end&&days.length<13){
        days.push(cur.toISOString().slice(0,7));
        cur.setMonth(cur.getMonth()+1);
      }
      const caByM=days.map(m=>vP.filter(v=>(v.date||'').startsWith(m)).reduce((s,v)=>s+v.montant,0));
      const dpByM=days.map(m=>dP.filter(d=>(d.date||'').startsWith(m)).reduce((s,d)=>s+d.montant,0));
      const shortM=['J','F','M','A','M','J','J','A','S','O','N','D'];
      const labels=days.map(m=>shortM[parseInt(m.slice(5))-1]+' '+m.slice(2,4));
      RC.rpt=new Chart(c2,{type:'bar',data:{labels,
        datasets:[{label:'CA',data:caByM,backgroundColor:'rgba(16,185,129,.7)',borderRadius:4},
                  {label:'Dépenses',data:dpByM,backgroundColor:'rgba(239,68,68,.6)',borderRadius:4}]},
        options:{...go,plugins:{legend:{display:true,labels:{color:'#94A3B8',font:{size:11}}}},scales:{x:{ticks:{color:'#64748B'},grid:{color:'rgba(255,255,255,.04)'}},y:{beginAtZero:true,ticks:{color:'#64748B',callback:v=>Number(v).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')},grid:{color:'rgba(255,255,255,.04)'}}}}});
    } else {
      // Grouper par jour
      cur=new Date(from);
      while(cur<=end&&days.length<=maxDays){days.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
      const caByD=days.map(d=>vP.filter(v=>(v.date||'').startsWith(d)).reduce((s,v)=>s+v.montant,0));
      const dpByD=days.map(d=>dP.filter(dp=>(dp.date||'').startsWith(d)).reduce((s,dp)=>s+dp.montant,0));
      const labels=days.map(d=>d.slice(5));
      RC.rpt=new Chart(c2,{type:'line',data:{labels,
        datasets:[{label:'CA',data:caByD,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,.15)',fill:true,tension:.3,pointRadius:3},
                  {label:'Dépenses',data:dpByD,borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,.1)',fill:true,tension:.3,pointRadius:3}]},
        options:{...go,plugins:{legend:{display:true,labels:{color:'#94A3B8',font:{size:11}}}},scales:{x:{ticks:{color:'#64748B',maxRotation:45},grid:{color:'rgba(255,255,255,.04)'}},y:{beginAtZero:true,ticks:{color:'#64748B',callback:v=>Number(v).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')},grid:{color:'rgba(255,255,255,.04)'}}}}});
    }
  }

  // 3. CA par mode paiement
  const c3=document.getElementById('ch-pay');
  if(c3){
    const pays={};vP.forEach(v=>{pays[v.paiement]=(pays[v.paiement]||0)+v.montant;});
    const payLabels=Object.keys(pays);const payVals=Object.values(pays);
    RC.pay=new Chart(c3,{type:'doughnut',data:{labels:payLabels.length?payLabels:['Aucune vente'],
      datasets:[{data:payVals.length?payVals:[1],backgroundColor:['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#64748B'],borderWidth:0,hoverOffset:5}]},
      options:{...go,plugins:{legend:{position:'bottom',labels:{color:'#94A3B8',font:{size:11}}}}}});
  }

  // 4. Top 10 produits par CA (sur les ventes de la période)
  const c4=document.getElementById('ch-top');
  if(c4){
    const topMap={};
    vP.forEach(v=>(v.lignes||[]).forEach(l=>{topMap[l.produit]=(topMap[l.produit]||0)+l.qte*l.prix;}));
    const topSorted=Object.entries(topMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const topLabels=topSorted.map(([k])=>k.length>18?k.substring(0,16)+'…':k);
    const topVals=topSorted.map(([,v])=>v);
    RC.top=new Chart(c4,{type:'bar',data:{labels:topLabels.length?topLabels:['Aucune vente'],
      datasets:[{data:topVals.length?topVals:[0],backgroundColor:'rgba(59,130,246,.7)',borderRadius:4}]},
      options:{...go,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{color:'#64748B',callback:v=>Number(v).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#94A3B8',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}}}}});
  }
}

function xExcelRapport(){
  const {from,to}=getRptDates();
  const inP=(dateStr)=>{const d=(dateStr||'').slice(0,10);return d>=from&&d<=to;};
  const vP=D.ventes.filter(v=>inP(v.date));
  const dP=D.depenses.filter(d=>inP(d.date));
  const wb=XLSX.utils.book_new();
  // Onglet résumé
  const caP=vP.reduce((s,v)=>s+v.montant,0);
  const depP=dP.reduce((s,d)=>s+d.montant,0);
  const resData=[{Indicateur:'Période',Valeur:`${from} → ${to}`},{Indicateur:'CA total',Valeur:caP},{Indicateur:'Dépenses',Valeur:depP},{Indicateur:'Bénéfice net',Valeur:caP-depP},{Indicateur:'Nombre de ventes',Valeur:vP.length}];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(resData),'Résumé');
  // Onglet marges
  const margeData=D.produits.map(p=>({Code:p.code,Produit:p.designation,'Px Achat':p.achat,'Px Vente':p.vente,'Marge GNF':p.vente-p.achat,'Marge %':p.achat?Math.round((p.vente-p.achat)/p.achat*100):0,Stock:p.stock,'Valeur Stock':p.stock*p.achat}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(margeData),'Marges Produits');
  // Onglet ventes période
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(vP.map(v=>({Numéro:v.num,Date:v.date,Articles:v.articles,Montant:v.montant,Paiement:v.paiement}))),'Ventes période');
  // Onglet dépenses période
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(dP.map(d=>({Date:d.date,Libellé:d.libelle,Catégorie:d.categorie,Montant:d.montant}))),'Dépenses période');
  XLSX.writeFile(wb,`HABATECH_Rapport_${from}_${to}.xlsx`);
  toast('Export rapport téléchargé','success');
}

function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
function closeOnBg(e,id){if(e.target===document.getElementById(id))closeM(id);}
function toast(msg,type='info'){
  const tc=document.getElementById('toasts'),t=document.createElement('div');
  const ic={success:'✅',error:'🚨',warning:'⚠️',info:'ℹ️'};
  t.className=`toast ${type}`;t.innerHTML=`<span>${ic[type]||'ℹ️'}</span><span style="flex:1">${esc(msg)}</span>`;
  tc.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(80px)';t.style.transition='.4s';},3200);
  setTimeout(()=>t.remove(),3700);
}

// ═══════════════════════════════
//  PWA
// ═══════════════════════════════
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW non enregistré',e));});}

// ═══════════════════════════════
//  INIT
// ═══════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  initSB();
  restoreSession();
  document.getElementById('timeout-warn').addEventListener('click',resetTimeout);
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('sm-date').value=today;
  document.getElementById('sv-date').value=today;
  document.getElementById('sd-date').value=today;
  document.getElementById('sr-date').value=today;
  document.getElementById('c-date').value=today;
  const fut=new Date();fut.setDate(fut.getDate()+5);
  document.getElementById('c-prev').value=fut.toISOString().slice(0,10);
  // SSE simulation
  const msgs=[
    {m:'Stock minimum atteint — Farine de Blé 1kg',t:'warning'},
    {m:'Nouvelle commande CMD-2026-009 reçue',t:'info'},
    {m:'Rupture imminente — Huile Végétale 5L',t:'error'},
    {m:'Synchronisation OK',t:'success'},
  ];let si=0;
  setInterval(()=>{toast('🔴 '+msgs[si%msgs.length].m,msgs[si%msgs.length].t);si++;},22000);
});
