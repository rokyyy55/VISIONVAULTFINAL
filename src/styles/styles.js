export function makeStyles(theme) {
  const D = theme;

  const btn = (extra = {}) => ({
    padding: "11px 26px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Rajdhani', 'Sora', sans-serif",
    letterSpacing: 0.6,
    transition: "all 0.2s",
    ...extra,
  });

  const primaryBtn = {
    ...btn(),
    background: `linear-gradient(135deg, ${D.accent} 0%, ${D.accent2} 100%)`,
    color: "#fff",
    boxShadow: `0 0 24px ${D.accentGlow}`,
  };

  const ghostBtn = {
    ...btn(),
    background: D.glass,
    border: `1px solid ${D.glassBorder}`,
    color: D.text2,
    backdropFilter: "blur(8px)",
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1px solid ${D.border}`,
    background: D.inputBg,
    color: D.text,
    fontSize: 14,
    fontFamily: "'Sora', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    backdropFilter: "blur(8px)",
  };

  const glassCard = {
    background: D.cardBg,
    border: `1px solid ${D.glassBorder}`,
    borderRadius: 20,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  return { btn, primaryBtn, ghostBtn, inputStyle, glassCard };
}
