const BASE = "/api";

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Auth API
export async function fetchAuthStatus() {
  const res = await fetch(`${BASE}/auth/status`, {
    credentials: "same-origin",
  });
  return res.json();
}

export async function registerOwner(password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function login(password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function refreshToken() {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "same-origin",
  });
  return res.ok;
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    credentials: "same-origin",
  });
}

export async function fetchUser() {
  const status = await fetchAuthStatus();
  if (status.authenticated && status.user) return status.user;
  return null;
}

// Accounts
export async function getAccounts() {
  return request(`${BASE}/accounts`);
}
export async function createAccount(data) {
  return request(`${BASE}/accounts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function updateAccount(id, data) {
  return request(`${BASE}/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export async function deleteAccount(id) {
  return request(`${BASE}/accounts/${id}`, { method: "DELETE" });
}

// Fixed payments
export async function getFixedPayments() {
  return request(`${BASE}/fixed-payments`);
}
export async function createFixedPayment(data) {
  return request(`${BASE}/fixed-payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function updateFixedPayment(id, data) {
  return request(`${BASE}/fixed-payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export async function deleteFixedPayment(id) {
  return request(`${BASE}/fixed-payments/${id}`, { method: "DELETE" });
}

// Credit cards
export async function getCreditCards() {
  return request(`${BASE}/credit-cards`);
}
export async function createCreditCard(data) {
  return request(`${BASE}/credit-cards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function updateCreditCard(id, data) {
  return request(`${BASE}/credit-cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
export async function deleteCreditCard(id) {
  return request(`${BASE}/credit-cards/${id}`, { method: "DELETE" });
}

// Monthly records
export async function getMonthlyRecords(yearMonth) {
  return request(`${BASE}/monthly/${yearMonth}`);
}
export async function saveMonthlyRecords(yearMonth, data) {
  return request(`${BASE}/monthly/${yearMonth}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
