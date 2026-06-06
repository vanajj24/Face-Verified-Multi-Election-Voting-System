import React from "react";

export default function LoadingAnimation({ message = "Loading..." }) {
  return (
    <div style={overlay}>
      <div style={spinnerContainer}>
        <div style={spinner}></div>
        <p style={loadingText}>{message}</p>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  backdropFilter: "blur(2px)",
};

const spinnerContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "20px",
};

const spinner = {
  width: "50px",
  height: "50px",
  border: "4px solid rgba(255, 255, 255, 0.3)",
  borderTop: "4px solid #fff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const loadingText = {
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  margin: 0,
  textAlign: "center",
};

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
