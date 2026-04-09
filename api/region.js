const REGION_LOOKUP_BASE =
  process.env.FF_REGION_LOOKUP_BASE || 'https://ffname.vercel.app';

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