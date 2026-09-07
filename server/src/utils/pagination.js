/** Shared pagination + search helpers for large school datasets (1000+ students) */

export function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchFilter(q, fields = ['name', 'email', 'admissionId', 'phone']) {
  const term = String(q || '').trim();
  if (!term) return null;
  const rx = new RegExp(escapeRegex(term), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

export function paginatedResponse({ items, total, page, limit, extra = {} }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    ...extra,
    total,
    page,
    limit,
    pages,
    hasMore: page < pages,
  };
}
