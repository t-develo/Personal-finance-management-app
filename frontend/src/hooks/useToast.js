import { createContext, useContext, useReducer, useCallback, useRef } from "react";
import React from "react";

const ToastContext = createContext(null);

let nextId = 0;

function toastReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const timersRef = useRef({});

  const showToast = useCallback(({ type = "success", message }) => {
    const id = ++nextId;
    dispatch({ type: "ADD", toast: { id, toastType: type, message } });
    const duration = type === "success" ? 3000 : 5000;
    timersRef.current[id] = setTimeout(() => {
      dispatch({ type: "REMOVE", id });
      delete timersRef.current[id];
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: "REMOVE", id });
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  return React.createElement(
    ToastContext.Provider,
    { value: showToast },
    children,
    React.createElement(ToastContainer, { toasts, removeToast })
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  const colors = {
    success: { bg: "#122a1e", border: "#6ee7a0", text: "#6ee7a0" },
    error: { bg: "#2a1218", border: "#f87171", text: "#f87171" },
    warning: { bg: "#2a2412", border: "#f0c060", text: "#f0c060" },
  };

  return React.createElement(
    "div",
    {
      "aria-live": "polite",
      style: {
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 360,
      },
    },
    toasts.map((toast) => {
      const c = colors[toast.toastType] || colors.success;
      return React.createElement(
        "div",
        {
          key: toast.id,
          role: "alert",
          style: {
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            padding: "12px 16px",
            color: c.text,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            animation: "toast-slide-in 0.3s ease-out",
          },
        },
        React.createElement("span", null, toast.message),
        React.createElement(
          "button",
          {
            onClick: () => removeToast(toast.id),
            "aria-label": "閉じる",
            style: {
              background: "none",
              border: "none",
              color: c.text,
              cursor: "pointer",
              fontSize: 16,
              padding: 4,
              lineHeight: 1,
            },
          },
          "\u2715"
        )
      );
    })
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
