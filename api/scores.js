// Leaderboard for Marshellis Arcade games. Zero dependencies: talks to Upstash Redis over its REST API.
//
// Env vars (added automatically when you connect an Upstash Redis / "KV" store to the Vercel project):
//   KV_REST_API_URL + KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
//
//   GET  /api/scores?game=hex-collapse            -> { scores: [{ name, score }, ...] }   top 10
//   POST /api/scores { action: "start" }           -> { token }     call when a round begins
//   POST /api/scores { token, name, score }        -> { ok, rank, scores }  call when a round ends
const crypto = require('crypto');

const GAMES = { 'hex-collapse': { max: 60 * 60 } };   // allowed games + longest plausible score (seconds)
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'dick', 'pussy', 'asshole', 'whore', 'slut', 'rape', 'nazi'];

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const sign = (v) => crypto.createHmac('sha256', TOKEN).update(v).digest('hex').slice(0, 32);
const boardKey = (game) => 'scores:' + game;

function cleanName(raw) {
  const name = String(raw == null ? '' : raw).replace(/[^\w .\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const flat = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!name || BLOCKED.some((w) => flat.includes(w))) return 'Player';
  return name;
}

async function top(game) {
  const flat = await redis('ZREVRANGE', boardKey(game), 0, 9, 'WITHSCORES');
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ name: flat[i], score: Number(flat[i + 1]) });
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const send = (code, body) => res.status(code).send(JSON.stringify(body));
  if (!URL_ || !TOKEN) return send(503, { error: 'Leaderboard storage is not connected yet.' });

  try {
    const game = String((req.query && req.query.game) || (req.body && req.body.game) || 'hex-collapse');
    if (!GAMES[game]) return send(400, { error: 'Unknown game.' });

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=30');
      return send(200, { scores: await top(game) });
    }
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });

    // light per-IP rate limit
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const hits = await redis('INCR', 'rl:' + ip);
    if (hits === 1) await redis('EXPIRE', 'rl:' + ip, 60);
    if (hits > 40) return send(429, { error: 'Slow down a little.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (body.action === 'start') {
      const t = Date.now(), nonce = crypto.randomBytes(8).toString('hex');
      return send(200, { token: [t, nonce, sign(game + '.' + t + '.' + nonce)].join('.') });
    }

    // submit: the token proves a round really started, and that enough real time passed to earn the score
    const [t, nonce, sig] = String(body.token || '').split('.');
    if (!t || !nonce || !sig || sig !== sign(game + '.' + t + '.' + nonce)) return send(400, { error: 'Invalid round token.' });
    const elapsed = (Date.now() - Number(t)) / 1000;
    let score = Math.round(Number(body.score) * 10) / 10;
    if (!isFinite(score) || score < 0.5 || score > GAMES[game].max || score > elapsed + 1) return send(400, { error: 'Score rejected.' });
    if (elapsed > 3 * 60 * 60) return send(400, { error: 'Round expired.' });
    const fresh = await redis('SET', 'used:' + nonce, '1', 'NX', 'EX', 10800);
    if (!fresh) return send(400, { error: 'Round already submitted.' });

    const name = cleanName(body.name);
    await redis('ZADD', boardKey(game), 'GT', score, name);        // only ever raises a name's best
    await redis('ZREMRANGEBYRANK', boardKey(game), 0, -201);       // keep the top 200
    const rank = await redis('ZREVRANK', boardKey(game), name);
    return send(200, { ok: true, name, rank: rank == null ? null : rank + 1, scores: await top(game) });
  } catch (e) {
    return send(500, { error: 'Leaderboard hiccup. Try again in a moment.' });
  }
};
