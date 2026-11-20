const { L, configured, load, saveIfUnchanged } = require("../lib/store.js");

const ADMIN_PIN = process.env.ADMIN_PIN || L.CONFIG.LOCAL_ADMIN_PIN;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST uniquement" });
  if (!configured()) return res.status(503).json({ ok: false, error: "Base partagée non configurée" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { type, payload, pin } = body || {};
  const isAdmin = pin === ADMIN_PIN;

  try {
    for (let i = 0; i < 6; i++) {
      const db = await load();
      const prevRev = db.rev || 0;
      const r = L.apply(db, { type, payload }, isAdmin);
      if (r.error) return res.status(200).json({ ok: false, error: r.error, db: await load() });
      if (r.noWrite) return res.status(200).json({ ok: true, result: r.result ?? null, db });
      if (await saveIfUnchanged(db, prevRev)) return res.status(200).json({ ok: true, result: r.result, db });
      await new Promise(s => setTimeout(s, 40 + Math.random() * 120)); // conflit : on réessaie
    }
    res.status(200).json({ ok: false, error: "Trop de monde en même temps, réessaie" });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Base indisponible : " + e.message });
  }
};
