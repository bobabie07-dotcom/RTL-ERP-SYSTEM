const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(method, path, body) {
  const token = localStorage.getItem('erp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout (Render cold start)

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Server is taking too long to respond. Please try again in a moment.');
    throw err;
  }
  clearTimeout(timer);

  if (res.status === 401) {
    localStorage.removeItem('erp_token');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const msg = Array.isArray(detail)
      ? detail.map(d => d.msg || JSON.stringify(d)).join('; ')
      : (typeof detail === 'string' ? detail : 'Request failed');
    throw new Error(msg || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

const get    = (path, params) => {
  const clean = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    : null;
  const qs = clean && Object.keys(clean).length ? '?' + new URLSearchParams(clean).toString() : '';
  return request('GET', path + qs);
};
const post   = (path, body) => request('POST', path, body);
const put    = (path, body) => request('PUT', path, body);
const patch  = (path, body) => request('PATCH', path, body);
const del    = (path)       => request('DELETE', path);

export const authApi = {
  login:             (email, password)          => post('/api/auth/login', { email, password }),
  me:                ()                         => get('/api/auth/me'),
  changePassword:    (current, next)            => put('/api/auth/password', { current_password: current, new_password: next }),
  setFirstPassword:  (newPass, confirmPass)     => put('/api/auth/first-password', { new_password: newPass, confirm_password: confirmPass }),
  users:          ()                      => get('/api/auth/users'),
  createUser:     (data)                  => post('/api/auth/users', data),
  updateUser:     (id, data)              => patch(`/api/auth/users/${id}`, data),
  deleteUser:     (id)                    => del(`/api/auth/users/${id}`),
  resetPassword:  (id)                    => post(`/api/auth/users/${id}/reset-password`),
};

export const batchesApi = {
  list:      (params)            => get('/api/batches', params),
  get:       (id)                => get(`/api/batches/${id}`),
  logs:      (id)                => get(`/api/batches/${id}/logs`),
  addLog:    (id, data)          => post(`/api/batches/${id}/logs`, data),
  updateLog: (id, logId, data)   => patch(`/api/batches/${id}/logs/${logId}`, data),
  deleteLog: (id, logId)         => del(`/api/batches/${id}/logs/${logId}`),
  create:    (data)              => post('/api/batches', data),
  update:    (id, data)          => patch(`/api/batches/${id}`, data),
  delete:    (id)                => del(`/api/batches/${id}`),
  houses:    (params)            => get('/api/batches/meta/houses', params),
  breeds:    ()                  => get('/api/batches/meta/breeds'),
  buyers:    ()                  => get('/api/sales/buyers'),
};

export const feedApi = {
  types:           ()             => get('/api/feed/types'),
  createFeedType:  (data)         => post('/api/feed/types', data),
  stock:           ()             => get('/api/feed/stock'),
  purchases:      (params)       => get('/api/feed/purchases', params),
  issues:         (params)       => get('/api/feed/issues', params),
  weekly:         (farm_id)      => get('/api/feed/weekly', { farm_id }),
  createPurchase: (data)         => post('/api/feed/purchases', data),
  createIssue:    (data)         => post('/api/feed/issues', data),
  updateIssue:    (id, data)     => patch(`/api/feed/issues/${id}`, data),
  linkInventory:  (typeId, itemId) => patch(`/api/feed/types/${typeId}`, { inventory_item_id: itemId }),
  unlinkInventory:(typeId)        => patch(`/api/feed/types/${typeId}`, { inventory_item_id: null }),
};

export const mortalityApi = {
  list:    (params)    => get('/api/mortality', params),
  rates7d: (farm_id)  => get('/api/mortality/rates-7d', { farm_id }),
  create:  (data)     => post('/api/mortality', data),
  update:  (id, data) => patch(`/api/mortality/${id}`, data),
  delete:  (id)       => del(`/api/mortality/${id}`),
};

export const healthApi = {
  events:              (params)    => get('/api/health/events', params),
  vaccinations:        (params)    => get('/api/health/vaccinations', params),
  upcomingVaccinations:(farm_id)   => get('/api/health/vaccinations/upcoming', { farm_id }),
  createVaccination:   (data)      => post('/api/health/vaccinations', data),
  updateVaccination:   (id, data)  => patch(`/api/health/vaccinations/${id}`, data),
  deleteVaccination:   (id)        => del(`/api/health/vaccinations/${id}`),
  createEvent:         (data)      => post('/api/health/events', data),
  medications:         (category)  => get('/api/health/medications', category ? { category } : undefined),
};

export const inventoryApi = {
  items:          (params)   => get('/api/inventory/items', params),
  categories:     ()         => get('/api/inventory/categories'),
  createCategory: (name)     => post('/api/inventory/categories', { name }),
  suppliers:    ()         => get('/api/inventory/suppliers'),
  createItem:   (data)     => post('/api/inventory/items', data),
  updateItem:   (id, data) => patch(`/api/inventory/items/${id}`, data),
  deleteItem:   (id)       => del(`/api/inventory/items/${id}`),
  movement:     (data)     => post('/api/inventory/movements', data),
  reserveStock: (id, data) => post(`/api/inventory/items/${id}/reserve`, data),
  releaseStock: (id, data) => post(`/api/inventory/items/${id}/release`, data),
  checkAlerts:  (farm_id)  => post('/api/inventory/check-alerts', { farm_id }),
};

export const salesApi = {
  orders:        (params)    => get('/api/sales/orders', params),
  summary:       (farm_id)   => get('/api/sales/summary', { farm_id }),
  expenses:      (params)    => get('/api/sales/expenses', params),
  createExpense: (data)      => post('/api/sales/expenses', data),
  receivables:   (farm_id)   => get('/api/sales/receivables', { farm_id }),
  createOrder:   (data)      => post('/api/sales/orders', data),
  approveOrder:  (id)         => post(`/api/sales/orders/${id}/approve`),
  rejectOrder:   (id, reason) => post(`/api/sales/orders/${id}/reject`, { rejection_reason: reason }),
  updateOrder:   (id, data)   => patch(`/api/sales/orders/${id}`, data),
  recordPayment: (id, status) => patch(`/api/sales/orders/${id}/payment`, { payment_status: status }),
  deleteOrder:   (id)         => del(`/api/sales/orders/${id}`),
};

export const procurementApi = {
  orders:          (params)      => get('/api/procurement/orders', params),
  suppliers:       ()            => get('/api/procurement/suppliers'),
  createSupplier:  (data)        => post('/api/procurement/suppliers', data),
  createOrder:     (data)        => post('/api/procurement/orders', data),
  approveOrder:    (id)          => post(`/api/procurement/orders/${id}/approve`),
  rejectOrder:     (id, reason)  => post(`/api/procurement/orders/${id}/reject`, { rejection_reason: reason }),
  receiveOrder:    (id)          => post(`/api/procurement/orders/${id}/receive`),
  syncInventory:   (id, items)   => post(`/api/procurement/orders/${id}/sync-inventory`, { items }),
  deleteOrder:     (id)          => del(`/api/procurement/orders/${id}`),
};

export const alertsApi = {
  list:        (params)  => get('/api/alerts', params),
  markRead:    (id)      => patch(`/api/alerts/${id}/read`, {}),
  markAllRead: (farm_id) => post(`/api/alerts/mark-all-read?farm_id=${farm_id}`),
};

export const farmsApi = {
  list:        ()                         => get('/api/farms'),
  create:      (data)                     => post('/api/farms', data),
  update:      (id, data)                 => patch(`/api/farms/${id}`, data),
  delete:      (id)                       => del(`/api/farms/${id}`),
  houses:      (farm_id)                  => get(`/api/farms/${farm_id}/houses`),
  createHouse: (farm_id, data)            => post(`/api/farms/${farm_id}/houses`, data),
  updateHouse: (farm_id, house_id, data)  => patch(`/api/farms/${farm_id}/houses/${house_id}`, data),
  deleteHouse: (farm_id, house_id)        => del(`/api/farms/${farm_id}/houses/${house_id}`),
};

export const harvestApi = {
  create: (batchId, data) => post(`/api/harvest/${batchId}`, data),
  get:    (batchId)       => get(`/api/harvest/${batchId}`),
  update: (batchId, data) => patch(`/api/harvest/${batchId}`, data),
  pnl:    (batchId)       => get(`/api/harvest/${batchId}/pnl`),
};

export const batchPlansApi = {
  get:    (batch_id)       => get(`/api/batch-plans/${batch_id}`),
  upsert: (batch_id, data) => request('PUT', `/api/batch-plans/${batch_id}`, data),
  delete: (batch_id)       => del(`/api/batch-plans/${batch_id}`),
};

export const dashboardApi = {
  kpis: (farm_id) => get('/api/dashboard/kpis', { farm_id }),
};

export const reportsApi = {
  batchPnl:          (farm_id)             => get('/api/reports/batch-pnl', { farm_id }),
  feedConsumption:   (params)              => get('/api/reports/feed-consumption', params),
  mortalityAnalysis: (params)              => get('/api/reports/mortality-analysis', params),
  salesPerformance:  (farm_id, year, month) => get('/api/reports/sales-performance', { farm_id, year, month }),
  inventorySnapshot: (farm_id)             => get('/api/reports/inventory-snapshot', { farm_id }),
  farmFinances:     (farm_id)              => get('/api/reports/farm-finances', { farm_id }),
  mortalityImpact:  (farm_id, market_price, pricing_mode = 'per_kg') => get('/api/reports/mortality-impact', { farm_id, market_price, pricing_mode }),
  batchComparison:  (farm_id)              => get('/api/reports/batch-comparison', { farm_id }),
};

export const maintenanceApi = {
  list:   (params) => get('/api/maintenance', params),
  create: (data)   => post('/api/maintenance', data),
  update: (id, data) => patch(`/api/maintenance/${id}`, data),
  delete: (id)     => del(`/api/maintenance/${id}`),
};

export const supportApi = {
  listTickets:   (params)       => get('/api/support/tickets', params),
  createTicket:  (data)         => post('/api/support/tickets', data),
  getTicket:     (id)           => get(`/api/support/tickets/${id}`),
  updateTicket:  (id, data)     => patch(`/api/support/tickets/${id}`, data),
  assignTicket:  (id, data)     => post(`/api/support/tickets/${id}/assign`, data),
  changeStatus:  (id, data)     => post(`/api/support/tickets/${id}/status`, data),
  getComments:   (id)           => get(`/api/support/tickets/${id}/comments`),
  addComment:    (id, data)     => post(`/api/support/tickets/${id}/comments`, data),
  getActivity:   (id)           => get(`/api/support/tickets/${id}/activity`),
  getDashboard:  (params)       => get('/api/support/dashboard', params),
  getStaff:      ()             => get('/api/support/staff'),
  aiSuggest:     (id)          => get(`/api/support/tickets/${id}/ai-suggest`),
};

export const usersApi = {
  // Users
  list:            (params)          => get('/api/users', params),
  stats:           ()                => get('/api/users/stats'),
  get:             (id)              => get(`/api/users/${id}`),
  create:          (data)            => post('/api/users', data),
  update:          (id, data)        => patch(`/api/users/${id}`, data),
  setStatus:       (id, data)        => patch(`/api/users/${id}/status`, data),
  resetPassword:   (id)              => post(`/api/users/${id}/reset-password`, {}),
  // Roles
  getRoles:        (id)              => get(`/api/users/${id}/roles`),
  assignRoles:     (id, role_ids)    => post(`/api/users/${id}/roles`, { role_ids }),
  removeRole:      (id, role_id)     => del(`/api/users/${id}/roles/${role_id}`),
  // History
  loginHistory:    (id, limit)       => get(`/api/users/${id}/login-history`, limit ? { limit } : {}),
  auditLogs:       (id, limit)       => get(`/api/users/${id}/audit-logs`, limit ? { limit } : {}),
  allAuditLogs:    (limit)           => get('/api/users/audit-logs/all', limit ? { limit } : {}),
  // Role management
  listRoles:       ()                => get('/api/users/roles/all'),
  createRole:      (data)            => post('/api/users/roles/all', data),
  updateRole:      (id, data)        => patch(`/api/users/roles/all/${id}`, data),
};
