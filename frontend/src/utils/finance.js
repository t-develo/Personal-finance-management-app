/**
 * 家計管理アプリ共通ユーティリティ関数
 */

/** 金額を日本円表記にフォーマットする */
export function fmt(n) {
  return "¥" + Number(n || 0).toLocaleString("ja-JP");
}

/** "YYYY-MM" 文字列を "YYYY年M月" 形式に変換する */
export function formatYearMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

/** "YYYY-MM" 文字列を delta ヶ月ずらして返す */
export function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "1,6,12" 形式のボーナス月文字列を数値配列に変換する */
export function parseBonusMonths(str) {
  if (!str) return [];
  return str
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 12);
}
