(function (root) {
  const CONFIG = {
    // ✏️ Adaptez la liste des pôles de l'AJC ici
    POLES: ["Système d'information", "RH", "Marketing", "Audit-Qualité", "Dev Co", "Présidente", "VP", "Sec G", "Trésorerie", "Anciens"],
    // Points de base d'un prono (la cote réelle dépend de la rareté du choix)
    BASE: { pari: 50, battle: 30 },
    MAX_PROPOSALS: 5,  // pronos qu'un·e participant·e peut proposer
    CAP: 5,            // une cote ne dépasse jamais 5 × la base
    LOCAL_ADMIN_PIN: "AJC2026"
  };

  const uid = () => Math.random().toString(36).slice(2, 10);
  const key = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  function defaultDB() {
    const days = [
      { id: "ven", label: "🎪 Vendredi soir", sub: "L'arrivée sous le chapiteau", deadline: null },
      { id: "sam", label: "☀️ Samedi", sub: "La journée (et la gueule de bois)", deadline: null },
      { id: "samsoir", label: "🌙 Samedi soir", sub: "Soirée chic & passation", deadline: null },
      { id: "dim", label: "🥐 Dimanche", sub: "Le réveil difficile", deadline: null }
    ];
    const Q = (day, emoji, title, type = "pari") => ({ id: uid(), type, day, emoji, title, base: type === "vote" ? 0 : CONFIG.BASE.pari, open: true, winner: null });
    return {
      rev: 0,
      days,
      users: {},
      questions: [
        // Vendredi soir
        Q("ven", "💋", "Qui sera le/la premier·e à se chopper ?"),
        Q("ven", "🥴", "Qui sera le/la premier·e arraché·e ?"),
        Q("ven", "🤮", "Qui sera le/la premier·e à vomir ?"),
        Q("ven", "💀", "Qui sera le/la premier·e à finir KO ?"),
        Q("ven", "🍺", "Qui sera le/la premier·e à enchaîner un cul sec ?"),
        Q("ven", "💃", "Qui lancera la première choré sur la piste ?"),
        Q("ven", "🙈", "Qui sera le/la premier·e à tomber par terre ?"),
        Q("ven", "📱", "Qui sera le/la premier·e à perdre son téléphone ?"),
        Q("ven", "🗣️", "Qui balancera la première anecdote gênante ?"),
        Q("ven", "🛌", "Qui sera le/la premier·e à aller se coucher ?"),
        Q("ven", "🎭", "Soirée déguisement : meilleur costume", "vote"),
        // Samedi
        Q("sam", "🐓", "Qui sera le/la premier·e debout le matin ?"),
        Q("sam", "🧟", "Qui aura la pire gueule de bois ?"),
        Q("sam", "😴", "Qui sera le/la premier·e à s'endormir dans un endroit improbable ?"),
        Q("sam", "🏓", "Qui sera le/la champion·ne du beer pong ?"),
        Q("sam", "🍾", "Qui sera le/la premier·e à rouvrir une bouteille ?"),
        Q("sam", "🍕", "Qui mangera le plus du week-end ?"),
        Q("sam", "🤳", "Qui sera le/la premier·e à se faire afficher en story ?"),
        Q("sam", "📸", "Qui postera le plus de stories ?"),
        Q("sam", "🚿", "Qui sera le/la dernier·e à se doucher ?"),
        // Samedi soir
        Q("samsoir", "🏛️", "Qui sera élu·e au bureau ?"),
        Q("samsoir", "📣", "Qui fera la meilleure campagne ?"),
        Q("samsoir", "👑", "Qui sera le meilleur respo ?"),
        Q("samsoir", "🥲", "Qui sera le/la premier·e à pleurer pendant les discours ?"),
        Q("samsoir", "🍻", "Qui finira le plus bourré·e ?"),
        Q("samsoir", "😘", "Qui enchaînera le plus de chopes ?"),
        Q("samsoir", "🕺", "Qui sera le/la premier·e à danser sur une table ?"),
        Q("samsoir", "👠", "Qui sera le/la premier·e à finir pieds nus ?"),
        Q("samsoir", "🍷", "Qui sera le/la premier·e à renverser son verre ?"),
        Q("samsoir", "📞", "Qui sera le/la premier·e à appeler son ex ?"),
        Q("samsoir", "🎤", "Qui chantera le plus faux au karaoké ?"),
        Q("samsoir", "🦉", "Qui sera le/la dernier·e couché·e ?"),
        Q("samsoir", "🥂", "Soirée chic : le/la mieux habillé·e", "vote"),
        Q("samsoir", "🎙️", "Meilleur discours de passation", "vote"),
        // Dimanche
        Q("dim", "⏰", "Qui sera le/la dernier·e au brunch ?"),
        Q("dim", "🔇", "Qui aura perdu sa voix ?"),
        Q("dim", "🤐", "Qui ne se souviendra de rien ?"),
        Q("dim", "🫥", "Qui sera introuvable au moment du départ ?"),
        Q("dim", "🚗", "Qui sera le/la premier·e à s'endormir sur le trajet retour ?"),
        Q("dim", "🤡", "Qui aura été le clown officiel du WEP ?"),
        Q("dim", "⭐", "MVP du week-end", "vote")
      ],
      bets: {},   // bets[userId][questionId] = {target, boost}
      votes: {},  // votes[userId][questionId] = target
      challenges: [
        { id: uid(), mult: 2, title: "Remplir la fiche « outils utilisés » de ton pôle" },
        { id: uid(), mult: 2, title: "Trouver et signaler un bug sur ce site" },
        { id: uid(), mult: 3, title: "Déployer ta propre page sur Vercel (équipe AJC)" },
        { id: uid(), mult: 3, title: "Rédiger une mini-FAQ IT pour les nouveaux" },
        { id: uid(), mult: 4, title: "Automatiser une tâche répétitive d'un pôle (Make, Zapier, Notion…)" },
        { id: uid(), mult: 5, title: "Former 3 personnes à un outil du Pôle SI" }
      ],
      claims: [],
      meta: { lastUpdate: null, nextUpdate: "Dimanche au brunch 🥐" }
    };
  }

  function normalizeDB(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.questions)) return defaultDB();
    for (const k of ["users", "bets", "votes"]) d[k] = d[k] || {};
    d.meta = d.meta || {};
    d.days = Array.isArray(d.days) && d.days.length ? d.days : defaultDB().days;
    d.challenges = d.challenges || [];
    d.claims = d.claims || [];
    d.rev = d.rev || 0;
    return d;
  }

  /* ---------- Clôture ---------- */
  const deadlineOf = (db, q) => q.deadline || (db.days.find(d => d.id === q.day) || {}).deadline || null;
  const isOpen = (db, q, now = Date.now()) => q.type !== "vote" ? (q.open && !q.winner && !(deadlineOf(db, q) && now >= deadlineOf(db, q))) : (q.open && !q.winner);

  /* ---------- Cotes : plus ton choix est rare, plus il rapporte ---------- */
  function picks(db, qid, exceptUser) {
    const counts = {}; let total = 0;
    for (const [u, b] of Object.entries(db.bets)) {
      if (u === exceptUser || !b[qid]) continue;
      counts[b[qid].target] = (counts[b[qid].target] || 0) + 1; total++;
    }
    return { counts, total };
  }
  const coteRaw = (base, n, T) => Math.min(base * CONFIG.CAP, Math.max(base, Math.round(base / Math.sqrt(n / T) / 5) * 5));
  // Cote affichée pour un joueur qui choisirait `target` maintenant
  function coteFor(db, q, target, user) {
    const { counts, total } = picks(db, q.id, user);
    return coteRaw(q.base, (counts[target] || 0) + 1, total + 1);
  }
  // Cote finale (tous les pronos comptés)
  function coteFinal(db, q, target) {
    const { counts, total } = picks(db, q.id);
    return coteRaw(q.base, Math.max(1, counts[target] || 0), Math.max(1, total));
  }
  function rarity(share) {
    if (share >= 0.30) return { label: "Favori", cls: "fav" };
    if (share >= 0.15) return { label: "Outsider", cls: "out" };
    if (share >= 0.05) return { label: "Rare", cls: "rare" };
    return { label: "Ultra rare", cls: "ultra" };
  }

  const multOf = (db, user, tok) => ((db.users[user] && db.users[user].boosts) || []).find(b => b.id === tok)?.mult || 1;

  function stats(db, user, dayId) {
    let score = 0, won = 0, lost = 0, pending = 0, best = 0;
    for (const [qid, b] of Object.entries(db.bets[user] || {})) {
      const q = db.questions.find(x => x.id === qid);
      if (!q || (dayId && q.day !== dayId)) continue;
      if (!q.winner) { pending++; continue; }
      if (q.winner === b.target) { const pts = coteFinal(db, q, q.winner) * multOf(db, user, b.boost); score += pts; won++; best = Math.max(best, pts); }
      else lost++;
    }
    return { score, won, lost, pending, best };
  }

  function ranking(db, opts = {}) {
    return Object.entries(db.users)
      .filter(([, u]) => !opts.pole || u.pole === opts.pole)
      .map(([id, u]) => ({ id, u, ...stats(db, id, opts.day) }))
      .sort((a, b) => b.score - a.score || b.won - a.won || (a.u.first + a.u.last).localeCompare(b.u.first + b.u.last));
  }

  function poleRanking(db, day) {
    const g = {};
    for (const r of ranking(db, { day })) {
      const p = r.u.pole || "Sans pôle";
      g[p] = g[p] || { pole: p, members: 0, total: 0 };
      g[p].members++; g[p].total += r.score;
    }
    return Object.values(g).map(x => ({ ...x, avg: Math.round(x.total / x.members) })).sort((a, b) => b.avg - a.avg || b.total - a.total);
  }

  function tally(db, qid) {
    const c = {};
    for (const v of Object.values(db.votes)) if (v[qid]) c[v[qid]] = (c[v[qid]] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }

  const ADMIN = new Set(["setWinner", "toggle", "addQ", "delQ", "claimDecision", "addC", "delC", "delUser", "publish", "import", "reset", "checkPin", "setDeadline", "grant", "revoke"]);

  function apply(db, action, isAdmin, now = Date.now()) {
    const p = action.payload || {};
    const fail = m => ({ error: m });
    if (ADMIN.has(action.type) && !isAdmin) return fail("Code admin incorrect");
    const u = p.user ? db.users[p.user] : null;
    const q = p.qid ? db.questions.find(x => x.id === p.qid) : null;
    let result = null;

    switch (action.type) {
      case "register": {
        const first = String(p.first || "").trim().slice(0, 40), last = String(p.last || "").trim().slice(0, 40);
        if (!first || !last) return fail("Prénom et nom obligatoires");
        if (!CONFIG.POLES.includes(p.pole)) return fail("Choisis ton pôle");
        const k = key(first + " " + last);
        if (Object.values(db.users).some(x => key(x.first + " " + x.last) === k)) return fail("Déjà inscrit·e : utilise « Déjà inscrit·e »");
        result = uid();
        // Comme dans MPP : un bonus ×2 offert pour tout le week-end
        db.users[result] = { first, last, pole: p.pole, created: now, boosts: [{ id: uid(), mult: 2, label: "Bonus ×2 de bienvenue", used: null }] };
        break;
      }
      case "setPole":
        if (!u) return fail("Compte introuvable");
        if (!CONFIG.POLES.includes(p.pole)) return fail("Pôle inconnu");
        u.pole = p.pole; break;
      case "bet": {
        if (!u) return fail("Compte introuvable");
        if (!q || q.type === "vote") return fail("Question introuvable");
        if (!isOpen(db, q, now)) return fail("Trop tard, les pronos sont clôturés pour cette question");
        const allowed = q.type === "battle" ? q.options : Object.keys(db.users);
        if (!allowed.includes(p.target)) return fail("Choisis une personne");
        const toks = u.boosts || (u.boosts = []);
        const prev = (db.bets[p.user] || {})[q.id];
        if (p.boost) { const t = toks.find(x => x.id === p.boost); if (!t || (t.used && t.used !== q.id)) return fail("Bonus indisponible"); }
        if (prev && prev.boost) { const t = toks.find(x => x.id === prev.boost); if (t) t.used = null; }
        if (p.boost) toks.find(x => x.id === p.boost).used = q.id;
        (db.bets[p.user] = db.bets[p.user] || {})[q.id] = { target: p.target, boost: p.boost || null, at: now };
        break;
      }
      case "vote":
        if (!u) return fail("Compte introuvable");
        if (!q || q.type !== "vote") return fail("Vote introuvable");
        if (!isOpen(db, q, now)) return fail("Le vote est fermé");
        if (!db.users[p.target]) return fail("Choisis une personne");
        (db.votes[p.user] = db.votes[p.user] || {})[q.id] = p.target;
        break;
      case "propose": {
        if (!u) return fail("Compte introuvable");
        const title = String(p.title || "").trim().slice(0, 140);
        if (title.length < 8) return fail("Écris ta question en entier");
        const d = db.days.find(x => x.id === p.day);
        if (!d) return fail("Choisis une journée");
        if (d.deadline && now >= d.deadline) return fail("Cette journée est déjà clôturée");
        if (db.questions.filter(x => x.by === p.user).length >= CONFIG.MAX_PROPOSALS) return fail("Maximum " + CONFIG.MAX_PROPOSALS + " propositions par personne");
        if (db.questions.some(x => key(x.title) === key(title))) return fail("Ce prono existe déjà");
        db.questions.push({ id: uid(), type: "pari", day: d.id, emoji: String(p.emoji || "💡").slice(0, 8), title, base: CONFIG.BASE.pari, open: true, winner: null, by: p.user, at: now });
        result = d.id; break;
      }
      case "claim":
        if (!u) return fail("Compte introuvable");
        if (!db.challenges.some(c => c.id === p.cid)) return fail("Défi introuvable");
        if (db.claims.some(c => c.user === p.user && c.challenge === p.cid && c.status !== "ko")) return fail("Défi déjà envoyé");
        db.claims.push({ id: uid(), user: p.user, challenge: p.cid, status: "pending", at: now });
        break;

      /* ---------- ADMIN ---------- */
      case "checkPin": return { ok: true, noWrite: true };
      case "setWinner":
        if (!q) return fail("Question introuvable");
        q.winner = p.winner && db.users[p.winner] ? p.winner : null;
        if (q.winner) q.open = false;
        break;
      case "toggle": if (!q) return fail("Question introuvable"); q.open = !q.open; break;
      case "setDeadline": {
        const d = db.days.find(x => x.id === p.day);
        if (!d) return fail("Journée introuvable");
        d.deadline = p.deadline ? Number(p.deadline) : null; break;
      }
      case "addQ": {
        const type = ["pari", "vote", "battle"].includes(p.type) ? p.type : "pari";
        const title = String(p.title || "").trim().slice(0, 140);
        if (!title) return fail("Intitulé obligatoire");
        const day = db.days.some(d => d.id === p.day) ? p.day : db.days[0].id;
        const def = type === "vote" ? 0 : CONFIG.BASE[type];
        const nq = { id: uid(), type, day, emoji: String(p.emoji || "🎪").slice(0, 8), title, open: true, winner: null,
          base: type === "vote" ? 0 : Math.max(5, parseInt(p.base, 10) || def) };
        if (type === "battle") {
          if (!db.users[p.a] || !db.users[p.b] || p.a === p.b) return fail("Choisis 2 combattant·es différent·es");
          nq.options = [p.a, p.b];
        }
        db.questions.push(nq); break;
      }
      case "delQ":
        if (!q) return fail("Question introuvable");
        db.questions = db.questions.filter(x => x.id !== q.id);
        for (const b of Object.values(db.bets)) delete b[q.id];
        for (const v of Object.values(db.votes)) delete v[q.id];
        for (const x of Object.values(db.users)) (x.boosts || []).forEach(t => { if (t.used === q.id) t.used = null; });
        break;
      case "grant": {
        const ch = db.challenges.find(x => x.id === p.cid);
        if (!u) return fail("Choisis une personne");
        if (!ch) return fail("Choisis un défi");
        if (db.claims.some(c => c.user === p.user && c.challenge === ch.id && c.status === "ok")) return fail("Défi déjà attribué à cette personne");
        const tok = { id: uid(), mult: ch.mult, label: ch.title, used: null };
        (u.boosts = u.boosts || []).push(tok);
        db.claims.push({ id: uid(), user: p.user, challenge: ch.id, status: "ok", boost: tok.id, at: now });
        break;
      }
      case "revoke": {
        const c = db.claims.find(x => x.id === p.id);
        if (!c) return fail("Introuvable");
        const cu = db.users[c.user];
        if (cu && c.boost) {
          const t = (cu.boosts || []).find(x => x.id === c.boost);
          if (t && t.used && db.bets[c.user] && db.bets[c.user][t.used]) db.bets[c.user][t.used].boost = null;
          cu.boosts = (cu.boosts || []).filter(x => x.id !== c.boost);
        }
        db.claims = db.claims.filter(x => x.id !== c.id);
        break;
      }
      case "claimDecision": {
        const c = db.claims.find(x => x.id === p.id);
        if (!c || c.status !== "pending") return fail("Déjà traité");
        c.status = p.ok ? "ok" : "ko";
        if (p.ok) {
          const ch = db.challenges.find(x => x.id === c.challenge), cu = db.users[c.user];
          if (ch && cu) (cu.boosts = cu.boosts || []).push({ id: uid(), mult: ch.mult, label: ch.title, used: null });
        }
        break;
      }
      case "addC": {
        const title = String(p.title || "").trim().slice(0, 140);
        if (!title) return fail("Intitulé obligatoire");
        db.challenges.push({ id: uid(), title, mult: Math.min(5, Math.max(2, parseInt(p.mult, 10) || 2)) }); break;
      }
      case "delC": db.challenges = db.challenges.filter(x => x.id !== p.id); break;
      case "delUser":
        if (!u) return fail("Compte introuvable");
        delete db.users[p.user]; delete db.bets[p.user]; delete db.votes[p.user];
        db.claims = db.claims.filter(c => c.user !== p.user);
        for (const x of db.questions) {
          if (x.winner === p.user) x.winner = null;
          if (x.options && x.options.includes(p.user)) x.open = false;
        }
        for (const b of Object.values(db.bets)) for (const k of Object.keys(b)) if (b[k].target === p.user) delete b[k];
        for (const v of Object.values(db.votes)) for (const k of Object.keys(v)) if (v[k] === p.user) delete v[k];
        break;
      case "publish":
        db.meta.lastUpdate = now;
        db.meta.nextUpdate = String(p.nextUpdate || "").slice(0, 80);
        break;
      case "import":
      case "reset": {
        const fresh = action.type === "reset" ? defaultDB() : normalizeDB(p.db);
        const rev = db.rev;
        for (const k of Object.keys(db)) delete db[k];
        Object.assign(db, fresh, { rev });
        break;
      }
      default: return fail("Action inconnue");
    }
    db.rev = (db.rev || 0) + 1;
    return { ok: true, result };
  }

  const api = { CONFIG, uid, key, defaultDB, normalizeDB, deadlineOf, isOpen, picks, coteFor, coteFinal, rarity, multOf, stats, ranking, poleRanking, tally, apply };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WEPLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
