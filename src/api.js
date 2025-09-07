// Simple frontend API for the Weighbridge backend
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function http(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

export const api = {
  // Records
  bulkInsert: (payload) => http('/records/bulk', { method: 'POST', body: JSON.stringify(payload) }),

  // Analytics
  overview: () => http('/analytics/overview'),
  byPerson: (limit = 10) => http(`/analytics/by-person?limit=${limit}`),
  bySite: (limit = 10) => http(`/analytics/by-site?limit=${limit}`),
  byShift: () => http(`/analytics/by-shift`),
  byGroup: (limit = 10) => http(`/analytics/by-group?limit=${limit}`),

  // References
  people: {
    list: () => http('/refs/people'),
    create: (name, group, shift) => http('/refs/people', { method: 'POST', body: JSON.stringify({ name, group, shift }) }),
    update: (id, { group, shift }) => http(`/refs/people/${id}`, { method: 'PATCH', body: JSON.stringify({ group, shift }) }),
  },
  groups: {
    list: () => http('/refs/groups'),
    create: (name) => http('/refs/groups', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id) => http(`/refs/groups/${id}`, { method: 'DELETE' }),
  },
  shifts: {
    list: () => http('/refs/shifts'),
    create: (name) => http('/refs/shifts', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id) => http(`/refs/shifts/${id}`, { method: 'DELETE' }),
  },
  sites: { list: () => http('/refs/sites') },
  users: { list: () => http('/refs/users') },
};

export default api;