import React from "react";

const styles = {
  wrapper: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#8b95a5",
    marginBottom: 6,
    fontWeight: 500,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f1218",
    border: "1px solid #2a3040",
    borderRadius: 8,
    color: "#e4e8ef",
    fontSize: 14,
    outline: "none",
    appearance: "none",
  },
};

export default function SelectField({ label, value, onChange, options }) {
  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
