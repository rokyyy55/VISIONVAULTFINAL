import { useTheme } from "../context/ThemeContext";
import { useLang } from "../context/LangContext";
import { makeStyles } from "../styles/styles";

export default function ChoosePage({ onChoose, onBack }) {
  const { theme: D, isDark } = useTheme();
  const { t } = useLang();
  const S = makeStyles(D);

  const options = [
    {
      id:"local",
      icon:"💻",
      title:t.localMode,
      badge:t.localBadge,
      desc:t.localDesc,
      color:D.accent,
      features:["No internet required","Data stays on device","One-time model setup"],
    },
    {
      id:"cloud",
      icon:"☁",
      title:t.cloudMode,
      badge:t.cloudBadge,
      desc:t.cloudDesc,
      color:D.accent2,
      features:["Free API key","Fastest inference","No local install"],
    },
  ];

  return (
    <div style={{ position:"relative", zIndex:1, padding:"100px 32px 60px", maxWidth:820, margin:"0 auto" }}>
      <button onClick={onBack} style={{ ...S.ghostBtn, padding:"8px 18px", fontSize:13, marginBottom:36 }}>← {t.back}</button>

      <h2 style={{
        fontSize:"clamp(32px,5vw,48px)", fontWeight:800,
        letterSpacing:-1.5, margin:"0 0 10px", color:D.text,
        fontFamily:"'Rajdhani','Sora',sans-serif",
      }}>{t.chooseMode}</h2>
      <p style={{ color:D.text2, fontSize:16, marginBottom:48 }}>{t.chooseSub}</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {options.map(opt => (
          <div
            key={opt.id}
            onClick={() => onChoose(opt.id)}
            style={{
              ...S.glassCard,
              padding:"32px 28px", cursor:"pointer",
              transition:"transform 0.2s, border 0.2s, box-shadow 0.2s",
              position:"relative", overflow:"hidden",
              border:`1px solid ${D.glassBorder}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform="translateY(-5px)";
              e.currentTarget.style.border=`1px solid ${opt.color}66`;
              e.currentTarget.style.boxShadow=`0 8px 40px ${opt.color}28`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform="translateY(0)";
              e.currentTarget.style.border=`1px solid ${D.glassBorder}`;
              e.currentTarget.style.boxShadow="none";
            }}
          >
            {/* Background glow */}
            <div style={{
              position:"absolute", top:-60, right:-60,
              width:180, height:180, borderRadius:"50%",
              background:opt.color, opacity: isDark ? 0.08 : 0.10,
              filter:"blur(20px)",
            }}/>

            <div style={{ fontSize:40, marginBottom:18 }}>{opt.icon}</div>

            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontWeight:800, fontSize:24, color:D.text, fontFamily:"'Rajdhani',sans-serif" }}>
                {opt.title}
              </span>
              <span style={{
                fontSize:9, fontWeight:800, letterSpacing:2,
                padding:"3px 9px", borderRadius:6,
                background:`${opt.color}22`,
                color:opt.color,
                border:`1px solid ${opt.color}44`,
                textTransform:"uppercase",
              }}>{opt.badge}</span>
            </div>

            <p style={{ color:D.text2, fontSize:14, lineHeight:1.65, margin:"0 0 20px" }}>{opt.desc}</p>

            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {opt.features.map(f => (
                <li key={f} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, fontSize:13, color:D.text2 }}>
                  <span style={{ width:16, height:16, borderRadius:"50%", background:`${opt.color}22`, border:`1px solid ${opt.color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:opt.color, flexShrink:0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div style={{ marginTop:24, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
              <span style={{ fontSize:13, color:opt.color, fontWeight:700 }}>Select →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
