/** Video helpers: YouTube / Vimeo links become embeds; direct files play in <video>. */

export function youtubeId(url = '') {
  const s = String(url).trim();
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

export function vimeoId(url = '') {
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
}

export function isVideoFile(url = '') {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url));
}

/** { kind: 'youtube'|'vimeo'|'file', src, thumb } or null */
export function resolveVideo(...urls) {
  for (const raw of urls) {
    const url = String(raw || '').trim();
    if (!url) continue;
    const yt = youtubeId(url);
    if (yt) {
      return {
        kind: 'youtube',
        src: `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`,
        thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      };
    }
    const vm = vimeoId(url);
    if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm}`, thumb: '' };
    if (isVideoFile(url)) return { kind: 'file', src: url, thumb: '' };
  }
  return null;
}
