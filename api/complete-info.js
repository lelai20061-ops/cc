const FULL_INFO_BASE =
  process.env.FF_FULL_INFO_BASE || 'https://ffdvinh09-info.vercel.app';

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

  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

module.exports = async function handler(req, res) {
  try {
    const uid = req.query?.uid;
    const region = normalizeRegion(req.query?.region);

    if (!validUid(uid)) {
      return res.status(400).json({
        status: 'error',
        message: 'UID must be 6-20 digits.'
      });
    }

    if (!region) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu region. Hãy gọi dạng /api/complete-info?uid=2450675101&region=VN'
      });
    }

    const infoUrl =
      `${FULL_INFO_BASE}/player-info?region=${encodeURIComponent(region)}&uid=${encodeURIComponent(uid)}`;

    const upstream = await fetchText(infoUrl);

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        status: 'error',
        message: `Upstream HTTP ${upstream.status}`,
        raw: upstream.text.slice(0, 500),
        region
      });
    }

    let infoData;
    try {
      infoData = JSON.parse(upstream.text);
    } catch {
      return res.status(502).json({
        status: 'error',
        message: 'Upstream did not return JSON.',
        raw: upstream.text.slice(0, 500),
        region
      });
    }

    if (!infoData || !infoData.basicInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Full account info not found.',
        upstream: infoData,
        region
      });
    }

    return res.status(200).json({
      status: 'success',
      region,
      data: infoData,
      outfit_image: null
    });
  } catch (error) {
    console.error('complete-info.js fatal error:', error);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch account info.'
    });
  }
};
