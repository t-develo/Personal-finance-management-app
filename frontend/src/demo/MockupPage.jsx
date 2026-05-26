import React, { useState } from "react";
import { useFinanceData } from "../hooks/useFinanceData";
import Dashboard from "../components/Dashboard";
import AccountsTab from "../components/AccountsTab";
import FixedPaymentsTab from "../components/FixedPaymentsTab";
import CreditCardsTab from "../components/CreditCardsTab";
import MonthlyTab from "../components/MonthlyTab";

const SECTIONS = [
  { num: "1", label: "ダッシュボード", icon: "📊", key: "dashboard" },
  { num: "2", label: "口座管理", icon: "🏦", key: "accounts" },
  { num: "3", label: "固定支払い", icon: "📋", key: "fixed" },
  { num: "4", label: "クレジットカード", icon: "💳", key: "cards" },
  { num: "5", label: "月次記録", icon: "📅", key: "monthly" },
];

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const css = `
  .mockup-root {
    background: #0f1218;
    color: #e4e8ef;
    min-height: 100vh;
    font-family: 'Noto Sans JP', -apple-system, sans-serif;
    padding: 32px 24px 64px;
  }
  .mockup-hero {
    max-width: 1100px;
    margin: 0 auto 32px;
    padding: 28px 32px;
    background: linear-gradient(135deg, #1a2744, #1e3a5f 55%, #3a1a35);
    border: 1px solid #1e2530;
    border-radius: 16px;
  }
  .mockup-hero h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .mockup-hero .sub {
    color: #c5d6ee;
    font-size: 14px;
    margin: 0;
  }
  .mockup-hero .meta {
    margin-top: 16px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #8badd9;
  }
  .mockup-hero .meta span {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 4px 10px;
    border-radius: 6px;
  }
  .mockup-section {
    max-width: 1100px;
    margin: 0 auto 28px;
  }
  .mockup-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: #1e2530;
    border: 1px solid #2a3040;
    border-radius: 12px 12px 0 0;
    border-bottom: none;
  }
  .mockup-section-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #4f8cff;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
  }
  .mockup-section-label {
    font-size: 16px;
    font-weight: 700;
    color: #e4e8ef;
  }
  .mockup-section-icon {
    font-size: 18px;
  }
  .mockup-section-body {
    background: #0f1218;
    border: 1px solid #2a3040;
    border-top: none;
    border-radius: 0 0 12px 12px;
    padding: 24px;
  }
`;

export default function MockupPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const data = useFinanceData(yearMonth);

  if (data.loading) {
    return (
      <div style={{ background: "#0f1218", color: "#8b95a5", minHeight: "100vh", padding: 40 }}>
        サンプルデータ読み込み中...
      </div>
    );
  }

  const renderTab = (key) => {
    switch (key) {
      case "dashboard":
        return <Dashboard data={data} yearMonth={yearMonth} />;
      case "accounts":
        return <AccountsTab data={data} />;
      case "fixed":
        return <FixedPaymentsTab data={data} />;
      case "cards":
        return <CreditCardsTab data={data} />;
      case "monthly":
        return <MonthlyTab data={data} yearMonth={yearMonth} setYearMonth={setYearMonth} />;
      default:
        return null;
    }
  };

  return (
    <div className="mockup-root">
      <style>{css}</style>
      <div className="mockup-hero">
        <h1>家計管理アプリ — プロダクト全体像</h1>
        <p className="sub">
          1ページに全5画面を縦に並べたショーケース。バックエンド不要、サンプルデータで描画されています。
        </p>
        <div className="meta">
          <span>📊 Dashboard</span>
          <span>🏦 口座</span>
          <span>📋 固定支払い</span>
          <span>💳 カード</span>
          <span>📅 月次記録</span>
          <span>🗓 対象月: {yearMonth}</span>
        </div>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.key} className="mockup-section">
          <div className="mockup-section-header">
            <div className="mockup-section-num">{s.num}</div>
            <span className="mockup-section-icon" aria-hidden="true">
              {s.icon}
            </span>
            <span className="mockup-section-label">{s.label}</span>
          </div>
          <div className="mockup-section-body">{renderTab(s.key)}</div>
        </section>
      ))}
    </div>
  );
}
