import { useState } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { LangProvider } from "./context/LangContext";
import BubbleBackground from "./components/BubbleBackground";
import TopBar           from "./components/TopBar";
import SettingsPanel    from "./components/SettingsPanel";
import HomePage         from "./pages/HomePage";
import ChoosePage       from "./pages/ChoosePage";
import SetupPage        from "./pages/SetupPage";
import ScanPage         from "./pages/ScanPage";
import ResultsPage      from "./pages/ResultsPage";

function AppInner() {
  const { theme: D } = useTheme();

  const [page,         setPage]         = useState("home");
  const [engine,       setEngine]       = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanResults,  setScanResults]  = useState(null);

  const goChoose = () => setPage("choose");

  // ── FIX: persist engine to localStorage so ScanPage.startScan() can read it
  const _applyEngine = (eng) => {
    setEngine(eng);
    localStorage.setItem("vv_engine", eng);   // ← was missing everywhere
  };

  const chooseEngine = (eng) => {
    _applyEngine(eng);
    const hasKey = eng === "cloud"
      ? (localStorage.getItem("vv_groq_key")   || "").length > 10
      : (localStorage.getItem("vv_model_path") || "").length > 5;
    setPage(hasKey ? "scan" : "setup");
  };

  const handleSwitchEngine = (eng) => {
    _applyEngine(eng);
    setSettingsOpen(false);
    const hasKey = eng === "cloud"
      ? (localStorage.getItem("vv_groq_key")   || "").length > 10
      : (localStorage.getItem("vv_model_path") || "").length > 5;
    setPage(hasKey ? "scan" : "setup");
  };

  const handleDone = (results) => {
    setScanResults(results);
    setPage("results");
  };

  const reset = () => {
    setScanResults(null);
    setPage("scan");
  };

  return (
    <div style={{
      fontFamily: "'Sora','Segoe UI',sans-serif",
      color:      D.text,
      minHeight:  "100vh",
      position:   "relative",
    }}>
      <BubbleBackground />
      <TopBar engine={engine} onSettings={() => setSettingsOpen(true)} />

      {settingsOpen && (
        <SettingsPanel
          engine={engine || "cloud"}
          setEngine={_applyEngine}
          onClose={() => setSettingsOpen(false)}
          onSwitchEngine={handleSwitchEngine}
        />
      )}

      {page === "home"    && <HomePage   onStart={goChoose} />}
      {page === "choose"  && <ChoosePage onChoose={chooseEngine} onBack={() => setPage("home")} />}
      {page === "setup"   && <SetupPage  engine={engine} onDone={() => setPage("scan")} onBack={() => setPage("choose")} />}
      {page === "scan"    && <ScanPage   engine={engine} onDone={handleDone} />}
      {page === "results" && <ResultsPage results={scanResults} onReset={reset} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  );
}
