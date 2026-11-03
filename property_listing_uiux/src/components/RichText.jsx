/**
 * Safe lightweight text formatter for admin-written page content (no raw HTML):
 *   ## Heading / ### Subheading, "- " bullets, "1. " numbered lists,
 *   **bold**, blank line = new paragraph, [text](https://link).
 */
function inline(text, keyBase) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:|tel:)[^)\s]+\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={`${keyBase}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    } else {
      const label = tok.slice(1, tok.indexOf(']'));
      const href = tok.slice(tok.indexOf('(') + 1, -1);
      const external = /^https?:/.test(href);
      parts.push(
        <a key={`${keyBase}-a${i++}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
          {label}
        </a>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function RichText({ text = '', className = '' }) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`rich-text ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        if (/^###\s/.test(block)) return <h3 key={bi}>{inline(block.replace(/^###\s+/, ''), bi)}</h3>;
        if (/^##\s/.test(block)) return <h2 key={bi}>{inline(block.replace(/^##\s+/, ''), bi)}</h2>;
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return <ul key={bi}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^[-*]\s+/, ''), `${bi}-${li}`)}</li>)}</ul>;
        }
        if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
          return <ol key={bi}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\d+[.)]\s+/, ''), `${bi}-${li}`)}</li>)}</ol>;
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
