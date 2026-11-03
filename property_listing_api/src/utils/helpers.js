const slugify = require('slugify');

function toSlug(text) {
  return slugify(String(text || ''), { lower: true, strict: true, trim: true });
}

function formatIndianPrice(amount, currencySymbol = '₹') {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  const n = Number(amount);
  if (n >= 10000000) return `${currencySymbol}${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (n >= 100000) return `${currencySymbol}${(n / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`;
  return `${currencySymbol}${n.toLocaleString('en-IN')}`;
}

function pagination(query, defaults = { page: 1, limit: 12 }) {
  const page = Math.max(1, Number(query.page) || defaults.page);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || defaults.limit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { toSlug, formatIndianPrice, pagination };
