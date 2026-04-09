const REGION_LOOKUP_BASE =
  process.env.FF_REGION_LOOKUP_BASE || 'https://ffname.vercel.app';

const FULL_INFO_BASE =
  process.env.FF_FULL_INFO_BASE || 'https://ffdvinh09-info.vercel.app';

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

function normalizeRegion(region) {
  const raw = String(region || '').trim().toUpperCase();
  const aliasMap = {
    EUROPE: 'EU',
  };
  return aliasMap[raw] || raw;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream error ${response.status}`);
  }

  return response.json();
}

async function detectRegion(uid) {
  const url = `${REGION_LOOKUP_BASE}/?uid=${encodeURIComponent(uid)}`;
  const data = await fetchJson(url);

  if (!data || !data.region) {
    throw new Error('Could not detect region from UID.');
  }

  return {
    nickname: data.nickname || null,
    region: normalizeRegion(data.region),
    server: data.join || null
  };
}

module.exports = async (req, res) => {
  try {
    const { uid, region } = req.query;

    if (!validUid(uid)) {
      return res.status(400).json({
        status: 'error',
        message: 'UID must be 6-20 digits.'
      });
    }

    let finalRegion = normalizeRegion(region);

    if (!finalRegion) {
      const detected = await detectRegion(uid);
      finalRegion = detected.region;
    }

    if (!finalRegion) {
      return res.status(400).json({
        status: 'error',
        message: 'Could not determine region for this UID.'
      });
    }

    const infoUrl =
      `${FULL_INFO_BASE}/player-info?region=${encodeURIComponent(finalRegion)}&uid=${encodeURIComponent(uid)}`;

    const infoData = await fetchJson(infoUrl);

    if (!infoData || !infoData.basicInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Full account info not found.'
      });
    }

    return res.status(200).json({
      status: 'success',
      region: finalRegion,
      data: infoData,
      outfit_image: null
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch account info.'
    });
  }
};