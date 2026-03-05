import React, { useEffect, useRef } from "react";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  modal: {
    background: "#161b24",
    border: "1px solid #1e2530",
    borderRadius: 12,
    width: "100%",
    maxWidth: 440,
    maxHeight: "90vh",
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1e2530",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#e4e8ef",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#6b7585",
    fontSize: 20,
    cursor: "pointer",
    borderRadius: 4,
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 20,
  },
  footer: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    padding: "12px 20px",
    borderTop: "1px solid #1e2530",
  },
  btnPrimary: {
    background: "#4f8cff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    minHeight: 44,
  },
  btnSecondary: {
    background: "#1e2530",
    color: "#8b95a5",
    border: "1px solid #2a3040",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    cursor: "pointer",
    minHeight: 44,
  },
};

export default function Modal({ title, onClose, onSubmit, submitLabel, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = modal.querySelectorAll(focusableSelector);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    const trapHandler = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener("keydown", trapHandler);
    return () => modal.removeEventListener("keydown", trapHandler);
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div style={styles.header}>
          <span id="modal-title" style={styles.title}>{title}</span>
          <button style={styles.closeBtn} onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div style={styles.body}>{children}</div>
          <div style={styles.footer}>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" style={styles.btnPrimary}>
              {submitLabel || "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
