import React,{useEffect,useMemo,useState} from "react";

const styles={card:{border:"1px solid #E2E8F0",borderRadius:14,padding:14,background:"#fff",display:"grid",gap:10},muted:{fontSize:12,color:"#64748B",lineHeight:1.7},button:{border:"1px solid #CBD5E1",borderRadius:9,padding:"7px 10px",background:"#fff",cursor:"pointer",font:"inherit",fontSize:12}};
export function getMediaEmbed(url){
  try{
    const u=new URL(String(url||"").trim());
    const host=u.hostname.toLowerCase().replace(/^www\./,"");
    let id="";
    if(host==="youtu.be") id=u.pathname.split("/").filter(Boolean)[0]||"";
    else if(host==="youtube.com"||host==="m.youtube.com"||host==="youtube-nocookie.com"){
      id=u.searchParams.get("v")||u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]||"";
    }
    if(id&&/^[\w-]{6,}$/.test(id))return {provider:"youtube",id,embedUrl:"https://www.youtube-nocookie.com/embed/"+id,watchUrl:"https://www.youtube.com/watch?v="+id};
    if(host==="vimeo.com"||host==="player.vimeo.com"){
      id=u.pathname.split("/").filter(Boolean).pop()||"";
      if(/^\d+$/.test(id))return {provider:"vimeo",id,embedUrl:"https://player.vimeo.com/video/"+id,watchUrl:"https://vimeo.com/"+id};
    }
    if(host==="www.loom.com"||host==="loom.com"){
      const m=u.pathname.match(/\/share\/([\w]+)/);
      if(m)return {provider:"loom",id:m[1],embedUrl:"https://www.loom.com/embed/"+m[1],watchUrl:u.href};
    }
    if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(u.pathname+u.search))return {provider:"file",id:u.href,embedUrl:u.href,watchUrl:u.href};
    if(["http:","https:"].includes(u.protocol))return {provider:"external",id:u.href,embedUrl:null,watchUrl:u.href};
  }catch{}
  return null;
}
export default function MediaEmbed({url,title="الفيديو",workspaceId="default",itemId="",onProgress,initialPosition=0,compact=false}){
  const media=useMemo(()=>getMediaEmbed(url),[url]);
  const key="os-hub:media-progress:"+String(workspaceId)+":"+String(itemId||url||"");
  const [position,setPosition]=useState(Math.max(0,Number(initialPosition)||0));
  const [saved,setSaved]=useState(false);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");if(v&&Number.isFinite(v.position))setPosition(Math.max(0,v.position));}catch{}},[key]);
  const save=next=>{const value=Math.max(0,Math.floor(Number(next)||0));setPosition(value);try{localStorage.setItem(key,JSON.stringify({position:value,updatedAt:new Date().toISOString(),url,title,itemId}));setSaved(true);window.setTimeout(()=>setSaved(false),1800);}catch{}onProgress?.({position:value,url,itemId});};
  if(!url)return <div style={styles.card}><b>لا يوجد فيديو مرتبط</b><div style={styles.muted}>أضف رابط الفيديو في بيانات الدرس أو المصدر لعرضه هنا.</div></div>;
  if(!media)return <div style={styles.card}><b>{title}</b><div style={styles.muted}>الرابط غير صالح أو غير مدعوم.</div></div>;
  const frameStyle={width:"100%",aspectRatio:"16 / 9",border:0,borderRadius:10,background:"#0F172A"};
  return <section style={{...styles.card,gap:8}} aria-label={"مشغل "+title}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><b>{title}</b><span style={styles.muted}>{media.provider==="youtube"?"YouTube":media.provider==="vimeo"?"Vimeo":media.provider==="loom"?"Loom":media.provider==="file"?"ملف فيديو":"مصدر خارجي"}</span></div>
    {media.provider==="file"?<video controls preload="metadata" src={media.embedUrl} style={frameStyle} onTimeUpdate={e=>{const p=Math.floor(e.currentTarget.currentTime);if(p>0&&p%10===0)save(p);}} onPause={e=>save(e.currentTarget.currentTime)} onEnded={()=>save(0)}/>:media.embedUrl?<iframe src={media.embedUrl+(media.provider==="youtube"?"?start="+position:"")} title={title} style={frameStyle} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<div style={{...frameStyle,display:"grid",placeItems:"center",padding:18,boxSizing:"border-box",color:"#fff",textAlign:"center"}}><div><div style={{fontSize:22,marginBottom:8}}>↗</div><div>الموقع لا يتيح التضمين داخل التطبيق.</div><a href={media.watchUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:12,color:"#fff"}}>فتح المصدر الأصلي</a></div></div>}
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>موضع الاستكمال (ثانية)<input type="number" min="0" value={position} onChange={e=>setPosition(Math.max(0,Number(e.target.value)||0))} style={{width:105,padding:6,border:"1px solid #CBD5E1",borderRadius:8}}/></label><button type="button" style={styles.button} onClick={()=>save(position)}>حفظ الموضع</button>{saved&&<span role="status" style={{fontSize:12,color:"#047857"}}>تم الحفظ</span>}<a href={media.watchUrl} target="_blank" rel="noreferrer" style={{fontSize:12}}>فتح المصدر الأصلي ↗</a></div>
    <div style={styles.muted}>موضع الاستكمال محفوظ على هذا الجهاز. دعم الحفظ التلقائي الدقيق داخل المشغلات الخارجية يختلف حسب المنصة؛ يمكنك تعديل الموضع وحفظه يدويًا.</div>
  </section>;
}
