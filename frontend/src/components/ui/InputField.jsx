import React, { useId } from "react";

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
  input: {
    width: "100%",
    padding: "10px 12px",
    background: "#0f1218",
    border: "1px solid #2a3040",
    borderRadius: 8,
    color: "#e4e8ef",
    fontSize: 14,
    outline: "none",
  },
};

export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  step,
}) {
  const id = useId();
  return (
    <div style={styles.wrapper}>
      <label htmlFor={id} style={styles.label}>{label}</label>
      <input
        id={id}
        style={styles.input}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
      />
    </div>
  );
}
