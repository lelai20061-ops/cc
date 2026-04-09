const REGION_LOOKUP_BASE =
  process.env.FF_REGION_LOOKUP_BASE || 'https://ffname.vercel.app';

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

function normalizeRegion(region) {
  const raw = String(region || '').trim().toUpperCase();
  const aliasMap = {
    EUROPE: 'EU'
  };
  return aliasMap[raw] || raw;
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

  if (!response.ok) {
    throw new Error(`Upstream HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return text;
}

module.exports = async function handler(req, res) {
  try {
    const uid = req.query?.uid;

    if (!validUid(uid)) {
      return res.status(400).json({
        error: 'UID must be 6-20 digits.'
      });
    }

    const url = `${REGION_LOOKUP_BASE}/?uid=${encodeURIComponent(uid)}`;
    const text = await fetchText(url);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Upstream did not return JSON.',
        raw: text.slice(0, 300)
      });
    }

    if (!data || !data.region || !data.nickname) {
      return res.status(404).json({
        error: 'Region lookup failed for this UID.',
        upstream: data
      });
    }

    return res.status(200).json({
      uid: String(uid),
      nickname: data.nickname,
      region: normalizeRegion(data.region),
      server: data.join || null
    });
  } catch (error) {
    console.error('region.js fatal error:', error);

    return res.status(500).json({
      error: error.message || 'Failed to fetch region info.'
    });
  }
};
