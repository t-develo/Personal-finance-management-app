import React from "react";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    color: "#6b7585",
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
  },
};

export default function EmptyState({ icon, message }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon || "📭"}</div>
      <div style={styles.message}>{message || "データがありません"}</div>
    </div>
  );
}
