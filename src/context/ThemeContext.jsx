import { createContext, useContext, useState, useEffect } from "react";

export const ThemeContext = createContext(null);

export const dark = {
  mode: "dark",
  bg:        "#04081a",
  bg2:       "#070d20",
  bg3:       "#0b1428",
  surface:   "rgba(255,255,255,0.04)",
  surface2:  "rgba(255,255,255,0.07)",
  glass:     "rgba(10,20,60,0.55)",
  glassBorder:"rgba(99,179,237,0.18)",
  border:    "rgba(99,179,237,0.20)",
  border2:   "rgba(139,92,246,0.35)",
  text:      "#e2e8f0",
  text2:     "#94a3b8",
  text3:     "#475569",
  accent:    "#7c3aed",
  accent2:   "#06b6d4",
  accentGlow:"rgba(124,58,237,0.35)",
  cardBg:    "rgba(8,18,50,0.7)",
  inputBg:   "rgba(255,255,255,0.06)",
  bubbles: [
    { x:8,  y:15, r:220, color:"#4f46e5", op:0.25 },
    { x:88, y:8,  r:160, color:"#06b6d4", op:0.20 },
    { x:50, y:85, r:240, color:"#7c3aed", op:0.18 },
    { x:15, y:75, r:140, color:"#0ea5e9", op:0.15 },
    { x:78, y:58, r:180, color:"#a78bfa", op:0.14 },
    { x:35, y:40, r:130, color:"#2563eb", op:0.12 },
  ],
};

export const light = {
  mode: "light",
  bg:        "#d4eaf7",
  bg2:       "#c8e3f5",
  bg3:       "#b8d9f2",
  surface:   "rgba(255,255,255,0.65)",
  surface2:  "rgba(255,255,255,0.45)",
  glass:     "rgba(255,255,255,0.55)",
  glassBorder:"rgba(255,255,255,0.85)",
  border:    "rgba(0,140,210,0.25)",
  border2:   "rgba(0,180,255,0.4)",
  text:      "#0a2540",
  text2:     "#1e5a8e",
  text3:     "#5b8fb9",
  accent:    "#0077cc",
  accent2:   "#00b4d8",
  accentGlow:"rgba(0,119,204,0.2)",
  cardBg:    "rgba(255,255,255,0.60)",
  inputBg:   "rgba(255,255,255,0.75)",
  bubbles: [
    { x:10, y:5,  r:300, color:"#ffffff", op:0.55 },
    { x:85, y:12, r:200, color:"#a8d8f0", op:0.60 },
    { x:50, y:80, r:280, color:"#c2e9fb", op:0.50 },
    { x:20, y:65, r:180, color:"#90caf9", op:0.45 },
    { x:75, y:50, r:220, color:"#b3e5fc", op:0.40 },
    { x:40, y:35, r:160, color:"#e1f5fe", op:0.60 },
  ],
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? dark : light;
  const toggle = () => setIsDark(d => !d);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
