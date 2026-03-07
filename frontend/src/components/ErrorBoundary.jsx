import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] 未処理エラー:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: 16,
            color: "#e4e8ef",
            background: "#0f1218",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            予期しないエラーが発生しました
          </h1>
          <p style={{ color: "#6b7585", fontSize: 14, margin: 0 }}>
            ページを再読み込みしてください。問題が続く場合はサポートにお問い合わせください。
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 24px",
              background: "#4f8cff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
