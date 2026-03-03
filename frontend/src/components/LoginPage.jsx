import React, { useState } from "react";
import { registerOwner, login } from "../api/client";

const pageStyles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#0f1218",
    padding: 16,
  },
  card: {
    background: "#161b24",
    borderRadius: 12,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 400,
    border: "1px solid #1e2530",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#e4e8ef",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7585",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#8b95a5",
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f1218",
    border: "1px solid #2a3040",
    borderRadius: 8,
    color: "#e4e8ef",
    fontSize: 14,
    outline: "none",
    marginBottom: 16,
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px 0",
    background: "#4f8cff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  error: {
    color: "#ff6b6b",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
};

export default function LoginPage({ isRegistration, onSuccess }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegistration && password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上必要です");
      return;
    }

    setLoading(true);
    try {
      if (isRegistration) {
        const result = await registerOwner(password);
        onSuccess(result.user);
      } else {
        const result = await login(password);
        onSuccess(result.user);
      }
    } catch (err) {
      setError(err.message || "認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyles.wrapper}>
      <form style={pageStyles.card} onSubmit={handleSubmit}>
        <div style={pageStyles.title}>家計管理</div>
        <div style={pageStyles.subtitle}>
          {isRegistration
            ? "初回セットアップ: パスワードを設定してください"
            : "パスワードを入力してログイン"}
        </div>

        {error && <div style={pageStyles.error}>{error}</div>}

        <label style={pageStyles.label}>パスワード</label>
        <input
          style={pageStyles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8文字以上"
          autoFocus
          required
          minLength={8}
        />

        {isRegistration && (
          <>
            <label style={pageStyles.label}>パスワード確認</label>
            <input
              style={pageStyles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              required
              minLength={8}
            />
          </>
        )}

        <button
          type="submit"
          style={{
            ...pageStyles.button,
            ...(loading ? pageStyles.buttonDisabled : {}),
          }}
          disabled={loading}
        >
          {loading
            ? "処理中..."
            : isRegistration
              ? "パスワードを設定"
              : "ログイン"}
        </button>
      </form>
    </div>
  );
}
