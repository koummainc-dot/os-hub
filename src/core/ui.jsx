import React,{useState,useEffect,useRef,useContext,useMemo,useCallback} from "react";
import { PLATFORM } from "./core.js";

const A="#EF9F27";
const ToastCtx=React.createContext(()=>{});
function useToastNotify(){return useContext(ToastCtx)||(()=>{});}

// Global toast renderer. Kept dependency-free so it works in the standalone HTML build.
function ToastContainer({toasts=[],onRemove=()=>{}}){
  if(!toasts.length) return null;
  return <div style={{
    position:"fixed",bottom:24,insetInlineEnd:24,zIndex:99999,
    display:"flex",flexDirection:"column",gap:10,width:"min(380px,calc(100vw - 32px))",
    pointerEvents:"none"
  }}>
    {toasts.map(t=>(
      <div key={t.id} role="status" style={{
        pointerEvents:"auto",display:"flex",alignItems:"center",gap:10,
        background:"#16181D",color:"#fff",border:"1px solid rgba(255,255,255,.10)",
        borderRadius:12,padding:"12px 14px",boxShadow:"0 12px 32px rgba(0,0,0,.20)",
        fontSize:13,lineHeight:1.5,direction:"rtl"
      }}>
        <span style={{width:8,height:8,borderRadius:"50%",background:A,flexShrink:0}}/>
        <span style={{flex:1}}>{t.msg}</span>
        <button type="button" onClick={()=>onRemove(t.id)} aria-label="إغلاق" style={{
          border:0,background:"transparent",color:"rgba(255,255,255,.65)",
          cursor:"pointer",fontSize:18,lineHeight:1,padding:2
        }}>×</button>
      </div>
    ))}
  </div>;
}


const S={
  card:{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-md)",padding:"16px 20px",boxShadow:"var(--shadow)"},
  inp:{width:"100%",padding:"10px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-main)",color:"var(--text-main)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box", transition:"var(--transition)"},
  sel:{width:"100%",padding:"10px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-main)",color:"var(--text-main)",fontSize:13,fontFamily:"inherit",outline:"none", cursor:"pointer"},
  ta:{width:"100%",padding:"10px 14px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-main)",color:"var(--text-main)",fontSize:13,fontFamily:"inherit",resize:"vertical",minHeight:80,outline:"none",boxSizing:"border-box"},
  btn:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"transparent",color:"var(--text-dim)",cursor:"pointer",fontSize:13,fontWeight:500, transition:"var(--transition)"},
  btnA:{background:"var(--accent)",border:"none",color:"#1a0f00",padding:"8px 20px",borderRadius:"var(--radius-sm)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6, transition:"var(--transition)"},
  lbl:{fontSize:11,color:"var(--text-dim)",marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:"0.6px",fontWeight:700},
  g2:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:16},
  g3:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14},
  g4:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14},
};

function AccessDenied(){return <div dir="rtl" style={{padding:48,textAlign:"center",color:"#57606A"}}><div style={{fontSize:42,marginBottom:12}}>🔒</div><div style={{fontSize:18,fontWeight:800,color:"#16181D",marginBottom:8}}>غير مصرح بالوصول</div><div style={{fontSize:12}}>ليس لديك صلاحية لعرض هذا القسم.</div></div>;}

function Overlay({children}) {
  return (
    <div style={{position:"fixed", inset:0, background:"#F1F3F5", zIndex:5000,
                 display:"flex", alignItems:"center", justifyContent:"center",
                 direction:"rtl", padding:20}}>
      <div style={{...S.card, width:420, padding:"36px 32px",
                   border:`1px solid ${A}25`, boxShadow:`0 0 60px ${A}10`}}>
        {children}
      </div>
    </div>
  );
}
function Logo() {
  return (
    <div style={{textAlign:"center", marginBottom:26}}>
      <div style={{fontSize:30, fontWeight:900, color:A, letterSpacing:"-1px", marginBottom:4}}>{PLATFORM.name}</div>
      <div style={{fontSize:12, color:"#6E7781"}}>{PLATFORM.tagline}</div>
    </div>
  );
}
function ErrBox({msg}) {
  return (
    <div style={{padding:"8px 12px", background:"rgba(248,113,113,0.08)",
                 border:"1px solid rgba(248,113,113,0.2)", borderRadius:8,
                 color:"#F87171", fontSize:11, marginBottom:12}}>{msg}</div>
  );
}


class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ContentOS Error Boundary:", error, errorInfo);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      return (
        <div dir="rtl" style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F1F3F5",
          padding: 24,
          boxSizing: "border-box",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}>
          <div style={{
            width: "min(620px, 100%)",
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 18,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(0,0,0,.08)"
          }}>
            <div style={{fontSize: 42, marginBottom: 10}}>⚠️</div>
            <h2 style={{margin: "0 0 10px", color: "#16181D", fontSize: 22}}>
              حدث خطأ في ContentOS
            </h2>
            <p style={{margin: "0 0 20px", color: "#6E7781", lineHeight: 1.8}}>
              حدث خطأ غير متوقع أثناء عرض الصفحة. يمكنك إعادة تحميل التطبيق والمحاولة مرة أخرى.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                border: 0,
                borderRadius: 10,
                padding: "11px 20px",
                background: "#6D4AFF",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              إعادة تحميل التطبيق
            </button>
            {error && (
              <details style={{marginTop: 22, textAlign: "right"}}>
                <summary style={{cursor: "pointer", color: "#6E7781", fontSize: 12}}>
                  تفاصيل الخطأ للمطور
                </summary>
                <pre style={{
                  marginTop: 10,
                  padding: 12,
                  background: "#F8F9FA",
                  borderRadius: 10,
                  direction: "ltr",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 11,
                  color: "#B42318",
                  overflow: "auto"
                }}>
                  {String(error.message || error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// Restored missing application modules from the original ContentOS build.


export { A, AccessDenied, AppErrorBoundary, ErrBox, Logo, Overlay, S, ToastContainer, ToastCtx, useToastNotify };
