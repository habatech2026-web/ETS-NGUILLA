

function toggleQuickLinks(force){
  const panel=document.getElementById('quick-links-panel');
  const btn=document.getElementById('quick-links-toggle');
  if(!panel||!btn)return;
  const opening=typeof force==='boolean'?force:panel.style.display==='none';
  panel.style.display=opening?'block':'none';
  btn.setAttribute('aria-expanded',opening?'true':'false');
}
function quickGo(pg){
  const navItem=Array.from(document.querySelectorAll('#sidebar .nav-item')).find(el=>(el.getAttribute('onclick')||'').includes("goPage('"+pg+"'"));
  goPage(pg,navItem||null);
  toggleQuickLinks(false);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')toggleQuickLinks(false);});
// ── Liens rapides du dashboard (personnalisables, mémorisés par appareil) ──
const DQ_CATALOG=[
 {id:'pos',ic:'⚡',l:'Point de vente',f:()=>openPOS()},
 {id:'vente',ic:'🛒',l:'Nouvelle vente',f:()=>openM('m-vente')},
 {id:'mvt',ic:'🔄',l:'Mouvement stock',f:()=>openM('m-mvt')},
 {id:'prod',ic:'➕',l:'Nouveau produit',f:()=>openNewProduit()},
 {id:'client',ic:'👥',l:'Nouveau client',f:()=>openNewClient()},
 {id:'depense',ic:'💸',l:'Nouvelle dépense',f:()=>openM('m-depense')},
 {id:'cmd',ic:'📋',l:'Nouvelle commande',f:()=>openM('m-cmd')},
 {id:'retour',ic:'🔁',l:'Retour client',f:()=>openM('m-retour')},
 {id:'p-alertes',ic:'🔔',l:'Alertes',f:()=>quickGo('alertes')},
 {id:'p-fact',ic:'🧾',l:'Facturation',f:()=>quickGo('facturation')},
 {id:'p-inv',ic:'🔍',l:'Inventaire',f:()=>quickGo('inventaire')},
 {id:'p-clients',ic:'💳',l:'Crédits clients',f:()=>quickGo('clients')},
 {id:'p-rapports',ic:'📊',l:'Rapports',f:()=>quickGo('rapports')}
];
const DQ_DEFAULT=['pos','vente','mvt','prod','client','depense','p-alertes','p-rapports'];
function dqGet(){try{const v=JSON.parse(localStorage.getItem('ets_fav_links')||'null');if(Array.isArray(v)&&v.length)return v;}catch(e){}return DQ_DEFAULT.slice();}
function dqRun(id){const it=DQ_CATALOG.find(x=>x.id===id);if(!it)return;try{it.f();}catch(e){toast('Action indisponible : '+e.message,'error');}}
function dqToggleCfg(){const c=document.getElementById('dq-cfg');if(c)c.style.display=c.style.display==='flex'?'none':'flex';}
function dqSet(id,on){let v=dqGet().filter(x=>x!==id);if(on)v.push(id);v=DQ_CATALOG.map(x=>x.id).filter(x=>v.includes(x));try{localStorage.setItem('ets_fav_links',JSON.stringify(v));}catch(e){}renderDashQuick(true);}
function renderDashQuick(keepCfg){
  const row=document.getElementById('dq-row'),cfg=document.getElementById('dq-cfg');if(!row||!cfg)return;
  const fav=dqGet(),open=cfg.style.display==='flex';
  row.innerHTML=DQ_CATALOG.filter(x=>fav.includes(x.id)).map(x=>`<button onclick="dqRun('${x.id}')">${x.ic} ${esc(x.l)}</button>`).join('')+'<button class="dq-edit" onclick="dqToggleCfg()" title="Personnaliser">⭐ Personnaliser</button>';
  cfg.innerHTML=DQ_CATALOG.map(x=>`<label><input type="checkbox" ${fav.includes(x.id)?'checked':''} onchange="dqSet('${x.id}',this.checked)"> ${x.ic} ${esc(x.l)}</label>`).join('');
  cfg.style.display=(keepCfg&&open)?'flex':'none';
}
// KPI cliquables
(function(){const m={'k-prod':'produits','k-val':'produits','k-al':'alertes','k-rup':'alertes'};
 Object.keys(m).forEach(id=>{const el=document.getElementById(id),k=el&&el.closest('.kpi');if(k){k.classList.add('kpi-link');k.title='Ouvrir';k.onclick=()=>quickGo(m[id]);}});})();
renderDashQuick();

document.addEventListener('click',function(e){
  const panel=document.getElementById('quick-links-panel');
  const btn=document.getElementById('quick-links-toggle');
  if(panel&&btn&&panel.style.display!=='none'&&!panel.contains(e.target)&&!btn.contains(e.target))toggleQuickLinks(false);
});

