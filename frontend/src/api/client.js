import { isDemoMode } from "../demo/demoMode";
import {
  sampleAccounts,
  sampleFixedPayments,
  sampleCreditCards,
  buildSampleMonthly,
  saveSampleMonthly,
  nextId,
} from "../demo/sampleData";

const BASE = "/api";
const DEMO = isDemoMode();

const clone = (v) => JSON.parse(JSON.stringify(v));
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 80));

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
  if (DEMO) {
    return delay({ userDetails: "demo@example.com", userId: "demo-user", identityProvider: "demo" });
  }
  const res = await fetch("/.auth/me");
  const data = await res.json();
  return data.clientPrincipal;
}

// Accounts
export async function getAccounts() {
  if (DEMO) return delay(clone(sampleAccounts));
  return request(`${BASE}/accounts`);
}
export async function createAccount(data) {
  if (DEMO) {
    const created = { id: nextId("a"), name: data.name, balance: data.balance || 0 };
    sampleAccounts.push(created);
    return delay(clone(created));
  }
  return request(`${BASE}/accounts`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateAccount(id, data) {
  if (DEMO) {
    const idx = sampleAccounts.findIndex((a) => a.id === id);
    if (idx >= 0) sampleAccounts[idx] = { ...sampleAccounts[idx], ...data, id };
    return delay(clone(sampleAccounts[idx] || { id, ...data }));
  }
  return request(`${BASE}/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteAccount(id) {
  if (DEMO) {
    const idx = sampleAccounts.findIndex((a) => a.id === id);
    if (idx >= 0) sampleAccounts.splice(idx, 1);
    sampleFixedPayments.forEach((fp) => {
      if (fp.accountId === id) fp.accountId = "";
    });
    return delay(null);
  }
  return request(`${BASE}/accounts/${id}`, { method: "DELETE" });
}

// Fixed payments
export async function getFixedPayments() {
  if (DEMO) return delay(clone(sampleFixedPayments));
  return request(`${BASE}/fixed-payments`);
}
export async function createFixedPayment(data) {
  if (DEMO) {
    const created = {
      id: nextId("f"),
      name: data.name,
      amount: data.amount || 0,
      accountId: data.accountId || "",
      bonusMonths: data.bonusMonths || "",
      bonusAmount: data.bonusAmount || 0,
    };
    sampleFixedPayments.push(created);
    return delay(clone(created));
  }
  return request(`${BASE}/fixed-payments`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateFixedPayment(id, data) {
  if (DEMO) {
    const idx = sampleFixedPayments.findIndex((f) => f.id === id);
    if (idx >= 0) sampleFixedPayments[idx] = { ...sampleFixedPayments[idx], ...data, id };
    return delay(clone(sampleFixedPayments[idx] || { id, ...data }));
  }
  return request(`${BASE}/fixed-payments/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteFixedPayment(id) {
  if (DEMO) {
    const idx = sampleFixedPayments.findIndex((f) => f.id === id);
    if (idx >= 0) sampleFixedPayments.splice(idx, 1);
    return delay(null);
  }
  return request(`${BASE}/fixed-payments/${id}`, { method: "DELETE" });
}

// Credit cards
export async function getCreditCards() {
  if (DEMO) return delay(clone(sampleCreditCards));
  return request(`${BASE}/credit-cards`);
}
export async function createCreditCard(data) {
  if (DEMO) {
    const created = { id: nextId("c"), name: data.name, accountId: data.accountId || "" };
    sampleCreditCards.push(created);
    return delay(clone(created));
  }
  return request(`${BASE}/credit-cards`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateCreditCard(id, data) {
  if (DEMO) {
    const idx = sampleCreditCards.findIndex((c) => c.id === id);
    if (idx >= 0) sampleCreditCards[idx] = { ...sampleCreditCards[idx], ...data, id };
    return delay(clone(sampleCreditCards[idx] || { id, ...data }));
  }
  return request(`${BASE}/credit-cards/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteCreditCard(id) {
  if (DEMO) {
    const idx = sampleCreditCards.findIndex((c) => c.id === id);
    if (idx >= 0) sampleCreditCards.splice(idx, 1);
    return delay(null);
  }
  return request(`${BASE}/credit-cards/${id}`, { method: "DELETE" });
}

// Monthly records
export async function getMonthlyRecords(yearMonth) {
  if (DEMO) return delay(buildSampleMonthly(yearMonth));
  return request(`${BASE}/monthly/${yearMonth}`);
}
export async function saveMonthlyRecords(yearMonth, data) {
  if (DEMO) return delay(saveSampleMonthly(yearMonth, data));
  return request(`${BASE}/monthly/${yearMonth}`, { method: "PUT", body: JSON.stringify(data) });
}
