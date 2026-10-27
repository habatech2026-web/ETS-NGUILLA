
// ══════════════════════════════════════════
//  ASSISTANT IA — HABATECH ETS N’GUILLA & FRÈRES
// ══════════════════════════════════════════
let AI_MODE = localStorage.getItem('ai_mode') || 'local'; // 'local' | 'cloud'
let AI_KEY  = sessionStorage.getItem('ai_api_key') || '';
let AI_OPEN = false;
let AI_BUSY = false;
let aiHistory = []; // historique conversation

function toggleAI(){
  AI_OPEN = !AI_OPEN;
  document.getElementById('ai-panel').classList.toggle('open', AI_OPEN);
  if(AI_OPEN && document.getElementById('ai-messages').children.length === 0){
    aiWelcome();
  }
}

function setAIMode(mode){
  AI_MODE = mode;
  localStorage.setItem('ai_mode', mode);
  document.getElementById('ai-badge-local').classList.toggle('active', mode==='local');
  document.getElementById('ai-badge-cloud').classList.toggle('active', mode==='cloud');
  const keyRow = document.getElementById('ai-key-row');
  const dot = document.getElementById('ai-status-dot');
  const txt = document.getElementById('ai-status-txt');
  if(mode === 'cloud'){
    keyRow.classList.toggle('visible', !AI_KEY);
    if(AI_KEY){
      dot.className=''; dot.classList.add('ok');
      txt.textContent = 'Claude AI connecté (cloud)';
    } else {
      dot.className=''; dot.classList.add('err');
      txt.textContent = 'Clé API requise pour le mode cloud';
    }
  } else {
    keyRow.classList.remove('visible');
    dot.className=''; dot.classList.add('ok');
    txt.textContent = 'Mode local actif — analyse des données boutique';
  }
  aiHistory = [];
  document.getElementById('ai-messages').innerHTML = '';
  aiWelcome();
}

function aiSaveKey(){
  if(!CU||CU.role!=='admin'){aiAddMsg('bot','⚠️ Seul un administrateur peut enregistrer la clé API.');return;}
  const k = document.getElementById('ai-api-key').value.trim();
  if(!k.startsWith('sk-ant-') && !k.startsWith('sk-')){
    aiAddMsg('bot','⚠️ Clé invalide. Elle doit commencer par <code>sk-ant-…</code>');
    return;
  }
  AI_KEY = k;
  sessionStorage.setItem('ai_api_key', k);localStorage.removeItem('ai_api_key');
  document.getElementById('ai-key-row').classList.remove('visible');
  document.getElementById('ai-status-dot').className='ok';
  document.getElementById('ai-status-txt').textContent = 'Claude AI connecté (cloud)';
  aiAddMsg('bot','✅ Clé sauvegardée ! Le mode Cloud est maintenant actif.');
}

function aiWelcome(){
  const greetings = {
    local: `👋 Bonjour ! Je suis votre assistant **local** intégré à ETS N’GUILLA & FRÈRES.\n\nJ'analyse vos données en temps réel (stock, ventes, dépenses, clients) sans connexion internet. Posez-moi n'importe quelle question sur votre boutique !`,
    cloud: AI_KEY
      ? `☁️ Assistant **Claude AI** activé !\n\nJe peux analyser vos données boutique ET répondre à des questions complexes grâce à l'intelligence artificielle avancée. Comment puis-je vous aider ?`
      : `☁️ Mode **Cloud** sélectionné.\n\nPour utiliser Claude AI, veuillez entrer votre clé API Anthropic ci-dessous. Vous pouvez l'obtenir sur [console.anthropic.com](https://console.anthropic.com).`
  };
  aiAddMsg('bot', greetings[AI_MODE]);
}

function aiAddMsg(role, text){
  const wrap = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  const ico = document.createElement('div');
  ico.className = 'ai-ico';
  ico.textContent = role === 'bot' ? '🤖' : '👤';
  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  // Markdown basique
  bubble.innerHTML = text
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`(.*?)`/g,'<code style="background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px;font-family:\'DM Mono\',monospace;font-size:11px">$1</code>')
    .replace(/\n/g,'<br>');
  div.appendChild(ico);
  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  if(role === 'user') aiHistory.push({role:'user', content: text});
  if(role === 'bot')  aiHistory.push({role:'assistant', content: text});
}

function aiShowTyping(){
  const wrap = document.getElementById('ai-messages');
  const d = document.createElement('div');
  d.id = 'ai-typing-ind';
  d.className = 'ai-msg bot';
  d.innerHTML = `<div class="ai-ico">🤖</div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>`;
  wrap.appendChild(d);
  wrap.scrollTop = wrap.scrollHeight;
}
function aiRemoveTyping(){
  const t = document.getElementById('ai-typing-ind');
  if(t) t.remove();
}

