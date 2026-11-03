/** Normalize Google Maps share/place/search URLs into an embeddable iframe src. */

export function parseLatLngFromMapsUrl(url = '') {
  const text = String(url || '').trim();
  if (!text) return null;

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /\/search\/(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

export function toGoogleMapsEmbedUrl({ mapUrl = '', latitude = null, longitude = null, zoom = 15 } = {}) {
  const raw = String(mapUrl || '').trim();

  if (raw) {
    if (/google\.[^/]+\/maps\/embed/i.test(raw) || /output=embed/i.test(raw)) {
      return raw;
    }

    // Google share links sometimes already contain pb= embed payload
    const pb = raw.match(/[?&]pb=([^&]+)/i);
    if (pb) {
      return `https://www.google.com/maps/embed?pb=${decodeURIComponent(pb[1])}`;
    }

    const fromUrl = parseLatLngFromMapsUrl(raw);
    if (fromUrl) {
      return `https://maps.google.com/maps?q=${fromUrl.lat},${fromUrl.lng}&z=${zoom}&output=embed`;
    }

    // Place / search text URL → query embed
    try {
      const u = new URL(raw);
      if (u.hostname.includes('google.') && u.pathname.includes('/maps')) {
        const place = u.pathname.match(/\/maps\/place\/([^/]+)/i)?.[1];
        const q = place || u.searchParams.get('q') || u.searchParams.get('query');
        if (q) {
          return `https://maps.google.com/maps?q=${encodeURIComponent(decodeURIComponent(q))}&z=${zoom}&output=embed`;
        }
      }
    } catch {
      // not a valid URL — fall through
    }
  }

  const lat = latitude != null && latitude !== '' ? Number(latitude) : NaN;
  const lng = longitude != null && longitude !== '' ? Number(longitude) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  }

  return '';
}

export function applyMapsUrlToForm(url, current = {}) {
  const coords = parseLatLngFromMapsUrl(url);
  const embed = toGoogleMapsEmbedUrl({
    mapUrl: url,
    latitude: coords?.lat ?? current.latitude,
    longitude: coords?.lng ?? current.longitude,
  });
  return {
    map_url: embed || url || '',
    latitude: coords ? String(coords.lat) : (current.latitude ?? ''),
    longitude: coords ? String(coords.lng) : (current.longitude ?? ''),
  };
}
