import React, { useState, useEffect, useRef, useCallback } from "react";

function fmt(n) {
  return "¥" + Number(n || 0).toLocaleString("ja-JP");
}

function formatYearMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
    flexWrap: "wrap",
  },
  title: { fontSize: 20, fontWeight: 700 },
  monthNav: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  monthBtn: {
    background: "#1e2530",
    border: "1px solid #2a3040",
    color: "#8b95a5",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 16,
    cursor: "pointer",
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: "#e4e8ef",
    minWidth: 100,
    textAlign: "center",
  },
  section: {
    background: "#161b24",
    border: "1px solid #1e2530",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 16,
    color: "#e4e8ef",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #1e2530",
    gap: 12,
    flexWrap: "wrap",
  },
  inputLabel: {
    fontSize: 14,
    color: "#e4e8ef",
    minWidth: 120,
  },
  input: {
    width: 180,
    padding: "8px 12px",
    background: "#0f1218",
    border: "1px solid #2a3040",
    borderRadius: 8,
    color: "#e4e8ef",
    fontSize: 14,
    fontFamily: "'DM Mono', monospace",
    textAlign: "right",
    outline: "none",
  },
  placeholder: {
    fontSize: 12,
    color: "#6b7585",
    marginTop: 2,
  },
  saved: {
    fontSize: 12,
    color: "#6ee7a0",
    marginLeft: 8,
    opacity: 0,
    transition: "opacity 0.3s",
  },
};

export default function MonthlyTab({ data, yearMonth, setYearMonth }) {
  const { accounts, creditCards, monthlyRecords, saveMonthly } = data;

  const [balances, setBalances] = useState({});
  const [cardAmounts, setCardAmounts] = useState({});
  const [savedIndicator, setSavedIndicator] = useState(null);
  const debounceRef = useRef(null);

  // Sync local state with loaded monthly records
  useEffect(() => {
    setBalances(monthlyRecords.accountBalances || {});
    setCardAmounts(monthlyRecords.cardPayments || {});
  }, [monthlyRecords]);

  const save = useCallback(
    (newBalances, newCards) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await saveMonthly({
          accountBalances: newBalances,
          cardPayments: newCards,
        });
        setSavedIndicator(Date.now());
        setTimeout(() => setSavedIndicator(null), 1500);
      }, 800);
    },
    [saveMonthly]
  );

  const handleBalanceChange = (accId, val) => {
    const num = val === "" ? undefined : parseFloat(val);
    const next = { ...balances };
    if (num == null || isNaN(num)) {
      delete next[accId];
    } else {
      next[accId] = num;
    }
    setBalances(next);
    save(next, cardAmounts);
  };

  const handleCardChange = (cardId, val) => {
    const num = val === "" ? undefined : parseFloat(val);
    const next = { ...cardAmounts };
    if (num == null || isNaN(num)) {
      delete next[cardId];
    } else {
      next[cardId] = num;
    }
    setCardAmounts(next);
    save(balances, next);
  };

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>月次記録</h2>
        <div style={styles.monthNav}>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth(shiftMonth(yearMonth, -1))}
          >
            ◀
          </button>
          <span style={styles.monthLabel}>{formatYearMonth(yearMonth)}</span>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth(shiftMonth(yearMonth, 1))}
          >
            ▶
          </button>
        </div>
      </div>

      {savedIndicator && (
        <div
          style={{
            fontSize: 13,
            color: "#6ee7a0",
            marginBottom: 12,
            textAlign: "right",
          }}
        >
          保存しました
        </div>
      )}

      {/* Account balances */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>口座残高</h3>
        {accounts.length === 0 ? (
          <div style={{ color: "#6b7585", fontSize: 14 }}>
            口座が登録されていません
          </div>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} style={styles.inputRow}>
              <div>
                <div style={styles.inputLabel}>{acc.name}</div>
                <div style={styles.placeholder}>
                  マスタ残高: {fmt(acc.balance)}
                </div>
              </div>
              <input
                style={styles.input}
                type="number"
                value={balances[acc.id] != null ? balances[acc.id] : ""}
                onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                placeholder={String(acc.balance || 0)}
                step="1"
              />
            </div>
          ))
        )}
      </div>

      {/* Card payments */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>カード支払額</h3>
        {creditCards.length === 0 ? (
          <div style={{ color: "#6b7585", fontSize: 14 }}>
            クレジットカードが登録されていません
          </div>
        ) : (
          creditCards.map((cc) => (
            <div key={cc.id} style={styles.inputRow}>
              <div style={styles.inputLabel}>{cc.name}</div>
              <input
                style={styles.input}
                type="number"
                value={cardAmounts[cc.id] != null ? cardAmounts[cc.id] : ""}
                onChange={(e) => handleCardChange(cc.id, e.target.value)}
                placeholder="0"
                step="1"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
