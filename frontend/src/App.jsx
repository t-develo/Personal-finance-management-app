import React, { useState, useEffect, useCallback } from "react";
import { fetchUser } from "./api/client";
import { useFinanceData } from "./hooks/useFinanceData";
import Dashboard from "./components/Dashboard";
import AccountsTab from "./components/AccountsTab";
import FixedPaymentsTab from "./components/FixedPaymentsTab";
import CreditCardsTab from "./components/CreditCardsTab";
import MonthlyTab from "./components/MonthlyTab";

const TABS = [
  { id: "dashboard", label: "ダッシュボード", icon: "📊" },
  { id: "accounts", label: "口座", icon: "🏦" },
  { id: "fixed", label: "固定支払い", icon: "📋" },
  { id: "cards", label: "カード", icon: "💳" },
  { id: "monthly", label: "月次記録", icon: "📅" },
];

function getInitialYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatYearMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

const styles = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  sidebar: {
    width: 240,
    minWidth: 240,
    background: "#161b24",
    borderRight: "1px solid #1e2530",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflowY: "auto",
  },
  sidebarHeader: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #1e2530",
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e4e8ef",
    letterSpacing: "0.5px",
  },
  nav: {
    flex: 1,
    padding: "8px 0",
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    cursor: "pointer",
    background: active ? "#1e2530" : "transparent",
    color: active ? "#fff" : "#8b95a5",
    borderLeft: active ? "3px solid #4f8cff" : "3px solid transparent",
    fontSize: 14,
    fontWeight: active ? 500 : 400,
    transition: "all 0.15s",
  }),
  monthSelector: {
    padding: "16px",
    borderTop: "1px solid #1e2530",
  },
  monthLabel: {
    fontSize: 11,
    color: "#6b7585",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: "0.5px",
  },
  monthControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#0f1218",
    borderRadius: 8,
    padding: "6px 4px",
  },
  monthBtn: {
    background: "none",
    border: "none",
    color: "#8b95a5",
    cursor: "pointer",
    padding: "4px 8px",
    fontSize: 16,
    borderRadius: 4,
  },
  monthText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#e4e8ef",
  },
  userSection: {
    padding: "12px 16px",
    borderTop: "1px solid #1e2530",
    fontSize: 13,
    color: "#6b7585",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutLink: {
    color: "#4f8cff",
    textDecoration: "none",
    fontSize: 12,
  },
  main: {
    flex: 1,
    overflow: "auto",
    padding: "24px 32px",
  },
  mobileHeader: {
    display: "none",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#161b24",
    borderBottom: "1px solid #1e2530",
  },
  hamburger: {
    background: "none",
    border: "none",
    color: "#e4e8ef",
    fontSize: 24,
    cursor: "pointer",
    padding: 4,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 90,
  },
};

const responsiveCSS = `
  @media (max-width: 768px) {
    .app-sidebar { display: none !important; }
    .mobile-header { display: flex !important; }
    .app-sidebar.open { display: flex !important; position: fixed; z-index: 100; top: 0; left: 0; bottom: 0; }
    .app-main { padding: 16px !important; }
  }
`;

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [yearMonth, setYearMonth] = useState(getInitialYearMonth);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const data = useFinanceData(yearMonth);

  useEffect(() => {
    fetchUser().then(setUser).catch(() => {});
  }, []);

  const selectTab = useCallback((id) => {
    setTab(id);
    setMenuOpen(false);
  }, []);

  const sidebarContent = (
    <>
      <div style={styles.sidebarHeader}>
        <div style={styles.appTitle}>家計管理</div>
      </div>
      <nav style={styles.nav}>
        {TABS.map((t) => (
          <div
            key={t.id}
            style={styles.navItem(tab === t.id)}
            onClick={() => selectTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </nav>
      <div style={styles.monthSelector}>
        <div style={styles.monthLabel}>対象月</div>
        <div style={styles.monthControls}>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth((ym) => shiftMonth(ym, -1))}
          >
            ◀
          </button>
          <span style={styles.monthText}>{formatYearMonth(yearMonth)}</span>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth((ym) => shiftMonth(ym, 1))}
          >
            ▶
          </button>
        </div>
      </div>
      {user && (
        <div style={styles.userSection}>
          <span>{user.userDetails}</span>
          <a href="/.auth/logout" style={styles.logoutLink}>
            ログアウト
          </a>
        </div>
      )}
    </>
  );

  return (
    <>
      <style>{responsiveCSS}</style>
      <div style={styles.layout}>
        {/* Mobile header */}
        <div className="mobile-header" style={styles.mobileHeader}>
          <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
          <span style={{ fontWeight: 700 }}>家計管理</span>
          <span style={{ fontSize: 13, color: "#6b7585" }}>
            {formatYearMonth(yearMonth)}
          </span>
        </div>

        {/* Overlay */}
        {menuOpen && (
          <div style={styles.overlay} onClick={() => setMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`app-sidebar${menuOpen ? " open" : ""}`}
          style={styles.sidebar}
        >
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="app-main" style={styles.main}>
          {tab === "dashboard" && <Dashboard data={data} yearMonth={yearMonth} />}
          {tab === "accounts" && <AccountsTab data={data} />}
          {tab === "fixed" && <FixedPaymentsTab data={data} />}
          {tab === "cards" && <CreditCardsTab data={data} />}
          {tab === "monthly" && (
            <MonthlyTab
              data={data}
              yearMonth={yearMonth}
              setYearMonth={setYearMonth}
            />
          )}
        </main>
      </div>
    </>
  );
}