function aiAsk(q){
  document.getElementById('ai-input').value = q;
  aiSend();
}

async function aiSend(){
  if(AI_BUSY) return;
  const inp = document.getElementById('ai-input');
  const q = inp.value.trim();
  if(!q) return;
  inp.value = ''; inp.style.height = 'auto';
  aiAddMsg('user', q);
  AI_BUSY = true;
  document.getElementById('ai-send').disabled = true;
  aiShowTyping();

  try{
    if(AI_MODE === 'local'){
      const reply = await aiLocalAnswer(q);
      aiRemoveTyping();
      aiAddMsg('bot', reply);
    } else {
      if(!AI_KEY){ aiRemoveTyping(); aiAddMsg('bot','⚠️ Veuillez d\'abord sauvegarder votre clé API.'); AI_BUSY=false; document.getElementById('ai-send').disabled=false; return; }
      const reply = await aiCloudAnswer(q);
      aiRemoveTyping();
      aiAddMsg('bot', reply);
    }
  } catch(e){
    aiRemoveTyping();
    aiAddMsg('bot', `❌ Erreur : ${esc(e.message)}`);
  }
  AI_BUSY = false;
  document.getElementById('ai-send').disabled = false;
}

// ── MODE LOCAL : analyse des données boutique ──
async function aiLocalAnswer(q){
  await new Promise(r => setTimeout(r, 600 + Math.random()*400));
  const ql = q.toLowerCase();

  // Récupérer données depuis le contexte de l'app
  const prods = D.produits||[];
  const ventes = D.ventes||[];
  const clients = D.clients||[];
  const depenses = D.depenses||[];

  // — Stock & produits —
  if(ql.includes('stock') || ql.includes('rupture') || ql.includes('critique')){
    const crit = prods.filter(p => p.etat === 'rupture' || p.stock <= 0);
    const low  = prods.filter(p => p.etat === 'critique' || (p.stock > 0 && p.stock <= p.min));
    let r = `📦 **Analyse du stock (${prods.length} produits)**\n\n`;
    r += `• En rupture : **${crit.length}** produit${crit.length>1?'s':''}\n`;
    r += `• Stock critique : **${low.length}** produit${low.length>1?'s':''}\n`;
    if(crit.length > 0) r += `\n🔴 Ruptures : ${crit.slice(0,5).map(p=>`*${esc(p.designation)}*`).join(', ')}${crit.length>5?' …':''}`;
    if(low.length > 0)  r += `\n🟠 Critiques : ${low.slice(0,5).map(p=>`*${esc(p.designation)}* (${p.stock} ${esc(p.unite||'')})`).join(', ')}${low.length>5?' …':''}`;
    return r;
  }

  // — Ventes —
  if(ql.includes('vente') || ql.includes('ca') || ql.includes('chiffre') || ql.includes('recette')){
    const today = new Date().toISOString().slice(0,10);
    const vJ = ventes.filter(v => (v.date||'').startsWith(today));
    const totJ = vJ.reduce((s,v)=>s+(+v.montant||0), 0);
    const totM = ventes.reduce((s,v)=>s+(+v.montant||0), 0);
    return `💰 **Ventes**\n\n• Aujourd'hui : **${vJ.length}** vente${vJ.length>1?'s':''} — **${totJ.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**\n• Total enregistré : **${ventes.length}** ventes — **${totM.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**`;
  }

  // — Produits les plus vendus —
  if(ql.includes('top') || ql.includes('plus vendu') || ql.includes('populaire')){
    const cnt = {};
    ventes.forEach(v => {
      const lignes = Array.isArray(v.lignes) ? v.lignes : (v.lignes ? JSON.parse(v.lignes) : []);
      lignes.forEach(l => { cnt[l.nom || l.designation || l.code] = (cnt[l.nom || l.designation || l.code]||0)+(+l.qte||1); });
    });
    const sorted = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(!sorted.length) return '🏆 Pas encore de données de vente suffisantes.';
    return `🏆 **Top 5 produits vendus**\n\n` + sorted.map((e,i)=>`${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} ${e[0]} — **${e[1]}** unités`).join('\n');
  }

  // — Clients / dettes —
  if(ql.includes('client') || ql.includes('dette') || ql.includes('crédit')){
    const detteurs = clients.filter(c => (+c.dette||0) > 0).sort((a,b)=>(+b.dette)-(+a.dette));
    const totDette = detteurs.reduce((s,c)=>s+(+c.dette||0), 0);
    let r = `👤 **Clients (${clients.length} total)**\n\n• Avec dettes : **${detteurs.length}**\n• Encours total : **${totDette.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**`;
    if(detteurs.length) r += `\n\n🔴 Top débiteurs :\n` + detteurs.slice(0,3).map(c=>`• ${esc(c.nom)} — **${(+c.dette).toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**`).join('\n');
    return r;
  }

  // — Dépenses —
  if(ql.includes('dépense') || ql.includes('charge') || ql.includes('dépenses')){
    const today = new Date().toISOString().slice(0,10);
    const depJ = depenses.filter(d => d.date === today);
    const totJ = depJ.reduce((s,d)=>s+(+d.montant||0),0);
    const totAll = depenses.reduce((s,d)=>s+(+d.montant||0),0);
    return `💸 **Dépenses**\n\n• Aujourd'hui : **${depJ.length}** dépense${depJ.length>1?'s':''} — **${totJ.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**\n• Total enregistré : **${totAll.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF**`;
  }

  // — Dashboard / résumé —
  if(ql.includes('résumé') || ql.includes('tableau') || ql.includes('dashboard') || ql.includes('bilan')){
    const today = new Date().toISOString().slice(0,10);
    const vJ = ventes.filter(v => (v.date||'').startsWith(today));
    const totJ = vJ.reduce((s,v)=>s+(+v.montant||0), 0);
    const crit = prods.filter(p => p.etat==='rupture'||p.etat==='critique'||p.stock<=(p.min||5));
    const detteurs = clients.filter(c => (+c.dette||0) > 0);
    return `📊 **Résumé ETS N’GUILLA & FRÈRES**\n\n💰 Ventes du jour : **${totJ.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF** (${vJ.length} ticket${vJ.length>1?'s':''})\n📦 Produits : **${prods.length}** dont **${crit.length}** en alerte stock\n👤 Clients : **${clients.length}** dont **${detteurs.length}** avec dettes\n💸 Total dépenses enregistrées : **${depenses.length}** opération${depenses.length>1?'s':''}`;
  }

  // — Aide —
  if(ql.includes('aide') || ql.includes('help') || ql.includes('que peux')){
    return `🤖 **Ce que je peux faire en mode local :**\n\n• 📦 Analyser le stock et alertes\n• 💰 Résumé des ventes du jour\n• 🏆 Top produits vendus\n• 👤 Clients et encours dettes\n• 💸 Suivi des dépenses\n• 📊 Bilan global du dashboard\n\n💡 Passez en mode **Cloud** pour des analyses plus avancées avec Claude AI !`;
  }

  // — Réponse générique —
  return `🤔 Je n'ai pas trouvé de correspondance précise pour : *"${q}"*\n\nEssayez des questions comme :\n• "Quel est le stock critique ?"\n• "Ventes du jour"\n• "Résumé du dashboard"\n• "Clients avec dettes"\n\nOu activez le mode **Cloud** pour des questions en langage naturel avancé !`;
}

