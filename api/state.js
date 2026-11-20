const { configured, load } = require("../lib/store.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!configured()) return res.status(200).json({ configured: false });
  try {
    res.status(200).json({ configured: true, db: await load() });
  } catch (e) {
    res.status(500).json({ configured: true, error: "Base indisponible : " + e.message });
  }
};
