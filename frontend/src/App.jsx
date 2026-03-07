import React, { useState, useEffect, useCallback } from "react";
import { fetchUser } from "./api/client";
import { useFinanceData } from "./hooks/useFinanceData";
import { ToastProvider } from "./hooks/useToast";
import Dashboard from "./components/Dashboard";
import AccountsTab from "./components/AccountsTab";
import FixedPaymentsTab from "./components/FixedPaymentsTab";
import CreditCardsTab from "./components/CreditCardsTab";
import MonthlyTab from "./components/MonthlyTab";
import { formatYearMonth, shiftMonth } from "./utils/finance";

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

/* ─────────────────────────────────────────────
   Layout CSS
   ───────────────────────────────────────────── */
const layoutCSS = `
  /* === Desktop (default) === */
  .app-layout {
    display: flex;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }

  .app-sidebar {
    width: 240px;
    min-width: 240px;
    background: #161b24;
    border-right: 1px solid #1e2530;
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
  }

  .mobile-header {
    display: none;
  }

  .sidebar-overlay {
    display: none;
  }

  .app-main {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    min-width: 0;
  }

  /* === Mobile (<= 768px) === */
  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
    }

    .app-sidebar {
      display: none;
    }

    .app-sidebar.open {
      display: flex;
      position: fixed;
      z-index: 100;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      min-width: 280px;
    }

    .sidebar-overlay.visible {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 90;
    }

    .mobile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b24;
      border-bottom: 1px solid #1e2530;
      flex-shrink: 0;
    }

    .app-main {
      padding: 16px;
      flex: 1;
      min-height: 0;
    }
  }

  .skip-link {
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
    z-index: 9999;
  }
  .skip-link:focus {
    position: fixed;
    top: 8px;
    left: 8px;
    width: auto;
    height: auto;
    padding: 8px 16px;
    background: #4f8cff;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    text-decoration: none;
  }

  @keyframes toast-slide-in {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

/* ─────────────────────────────────────
   Decorative inline styles
   ───────────────────────────────────── */
const styles = {
  sidebarHeader: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #1e2530",
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e4e8ef",
    letterSpacing: "0.5px",
    margin: 0,
  },
  nav: {
    flex: 1,
    padding: "8px 0",
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    minHeight: 44,
    cursor: "pointer",
    background: active ? "#1e2530" : "transparent",
    color: active ? "#fff" : "#8b95a5",
    borderLeft: active ? "3px solid #4f8cff" : "3px solid transparent",
    borderRight: "none",
    borderTop: "none",
    borderBottom: "none",
    fontSize: 14,
    fontWeight: active ? 500 : 400,
    transition: "all 0.15s",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  }),
  monthSelector: {
    padding: "16px",
    borderTop: "1px solid #1e2530",
  },
  monthLabel: {
    fontSize: 13,
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
    fontSize: 16,
    borderRadius: 4,
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 13,
  },
  hamburger: {
    background: "none",
    border: "none",
    color: "#e4e8ef",
    fontSize: 24,
    cursor: "pointer",
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

function AppContent() {
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
        <h1 style={styles.appTitle}>家計管理</h1>
      </div>
      <nav style={styles.nav} aria-label="メインナビゲーション">
        {TABS.map((t) => (
          <button
            key={t.id}
            style={styles.navItem(tab === t.id)}
            onClick={() => selectTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div style={styles.monthSelector}>
        <div style={styles.monthLabel}>対象月</div>
        <div style={styles.monthControls}>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth((ym) => shiftMonth(ym, -1))}
            aria-label="前月"
          >
            ◀
          </button>
          <span style={styles.monthText}>{formatYearMonth(yearMonth)}</span>
          <button
            style={styles.monthBtn}
            onClick={() => setYearMonth((ym) => shiftMonth(ym, 1))}
            aria-label="翌月"
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
      <style>{layoutCSS}</style>
      <a href="#main-content" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <div className="app-layout">
        {/* Mobile header */}
        <header className="mobile-header">
          <button
            style={styles.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>家計管理</span>
          <span style={{ fontSize: 13, color: "#6b7585" }}>
            {formatYearMonth(yearMonth)}
          </span>
        </header>

        {/* Sidebar overlay (mobile only) */}
        <div
          className={`sidebar-overlay${menuOpen ? " visible" : ""}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Sidebar */}
        <aside id="app-sidebar" className={`app-sidebar${menuOpen ? " open" : ""}`}>
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main id="main-content" className="app-main">
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

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
