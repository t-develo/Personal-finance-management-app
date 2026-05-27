export const sampleAccounts = [
  { id: "a1", name: "三井住友銀行", balance: 1250000 },
  { id: "a2", name: "楽天銀行", balance: 480000 },
  { id: "a3", name: "ゆうちょ銀行", balance: 320000 },
];

export const sampleFixedPayments = [
  { id: "f1", name: "家賃", amount: 95000, accountId: "a1", bonusMonths: "", bonusAmount: 0 },
  { id: "f2", name: "電気", amount: 8200, accountId: "a1", bonusMonths: "", bonusAmount: 0 },
  { id: "f3", name: "ガス", amount: 4300, accountId: "a1", bonusMonths: "", bonusAmount: 0 },
  { id: "f4", name: "水道", amount: 3100, accountId: "a1", bonusMonths: "6,12", bonusAmount: 3100 },
  { id: "f5", name: "Netflix", amount: 1490, accountId: "a2", bonusMonths: "", bonusAmount: 0 },
  { id: "f6", name: "Spotify", amount: 980, accountId: "a2", bonusMonths: "", bonusAmount: 0 },
  { id: "f7", name: "楽天モバイル", amount: 3278, accountId: "a2", bonusMonths: "", bonusAmount: 0 },
  { id: "f8", name: "国民年金", amount: 16980, accountId: "a1", bonusMonths: "", bonusAmount: 0 },
  { id: "f9", name: "生命保険", amount: 8500, accountId: "a1", bonusMonths: "", bonusAmount: 0 },
];

export const sampleCreditCards = [
  { id: "c1", name: "楽天カード", accountId: "a2" },
  { id: "c2", name: "三井住友カード(NL)", accountId: "a1" },
  { id: "c3", name: "JCB CARD W", accountId: "a1" },
];

const DEFAULT_BALANCES = { a1: 1250000, a2: 480000, a3: 320000 };
const DEFAULT_CARDS = { c1: 62400, c2: 48500, c3: 23100 };

const monthlyOverrides = {};

export function buildSampleMonthly(yearMonth) {
  if (monthlyOverrides[yearMonth]) {
    return JSON.parse(JSON.stringify(monthlyOverrides[yearMonth]));
  }
  return {
    accountBalances: { ...DEFAULT_BALANCES },
    cardPayments: { ...DEFAULT_CARDS },
  };
}

export function saveSampleMonthly(yearMonth, data) {
  monthlyOverrides[yearMonth] = JSON.parse(JSON.stringify(data));
  return buildSampleMonthly(yearMonth);
}

let idCounter = 100;
export function nextId(prefix) {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}
