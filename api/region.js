const REGION_API = 'https://danger-player-info.vercel.app/region';
const API_KEY = process.env.DANGER_API_KEY || 'DANGERxINFO';

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0'
    }
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

module.exports = async function handler(req, res) {
  try {
    const uid = req.query?.uid;

    if (!validUid(uid)) {
      return res.status(400).json({
        error: 'UID must be 6-20 digits.'
      });
    }

    const url = `${REGION_API}?uid=${encodeURIComponent(uid)}&key=${encodeURIComponent(API_KEY)}`;
    const upstream = await fetchText(url);

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: `Upstream HTTP ${upstream.status}`,
        raw: upstream.text.slice(0, 500)
      });
    }

    let data;
    try {
      data = JSON.parse(upstream.text);
    } catch {
      return res.status(502).json({
        error: 'Upstream did not return JSON.',
        raw: upstream.text.slice(0, 500)
      });
    }

    const out = {
      uid: String(data.uid || data.accountId || uid),
      nickname: data.nickname || data.playerName || data?.data?.nickname || null,
      region: data.region || data?.data?.region || null,
      server: data.server || data.join || data?.data?.server || null
    };

    if (!out.region && !out.nickname) {
      return res.status(404).json({
        error: 'Region lookup failed.',
        upstream: data
      });
    }

    return res.status(200).json(out);
  } catch (error) {
    console.error('region.js fatal error:', error);

    return res.status(500).json({
      error: error.message || 'Failed to fetch region info.'
    });
  }
};
