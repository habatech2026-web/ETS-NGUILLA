/* ETS N'GUILLA & FRÈRES — V19 — Notifications clients : SMS, WhatsApp, e-mail
   SMS : application Messages du téléphone (lien sms:). WhatsApp : lien wa.me. E-mail : application Mail (mailto:)
   ou Gmail web sur ordinateur. Aucune clé API, aucun serveur. Le suivi indique « préparé » (pas « envoyé/livré »).
   Données : db_sms_log (historique), db_sms_cfg (réglages/modèles) — sauvegardées avec le reste (db_*). */
(function () {
  'use strict';
  var LOG_KEY = 'db_sms_log', CFG_KEY = 'db_sms_cfg', LOG_MAX = 500;
  var TYPES = { vente: 'Merci pour l’achat', credit: 'Achat à crédit', remb: 'Paiement reçu', solde: 'Compte soldé', relance: 'Relance de dette', libre: 'Message libre' };
  var DEF = {
    entreprise: "ETS N'GUILLA & FRÈRES", prefix: '224', auto: true, noAccent: true, relanceJours: 7,
    tpl: {
      vente: 'Bonjour {client}, merci pour votre achat {num} de {montant} chez {entreprise}. À bientôt !',
      credit: 'Bonjour {client}, votre achat {num} ({montant}) a été enregistré à crédit. Solde à payer : {dette}. {entreprise}',
      remb: 'Bonjour {client}, nous avons bien reçu votre paiement de {montant}. Solde restant : {dette}. Merci. {entreprise}',
      solde: 'Bonjour {client}, nous avons bien reçu votre paiement de {montant}. Votre compte est soldé. Merci ! {entreprise}',
      relance: 'Bonjour {client}, petit rappel : votre solde chez {entreprise} est de {dette}. Merci de passer le régler. Cordialement.',
      libre: 'Bonjour {client}, '
    },
    subj: {
      vente: 'Merci pour votre achat {num}', credit: 'Achat à crédit {num} — solde à payer {dette}', remb: 'Paiement reçu — merci',
      solde: 'Compte soldé — merci', relance: 'Rappel : solde à régler chez {entreprise}', libre: 'Message de {entreprise}'
    }
  };
  var GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  var GSMX = '^{}\\[~]|€';
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent || '');
  function isMobile() { return /Android|iP(hone|ad|od)/i.test(navigator.userAgent || ''); }
  var S = { cid: null, type: 'libre', extra: {}, clientTel: '', clientMail: '' };

  /* ---------- utilitaires ---------- */
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function T(m, t) { if (typeof toast === 'function') toast(m, t || 'info'); }
  function money(n) { return typeof gnf === 'function' ? gnf(n) : String(n || 0) + ' GNF'; }
  function clients() { return (typeof D !== 'undefined' && D && D.clients) || []; }
  function findClient(id) { return clients().find(function (c) { return String(c.id) === String(id); }) || null; }
  function cfg() {
    var s = lsGet(CFG_KEY, null) || {};
    var c = Object.assign({}, DEF, s);
    c.tpl = Object.assign({}, DEF.tpl, s.tpl || {});
    c.subj = Object.assign({}, DEF.subj, s.subj || {});
    return c;
  }
  function today() { return new Date().toLocaleDateString('fr-FR'); }
  function nowStr() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }

  /* ---------- numéro de téléphone ---------- */
  function normTel(raw) {
    var s = String(raw == null ? '' : raw).split(/[\/;,]|\sou\s/i)[0].trim();
    var bad = function (r) { return { ok: false, e164: '', digits: '', reason: r }; };
    if (!s) return bad('Numéro manquant');
    var p = (String(cfg().prefix).replace(/\D/g, '')) || '224';
    var plus = s.charAt(0) === '+', d = s.replace(/\D/g, '');
    if (!plus && d.indexOf('00') === 0) { d = d.slice(2); plus = true; }
    if (!plus) {
      if (d.length === 9) d = p + d;
      else if (d.indexOf(p) === 0 && d.length === p.length + 9) { /* déjà complet */ }
      else return bad('Numéro incomplet (' + d.length + ' chiffres)');
    }
    if (d.indexOf(p) === 0 && d.length !== p.length + 9) return bad('Numéro invalide (attendu : ' + p + ' + 9 chiffres)');
    if (d.length < 8 || d.length > 15) return bad('Numéro invalide');
    return { ok: true, e164: '+' + d, digits: d, reason: '' };
  }
  function normMail(raw) {
    var s = String(raw == null ? '' : raw).trim().split(/[;,\s]/)[0];
    if (!s) return { ok: false, addr: '', reason: 'E-mail manquant' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { ok: false, addr: '', reason: 'Adresse e-mail invalide' };
    return { ok: true, addr: s.toLowerCase(), reason: '' };
  }
  function fmtTel(t) { var m = /^\+224(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(t); return m ? '+224 ' + m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] : t; }

  /* ---------- texte SMS ---------- */
  function simplify(s) {
    return String(s).replace(/[’‘`´]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
      .replace(/[\u00a0\u202f\u2009]/g, ' ').replace(/œ/g, 'oe').replace(/Œ/g, 'OE');
  }
  function stripAcc(s) { return simplify(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function prepare(text, noAccent) { return (noAccent ? stripAcc(text) : simplify(text)).replace(/ {2,}/g, ' ').trim(); }
  function smsInfo(msg) {
    var len = 0, uni = false, i, ch, chars = Array.from(msg);
    for (i = 0; i < chars.length; i++) {
      ch = chars[i];
      if (GSM.indexOf(ch) > -1) len++; else if (GSMX.indexOf(ch) > -1) len += 2; else uni = true;
    }
    var per;
    if (uni) { len = chars.length; per = len <= 70 ? 70 : 67; } else per = len <= 160 ? 160 : 153;
    return { len: len, segs: Math.max(1, Math.ceil(len / per)), unicode: uni };
  }
  function fill(t, ctx) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(ctx, k) ? ctx[k] : m; }); }
  function ctxFor(c, x) {
    x = x || {};
    return {
      client: c ? c.nom : '', montant: x.montant != null ? money(x.montant) : '',
      dette: money(x.dette != null ? x.dette : (c && c.dette) || 0), num: x.num || '', date: today(), entreprise: cfg().entreprise
    };
  }
  function tplKey(type, c, x) {
    var dette = x && x.dette != null ? x.dette : (c && c.dette) || 0;
    return (type === 'remb' && dette <= 0) ? 'solde' : type;
  }

  /* ---------- historique ---------- */
  function logSms(e) {
    var a = lsGet(LOG_KEY, []);
    a.unshift(e);
    if (a.length > LOG_MAX) a.length = LOG_MAX;
    lsSet(LOG_KEY, a);
  }
  function daysSinceRelance(cid) {
    var a = lsGet(LOG_KEY, []), i, t;
    for (i = 0; i < a.length; i++) {
      if (String(a[i].client_id) === String(cid) && a[i].type === 'relance') {
        t = Date.parse(String(a[i].date).replace(' ', 'T'));
        if (!isNaN(t)) return Math.max(0, Math.floor((Date.now() - t) / 864e5));
      }
    }
    return null;
  }

  /* ---------- fenêtres ---------- */
  function mk(id, title, body, foot, wide) {
    var d = document.createElement('div');
    d.className = 'overlay'; d.id = id;
    d.setAttribute('onclick', "closeOnBg(event,'" + id + "')");
    d.innerHTML = '<div class="modal' + (wide ? ' modal-lg' : '') + '"><div class="modal-head"><h3>' + title +
      '</h3><span class="modal-close" onclick="closeM(\'' + id + '\')">×</span></div><div class="modal-body">' + body + '</div>' +
      (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div>';
    document.body.appendChild(d);
    return d;
  }
  function typeOptions(sel) {
    return Object.keys(TYPES).filter(function (k) { return k !== 'solde'; }).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + TYPES[k] + '</option>';
    }).join('');
  }
  function build() {
    if (el('m-sms-relance')) return;
    mk('m-sms-relance', '📨 Relancer les débiteurs',
      '<div id="rel-sum" style="font-size:12px;color:var(--text2);margin-bottom:8px"></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:10px;cursor:pointer"><input type="checkbox" id="rel-hide" checked onchange="SMSC.renderRelance()"> Masquer les clients déjà relancés récemment</label>' +
      '<div class="tw"><table><thead><tr><th>Client</th><th>Dette</th><th>Dernière relance</th><th></th></tr></thead><tbody id="rel-body"></tbody></table></div>' +
      '<p style="font-size:11px;color:var(--text3);margin-top:8px">Un message s’ouvre par client (canal préféré mis en avant) : appuyez sur « Envoyer », revenez ici, puis « Suivant ».</p>',
      '<button class="btn btn-outline" onclick="closeM(\'m-sms-relance\')">Fermer</button><button class="btn btn-primary" onclick="SMSC.next()">▶ Suivant</button>', true);
    mk('m-sms-histo', '📜 Notifications préparées',
      '<div class="tw"><table><thead><tr><th>Date</th><th>Client</th><th>Type</th><th>Canal</th><th>Message</th><th></th></tr></thead><tbody id="sh-body"></tbody></table></div>' +
      '<p style="font-size:11px;color:var(--text3);margin-top:8px">« Préparé » = ouvert dans Messages, WhatsApp ou e-mail. L’app ne peut pas savoir si vous avez appuyé sur Envoyer.</p>',
      '<button class="btn btn-danger btn-sm" onclick="SMSC.clearLog()">🗑️ Vider</button><button class="btn btn-outline" onclick="closeM(\'m-sms-histo\')">Fermer</button>', true);
    mk('m-sms-cfg', '⚙️ Réglages des notifications',
      '<div class="fg">' +
      '<div><label>Nom dans les messages</label><input id="sc-ent"></div>' +
      '<div><label>Indicatif pays</label><input id="sc-pre" inputmode="numeric" placeholder="224"></div>' +
      '<div><label>Relance : ne pas redemander avant (jours)</label><input id="sc-jr" type="number" min="0" max="90"></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;justify-content:flex-end">' +
      '<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="sc-auto"> Proposer une notification après vente à un client / paiement</label>' +
      '<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="sc-acc"> SMS : retirer les accents par défaut (160 car. au lieu de 70)</label></div>' +
      Object.keys(TYPES).map(function (k) {
        return '<div class="ff"><label>Modèle : ' + TYPES[k] + '</label><textarea id="sc-t-' + k + '" rows="2"></textarea><input id="sc-s-' + k + '" placeholder="Objet de l’e-mail" style="margin-top:6px"></div>';
      }).join('') + '</div>' +
      '<p style="font-size:11px;color:var(--text3);margin-top:8px">Variables (messages et objets) : {client} {montant} {dette} {num} {date} {entreprise}</p>',
      '<button class="btn btn-outline btn-sm" onclick="SMSC.resetCfg()">↺ Modèles par défaut</button><button class="btn btn-outline" onclick="closeM(\'m-sms-cfg\')">Annuler</button><button class="btn btn-primary" onclick="SMSC.saveCfg()">💾 Enregistrer</button>', true);
    mk('m-sms', '📨 Notifier le client',
      '<div class="fg">' +
      '<div class="ff"><label>Client</label><input id="sms-cl" readonly style="opacity:.85"></div>' +
      '<div><label>📱 Téléphone (SMS / WhatsApp)</label><input id="sms-tel" inputmode="tel" oninput="SMSC.contactChanged()"><div id="sms-tel-msg" style="font-size:11px;margin-top:4px"></div></div>' +
      '<div><label>✉️ E-mail</label><input id="sms-mail" type="email" inputmode="email" oninput="SMSC.contactChanged()"><div id="sms-mail-msg" style="font-size:11px;margin-top:4px"></div></div>' +
      '<div><label>Modèle</label><select id="sms-type" onchange="SMSC.typeChanged()">' + typeOptions('libre') + '</select></div>' +
      '<div><label>Objet (e-mail)</label><input id="sms-subj"></div>' +
      '<div class="ff" id="sms-save-row" style="display:none"><label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="sms-save" checked> Enregistrer les coordonnées modifiées sur la fiche client</label></div>' +
      '<div class="ff"><label>Message</label><textarea id="sms-msg" rows="5" oninput="SMSC.count()"></textarea>' +
      '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:11px;margin-top:4px"><span id="sms-count"></span>' +
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="sms-noacc" onchange="SMSC.count()"> SMS : sans accents</label></div></div></div>' +
      '<p style="font-size:11px;color:var(--text3);margin-top:8px">Le message s’ouvre dans Messages, WhatsApp ou votre application e-mail : appuyez sur « Envoyer ». Sur ordinateur : WhatsApp Web, Gmail ou Copier.</p>',
      '<button class="btn btn-outline" onclick="closeM(\'m-sms\')">Fermer</button>' +
      '<button class="btn btn-outline" id="sms-b-copie" onclick="SMSC.send(\'copie\')">📋 Copier</button>' +
      '<button class="btn btn-outline" id="sms-b-email" onclick="SMSC.send(\'email\')">✉️ E-mail</button>' +
      '<button class="btn btn-outline" id="sms-b-whatsapp" onclick="SMSC.send(\'whatsapp\')">💬 WhatsApp</button>' +
      '<button class="btn btn-primary" id="sms-b-sms" onclick="SMSC.send(\'sms\')">📱 SMS</button>');
  }

  /* ---------- composeur ---------- */
  function composeMessage() {
    var c = findClient(S.cid), k = tplKey(S.type, c, S.extra);
    return fill(cfg().tpl[k] || '', ctxFor(c, S.extra));
  }
  function compose(cid, type, extra, opts) {
    build();
    opts = opts || {};
    var c = findClient(cid);
    if (!c) { T('Client introuvable', 'error'); return; }
    S.cid = c.id; S.type = TYPES[type] ? type : 'libre'; S.extra = extra || {}; S.clientTel = c.tel || ''; S.clientMail = c.email || '';
    el('sms-cl').value = c.nom + (c.dette > 0 ? '  —  dette : ' + money(c.dette) : '');
    el('sms-tel').value = c.tel || '';
    el('sms-mail').value = c.email || '';
    el('sms-type').value = S.type === 'solde' ? 'remb' : S.type;
    el('sms-noacc').checked = !!cfg().noAccent;
    el('sms-msg').value = opts.msg != null ? opts.msg : composeMessage();
    el('sms-subj').value = opts.subj != null ? opts.subj : composeSubject();
    contactChanged(); count();
    openM('m-sms');
  }
  function composeSubject() {
    var c = findClient(S.cid), k = tplKey(S.type, c, S.extra);
    return fill(cfg().subj[k] || cfg().subj.libre, ctxFor(c, S.extra));
  }
  function typeChanged() { S.type = el('sms-type').value; el('sms-msg').value = composeMessage(); el('sms-subj').value = composeSubject(); count(); }
  function contactChanged() {
    var tv = el('sms-tel').value.trim(), mv = el('sms-mail').value.trim();
    var t = normTel(tv), m = normMail(mv), c = findClient(S.cid), note = '';
    if (c && c.sms_ok === false) note = ' ⚠️ Ce client a refusé les notifications.';
    var show = function (ok, good, why, empty) {
      return empty ? '<span style="color:var(--text3)">Non renseigné</span>' : ok ? '<span style="color:var(--green)">✓ ' + E(good) + '</span>' : '<span style="color:var(--red)">✗ ' + E(why) + '</span>';
    };
    el('sms-tel-msg').innerHTML = show(t.ok, fmtTel(t.e164), t.reason, !tv) + '<span style="color:var(--orange)">' + note + '</span>';
    el('sms-mail-msg').innerHTML = show(m.ok, m.addr, m.reason, !mv);
    var diff = (t.ok && normTel(S.clientTel).e164 !== t.e164) || (m.ok && String(S.clientMail || '').toLowerCase() !== m.addr);
    el('sms-save-row').style.display = diff ? 'block' : 'none';
    // canal mis en avant : préféré du client s'il est joignable, sinon le premier disponible
    var avail = { sms: t.ok, whatsapp: t.ok, email: m.ok }, pref = (c && c.canal) || 'sms';
    var best = [pref, 'sms', 'whatsapp', 'email'].filter(function (k) { return avail[k]; })[0] || null;
    ['sms', 'whatsapp', 'email'].forEach(function (k) { el('sms-b-' + k).className = 'btn ' + (k === best ? 'btn-primary' : 'btn-outline'); });
  }
  function msgFor(canal) {
    var raw = el('sms-msg').value;
    return canal === 'sms' ? prepare(raw, el('sms-noacc').checked) : raw.replace(/[ \t]+\n/g, '\n').trim();
  }
  function count() {
    var m = msgFor('sms'), i = smsInfo(m);
    el('sms-count').innerHTML = 'SMS : ' + i.len + ' car. · <b>' + i.segs + ' SMS</b>' + (i.unicode ? ' <span style="color:var(--orange)">(caractères spéciaux : 70 car. par SMS)</span>' : '');
  }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    return new Promise(function (ok, ko) {
      try { var a = document.createElement('textarea'); a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); var r = document.execCommand('copy'); a.remove(); r ? ok() : ko(); } catch (e) { ko(e); }
    });
  }
  function openLink(href) {
    var a = document.createElement('a');
    a.href = href; a.style.display = 'none'; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 600);
  }
  function send(canal) {
    var msg = msgFor(canal), t = normTel(el('sms-tel').value), m = normMail(el('sms-mail').value), c = findClient(S.cid);
    var subject = el('sms-subj').value.trim() || composeSubject();
    if (!msg) { T('Message vide', 'error'); return; }
    if ((canal === 'sms' || canal === 'whatsapp') && !t.ok) { T('Téléphone : ' + t.reason, 'error'); return; }
    if (canal === 'email' && !m.ok) { T(m.reason, 'error'); return; }
    if (c && el('sms-save-row').style.display !== 'none' && el('sms-save').checked) {
      if (t.ok) c.tel = t.e164;
      if (m.ok) c.email = m.addr;
      try { localStorage.setItem('db_cl', JSON.stringify(D.clients)); if (typeof rdClients === 'function') rdClients(); } catch (e) { }
      S.clientTel = c.tel || ''; S.clientMail = c.email || ''; el('sms-save-row').style.display = 'none';
    }
    if (canal === 'sms') {
      openLink('sms:' + t.e164 + (IOS ? '&' : '?') + 'body=' + encodeURIComponent(msg));
      if (!isMobile()) T('Sur ordinateur, le SMS peut ne pas s’ouvrir : utilisez WhatsApp, E-mail ou Copier.', 'warning');
    } else if (canal === 'whatsapp') {
      window.open('https://wa.me/' + t.digits + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    } else if (canal === 'email') {
      if (isMobile()) openLink('mailto:' + m.addr + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg));
      else window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.addr) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg), '_blank', 'noopener');
    } else {
      copyText(msg).then(function () { T('Message copié', 'success'); }, function () { T('Copie impossible', 'error'); });
    }
    logSms({
      id: Date.now(), date: nowStr(), client_id: S.cid, client: c ? c.nom : '', tel: t.ok ? t.e164 : '', email: m.ok ? m.addr : '',
      type: S.type === 'solde' ? 'remb' : S.type, canal: canal, subject: canal === 'email' ? subject : '', msg: msg,
      user: (typeof CU !== 'undefined' && CU && CU.nom) || ''
    });
    try { if (typeof logAction === 'function') logAction('UPDATE', 'Notification ' + canal + ' préparée pour ' + (c ? c.nom : '?') + ' — ' + (TYPES[S.type] || S.type)); } catch (e) { }
    var ok = { sms: 'SMS prêt : appuyez sur « Envoyer » dans Messages', whatsapp: 'WhatsApp ouvert : appuyez sur Envoyer', email: isMobile() ? 'E-mail prêt : appuyez sur Envoyer' : 'Gmail ouvert dans un nouvel onglet' };
    if (ok[canal]) T(ok[canal], 'success');
    renderRelance(); renderHisto();
    if (canal !== 'copie') closeM('m-sms');
  }

  /* ---------- relance des débiteurs ---------- */
  function reach(x) { return normTel(x.tel).ok || normMail(x.email).ok; }
  function relanceRows() {
    var c = cfg(), hide = el('rel-hide') ? el('rel-hide').checked : true, st = { all: 0, notel: 0, refus: 0, recent: 0 };
    var rows = [];
    clients().forEach(function (x) {
      if (!(x.dette > 0)) return;
      st.all++;
      if (x.sms_ok === false) { st.refus++; return; }
      if (!reach(x)) { st.notel++; return; }
      var d = daysSinceRelance(x.id);
      if (hide && d != null && d < c.relanceJours) { st.recent++; return; }
      rows.push({ c: x, d: d });
    });
    rows.sort(function (a, b) { return b.c.dette - a.c.dette; });
    return { rows: rows, st: st };
  }
  function renderRelance() {
    if (!el('rel-body')) return;
    var r = relanceRows(), st = r.st, tot = r.rows.reduce(function (s, x) { return s + x.c.dette; }, 0);
    el('rel-sum').innerHTML = '<b>' + r.rows.length + '</b> à relancer (' + E(money(tot)) + ') · ' + st.all + ' débiteurs au total' +
      (st.recent ? ' · ' + st.recent + ' relancés récemment' : '') + (st.notel ? ' · <span style="color:var(--red)">' + st.notel + ' sans téléphone ni e-mail valide</span>' : '') + (st.refus ? ' · ' + st.refus + ' sans notifications' : '');
    el('rel-body').innerHTML = r.rows.length ? r.rows.map(function (x) {
      var id = String(x.c.id).replace(/'/g, '');
      return '<tr><td><b>' + E(x.c.nom) + '</b><br><span style="font-size:10.5px;color:var(--text3)">' + E([x.c.tel, x.c.email].filter(Boolean).join(' · ')) + '</span></td>' +
        '<td style="font-family:\'DM Mono\',monospace;font-weight:700;color:var(--red)">' + E(money(x.c.dette)) + '</td>' +
        '<td style="font-size:11px;color:var(--text3)">' + (x.d == null ? 'jamais' : x.d === 0 ? '<span style="color:var(--green)">✓ aujourd’hui</span>' : 'il y a ' + x.d + ' j') + '</td>' +
        '<td><button class="btn btn-primary btn-sm" onclick="SMSC.compose(\'' + id + '\',\'relance\')">📨 Notifier</button></td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="empty"><div class="ico">✅</div><p>Aucun client à relancer</p></div></td></tr>';
  }
  function openRelance() { build(); renderRelance(); openM('m-sms-relance'); }
  function next() {
    var r = relanceRows().rows.filter(function (x) { return x.d !== 0; })[0];
    if (!r) { T('Plus aucun client à relancer', 'success'); return; }
    compose(r.c.id, 'relance');
  }

  /* ---------- historique ---------- */
  function renderHisto() {
    if (!el('sh-body')) return;
    var a = lsGet(LOG_KEY, []).slice(0, 100);
    el('sh-body').innerHTML = a.length ? a.map(function (x) {
      var id = String(x.client_id).replace(/'/g, '');
      return '<tr><td style="font-size:11px;white-space:nowrap">' + E(x.date) + '</td><td><b>' + E(x.client) + '</b><br><span style="font-size:10.5px;color:var(--text3)">' + E(x.canal === 'email' ? x.email : x.tel) + '</span></td>' +
        '<td style="font-size:11px">' + E(TYPES[x.type] || x.type) + '</td><td title="' + E(x.canal) + '">' + (x.canal === 'sms' ? '📱' : x.canal === 'whatsapp' ? '💬' : x.canal === 'email' ? '✉️' : '📋') + '</td>' +
        '<td style="font-size:11px;max-width:260px" title="' + E(x.msg) + '">' + E(String(x.msg).length > 70 ? String(x.msg).slice(0, 70) + '…' : x.msg) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" title="Renvoyer" onclick="SMSC.compose(\'' + id + '\',\'' + E(x.type) + '\',null,{msg:SMSC._msg(' + x.id + '),subj:SMSC._subj(' + x.id + ')})">↻</button></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty"><div class="ico">📭</div><p>Aucun SMS préparé</p></div></td></tr>';
  }
  function openHisto() { build(); renderHisto(); openM('m-sms-histo'); }
  function clearLog() { if (!confirm('Vider tout l’historique des notifications ?')) return; lsSet(LOG_KEY, []); renderHisto(); renderRelance(); T('Historique vidé', 'warning'); }

  /* ---------- réglages ---------- */
  function openCfg() {
    build();
    var c = cfg();
    el('sc-ent').value = c.entreprise; el('sc-pre').value = c.prefix; el('sc-jr').value = c.relanceJours;
    el('sc-auto').checked = !!c.auto; el('sc-acc').checked = !!c.noAccent;
    Object.keys(TYPES).forEach(function (k) { el('sc-t-' + k).value = c.tpl[k]; el('sc-s-' + k).value = c.subj[k]; });
    openM('m-sms-cfg');
  }
  function saveCfg() {
    var tpl = {}, subj = {};
    Object.keys(TYPES).forEach(function (k) { tpl[k] = el('sc-t-' + k).value.trim() || DEF.tpl[k]; subj[k] = el('sc-s-' + k).value.trim() || DEF.subj[k]; });
    var pre = el('sc-pre').value.replace(/\D/g, '') || '224', jr = parseInt(el('sc-jr').value, 10);
    lsSet(CFG_KEY, {
      entreprise: el('sc-ent').value.trim() || DEF.entreprise, prefix: pre, auto: el('sc-auto').checked, noAccent: el('sc-acc').checked,
      relanceJours: isNaN(jr) ? 7 : Math.min(90, Math.max(0, jr)), tpl: tpl, subj: subj
    });
    closeM('m-sms-cfg'); renderRelance(); T('Réglages enregistrés', 'success');
  }
  function resetCfg() {
    if (!confirm('Remettre les modèles par défaut ?')) return;
    Object.keys(TYPES).forEach(function (k) { el('sc-t-' + k).value = DEF.tpl[k]; el('sc-s-' + k).value = DEF.subj[k]; });
  }

  /* ---------- propositions automatiques ---------- */
  function canOffer(c) { return c && c.sms_ok !== false && reach(c) && cfg().auto; }
  function offer(cid, type, extra) {
    var c = findClient(cid);
    if (!canOffer(c)) return;
    setTimeout(function () { compose(c.id, type, extra); }, 500);
  }
  function wrapSale(name) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__sms) return;
    var w = async function () {
      var n0 = D.ventes.length, r = await orig.apply(this, arguments);
      try {
        if (D.ventes.length > n0) {
          var v = D.ventes[0];
          if (v && v.client_id) {
            var c = findClient(v.client_id), cr = /cr[ée]dit/i.test(String(v.paiement));
            offer(v.client_id, cr ? 'credit' : 'vente', { montant: v.montant, num: v.num, dette: c ? c.dette : 0 });
          }
        }
      } catch (e) { console.error('SMS vente', e); }
      return r;
    };
    w.__sms = true; window[name] = w;
  }
  function wrapRemb() {
    var orig = window.saveRemb;
    if (typeof orig !== 'function' || orig.__sms) return;
    var w = function () {
      var cid = el('remb-cid') && el('remb-cid').value, mnt = Number(el('remb-mnt') && el('remb-mnt').value) || 0, c = findClient(cid), before = c ? Number(c.dette) || 0 : 0;
      var r = orig.apply(this, arguments);
      try {
        if (c && mnt > 0 && (Number(c.dette) || 0) < before) offer(c.id, 'remb', { montant: Math.min(mnt, before), dette: c.dette });
      } catch (e) { console.error('SMS remboursement', e); }
      return r;
    };
    w.__sms = true; window.saveRemb = w;
  }

  /* ---------- sauvegarde / restauration ---------- */
  function exportData() { return { log: lsGet(LOG_KEY, []), cfg: lsGet(CFG_KEY, null) }; }
  function importData(p) {
    if (!p || typeof p !== 'object') return;
    if (Array.isArray(p.log)) lsSet(LOG_KEY, p.log.slice(0, LOG_MAX));
    if (p.cfg && typeof p.cfg === 'object') lsSet(CFG_KEY, p.cfg);
  }

  window.SMSC = {
    compose: compose, send: send, count: count, typeChanged: typeChanged, contactChanged: contactChanged, telChanged: contactChanged,
    openRelance: openRelance, renderRelance: renderRelance, next: next,
    openHisto: openHisto, clearLog: clearLog, openCfg: openCfg, saveCfg: saveCfg, resetCfg: resetCfg,
    exportData: exportData, importData: importData,
    _subj: function (id) { var x = lsGet(LOG_KEY, []).filter(function (e) { return e.id === id; })[0]; return x && x.subject ? x.subject : null; },
    _msg: function (id) { var x = lsGet(LOG_KEY, []).filter(function (e) { return e.id === id; })[0]; return x ? x.msg : ''; },
    _t: { normTel: normTel, normMail: normMail, smsInfo: smsInfo, prepare: prepare, fill: fill, cfg: cfg }
  };
  build();
  wrapSale('saveVente'); wrapSale('posEncaisser'); wrapRemb();
})();
