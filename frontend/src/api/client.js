const BASE = "/api";

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = "/.auth/login/github";
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// User
export async function fetchUser() {
  const res = await fetch("/.auth/me");
  const data = await res.json();
  return data.clientPrincipal;
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
