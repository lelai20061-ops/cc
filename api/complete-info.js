const ACCINFO_API = 'https://danger-player-info.vercel.app/accinfo';
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
        status: 'error',
        message: 'UID must be 6-20 digits.'
      });
    }

    const url = `${ACCINFO_API}?uid=${encodeURIComponent(uid)}&key=${encodeURIComponent(API_KEY)}`;
    const upstream = await fetchText(url);

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        status: 'error',
        message: `Upstream HTTP ${upstream.status}`,
        raw: upstream.text.slice(0, 500)
      });
    }

    let data;
    try {
      data = JSON.parse(upstream.text);
    } catch {
      return res.status(502).json({
        status: 'error',
        message: 'Upstream did not return JSON.',
        raw: upstream.text.slice(0, 500)
      });
    }

    const outfitImage =
      data.outfit_image ||
      data.outfitImage ||
      data?.data?.outfit_image ||
      data?.data?.outfitImage ||
      null;

    if (data?.status === 'success' && data?.data) {
      return res.status(200).json({
        ...data,
        outfit_image: data.outfit_image || outfitImage || null
      });
    }

    if (data?.basicInfo || data?.profileInfo || data?.socialInfo) {
      return res.status(200).json({
        status: 'success',
        region: data?.basicInfo?.region || null,
        data,
        outfit_image: outfitImage
      });
    }

    if (data?.data && (data.data.basicInfo || data.data.profileInfo || data.data.socialInfo)) {
      return res.status(200).json({
        status: 'success',
        region: data?.data?.basicInfo?.region || null,
        data: data.data,
        outfit_image: outfitImage
      });
    }

    return res.status(200).json({
      status: 'success',
      region: data?.region || null,
      data,
      outfit_image: outfitImage
    });
  } catch (error) {
    console.error('complete-info.js fatal error:', error);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch account info.'
    });
  }
};
