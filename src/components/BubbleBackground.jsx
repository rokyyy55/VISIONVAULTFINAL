import { useTheme } from "../context/ThemeContext";

export default function BubbleBackground() {
  const { theme: D, isDark } = useTheme();

  return (
    <>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes floatB { 0%,100%{transform:translate(-50%,-50%) scale(1.08)} 50%{transform:translate(-50%,-50%) scale(0.90)} }
        @keyframes floatC { 0%,100%{transform:translate(-50%,-50%) scale(0.93)} 50%{transform:translate(-50%,-50%) scale(1.10)} }
        @keyframes floatD { 0%,100%{transform:translate(-50%,-50%) scale(1.05)} 50%{transform:translate(-50%,-50%) scale(0.95)} }
        ${isDark ? `
          body { background: #04081a; }
        ` : `
          body {
            background: linear-gradient(160deg, #d0eaf8 0%, #b8d9f4 30%, #a0ccee 60%, #c8e8fb 100%);
          }
        `}
      `}</style>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>

        {/* Dark mode: deep space grid lines */}
        {isDark && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.06 }}
            xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4f8ef7" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Light mode: Frutiger Aero sky gradient overlay */}
        {!isDark && (
          <>
            <div style={{
              position:"absolute", inset:0,
              background:"linear-gradient(180deg, rgba(180,225,255,0.6) 0%, rgba(120,195,240,0.3) 40%, rgba(200,240,255,0.5) 100%)",
            }}/>
            {/* Lens flare top-right */}
            <div style={{
              position:"absolute", right:"5%", top:"3%",
              width:420, height:420, borderRadius:"50%",
              background:"radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(160,220,255,0.4) 40%, transparent 70%)",
              filter:"blur(2px)",
            }}/>
            {/* Soft white cloud-like blobs */}
            <div style={{ position:"absolute", left:"20%", top:"10%", width:500, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.45)", filter:"blur(40px)" }}/>
            <div style={{ position:"absolute", right:"15%", top:"30%", width:380, height:160, borderRadius:"50%", background:"rgba(200,240,255,0.50)", filter:"blur(30px)" }}/>
          </>
        )}

        {/* Bubbles */}
        {D.bubbles.map((b, i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${b.x}%`, top:`${b.y}%`,
            width: b.r * 2, height: b.r * 2,
            borderRadius:"50%",
            background: isDark ? b.color : b.color,
            opacity: b.op,
            filter: isDark ? "blur(70px)" : "blur(50px)",
            transform:"translate(-50%,-50%)",
            animation:`float${["A","B","C","D","A","B"][i]} ${9+i*2}s ease-in-out infinite alternate`,
          }}/>
        ))}

        {/* Dark mode: star particles */}
        {isDark && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.5 }} xmlns="http://www.w3.org/2000/svg">
            {Array.from({length:60}).map((_,i)=>{
              const cx = (i*37+13)%100;
              const cy = (i*53+7)%100;
              const r  = i%4===0?1.2:0.5;
              return <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={r} fill="white" opacity={0.4+Math.random()*0.4}/>;
            })}
          </svg>
        )}
      </div>
    </>
  );
}
