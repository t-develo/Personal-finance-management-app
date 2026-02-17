import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const globalStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    height: 100%;
  }

  body {
    font-family: 'Noto Sans JP', sans-serif;
    background: #0f1218;
    color: #e4e8ef;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  #root {
    height: 100%;
  }

  input, select, button, textarea {
    font-family: inherit;
  }

  .mono {
    font-family: 'DM Mono', monospace;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #0f1218;
  }
  ::-webkit-scrollbar-thumb {
    background: #2a3040;
    border-radius: 3px;
  }
`;

const styleEl = document.createElement("style");
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
