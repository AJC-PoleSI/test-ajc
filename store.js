// Accès à la base partagée (Upstash Redis, via son API REST — aucune dépendance npm)
const L = require("./wep-logic.js");

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "wep2026:db";

const configured = () => Boolean(URL_ && TOKEN);

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function load() {
  const raw = await redis(["GET", KEY]);
  if (!raw) return L.defaultDB();
  try { return L.normalizeDB(JSON.parse(raw)); } catch { return L.defaultDB(); }
}

// Écrit seulement si personne n'a modifié la base entre-temps (évite d'écraser le prono d'un autre)
const CAS = `
local cur = redis.call('GET', KEYS[1])
if cur then
  local d = cjson.decode(cur)
  if (tonumber(d.rev) or 0) ~= tonumber(ARGV[2]) then return 0 end
elseif tonumber(ARGV[2]) ~= 0 then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
return 1`;

async function saveIfUnchanged(db, prevRev) {
  return (await redis(["EVAL", CAS, "1", KEY, JSON.stringify(db), String(prevRev)])) === 1;
}

module.exports = { L, configured, load, saveIfUnchanged };