// ── MODE CLOUD : Claude AI via Anthropic API ──
async function aiCloudAnswer(q){
  // Contexte données boutique pour enrichir la réponse Claude
  const prods = D.produits||[];
  const ventes = D.ventes||[];
  const clients = D.clients||[];
  const depenses = D.depenses||[];

  const today = new Date().toISOString().slice(0,10);
  const vJ = ventes.filter(v => (v.date||'').startsWith(today));
  const totJ = vJ.reduce((s,v)=>s+(+v.montant||0), 0);
  const crit = prods.filter(p => p.etat==='rupture'||p.etat==='critique'||p.stock<=(p.min||5));

  const systemPrompt = `Tu es l'assistant IA intégré à ETS N’GUILLA & FRÈRES, entreprise commerciale (gestion de stock, achat et vente de produits consommables et non consommables). Application développée par HABATECH pour la Guinée.
Tu réponds en français de façon concise, professionnelle et utile. Tu utilises des emojis contextuels.

DONNÉES TEMPS RÉEL DE LA BOUTIQUE (${today}) :
- Produits total : ${prods.length} | En alerte : ${crit.length}
- Ventes aujourd'hui : ${vJ.length} tickets | CA : ${totJ.toLocaleString('fr').replace(/[\u202F\u00A0]/g, ' ')} GNF
- Clients : ${clients.length} | Avec dettes : ${clients.filter(c=>(+c.dette||0)>0).length}
- Dépenses enregistrées : ${depenses.length}

TOP 5 PRODUITS (stock) : ${prods.slice(0,5).map(p=>`${esc(p.designation)} (stock: ${p.stock})`).join(', ')||'aucun'}

Réponds en moins de 200 mots sauf si une analyse détaillée est demandée.`;

  // Construire historique pour contexte multi-tour (max 6 derniers)
  const msgs = aiHistory.slice(-6).map(m => ({role: m.role, content: m.content}));
  msgs.push({role: 'user', content: q});

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'},
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: msgs
    })
  });

  if(!res.ok){
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || 'Pas de réponse.';
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', ()=>{
  setAIMode(AI_MODE);
  if(AI_KEY) document.getElementById('ai-api-key').value = AI_KEY;
});
