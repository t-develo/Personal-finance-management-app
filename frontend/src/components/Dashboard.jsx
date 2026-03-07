import React from "react";
import { fmt, parseBonusMonths } from "../utils/finance";

const dashboardCSS = `
  .summary-grid {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .summary-grid > .summary-card {
    flex: 1 1 200px;
    min-width: 180px;
    border-radius: 12px;
    padding: 20px 24px;
  }
  .dash-section {
    background: #161b24;
    border: 1px solid #1e2530;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .table-scroll table {
    min-width: 420px;
  }
  @media (max-width: 768px) {
    .summary-grid > .summary-card {
      flex: 1 1 100%;
      min-width: 0;
    }
    .dash-section {
      padding: 16px;
    }
    .table-scroll table {
      min-width: 340px;
    }
  }
`;

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #1e2530",
  color: "#6b7585",
  fontWeight: 500,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const thRight = { ...thStyle, textAlign: "right" };

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #1e2530",
  color: "#e4e8ef",
};

const tdMono = {
  ...tdStyle,
  fontFamily: "'DM Mono', monospace",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const totalRow = {
  fontWeight: 700,
};

const sectionTitle = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 12,
  color: "#e4e8ef",
};

export default function Dashboard({ data, yearMonth }) {
  const { accounts, fixedPayments, creditCards, monthlyRecords, loading } = data;

  if (loading) {
    return <div style={{ color: "#6b7585", padding: 40 }}>読み込み中...</div>;
  }

  const currentMonth = parseInt(yearMonth.split("-")[1]);

  // Compute account balances: use monthly record if available, else fallback to master
  const accountBalanceMap = {};
  accounts.forEach((acc) => {
    accountBalanceMap[acc.id] =
      monthlyRecords.accountBalances[acc.id] != null
        ? monthlyRecords.accountBalances[acc.id]
        : acc.balance;
  });

  const totalBalance = Object.values(accountBalanceMap).reduce(
    (s, v) => s + (v || 0),
    0
  );

  // Fixed payment deductions by account (including bonus amounts for bonus months)
  const deductionByAccount = {};
  let totalFixed = 0;
  fixedPayments.forEach((fp) => {
    const bonusMonthsList = parseBonusMonths(fp.bonusMonths);
    const isBonus = bonusMonthsList.includes(currentMonth);
    const amount = (fp.amount || 0) + (isBonus ? (fp.bonusAmount || 0) : 0);

    totalFixed += amount;
    if (fp.accountId) {
      deductionByAccount[fp.accountId] =
        (deductionByAccount[fp.accountId] || 0) + amount;
    }
  });

  // Card payments
  const cardPaymentMap = {};
  creditCards.forEach((cc) => {
    cardPaymentMap[cc.id] = monthlyRecords.cardPayments[cc.id] || 0;
  });
  const totalCards = Object.values(cardPaymentMap).reduce(
    (s, v) => s + (v || 0),
    0
  );

  // Add card payment deductions to accounts via card's accountId
  creditCards.forEach((cc) => {
    if (cc.accountId) {
      deductionByAccount[cc.accountId] =
        (deductionByAccount[cc.accountId] || 0) + (cardPaymentMap[cc.id] || 0);
    }
  });

  const totalExpenses = totalFixed + totalCards;
  const netBalance = totalBalance - totalExpenses;

  return (
    <div>
      <style>{dashboardCSS}</style>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        ダッシュボード
      </h2>

      {/* Summary cards */}
      <div className="summary-grid">
        <div
          className="summary-card"
          style={{ background: "linear-gradient(135deg, #1a2744, #1e3a5f)" }}
        >
          <div style={{ fontSize: 12, color: "#8badd9", marginBottom: 4 }}>
            総残高
          </div>
          <div
            className="mono"
            style={{ fontSize: 24, fontWeight: 500, color: "#fff" }}
          >
            {fmt(totalBalance)}
          </div>
        </div>
        <div
          className="summary-card"
          style={{ background: "linear-gradient(135deg, #3a1a35, #5f1e4a)" }}
        >
          <div style={{ fontSize: 12, color: "#d98bba", marginBottom: 4 }}>
            総支出予定
          </div>
          <div
            className="mono"
            style={{ fontSize: 24, fontWeight: 500, color: "#fff" }}
          >
            {fmt(totalExpenses)}
          </div>
        </div>
        <div
          className="summary-card"
          style={{
            background:
              netBalance >= 0
                ? "linear-gradient(135deg, #1a3a24, #1e5f3a)"
                : "linear-gradient(135deg, #3a1a1a, #5f1e1e)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: netBalance >= 0 ? "#8bd9a0" : "#d98b8b",
              marginBottom: 4,
            }}
          >
            差引残高
          </div>
          <div
            className="mono"
            style={{ fontSize: 24, fontWeight: 500, color: "#fff" }}
          >
            {fmt(netBalance)}
          </div>
        </div>
      </div>

      {/* Account summary table */}
      <div className="dash-section">
        <h3 style={sectionTitle}>口座別サマリー</h3>
        {accounts.length === 0 ? (
          <div style={{ color: "#6b7585", padding: 16, fontSize: 14 }}>
            口座が登録されていません
          </div>
        ) : (
          <div className="table-scroll">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>口座名</th>
                  <th style={thRight}>残高</th>
                  <th style={thRight}>引落予定</th>
                  <th style={thRight}>差引</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const bal = accountBalanceMap[acc.id] || 0;
                  const ded = deductionByAccount[acc.id] || 0;
                  return (
                    <tr key={acc.id}>
                      <td style={tdStyle}>{acc.name}</td>
                      <td style={tdMono}>{fmt(bal)}</td>
                      <td style={tdMono}>{fmt(ded)}</td>
                      <td
                        style={{
                          ...tdMono,
                          color: bal - ded >= 0 ? "#6ee7a0" : "#f87171",
                        }}
                      >
                        {fmt(bal - ded)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fixed payments table */}
      <div className="dash-section">
        <h3 style={sectionTitle}>固定支払い</h3>
        {fixedPayments.length === 0 ? (
          <div style={{ color: "#6b7585", padding: 16, fontSize: 14 }}>
            固定支払いが登録されていません
          </div>
        ) : (
          <div className="table-scroll">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>項目名</th>
                  <th style={thStyle}>引落口座</th>
                  <th style={thRight}>金額</th>
                </tr>
              </thead>
              <tbody>
                {fixedPayments.map((fp) => {
                  const accName =
                    accounts.find((a) => a.id === fp.accountId)?.name || "未設定";
                  const bonusMonthsList = parseBonusMonths(fp.bonusMonths);
                  const isBonus = bonusMonthsList.includes(currentMonth);
                  const totalAmount =
                    (fp.amount || 0) + (isBonus ? fp.bonusAmount || 0 : 0);
                  return (
                    <tr key={fp.id}>
                      <td style={tdStyle}>
                        {fp.name}
                        {isBonus && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              background: "#2a2010",
                              color: "#f0c060",
                              border: "1px solid #4a3820",
                              borderRadius: 4,
                              padding: "1px 6px",
                            }}
                          >
                            ボーナス月
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{accName}</td>
                      <td style={tdMono}>
                        {fmt(totalAmount)}
                        {isBonus && fp.bonusAmount > 0 && (
                          <div style={{ fontSize: 11, color: "#f0c060" }}>
                            {fmt(fp.amount)} + {fmt(fp.bonusAmount)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr style={totalRow}>
                  <td style={tdStyle} colSpan={2}>
                    合計
                  </td>
                  <td style={tdMono}>{fmt(totalFixed)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit card payments table */}
      <div className="dash-section">
        <h3 style={sectionTitle}>クレジットカード支払い</h3>
        {creditCards.length === 0 ? (
          <div style={{ color: "#6b7585", padding: 16, fontSize: 14 }}>
            クレジットカードが登録されていません
          </div>
        ) : (
          <div className="table-scroll">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>カード名</th>
                  <th style={thStyle}>引落口座</th>
                  <th style={thRight}>今月の支払額</th>
                </tr>
              </thead>
              <tbody>
                {creditCards.map((cc) => {
                  const accName =
                    accounts.find((a) => a.id === cc.accountId)?.name || "未設定";
                  return (
                    <tr key={cc.id}>
                      <td style={tdStyle}>{cc.name}</td>
                      <td style={tdStyle}>{accName}</td>
                      <td style={tdMono}>{fmt(cardPaymentMap[cc.id])}</td>
                    </tr>
                  );
                })}
                <tr style={totalRow}>
                  <td style={tdStyle} colSpan={2}>
                    合計
                  </td>
                  <td style={tdMono}>{fmt(totalCards)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
