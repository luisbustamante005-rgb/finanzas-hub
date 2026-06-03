import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ═══════════════════════════════════════════════════
// GOOGLE SHEETS SYNC
// ═══════════════════════════════════════════════════
const SHEET_ID = "1JIbLL7jcFr5POLKS18ZgEeE7knBE4xEQ7_1s8dilPt0";
const CLIENT_EMAIL = "finanza@finanzas2026-498222.iam.gserviceaccount.com";
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2w6/ePYt3hSCU
590tJ3gf/qzlGNuAYBkjt7gRb+/4cWe9Lfj4MzrBebSS4aXfb3O+wthkBcMv1oAF
jYlk2CLtyjxC0kgW541/jvPCximNl/wEf8x7Y0iFkUT0GFdjKGDQMkDXGUY8384h
a69Satc8GnFNSf0eMTUrQ1T9NWEbJmiCYm828uqSbVQCGhaQfMSCW+EodBiOikBN
XjcCAvPRfe+GOawtWk2eKtOsBiHZvy3GyW2gD2Ji0n2HFSCBTr/v7RrLK3Cg5zFe
TcqXgueCmjZt/xs5LRk+I6v+kFATmEafDuxdNtdXpVsJ9OBColtD4D8ACayKOsOj
YVizJaHzAgMBAAECggEASUCyry1UxoFd10D9tdjxfUVqz+JALDqYKOg8hwSqFpaB
oWIZPYXvAVgCB7MYdC8sIaPf7mse2gArzM33aSt2CH/72j6FNWT2ok9OJV2ejwmB
Md51O2lGSn64t+s/r1ciQqA5u9z9+W0spdmO6kY3YXgpvHQw1xaa/G2e1WQ9OQ9k
/lDwLrh8AeGd7A8RFJVFqnOccbz9KdwcmGaLXzP/MbbO2a4YnvoQAI19aLIJt441
5YfnsQ0WGoFj4PzQsHUKMOzNThNLe3F1HU91+g3mn3RBo2Nhfna/Mo17gonuXu0d
FTI71hcDneal2KIrC0q9tCZkS+yLLTRnN+mK1JfUjQKBgQDb1JtHitvXXSLPPN3p
xRVrurRRQ8wDJvKrf+B4twNKf+bhpAfu7cQNvKjPIL7CEJyS5ux+Y8rye2TerNlm
v0hcC+pD6BpAdJP4lIMWW6si5kLAA6LZfSWzfS+Kjh03CwcARf5E7jyz3CxjCR20
s1ha5kA8bByPpSOf/SS7HwUhbQKBgQDU1dWN9WbkP7pLzJajyRNsLUlq+O29B8wR
cpNJ8HcvmG7QFwR7NuWMEDcRQXlHYE8k5e/H6AVtsNiwntNL98axzLLx/dGRBUJh
YJMTnJim5ZzE/sBCq+5kkRICycpqus9iniGMV3d0O4+y2T9qTxmS/R2RGnq9M9da
awwoGbUU3wKBgGiF8YMV0ivXe+qfnUA+1k2Py5bsLn+9MBs9RUUAd88fe28EKEWB
xftmHbnGbw0lCt2KcR4zYtbitvZtpz0EbGpfu/an0HufMpA6RQ4Hbhq88zYLRI42
xAtQ1Z8CrX9zfdOydBDgWfqHEI/SUM6Pi85EtnxER1xBf+vdWG6kdDMNAoGBAKI+
q//+jcP7jKGRwVfzxXmWgDwqrNiH5Bl81SjtRX4j3n2EvmbLL2t5RPFDjxdJJKwF
GKe0iMbYpCbnvD1SEcaiO9tbWPELKFIhE51Ep926dap6ZMeuVxmUuT0k5Mg9xi/w
SbS5TJdvfBijocMBr4Ysq+hcXipzJXyI1AiRqEfTAoGBAM6l5fijlhTALNXlc6+p
ytcqQ6XIE2dhDwPlluR3T/T4kf27AgMsQN9JhA+hC8a/ULBfYFEF0ZZZO87tzFx4
0Ddu320u36so9fnxuCFbzHngygI0vAzvQc4XAHUtDtb2wd/bLPWKlWLZDrgHKqF1
lecxandfa0hNC/VJlfzxjWNo
-----END PRIVATE KEY-----`;

let _gsToken = null;
let _gsTokenExpiry = 0;

function withTimeout(promise, ms){
  return Promise.race([promise, new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]);
}

async function gsGetToken() {
  const now = Math.floor(Date.now()/1000);
  if(_gsToken && _gsTokenExpiry > now+60) return _gsToken;
  try {
    const header = btoa(JSON.stringify({alg:"RS256",typ:"JWT"})).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const iat = now, exp = now+3600;
    const payload = btoa(JSON.stringify({
      iss:CLIENT_EMAIL, scope:"https://www.googleapis.com/auth/spreadsheets",
      aud:"https://oauth2.googleapis.com/token", exp, iat
    })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const signing = `${header}.${payload}`;
    const keyData = PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,"");
    const binaryKey = Uint8Array.from(atob(keyData), c=>c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey.buffer,
      {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signing));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
    const jwt = `${signing}.${sigB64}`;
    const resp = await withTimeout(fetch("https://oauth2.googleapis.com/token",{
      method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    }), 5000);
    const d = await resp.json();
    _gsToken = d.access_token;
    _gsTokenExpiry = now+(d.expires_in||3600);
    return _gsToken;
  } catch(e) { return null; }
}

async function gsLoad() {
  try {
    const tk = await gsGetToken();
    if(!tk) return null;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("Finanzas!A1")}`;
    const r = await withTimeout(fetch(url, {headers:{Authorization:`Bearer ${tk}`}}), 5000);
    if(!r.ok) return null;
    const d = await r.json();
    const rows = d.values;
    if(!rows || rows.length < 2 || !rows[1][0]) return null;
    return JSON.parse(rows[1][0]);
  } catch(e) { return null; }
}

async function gsSave(data) {
  try {
    const tk = await gsGetToken();
    if(!tk) return false;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("Finanzas!A1")}?valueInputOption=RAW`;
    const r = await fetch(url, {
      method:"PUT",
      headers:{Authorization:`Bearer ${tk}`,"Content-Type":"application/json"},
      body: JSON.stringify({range:"Finanzas!A1", majorDimension:"ROWS", values:[["data"],[JSON.stringify(data)]]})
    });
    return r.ok;
  } catch(e) { return false; }
}

// ═══════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════
const CLP = n => `$${Math.round(n||0).toLocaleString("es-CL")}`;
const pct = (a,b) => b>0 ? Math.min(999,Math.round(a/b*100)) : 0;
const toDay = () => new Date().toISOString().split("T")[0];
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmt = s => s ? new Date(s+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"}) : "";
const fmtMo = s => s ? new Date(s+"-01T12:00").toLocaleDateString("es-CL",{month:"long",year:"numeric"}) : "";
const fmtMoShort = s => s ? new Date(s+"-01T12:00").toLocaleDateString("es-CL",{month:"short"}) : "";
const curMo = () => toDay().slice(0,7);
const lastNMonths = n => {
  const r=[]; const d=new Date();
  for(let i=n-1;i>=0;i--){
    const m=new Date(d.getFullYear(),d.getMonth()-i,1);
    r.push(`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}`);
  }
  return r;
};
const addMonths = (dateStr,n) => {
  const d=new Date(dateStr+"T12:00");
  d.setMonth(d.getMonth()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};
function cutDateForBD(bd,y,mo){
  const d=new Date(y,mo,bd); const w=d.getDay();
  if(w===6) return new Date(y,mo,bd-1);
  if(w===0) return new Date(y,mo,bd-2);
  return d;
}
function cardCycle(card){
  const n=new Date(); const y=n.getFullYear(),mo=n.getMonth();
  const bd=card.billingDay||19;
  const cutThis=cutDateForBD(bd,y,mo); cutThis.setHours(23,59,59);
  if(n>cutThis){
    const ny=mo===11?y+1:y,nm=mo===11?0:mo+1;
    const start=new Date(cutThis); start.setDate(start.getDate()+1); start.setHours(0,0,0);
    const end=cutDateForBD(bd,ny,nm); end.setHours(23,59,59);
    return {start,end};
  } else {
    const py=mo===0?y-1:y,pm=mo===0?11:mo-1;
    const prevCut=cutDateForBD(bd,py,pm); prevCut.setHours(23,59,59);
    const start=new Date(prevCut); start.setDate(start.getDate()+1); start.setHours(0,0,0);
    return {start,end:cutThis};
  }
}
function calcInstAmt(principal,annualRate,n){
  if(!annualRate||annualRate===0) return Math.round(principal/n);
  const r=annualRate/100/12;
  return Math.round(principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1));
}
function paidInsts(p){
  const now=new Date();
  if(p.firstPaymentMonth){
    // firstPaymentMonth = month cuota was generated
    // Payment happens the following month, so a cuota is "paid" when we're past its payment month
    const [fy,fm]=p.firstPaymentMonth.split("-").map(Number);
    // How many cuotas have been billed (payment received) = months since firstPaymentMonth - 1 (because payment is next month)
    const diff=(now.getFullYear()-fy)*12+(now.getMonth()-(fm-1))-1;
    return Math.min(Math.max(0,diff),p.installments);
  }
  const start=new Date(p.date+"T12:00");
  const diff=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth());
  return Math.min(Math.max(0,diff),p.installments);
}
function remainBal(p){ return (p.installments-paidInsts(p))*p.installmentAmt; }
function instForMonth(purchase,yearMonth){
  const [y,m]=yearMonth.split("-").map(Number);
  // If firstPaymentMonth is set, use it as reference instead of purchase date
  const ref=purchase.firstPaymentMonth||null;
  let diff;
  if(ref){
    const [ry,rm]=ref.split("-").map(Number);
    diff=(y-ry)*12+(m-rm)+1; // 1=first month, 2=second, etc.
  } else {
    const d=new Date(purchase.date+"T12:00");
    diff=(y-d.getFullYear())*12+(m-(d.getMonth()+1));
  }
  if(diff>=1&&diff<=purchase.installments) return {num:diff,amount:purchase.installmentAmt};
  return null;
}
function cardUsed(card,purchases){ return purchases.filter(p=>p.cardId===card.id&&!p.cancelled).reduce((s,p)=>s+remainBal(p),0); }
function cardDirectCharges(card,expenses,groceries){
  // All direct charges linked to this card (not filtered by cycle — shows full unpaid balance)
  const exp=expenses.filter(e=>e.cardId===card.id&&e.payMethod==="CMR/Crédito").reduce((s,e)=>s+e.amount,0);
  const grc=groceries.filter(g=>g.cardId===card.id&&g.payMethod==="CMR/Crédito").reduce((s,g)=>s+g.total,0);
  return exp+grc;
}
function cardTotalUsed(card,purchases,expenses,groceries,cardPayments){
  const paid=(cardPayments||[]).filter(p=>p.cardId===card.id).reduce((s,p)=>s+p.amount,0);
  return Math.max(0,cardUsed(card,purchases)+cardDirectCharges(card,expenses,groceries)-paid);
}

// For a direct expense/grocery paid with CMR/Crédito, return the billing month
// (i.e. the cycle it belongs to, not the calendar month of the date).
// If date > billingDay of its month → belongs to NEXT month's cycle.
// For non-credit payments, billing month = calendar month of date.
function expenseBillingMonth(dateStr, payMethod, cardId, cards){
  if(payMethod!=="CMR/Crédito"||!cardId) return dateStr.slice(0,7);
  const card=cards.find(c=>c.id===cardId);
  const bd=card?.billingDay||19;
  const d=new Date(dateStr+"T12:00");
  const cutDay=cutDateForBD(bd,d.getFullYear(),d.getMonth()).getDate();
  if(d.getDate()>cutDay){
    // After cut → next month's cycle
    const next=new Date(d.getFullYear(),d.getMonth()+1,1);
    return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}`;
  }
  return dateStr.slice(0,7);
}

// ═══════════════════════════════════════════════════
// BUCKETS & CATEGORIES
// ═══════════════════════════════════════════════════
const BUCKETS = {
  necesidades: { label:"Necesidades", emoji:"🔵", target:50, color:"#3B82F6", bg:"bg-blue-500", light:"bg-blue-900/30", border:"border-blue-700/50", text:"text-blue-400" },
  estilo:      { label:"Estilo de vida", emoji:"🟡", target:30, color:"#F59E0B", bg:"bg-amber-500", light:"bg-amber-900/30", border:"border-amber-700/50", text:"text-amber-400" },
  futuro:      { label:"Futuro", emoji:"🟢", target:20, color:"#10B981", bg:"bg-emerald-500", light:"bg-emerald-900/30", border:"border-emerald-700/50", text:"text-emerald-400" },
};

const CATS = {
  necesidades: [
    { id:"vivienda",    label:"🏠 Vivienda",           subs:["Arriendo","Dividendo","Agua","Luz","Gas","Gastos comunes","Otro vivienda"] },
    { id:"servicios",   label:"📱 Servicios fijos",     subs:["Plan celular","Internet hogar","Cable/TV","Teléfono fijo","Otro servicio"] },
    { id:"salud",       label:"🏥 Salud",               subs:["Médico/Consulta","Farmacia","Dentista","Exámenes","Isapre complementaria","Seguro médico","Otro salud"] },
    { id:"alimentos",   label:"🛒 Alimentación básica", subs:["Supermercado","Almacén/Minimarket","Feria/Verdulería","Carnicería","Panadería","Otro alimento"] },
    { id:"transporte",  label:"🚗 Transporte",          subs:["Bencina","TAG/Peajes","Locomoción/Metro/Bus","Revisión técnica","SOAP","Otro transporte"] },
    { id:"educacion",   label:"📚 Educación",           subs:["Mensualidad/Matrícula","Materiales","Jardín/Colegio","Cursos","Otro educación"] },
    { id:"seguros",     label:"🛡️ Seguros",             subs:["Seguro auto","Seguro de vida","Seguro hogar","Seguro de viaje","Otro seguro"] },
    { id:"deudas",      label:"💳 Deudas mínimas",      subs:["Cuota mínima TC","Crédito de consumo","Crédito hipotecario","Otro"] },
  ],
  estilo: [
    { id:"restaurantes",label:"🍽️ Restaurantes/Delivery",subs:["Restaurante","Delivery (PY/Rappi)","Café","Sushi","Comida rápida","Otro restaurante"] },
    { id:"streaming",   label:"🎬 Entretenimiento digital",subs:["Netflix","Spotify","Amazon Prime","Disney+","YouTube Premium","Videojuegos","Otra suscripción"] },
    { id:"salidas",     label:"🎉 Salidas/Ocio",         subs:["Cine","Eventos/Conciertos","Bar/Discoteca","Paseos","Otro ocio"] },
    { id:"ropa",        label:"👗 Ropa/Accesorios",      subs:["Ropa","Calzado","Accesorios","Otro ropa"] },
    { id:"antojos",     label:"🍫 Antojos/Snacks",       subs:["Dulces","Bebidas extra","Snacks","Helado","Otro antojo"] },
    { id:"varios",      label:"✨ Varios",               subs:["Regalos","Mascotas","Hobbies","Peluquería","Farmacia no esencial","Otro"] },
  ],
};
const ALL_CATS=[...CATS.necesidades,...CATS.estilo];
const getCatBucket = catId => CATS.necesidades.find(c=>c.id===catId)?"necesidades":"estilo";
const getCat = catId => ALL_CATS.find(c=>c.id===catId);
const PAYS=["Débito","Efectivo","Transferencia","CMR/Crédito"];
const CARD_COLORS=["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16"];
const BANKS=["BancoEstado","Banco Chile","Santander","BCI","Scotiabank","Itaú","CMR Falabella","Ripley","MACH","Otro"];
const PIE_COLORS=["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#A855F7"];

const INIT = {
  incomes:[],expenses:[],groceries:[],investments:[],cards:[],purchases:[], wifePayments:[], cardPayments:[],
  savings:{
    viaje:      {label:"Viaje 2027",  emoji:"✈️", target:0,balance:0,history:[]},
    emergencia: {label:"Emergencia",  emoji:"🛡️", target:0,balance:0,history:[]},
    universidad:{label:"Universidad", emoji:"🎓", target:0,balance:0,history:[]},
    casa:       {label:"Casa",        emoji:"🏡", target:0,balance:0,history:[]},
  },
};

// ═══════════════════════════════════════════════════
// FINANCIAL CALCULATIONS
// ═══════════════════════════════════════════════════
function calcDistribution(data, mo){
  // Use budgetMonth if set, otherwise fall back to date month
  const incomes = data.incomes.filter(i=>(i.budgetMonth||i.date.slice(0,7))===mo);
  const totalIncome = incomes.reduce((s,i)=>s+i.amount,0);

  // Necesidades: direct expenses + groceries + installments from necesidades purchases
  const directNec = data.expenses.filter(e=>expenseBillingMonth(e.date,e.payMethod,e.cardId,data.cards)===mo&&!e.isWife&&getCatBucket(e.catId)==="necesidades").reduce((s,e)=>s+e.amount,0);
  const groceriesMo = data.groceries.filter(g=>expenseBillingMonth(g.date,g.payMethod,g.cardId,data.cards)===mo).reduce((s,g)=>s+g.total,0);
  const instNec = data.purchases.filter(p=>!p.cancelled&&!p.isWife&&getCatBucket(p.catId||"varios")==="necesidades")
    .reduce((s,p)=>{const i=instForMonth(p,mo);return s+(i?i.amount:0);},0);
  const totalNec = directNec + groceriesMo + instNec;

  // Estilo: direct expenses + installments from estilo purchases
  const directEst = data.expenses.filter(e=>expenseBillingMonth(e.date,e.payMethod,e.cardId,data.cards)===mo&&!e.isWife&&getCatBucket(e.catId)==="estilo").reduce((s,e)=>s+e.amount,0);
  const instEst = data.purchases.filter(p=>!p.cancelled&&!p.isWife&&getCatBucket(p.catId||"varios")==="estilo")
    .reduce((s,p)=>{const i=instForMonth(p,mo);return s+(i?i.amount:0);},0);
  const totalEst = directEst + instEst;

  // Futuro: savings deposits + investments this month
  const savingsMo = Object.values(data.savings).reduce((s,f)=>{
    return s+f.history.filter(h=>h.date.startsWith(mo)&&h.amount>0).reduce((ss,h)=>ss+h.amount,0);
  },0);
  const investMo = data.investments.filter(i=>i.startDate.startsWith(mo)).reduce((s,i)=>s+i.amount,0);
  const totalFut = savingsMo + investMo;

  const totalSpent = totalNec + totalEst + totalFut;
  return { totalIncome, totalNec, totalEst, totalFut, totalSpent,
    pctNec: pct(totalNec,totalIncome), pctEst: pct(totalEst,totalIncome), pctFut: pct(totalFut,totalIncome),
    pctNecOfSpent: pct(totalNec,totalSpent), pctEstOfSpent: pct(totalEst,totalSpent), pctFutOfSpent: pct(totalFut,totalSpent),
  };
}

function getInsights(dist){
  const insights=[];
  if(dist.totalIncome===0) return insights;
  const devNec=dist.pctNec-50, devEst=dist.pctEst-30, devFut=dist.pctFut-20;
  if(devNec>10) insights.push({type:"warn",msg:`Tus necesidades consumen ${dist.pctNec}% del ingreso — ${devNec}pts sobre el objetivo`});
  if(devEst>8) insights.push({type:"warn",msg:`Estilo de vida en ${dist.pctEst}% — ${devEst}pts sobre el objetivo del 30%`});
  if(dist.pctFut<10&&dist.totalIncome>0) insights.push({type:"danger",msg:"Estás ahorrando menos del 10% — el objetivo es 20%"});
  if(devFut<-10) insights.push({type:"info",msg:`Llevas ${dist.pctFut}% en ahorro — podrías subir al 20%`});
  if(dist.pctNec<=50&&dist.pctEst<=30&&dist.pctFut>=20) insights.push({type:"good",msg:"¡Distribución 50/30/20 en regla este mes! 🎉"});
  const daysInMo=new Date(parseInt(curMo().split("-")[0]),parseInt(curMo().split("-")[1]),0).getDate();
  const dayOfMo=new Date().getDate();
  const projSpent=Math.round(dist.totalSpent/(dayOfMo||1)*daysInMo);
  if(projSpent>dist.totalIncome&&dist.totalIncome>0) insights.push({type:"danger",msg:`Proyección: gastarás ${CLP(projSpent)} vs ${CLP(dist.totalIncome)} de ingresos`});
  return insights;
}

// ═══════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════
const Card=({children,className=""})=><div className={`bg-slate-800 rounded-2xl p-4 shadow-lg ${className}`}>{children}</div>;
const Btn=({onClick,children,color="blue",sm=false,full=false,disabled=false})=>{
  const c={blue:"bg-blue-600 hover:bg-blue-500",green:"bg-emerald-600 hover:bg-emerald-500",red:"bg-rose-600 hover:bg-rose-500",gray:"bg-slate-600 hover:bg-slate-500",amber:"bg-amber-600 hover:bg-amber-500",purple:"bg-violet-600 hover:bg-violet-500"};
  return <button onClick={onClick} disabled={disabled} className={`${c[color]} text-white font-semibold rounded-xl transition-all active:scale-95 ${sm?"px-3 py-1.5 text-sm":"px-4 py-2.5 text-base"} ${full?"w-full":""} ${disabled?"opacity-40 cursor-not-allowed":""}`}>{children}</button>;
};
const Inp=({label,value,onChange,type="text",placeholder="",min,max,step,className=""})=>(
  <div className={`flex flex-col gap-1 ${className}`}>
    {label&&<label className="text-xs text-slate-400 font-medium">{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} max={max} step={step}
      className="bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none w-full"/>
  </div>
);
const Sel=({label,value,onChange,options,placeholder=""})=>(
  <div className="flex flex-col gap-1">
    {label&&<label className="text-xs text-slate-400 font-medium">{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} className="bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none w-full">
      {placeholder&&<option value="">{placeholder}</option>}
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const Badge=({children,color="gray"})=>{
  const c={blue:"bg-blue-900/50 text-blue-300",green:"bg-emerald-900/50 text-emerald-300",red:"bg-rose-900/50 text-rose-300",amber:"bg-amber-900/50 text-amber-300",gray:"bg-slate-700/80 text-slate-300",purple:"bg-violet-900/50 text-violet-300"};
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c[color]}`}>{children}</span>;
};
const Toggle=({value,onChange,label})=>(
  <div className="flex items-center gap-3">
    <button onClick={()=>onChange(!value)} className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${value?"bg-blue-600":"bg-slate-600"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value?"left-4":"left-0.5"}`}/>
    </button>
    {label&&<span className="text-sm text-slate-300">{label}</span>}
  </div>
);
const SectionHeader=({title,sub})=><div><h2 className="text-xl font-bold text-white">{title}</h2>{sub&&<p className="text-sm text-slate-400 mt-0.5">{sub}</p>}</div>;
const EmptyState=({msg})=><Card><p className="text-slate-500 text-sm text-center py-10">{msg}</p></Card>;
const ProgressBar=({value,max,color,height="h-2"})=>{
  const p=max>0?Math.min(100,(value/max)*100):0;
  const auto=!color?(p>=100?"bg-rose-500":p>=80?"bg-amber-500":"bg-emerald-500"):color;
  return <div className={`${height} bg-slate-700 rounded-full overflow-hidden`}><div className={`h-full ${auto} rounded-full transition-all duration-500`} style={{width:`${p}%`}}/></div>;
};

// Bucket pill
function BucketPill({bucketId}){
  const b=BUCKETS[bucketId];
  if(!b) return null;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.light} ${b.text} border ${b.border}`}>{b.emoji} {b.label}</span>;
}

// 50/30/20 widget
function DistWidget({dist,compact=false}){
  const bars=[
    {key:"necesidades",val:dist.pctNec,target:50,amt:dist.totalNec},
    {key:"estilo",     val:dist.pctEst,target:30,amt:dist.totalEst},
    {key:"futuro",     val:dist.pctFut,target:20,amt:dist.totalFut},
  ];
  if(compact) return(
    <div className="flex gap-1.5">
      {bars.map(({key,val,target})=>{
        const b=BUCKETS[key]; const dev=val-target;
        return <div key={key} className="flex-1 text-center">
          <p className={`text-lg font-black ${Math.abs(dev)>5?(dev>0?"text-rose-400":"text-emerald-400"):b.text}`}>{val}%</p>
          <p className="text-xs text-slate-500">{target}%</p>
          <p className="text-xs text-slate-400 truncate">{b.label.split(" ")[0]}</p>
        </div>;
      })}
    </div>
  );
  return(
    <div className="space-y-3">
      {bars.map(({key,val,target,amt})=>{
        const b=BUCKETS[key]; const dev=val-target;
        const isOver=dev>5; const isUnder=dev<-5;
        return(
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{b.emoji}</span>
                <div>
                  <p className="text-sm text-white font-semibold">{b.label}</p>
                  <p className="text-xs text-slate-500">objetivo {target}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black ${isOver?"text-rose-400":isUnder&&key==="futuro"?"text-amber-400":b.text}`}>{val}%</p>
                <p className="text-xs text-slate-500">{CLP(amt)}</p>
              </div>
            </div>
            <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isOver?"bg-rose-500":b.bg}`} style={{width:`${Math.min(100,val*2)}%`}}/>
              {/* Target marker */}
              <div className="absolute top-0 h-full w-0.5 bg-white/30" style={{left:`${Math.min(100,target*2)}%`}}/>
            </div>
            {(isOver||isUnder)&&(
              <p className={`text-xs mt-1 ${isOver?"text-rose-400":"text-emerald-400"}`}>
                {isOver?`▲ ${dev}pts sobre objetivo`:`▼ ${Math.abs(dev)}pts bajo objetivo`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function Dashboard({data}){
  const mo=curMo();
  const dist=calcDistribution(data,mo);
  const insights=getInsights(dist);

  const allDates=[...data.incomes,...data.expenses,...data.groceries].map(r=>r.date).sort().reverse();
  const lastDate=allDates[0];
  const daysSince=lastDate?Math.floor((new Date()-new Date(lastDate+"T12:00"))/86400000):null;

  // Disponible real = presupuesto base - todo lo gastado
  const base=data.config?.budgetBase||750000;
  const realAvailable=base-dist.totalSpent;
  const instDue=data.purchases.filter(p=>!p.cancelled).reduce((s,p)=>{const i=instForMonth(p,mo);return s+(i?i.amount:0);},0);

  // Credit
  const totalUsed=data.cards.reduce((s,c)=>s+cardTotalUsed(c,data.purchases,data.expenses,data.groceries,data.cardPayments),0);
  const totalLimit=data.cards.reduce((s,c)=>s+(c.creditLimit||0),0);

  const recent=[
    ...data.incomes.map(i=>({...i,_k:"in"})),
    ...data.expenses.map(e=>({...e,_k:"out"})),
    ...data.groceries.map(g=>({...g,_k:"out",amount:g.total,subcat:"Alimentación"})),
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);

  return(
    <div className="space-y-4">
      {/* Daily reminder */}
      {(daysSince===null||daysSince>=1)?(
        <div className={`rounded-2xl p-3.5 border flex items-center gap-3 ${daysSince!==null&&daysSince>=3?"bg-rose-900/30 border-rose-700/50":"bg-amber-900/30 border-amber-700/50"}`}>
          <span className="text-xl">{daysSince!==null&&daysSince>=3?"⚠️":"🔔"}</span>
          <div>
            <p className={`font-semibold text-sm ${daysSince!==null&&daysSince>=3?"text-rose-300":"text-amber-300"}`}>
              {daysSince===null?"Sin movimientos registrados aún":`Último registro hace ${daysSince} día${daysSince!==1?"s":""}`}
            </p>
            <p className="text-xs text-slate-400">Recuerda registrar los movimientos de hoy</p>
          </div>
        </div>
      ):(
        <div className="rounded-2xl p-3 bg-emerald-900/30 border border-emerald-700/50 flex items-center gap-2">
          <span>✅</span><p className="text-emerald-300 text-sm font-medium">Al día — última entrada hoy</p>
        </div>
      )}

      {/* 50/30/20 main widget */}
      <Card>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-white font-bold text-base">Distribución 50/30/20</p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtMo(mo)}</p>
          </div>
          {dist.totalIncome>0&&<div className="text-right"><p className="text-xs text-slate-500">Ingreso</p><p className="text-white font-bold text-sm">{CLP(dist.totalIncome)}</p></div>}
        </div>
        {dist.totalIncome===0
          ?<p className="text-slate-500 text-sm text-center py-6">Registra ingresos para ver tu distribución</p>
          :<DistWidget dist={dist}/>}
      </Card>

      {/* Insights */}
      {insights.length>0&&(
        <div className="space-y-2">
          {insights.map((ins,i)=>{
            const s={warn:{bg:"bg-amber-900/30",border:"border-amber-700/50",text:"text-amber-300",icon:"⚡"},danger:{bg:"bg-rose-900/30",border:"border-rose-700/50",text:"text-rose-300",icon:"🚨"},good:{bg:"bg-emerald-900/30",border:"border-emerald-700/50",text:"text-emerald-300",icon:"✅"},info:{bg:"bg-blue-900/30",border:"border-blue-700/50",text:"text-blue-300",icon:"💡"}}[ins.type];
            return <div key={i} className={`rounded-xl p-3 border flex items-start gap-2 ${s.bg} ${s.border}`}><span className="text-sm mt-0.5">{s.icon}</span><p className={`text-sm ${s.text}`}>{ins.msg}</p></div>;
          })}
        </div>
      )}

      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-2">
        {[{l:"Ingresos",v:dist.totalIncome,c:"text-emerald-400"},{l:"Gastos",v:dist.totalSpent,c:"text-rose-400"},{l:"Balance",v:dist.totalIncome-dist.totalSpent,c:(dist.totalIncome-dist.totalSpent)>=0?"text-blue-400":"text-rose-400"}]
          .map(({l,v,c})=>(
          <Card key={l} className="text-center !p-3">
            <p className="text-xs text-slate-400 mb-1">{l}</p>
            <p className={`font-bold text-sm ${c}`}>{CLP(v)}</p>
          </Card>
        ))}
      </div>

      {/* Real cash flow */}
      <Card>
        <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">💡 Presupuesto disponible</p>
        <p className={`text-3xl font-black mb-3 ${realAvailable>=0?"text-emerald-400":"text-rose-400"}`}>{CLP(realAvailable)}</p>
        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between"><span>Presupuesto base</span><span className="text-white">{CLP(base)}</span></div>
          <div className="flex justify-between"><span>− Total gastado</span><span className="text-rose-400">{CLP(dist.totalSpent)}</span></div>
          {instDue>0&&<div className="flex justify-between"><span className="text-slate-500">↳ incluye {CLP(instDue)} en cuotas TC</span><span></span></div>}
        </div>
      </Card>

      {/* Credit overview */}
      {data.cards.length>0&&(
        <Card>
          <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">💳 Crédito total</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-300 text-sm">Deuda vigente</span>
            <span className="text-amber-400 font-bold text-lg">{CLP(totalUsed)}</span>
          </div>
          {totalLimit>0&&<><ProgressBar value={totalUsed} max={totalLimit}/><p className="text-xs text-slate-500 mt-1.5">{pct(totalUsed,totalLimit)}% del cupo total · {CLP(Math.max(0,totalLimit-totalUsed))} disponible</p></>}
        </Card>
      )}

      {/* Savings overview */}
      <Card>
        <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">🟢 Fondos (Futuro)</p>
        {Object.entries(data.savings).map(([,f])=>{
          const p2=f.target>0?Math.min(100,(f.balance/f.target)*100):0;
          return(
            <div key={f.label} className="mb-3 last:mb-0">
              <div className="flex justify-between text-sm mb-1"><span className="text-slate-300">{f.emoji} {f.label}</span><span className="text-emerald-400 font-semibold">{CLP(f.balance)}</span></div>
              {f.target>0&&<ProgressBar value={f.balance} max={f.target} color="bg-emerald-500"/>}
            </div>
          );
        })}
      </Card>

      {/* Recent */}
      <Card>
        <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Últimos movimientos</p>
        {recent.length===0?<p className="text-slate-500 text-sm text-center py-4">Sin movimientos</p>
          :recent.map((r,i)=>(
          <div key={r.id+i} className="flex justify-between items-center py-2.5 border-b border-slate-700/60 last:border-0">
            <div>
              <p className="text-sm text-white">{r.desc||r.subcat||({sueldo:"Sueldo",uber:"Uber",extra:"Ingreso extra"}[r.type])||""}</p>
              <p className="text-xs text-slate-500">{fmt(r.date)} · {r.payMethod||r.type}</p>
            </div>
            <span className={`font-semibold text-sm ${r._k==="in"?"text-emerald-400":"text-rose-400"}`}>{r._k==="in"?"+":"−"}{CLP(r.amount)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// INGRESOS
// ═══════════════════════════════════════════════════
// Compute previous month helper
function prevMonth(mo){ const [y,m]=mo.split("-").map(Number); return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,"0")}`; }

function Ingresos({data,onChange}){
  const [show,setShow]=useState(false);
  const BLANK={type:"sueldo",amount:"",date:toDay(),budgetMonth:prevMonth(curMo()),desc:"",isWifeDebt:false};
  const [f,setF]=useState(BLANK);
  const save=()=>{
    if(!f.amount||!f.date)return;
    const amt=parseFloat(f.amount);
    const inc={...f,id:uid(),amount:amt};
    let newData={...data,incomes:[...data.incomes,inc]};
    // If marked as wife debt payment, register it in wifePayments and don't add to budget
    if(f.isWifeDebt){
      newData={...newData,
        wifePayments:[...(data.wifePayments||[]),{amount:amt,date:f.date,id:uid(),note:f.desc||"Pago deuda"}],
        incomes:data.incomes // don't add to incomes — it's a debt repayment
      };
    } else {
      newData={...newData,incomes:[...data.incomes,inc]};
    }
    onChange(newData);
    setF(BLANK); setShow(false);
  };
  const del=id=>onChange({...data,incomes:data.incomes.filter(i=>i.id!==id)});

  // Group by budgetMonth for display
  const grouped=data.incomes.reduce((acc,i)=>{
    const mo=i.budgetMonth||i.date.slice(0,7);
    (acc[mo]=acc[mo]||[]).push(i); return acc;
  },{});
  const TYPE={sueldo:{label:"💼 Sueldo",c:"blue"},uber:{label:"🚗 Uber",c:"green"},esposa:{label:"👩 Esposa/Pareja",c:"purple"},extra:{label:"⭐ Extra",c:"amber"}};
  const TCOLORS={blue:"bg-blue-900/50 text-blue-300",green:"bg-emerald-900/50 text-emerald-300",purple:"bg-violet-900/50 text-violet-300",amber:"bg-amber-900/50 text-amber-300"};

  return(
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="💰 Ingresos"/>
        <Btn sm color={show?"gray":"green"} onClick={()=>setShow(!show)}>{show?"Cancelar":"+ Agregar"}</Btn>
      </div>
      {show&&(
        <Card>
          <div className="space-y-3">
            <Sel label="Tipo" value={f.type} onChange={v=>setF({...f,type:v})}
              options={[{value:"sueldo",label:"💼 Sueldo"},{value:"uber",label:"🚗 Uber"},{value:"esposa",label:"👩 Aporte esposa/pareja"},{value:"extra",label:"⭐ Ingreso extra"}]}/>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Monto ($)" type="number" min="0" step="1000" value={f.amount} onChange={v=>setF({...f,amount:v})} placeholder="0"/>
              <Inp label="Fecha real de ingreso" type="date" value={f.date} onChange={v=>setF({...f,date:v})}/>
            </div>
            {/* Budget month — the key field */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-3 space-y-2">
              <p className="text-xs text-blue-300 font-semibold">📅 ¿A qué mes corresponde este ingreso?</p>
              <p className="text-xs text-slate-400">El dinero llega en {fmt(f.date)||"…"} pero corresponde al trabajo/período de:</p>
              <Inp value={f.budgetMonth} onChange={v=>setF({...f,budgetMonth:v})} placeholder="2026-05" type="month"/>
              <p className="text-xs text-slate-500">Este mes se usará para calcular tu 50/30/20</p>
            </div>
            <Inp label="Descripción (opcional)" value={f.desc} onChange={v=>setF({...f,desc:v})} placeholder="Ej: Sueldo mayo — llega junio"/>
            {f.type==="esposa"&&(
              <div className="space-y-2">
                <Toggle value={f.isWifeDebt||false} onChange={v=>setF({...f,isWifeDebt:v})} label="💜 Es pago de deuda pendiente"/>
                {f.isWifeDebt&&(
                  <div className="bg-violet-900/30 border border-violet-700/50 rounded-xl p-3">
                    <p className="text-xs text-violet-300">Este monto se registrará como pago de deuda de tu esposa — <strong>no entra al presupuesto 50/30/20</strong></p>
                  </div>
                )}
                {!f.isWifeDebt&&(
                  <div className="bg-slate-700/40 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Este monto entrará a tu presupuesto y podrás distribuirlo normalmente</p>
                  </div>
                )}
              </div>
            )}
            <Btn full color="green" onClick={save} disabled={!f.amount||!f.budgetMonth}>Guardar ingreso</Btn>
          </div>
        </Card>
      )}

      {/* Info banner explaining the logic */}
      {data.incomes.length===0&&(
        <div className="bg-slate-700/40 rounded-2xl p-4 border border-slate-600/50">
          <p className="text-slate-300 text-sm font-semibold mb-1">💡 Cómo funciona el desfase</p>
          <p className="text-xs text-slate-400">Tu sueldo llega en junio pero corresponde a mayo. Al registrarlo, asigna "mes presupuestal = mayo" — así los gastos de mayo se comparan contra ese ingreso correctamente.</p>
        </div>
      )}

      {Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0])).map(([mo,items])=>(
        <div key={mo}>
          <div className="flex justify-between items-center px-1 mb-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Presupuesto {fmtMo(mo)}</p>
            <p className="text-emerald-400 font-bold text-sm">{CLP(items.reduce((s,i)=>s+i.amount,0))}</p>
          </div>
          {items.sort((a,b)=>b.date.localeCompare(a.date)).map(i=>{
            const t=TYPE[i.type]||TYPE.extra;
            return(
              <Card key={i.id} className="mb-2 !p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TCOLORS[t.c]}`}>{t.label}</span>
                      {i.date.slice(0,7)!==(i.budgetMonth||i.date.slice(0,7))&&(
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">Recibido {fmt(i.date)}</span>
                      )}
                    </div>
                    <p className="text-white font-bold text-lg">{CLP(i.amount)}</p>
                    {i.desc&&<p className="text-xs text-slate-400">{i.desc}</p>}
                  </div>
                  <button onClick={()=>del(i.id)} className="text-slate-600 hover:text-rose-400 text-xl ml-2">×</button>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
      {data.incomes.length===0&&<EmptyState msg="Sin ingresos registrados"/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════
function Gastos({data,onChange}){
  const [show,setShow]=useState(false);
  const [filterBucket,setFilterBucket]=useState("all");
  const [showWifeDetail,setShowWifeDetail]=useState(false);
  const [wifePayAmt,setWifePayAmt]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [editF,setEditF]=useState(null);
  const [filterMo,setFilterMo]=useState(curMo());
  const [f,setF]=useState({bucket:"necesidades",catId:"",subcat:"",desc:"",amount:"",payMethod:"Débito",date:toDay(),cardId:""});
  const curBucketCats=CATS[f.bucket]||[];
  const selCat=curBucketCats.find(c=>c.id===f.catId);
  const BLANK_GASTO={bucket:"necesidades",catId:"",subcat:"",desc:"",amount:"",payMethod:"Débito",date:toDay(),cardId:"",isWife:false};

  const save=()=>{
    if(!f.amount||!f.catId||!f.subcat)return;
    onChange({...data,expenses:[...data.expenses,{...f,id:uid(),amount:parseFloat(f.amount)}]});
    setF(BLANK_GASTO); setShow(false);
  };
  const del=id=>onChange({...data,expenses:data.expenses.filter(e=>e.id!==id)});
  const startEdit=e=>{setEditingId(e.id);setEditF({...e,amount:String(e.amount)});};
  const saveEdit=()=>{
    if(!editF.amount||!editF.catId||!editF.subcat)return;
    onChange({...data,expenses:data.expenses.map(e=>e.id===editingId?{...editF,amount:parseFloat(editF.amount)}:e)});
    setEditingId(null);setEditF(null);
  };

  const months=[...new Set(data.expenses.map(e=>expenseBillingMonth(e.date,e.payMethod,e.cardId,data.cards)))].sort().reverse();
  if(!months.includes(filterMo))months.unshift(filterMo);

  const filtered=data.expenses.filter(e=>expenseBillingMonth(e.date,e.payMethod,e.cardId,data.cards)===filterMo&&(filterBucket==="all"||e.bucket===filterBucket))
    .sort((a,b)=>b.date.localeCompare(a.date));
  const total=filtered.reduce((s,e)=>s+e.amount,0);

  const mo=filterMo;
  const dist=calcDistribution(data,mo);
  const moIncome=dist.totalIncome;

  return(
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="💸 Gastos" sub={`Total: ${CLP(total)}`}/>
        <Btn sm color={show?"gray":"red"} onClick={()=>setShow(!show)}>{show?"Cancelar":"+ Agregar"}</Btn>
      </div>

      {/* Mini dist for current month */}
      {moIncome>0&&(
        <Card className="!p-3">
          <DistWidget dist={dist} compact/>
        </Card>
      )}

      {show&&(
        <Card>
          <p className="text-sm font-bold text-white mb-3">Nuevo gasto</p>
          <div className="space-y-3">
            {/* Bucket selector */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-2">Bucket</label>
              <div className="flex gap-2">
                {["necesidades","estilo"].map(k=>{
                  const b=BUCKETS[k];
                  return <button key={k} onClick={()=>setF({...f,bucket:k,catId:"",subcat:""})}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${f.bucket===k?`${b.bg} text-white`:"bg-slate-700 text-slate-400"}`}>
                    {b.emoji} {b.label}
                  </button>;
                })}
              </div>
            </div>
            <Sel label="Categoría" value={f.catId} onChange={v=>setF({...f,catId:v,subcat:""})}
              options={curBucketCats.map(c=>({value:c.id,label:c.label}))} placeholder="Selecciona categoría"/>
            {selCat&&<Sel label="Subcategoría" value={f.subcat} onChange={v=>setF({...f,subcat:v})} options={selCat.subs} placeholder="Subcategoría"/>}
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Monto ($)" type="number" min="0" step="100" value={f.amount} onChange={v=>setF({...f,amount:v})} placeholder="0"/>
              <Inp label="Fecha" type="date" value={f.date} onChange={v=>setF({...f,date:v})}/>
            </div>
            <Sel label="Medio de pago" value={f.payMethod} onChange={v=>setF({...f,payMethod:v,cardId:""})} options={PAYS}/>
            {f.payMethod==="CMR/Crédito"&&data.cards.length>0&&(
              <Sel label="¿A qué tarjeta?" value={f.cardId} onChange={v=>setF({...f,cardId:v})}
                options={data.cards.map(c=>({value:c.id,label:`${c.name} (•••${c.lastFour})`}))} placeholder="Selecciona tarjeta"/>
            )}
            {f.payMethod==="CMR/Crédito"&&data.cards.length===0&&(
              <p className="text-xs text-amber-400 bg-amber-900/30 px-3 py-2 rounded-xl">⚠️ Agrega una tarjeta en 💳 para vincularla</p>
            )}
            <Inp label="Descripción (opcional)" value={f.desc} onChange={v=>setF({...f,desc:v})} placeholder="Ej: Luz de mayo"/>
            <Toggle value={f.isWife} onChange={v=>setF({...f,isWife:v})} label="👩 Gasto de mi esposa (no afecta mi presupuesto)"/>
            {f.isWife&&<p className="text-xs text-amber-300 bg-amber-900/30 px-3 py-2 rounded-xl">Se excluye del 50/30/20 y suma a lo que te debe tu esposa</p>}
            <Btn full color="red" onClick={save} disabled={!f.amount||!f.catId||!f.subcat}>Guardar gasto</Btn>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <Sel value={filterMo} onChange={setFilterMo} options={months.map(m=>({value:m,label:fmtMo(m)}))}/>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
          {["all","necesidades","estilo"].map(k=>{
            const b=k==="all"?null:BUCKETS[k];
            return <button key={k} onClick={()=>setFilterBucket(k)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterBucket===k?b?`${b.bg} text-white`:"bg-white text-slate-900":"bg-slate-700 text-slate-400"}`}>
              {b?`${b.emoji} ${b.label}`:"Todos"}
            </button>;
          })}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(e=>{
          const cat=getCat(e.catId);
          const isEditing=editingId===e.id;
          return(
            <Card key={e.id} className="!p-3">
              {isEditing&&editF?(
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-semibold mb-2">Editando gasto</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Inp label="Monto ($)" type="number" min="0" step="100" value={editF.amount} onChange={v=>setEditF({...editF,amount:v})}/>
                    <Inp label="Fecha" type="date" value={editF.date} onChange={v=>setEditF({...editF,date:v})}/>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Bucket</label>
                    <div className="flex gap-2">
                      {["necesidades","estilo"].map(k=>{const b=BUCKETS[k];return <button key={k} onClick={()=>setEditF({...editF,bucket:k,catId:"",subcat:""})} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold ${editF.bucket===k?`${b.bg} text-white`:"bg-slate-700 text-slate-400"}`}>{b.emoji} {b.label}</button>;})}
                    </div>
                  </div>
                  <Sel label="Categoría" value={editF.catId} onChange={v=>setEditF({...editF,catId:v,subcat:""})} options={(CATS[editF.bucket]||[]).map(c=>({value:c.id,label:c.label}))} placeholder="Categoría"/>
                  {(CATS[editF.bucket]||[]).find(c=>c.id===editF.catId)&&<Sel label="Subcategoría" value={editF.subcat} onChange={v=>setEditF({...editF,subcat:v})} options={(CATS[editF.bucket]||[]).find(c=>c.id===editF.catId).subs} placeholder="Subcategoría"/>}
                  <Sel label="Medio de pago" value={editF.payMethod} onChange={v=>setEditF({...editF,payMethod:v})} options={PAYS}/>
                  {editF.payMethod==="CMR/Crédito"&&data.cards.length>0&&<Sel label="Tarjeta" value={editF.cardId||""} onChange={v=>setEditF({...editF,cardId:v})} options={data.cards.map(c=>({value:c.id,label:`${c.name} (•••${c.lastFour})`}))} placeholder="Selecciona tarjeta"/>}
                  <Inp label="Descripción" value={editF.desc||""} onChange={v=>setEditF({...editF,desc:v})} placeholder="Descripción"/>
                  <Toggle value={editF.isWife||false} onChange={v=>setEditF({...editF,isWife:v})} label="👩 Gasto de mi esposa"/>
                  <div className="flex gap-2 pt-1">
                    <Btn sm full color="blue" onClick={saveEdit}>Guardar cambios</Btn>
                    <Btn sm color="gray" onClick={()=>{setEditingId(null);setEditF(null);}}>Cancelar</Btn>
                  </div>
                </div>
              ):(
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5 flex-wrap mb-1.5">
                      <BucketPill b={e.bucket}/>{e.payMethod==="CMR/Crédito"&&<Badge color="amber">💳 CMR</Badge>}{e.isWife&&<Badge color="purple">👩 Esposa</Badge>}
                    </div>
                    <p className="text-white font-bold">{CLP(e.amount)}</p>
                    <p className="text-sm text-slate-300">{cat?.label.replace(/^\S+\s/,"")||""} › {e.subcat}{e.desc?` — ${e.desc}`:""}</p>
                    <p className="text-xs text-slate-500">{fmt(e.date)}</p>
                  </div>
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    <button onClick={()=>startEdit(e)} className="text-slate-500 hover:text-blue-400 text-sm px-1">✏️</button>
                    <button onClick={()=>del(e.id)} className="text-slate-600 hover:text-rose-400 text-xl">×</button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length===0&&<EmptyState msg={`Sin gastos${filterBucket!=="all"?` en ${BUCKETS[filterBucket]?.label}`:""} — ${fmtMo(filterMo)}`}/>}
      </div>

      {(()=>{
        const wifeExp=data.expenses.filter(e=>e.isWife);
        const totalOwed=wifeExp.reduce((s,e)=>s+e.amount,0);
        const totalPaid=(data.wifePayments||[]).reduce((s,p)=>s+p.amount,0);
        const balance=totalOwed-totalPaid;
        if(wifeExp.length===0) return null;
        return(
          <div className="mt-2">
            <button onClick={()=>setShowWifeDetail(!showWifeDetail)}
              className={`w-full rounded-2xl p-4 border transition-all text-left ${balance>0?"bg-violet-900/30 border-violet-700/50":"bg-emerald-900/20 border-emerald-700/40"}`}>
              <div className="flex justify-between items-center">
                <div><p className="text-sm font-bold text-white">👩 Tu esposa te debe</p><p className="text-xs text-slate-400">{wifeExp.length} gasto{wifeExp.length!==1?"s":""} · toca para ver</p></div>
                <div className="text-right"><p className={`text-2xl font-black ${balance>0?"text-violet-400":"text-emerald-400"}`}>{CLP(balance)}</p><p className="text-xs text-slate-500">{balance<=0?"Al día ✅":"pendiente"}</p></div>
              </div>
            </button>
            {showWifeDetail&&(
              <Card className="mt-2">
                <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Detalle deuda esposa</p>
                {wifeExp.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
                  <div key={e.id} className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div><p className="text-sm text-slate-300">{e.desc||e.subcat||"Gasto"}</p><p className="text-xs text-slate-500">{fmt(e.date)}</p></div>
                    <span className="text-violet-400 font-semibold">{CLP(e.amount)}</span>
                  </div>
                ))}
                {(data.wifePayments||[]).map((p,i)=>(
                  <div key={i} className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div><p className="text-sm text-emerald-400">Pago recibido</p><p className="text-xs text-slate-500">{fmt(p.date)}</p></div>
                    <span className="text-emerald-400 font-semibold">−{CLP(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-3 border-t border-slate-700 mt-1">
                  <span className="text-slate-300">Saldo pendiente</span>
                  <span className={balance>0?"text-violet-400":"text-emerald-400"}>{CLP(balance)}</span>
                </div>
                {balance>0&&(
                  <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400">Registrar pago de tu esposa</p>
                    <div className="flex gap-2">
                      <input type="number" min="0" step="1000" value={wifePayAmt} onChange={e=>setWifePayAmt(e.target.value)} placeholder="Monto ($)"
                        className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:outline-none"/>
                      <Btn sm color="green" onClick={()=>{if(!wifePayAmt)return;onChange({...data,wifePayments:[...(data.wifePayments||[]),{amount:parseFloat(wifePayAmt),date:toDay(),id:uid()}]});setWifePayAmt("");}}>✓</Btn>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ALIMENTACION (replaces Supermercado — now broader)
// ═══════════════════════════════════════════════════
function Alimentacion({data,onChange}){
  const [show,setShow]=useState(false);
  const [f,setF]=useState({date:toDay(),store:"",storeType:"Supermercado",payMethod:"Débito",cardId:"",items:[{name:"",amount:""}]});
  const STORE_TYPES=["Supermercado","Almacén/Minimarket","Feria/Verdulería","Carnicería","Panadería","Otro"];
  const addItem=()=>setF({...f,items:[...f.items,{name:"",amount:""}]});
  const rmItem=i=>setF({...f,items:f.items.filter((_,idx)=>idx!==i)});
  const setItem=(i,field,val)=>{const items=f.items.map((it,idx)=>idx===i?{...it,[field]:val}:it);setF({...f,items});};
  const total=f.items.reduce((s,it)=>s+(parseFloat(it.amount)||0),0);
  const save=()=>{
    const valid=f.items.filter(it=>it.name&&it.amount);
    if(!valid.length||!f.date)return;
    const p={...f,id:uid(),items:valid.map(it=>({...it,amount:parseFloat(it.amount)})),total:valid.reduce((s,it)=>s+parseFloat(it.amount),0)};
    onChange({...data,groceries:[...data.groceries,p]});
    setF({date:toDay(),store:"",storeType:"Supermercado",payMethod:"Débito",items:[{name:"",amount:""}]}); setShow(false);
  };
  const del=id=>onChange({...data,groceries:data.groceries.filter(g=>g.id!==id)});
  return(
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="🛒 Alimentación" sub="Supermercado, feria, almacén…"/>
        <Btn sm color={show?"gray":"blue"} onClick={()=>setShow(!show)}>{show?"Cancelar":"+ Compra"}</Btn>
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-slate-500">Clasificado automáticamente como</span>
        <BucketPill bucketId="necesidades"/>
      </div>
      {show&&(
        <Card>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Fecha" type="date" value={f.date} onChange={v=>setF({...f,date:v})}/>
              <Sel label="Tipo de local" value={f.storeType} onChange={v=>setF({...f,storeType:v})} options={STORE_TYPES}/>
            </div>
            <Inp label="Nombre del local (opcional)" value={f.store} onChange={v=>setF({...f,store:v})} placeholder="Ej: Líder Express"/>
            <Sel label="Medio de pago" value={f.payMethod} onChange={v=>setF({...f,payMethod:v})} options={PAYS}/>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-slate-400 font-medium">Ítems</label>
                <Btn sm color="gray" onClick={addItem}>+ Ítem</Btn>
              </div>
              {f.items.map((it,i)=>(
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input value={it.name} onChange={e=>setItem(i,"name",e.target.value)} placeholder="Producto"
                    className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none min-w-0"/>
                  <input type="number" value={it.amount} onChange={e=>setItem(i,"amount",e.target.value)} placeholder="$" min="0" step="100"
                    className="w-24 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none"/>
                  {f.items.length>1&&<button onClick={()=>rmItem(i)} className="text-slate-500 hover:text-rose-400 text-lg">×</button>}
                </div>
              ))}
              <div className="flex justify-between mt-3 pt-3 border-t border-slate-700">
                <span className="text-sm text-slate-400">Total</span>
                <span className="text-white font-bold text-lg">{CLP(total)}</span>
              </div>
            </div>
            <Btn full color="blue" onClick={save} disabled={!f.items.some(it=>it.name&&it.amount)}>Guardar</Btn>
          </div>
        </Card>
      )}
      {data.groceries.sort((a,b)=>b.date.localeCompare(a.date)).map(g=>(
        <Card key={g.id}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-white font-bold">{g.storeType||"Compra"}{g.store?` — ${g.store}`:""}</p>
              <div className="flex gap-2 mt-1"><Badge>{fmt(g.date)}</Badge><Badge color={g.payMethod==="CMR/Crédito"?"amber":"gray"}>{g.payMethod}</Badge></div>
            </div>
            <div className="flex items-center gap-2"><p className="text-white font-bold text-lg">{CLP(g.total)}</p><button onClick={()=>del(g.id)} className="text-slate-600 hover:text-rose-400 text-xl">×</button></div>
          </div>
          <div className="border-t border-slate-700 pt-2 space-y-1">
            {g.items.map((it,i)=><div key={i} className="flex justify-between text-sm"><span className="text-slate-300">{it.name}</span><span className="text-slate-400">{CLP(it.amount)}</span></div>)}
          </div>
        </Card>
      ))}
      {data.groceries.length===0&&<EmptyState msg="Sin compras registradas"/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TARJETAS
// ═══════════════════════════════════════════════════
function CardVisual({card,used}){
  const avail=Math.max(0,(card.creditLimit||0)-used);
  const p=pct(used,card.creditLimit||1);
  const bg=card.color||"#3B82F6";
  return(
    <div className="rounded-2xl p-4 relative overflow-hidden select-none" style={{background:`linear-gradient(135deg,${bg}ee,${bg}77)`}}>
      <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle,white 1px,transparent 1px)",backgroundSize:"20px 20px"}}/>
      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <div><p className="text-white/60 text-xs">{card.bank||"Banco"}</p><p className="text-white font-bold">{card.name}</p></div>
          <p className="text-white/70 font-mono text-sm">••• {card.lastFour||"0000"}</p>
        </div>
        <p className="text-white text-2xl font-black">{CLP(card.creditLimit||0)}</p>
        <p className="text-white/50 text-xs mb-2">límite de crédito</p>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/70">Usado: {CLP(used)} ({p}%)</span>
          <span className="text-white/70">Libre: {CLP(avail)}</span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${p>80?"bg-rose-400":p>60?"bg-amber-400":"bg-white/80"}`} style={{width:`${p}%`}}/>
        </div>
      </div>
    </div>
  );
}

function Tarjetas({data,onChange}){
  const [view,setView]=useState("list");
  const [selCard,setSelCard]=useState(null);
  const [cardF,setCardF]=useState({name:"",bank:"BancoEstado",lastFour:"",creditLimit:"",billingDay:"19",color:CARD_COLORS[0]});
  const [purF,setPurF]=useState({cardId:"",desc:"",totalAmount:"",installments:"1",annualRate:"0",date:toDay(),firstPaymentMonth:curMo(),bucket:"estilo",catId:"varios",subcat:"Otro",isWife:false});

  const saveCard=()=>{
    if(!cardF.name||!cardF.creditLimit)return;
    const card={...cardF,id:uid(),creditLimit:parseFloat(cardF.creditLimit),billingDay:parseInt(cardF.billingDay)||19};
    onChange({...data,cards:[...data.cards,card]});
    setCardF({name:"",bank:"BancoEstado",lastFour:"",creditLimit:"",billingDay:"19",color:CARD_COLORS[0]}); setView("list");
  };
  const delCard=id=>{
    onChange({...data,cards:data.cards.filter(c=>c.id!==id),purchases:data.purchases.filter(p=>p.cardId!==id)});
    if(selCard===id){setSelCard(null);setView("list");}
  };
  const savePurchase=()=>{
    const n=parseInt(purF.installments)||1; const principal=parseFloat(purF.totalAmount)||0; const rate=parseFloat(purF.annualRate)||0;
    if(!principal||!purF.cardId||!purF.desc)return;
    const installmentAmt=calcInstAmt(principal,rate,n);
    const p={...purF,id:uid(),totalAmount:principal,installments:n,annualRate:rate,installmentAmt,cancelled:false};
    onChange({...data,purchases:[...data.purchases,p]});
    setPurF({cardId:selCard||"",desc:"",totalAmount:"",installments:"1",annualRate:"0",date:toDay(),firstPaymentMonth:curMo(),bucket:"estilo",catId:"varios",subcat:"Otro",isWife:false});
    setView(selCard?"cardDetail":"list");
  };
  const cancelPurchase=id=>onChange({...data,purchases:data.purchases.map(p=>p.id===id?{...p,cancelled:true}:p)});

  if(view==="cardDetail"&&selCard){
    const card=data.cards.find(c=>c.id===selCard); if(!card)return <div/>;
    const cycle=cardCycle(card);
    const daysLeft=Math.max(0,Math.ceil((cycle.end-new Date())/86400000));
    const activePurchases=data.purchases.filter(p=>p.cardId===selCard&&!p.cancelled);
    const used=cardTotalUsed(card,data.purchases,data.expenses,data.groceries,data.cardPayments);
    const avail=Math.max(0,(card.creditLimit||0)-used);
    const nextMos=[curMo(),...[1,2,3].map(i=>addMonths(curMo()+"-01",i).slice(0,7))];
    const monthlyDue=nextMos.map(mo=>({mo,total:activePurchases.reduce((s,p)=>{const i=instForMonth(p,mo);return s+(i?i.amount:0);},0)}));
    return(
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>{setView("list");setSelCard(null);}} className="text-slate-400 hover:text-white text-2xl">←</button>
          <SectionHeader title={card.name} sub={card.bank}/>
        </div>
        <CardVisual card={card} used={used}/>
        <div className="grid grid-cols-2 gap-2">
          {[{l:"Deuda total",v:CLP(used),c:"text-amber-400"},{l:"Cupo libre",v:CLP(avail),c:"text-emerald-400"},{l:"Corte en",v:`${daysLeft}d`,c:daysLeft<=3?"text-rose-400":daysLeft<=7?"text-amber-400":"text-white"},{l:"Fecha corte",v:fmt(cycle.end.toISOString().split("T")[0]),c:"text-slate-300"}]
            .map(({l,v,c})=><Card key={l} className="text-center !p-3"><p className="text-xs text-slate-400 mb-1">{l}</p><p className={`font-bold ${c}`}>{v}</p></Card>)}
        </div>
        {/* Register payment */}
        {(()=>{
          const payments=(data.cardPayments||[]).filter(p=>p.cardId===selCard);
          const totalPaid=payments.reduce((s,p)=>s+p.amount,0);
          return(
            <Card className="border border-emerald-700/40">
              <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">💳 Pago de tarjeta</p>
              {payments.length>0&&(
                <div className="mb-3 space-y-1">
                  {payments.slice(-3).reverse().map((p,i)=>(
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-400">{fmt(p.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">−{CLP(p.amount)}</span>
                        <button onClick={()=>onChange({...data,cardPayments:(data.cardPayments||[]).filter((_,idx)=>idx!==((data.cardPayments||[]).findIndex(x=>x===p)))})}
                          className="text-slate-600 hover:text-rose-400 text-sm">×</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-700">
                    <span>Total pagado</span><span className="text-emerald-400">{CLP(totalPaid)}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input type="number" min="0" step="1000"
                  id={`pay-${selCard}`}
                  placeholder="Monto pagado ($)"
                  className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 focus:outline-none"/>
                <Btn sm color="green" onClick={()=>{
                  const inp=document.getElementById(`pay-${selCard}`);
                  const amt=parseFloat(inp?.value||0);
                  if(!amt)return;
                  onChange({...data,cardPayments:[...(data.cardPayments||[]),{cardId:selCard,amount:amt,date:toDay(),id:uid()}]});
                  if(inp)inp.value="";
                }}>Registrar pago</Btn>
              </div>
            </Card>
          );
        })()}
        {/* Direct charges this cycle */}
        {(()=>{
          const dc=cardDirectCharges(card,data.expenses,data.groceries);
          const instBal=cardUsed(card,data.purchases);
          return dc>0?(
            <Card className="border border-amber-700/40">
              <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">💳 Cargos ciclo actual</p>
              <div className="space-y-2 text-sm">
                {instBal>0&&<div className="flex justify-between"><span className="text-slate-400">Saldo cuotas pendientes</span><span className="text-white font-semibold">{CLP(instBal)}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">Cargos directos (gastos/super)</span><span className="text-amber-400 font-semibold">{CLP(dc)}</span></div>
                <div className="flex justify-between border-t border-slate-700 pt-2"><span className="text-slate-300 font-semibold">Total usado</span><span className="text-amber-400 font-bold">{CLP(dc+instBal)}</span></div>
              </div>
            </Card>
          ):null;
        })()}
        <Card>
          <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Cuotas por mes</p>
          {monthlyDue.filter(m=>m.total>0).map(({mo,total})=>(
            <div key={mo} className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
              <span className="text-slate-300 text-sm capitalize">{fmtMo(mo)}</span>
              <span className={`font-bold ${mo===curMo()?"text-amber-400":"text-white"}`}>{CLP(total)}</span>
            </div>
          ))}
          {monthlyDue.every(m=>m.total===0)&&<p className="text-slate-500 text-sm text-center py-3">Sin cuotas pendientes</p>}
        </Card>
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold text-white">Compras activas ({activePurchases.length})</p>
          <Btn sm color="blue" onClick={()=>{setPurF({...purF,cardId:selCard});setView("addPurchase");}}>+ Compra</Btn>
        </div>
        {activePurchases.map(p=>{
          const paid=paidInsts(p); const remaining=p.installments-paid; const balance=remainBal(p);
          const interest=Math.round((p.installmentAmt*p.installments)-p.totalAmount);
          return(
            <Card key={p.id} className="!p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1"><p className="text-white font-semibold text-sm">{p.desc}</p><div className="flex gap-1.5 mt-1"><BucketPill bucketId={p.bucket}/></div></div>
                <button onClick={()=>cancelPurchase(p.id)} className="text-slate-600 hover:text-rose-400 text-xs ml-2">Cancelar</button>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Cuota {paid}/{p.installments}</span><span>{CLP(p.installmentAmt)}/mes</span><span className="text-amber-400">Saldo: {CLP(balance)}</span>
              </div>
              <ProgressBar value={paid} max={p.installments} color="bg-blue-500" height="h-1.5"/>
              {interest>0&&<p className="text-xs text-rose-400/70 mt-1">Interés total: {CLP(interest)}</p>}
            </Card>
          );
        })}
        {activePurchases.length===0&&<EmptyState msg="Sin compras en esta tarjeta"/>}
      </div>
    );
  }

  if(view==="addCard") return(
    <div className="space-y-4">
      <div className="flex items-center gap-3"><button onClick={()=>setView("list")} className="text-slate-400 hover:text-white text-2xl">←</button><SectionHeader title="Nueva tarjeta"/></div>
      <Card>
        <div className="space-y-3">
          <Inp label="Nombre" value={cardF.name} onChange={v=>setCardF({...cardF,name:v})} placeholder="Ej: Visa BCI Gold"/>
          <Sel label="Banco" value={cardF.bank} onChange={v=>setCardF({...cardF,bank:v})} options={BANKS}/>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Últimos 4 dígitos" value={cardF.lastFour} onChange={v=>setCardF({...cardF,lastFour:v.slice(0,4)})} placeholder="1234"/>
            <Inp label="Límite ($)" type="number" min="0" step="100000" value={cardF.creditLimit} onChange={v=>setCardF({...cardF,creditLimit:v})} placeholder="1000000"/>
          </div>
          <Inp label="Día de corte" type="number" min="1" max="31" value={cardF.billingDay} onChange={v=>setCardF({...cardF,billingDay:v})} placeholder="19"/>
          <div><label className="text-xs text-slate-400 font-medium block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">{CARD_COLORS.map(c=><button key={c} onClick={()=>setCardF({...cardF,color:c})} className={`w-8 h-8 rounded-full transition-all ${cardF.color===c?"ring-2 ring-white scale-110":""}`} style={{background:c}}/>)}</div>
          </div>
          <Btn full color="blue" onClick={saveCard} disabled={!cardF.name||!cardF.creditLimit}>Agregar tarjeta</Btn>
        </div>
      </Card>
    </div>
  );

  if(view==="addPurchase"){
    const n=parseInt(purF.installments)||1; const principal=parseFloat(purF.totalAmount)||0; const rate=parseFloat(purF.annualRate)||0;
    const instAmt=principal>0?calcInstAmt(principal,rate,n):0;
    const purBucketCats=CATS[purF.bucket]||[];
    const purSelCat=purBucketCats.find(c=>c.id===purF.catId);
    return(
      <div className="space-y-4">
        <div className="flex items-center gap-3"><button onClick={()=>setView(selCard?"cardDetail":"list")} className="text-slate-400 hover:text-white text-2xl">←</button><SectionHeader title="Nueva compra TC"/></div>
        <Card>
          <div className="space-y-3">
            {!selCard&&<Sel label="Tarjeta" value={purF.cardId} onChange={v=>setPurF({...purF,cardId:v})} options={data.cards.map(c=>({value:c.id,label:`${c.name} (•••${c.lastFour})`}))} placeholder="Selecciona tarjeta"/>}
            <Inp label="Descripción" value={purF.desc} onChange={v=>setPurF({...purF,desc:v})} placeholder="Ej: TV Samsung"/>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Monto total ($)" type="number" min="0" step="1000" value={purF.totalAmount} onChange={v=>setPurF({...purF,totalAmount:v})} placeholder="0"/>
              <Inp label="Fecha" type="date" value={purF.date} onChange={v=>setPurF({...purF,date:v})}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="N° cuotas" type="number" min="1" max="60" value={purF.installments} onChange={v=>setPurF({...purF,installments:v})} placeholder="1"/>
              <Inp label="CAE anual (%)" type="number" min="0" step="0.5" value={purF.annualRate} onChange={v=>setPurF({...purF,annualRate:v})} placeholder="0"/>
            </div>
            <Inp label="Mes en que se genera la 1ª cuota" type="month" value={purF.firstPaymentMonth} onChange={v=>setPurF({...purF,firstPaymentMonth:v})}/>
            <p className="text-xs text-slate-500 -mt-2">El pago se cobra el mes siguiente (ej: cuota mayo → se paga en junio)</p>
            {instAmt>0&&(
              <div className="bg-slate-700/50 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Cuota mensual</span><span className="text-white font-bold">{CLP(instAmt)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total a pagar</span><span className="text-white">{CLP(instAmt*n)}</span></div>
                {instAmt*n>principal&&<div className="flex justify-between"><span className="text-slate-400">Interés total</span><span className="text-rose-400">{CLP(Math.round(instAmt*n-principal))}</span></div>}
              </div>
            )}
            {/* Bucket for 50/30/20 classification */}
            
            <Toggle value={purF.isWife} onChange={v=>setPurF({...purF,isWife:v})} label="👩 Compra de mi esposa"/>
            {purF.isWife&&<p className="text-xs text-amber-300 bg-amber-900/30 px-3 py-2 rounded-xl">Se excluye del 50/30/20 y suma a la deuda de tu esposa</p>}
            {!purF.isWife&&(
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-2">Clasificar en 50/30/20</label>
                <div className="flex gap-2">
                  {["necesidades","estilo"].map(k=>{const b=BUCKETS[k];return <button key={k} onClick={()=>setPurF({...purF,bucket:k,catId:"",subcat:""})} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${purF.bucket===k?`${b.bg} text-white`:"bg-slate-700 text-slate-400"}`}>{b.emoji} {b.label}</button>;})}
                </div>
              </div>
            )}
            <Sel label="Categoría" value={purF.catId} onChange={v=>setPurF({...purF,catId:v,subcat:""})} options={purBucketCats.map(c=>({value:c.id,label:c.label}))} placeholder="Categoría"/>
            {purSelCat&&<Sel label="Subcategoría" value={purF.subcat} onChange={v=>setPurF({...purF,subcat:v})} options={purSelCat.subs} placeholder="Subcategoría"/>}
            <Btn full color="blue" onClick={savePurchase} disabled={!purF.totalAmount||!purF.desc||((!selCard)&&!purF.cardId)}>Guardar compra</Btn>
          </div>
        </Card>
      </div>
    );
  }

  // Card list
  return(
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SectionHeader title="💳 Tarjetas"/>
        <div className="flex gap-2">
          <Btn sm color="gray" onClick={()=>{setPurF({...purF,cardId:""});setView("addPurchase");}}>+ Compra</Btn>
          <Btn sm color="blue" onClick={()=>setView("addCard")}>+ Tarjeta</Btn>
        </div>
      </div>
      {data.cards.length===0&&<EmptyState msg="Agrega tu primera tarjeta de crédito"/>}
      {data.cards.map(card=>{
        const used=cardTotalUsed(card,data.purchases,data.expenses,data.groceries,data.cardPayments);
        const active=data.purchases.filter(p=>p.cardId===card.id&&!p.cancelled);
        const cycle=cardCycle(card);
        const daysLeft=Math.max(0,Math.ceil((cycle.end-new Date())/86400000));
        return(
          <div key={card.id} className="mb-4">
            <button className="w-full text-left" onClick={()=>{setSelCard(card.id);setView("cardDetail");}}>
              <CardVisual card={card} used={used}/>
            </button>
            <div className="flex justify-between items-center px-1 mt-2">
              <span className="text-xs text-slate-500">{active.length} compra{active.length!==1?"s":""} activa{active.length!==1?"s":""} · Corte en {daysLeft}d</span>
              <div className="flex gap-3">
                <button onClick={()=>{setSelCard(card.id);setPurF({...purF,cardId:card.id});setView("addPurchase");}} className="text-xs text-blue-400">+ compra</button>
                <button onClick={()=>delCard(card.id)} className="text-xs text-slate-600 hover:text-rose-400">eliminar</button>
              </div>
            </div>
          </div>
        );
      })}
      {data.cards.length>1&&(()=>{
        const totalUsed2=data.cards.reduce((s,c)=>s+cardTotalUsed(c,data.purchases,data.expenses,data.groceries,data.cardPayments),0);
        const totalLimit2=data.cards.reduce((s,c)=>s+(c.creditLimit||0),0);
        const totalDue=data.purchases.filter(p=>!p.cancelled).reduce((s,p)=>{const i=instForMonth(p,curMo());return s+(i?i.amount:0);},0);
        return(
          <Card>
            <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Resumen total</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Deuda total</span><span className="text-amber-400 font-bold">{CLP(totalUsed2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Cuotas este mes</span><span className="text-rose-400 font-bold">{CLP(totalDue)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Cupo total libre</span><span className="text-emerald-400 font-bold">{CLP(Math.max(0,totalLimit2-totalUsed2))}</span></div>
            </div>
            {totalLimit2>0&&<div className="mt-3"><ProgressBar value={totalUsed2} max={totalLimit2} color={undefined}/></div>}
          </Card>
        );
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════
function Estadisticas({data}){
  const [period,setPeriod]=useState("6m");
  const n=period==="3m"?3:period==="6m"?6:12;
  const months=lastNMonths(n);
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length)return null;
    return <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs shadow-xl"><p className="text-white font-bold mb-2">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {CLP(p.value)}</p>)}</div>;
  };
  const monthlyData=months.map(mo=>{
    const dist=calcDistribution(data,mo);
    return {mo,label:fmtMoShort(mo),ingresos:dist.totalIncome,necesidades:dist.totalNec,estilo:dist.totalEst,futuro:dist.totalFut,balance:dist.totalIncome-dist.totalSpent};
  });
  const mo=curMo();
  const dist=calcDistribution(data,mo);
  const catData=ALL_CATS.map(cat=>{
    const v=data.expenses.filter(e=>e.date.startsWith(mo)&&e.catId===cat.id).reduce((s,e)=>s+e.amount,0)
      +(cat.id==="alimentos"?data.groceries.filter(g=>g.date.startsWith(mo)).reduce((s,g)=>s+g.total,0):0);
    return {name:cat.label.replace(/^\S+\s/,""),value:v,bucket:getCatBucket(cat.id)};
  }).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
  const totalExp=catData.reduce((s,c)=>s+c.value,0);
  const prevMo=lastNMonths(2)[0];
  const prevDist=calcDistribution(data,prevMo);
  const delta=prevDist.totalSpent>0?Math.round(((dist.totalSpent-prevDist.totalSpent)/prevDist.totalSpent)*100):0;
  return(
    <div className="space-y-4">
      <SectionHeader title="📊 Estadísticas"/>
      <div className="flex gap-2">
        {[["3m","3 meses"],["6m","6 meses"],["12m","12 meses"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriod(v)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${period===v?"bg-blue-600 text-white":"bg-slate-700 text-slate-400"}`}>{l}</button>
        ))}
      </div>
      {/* Trend */}
      {prevDist.totalSpent>0&&(
        <div className={`rounded-2xl p-3 flex items-center gap-3 ${delta>10?"bg-rose-900/30 border border-rose-700/50":delta<-10?"bg-emerald-900/30 border border-emerald-700/50":"bg-slate-800"}`}>
          <span className="text-2xl">{delta>10?"📈":delta<-10?"📉":"➡️"}</span>
          <div><p className="text-white text-sm font-bold">Gasto vs mes anterior: <span className={delta>0?"text-rose-400":"text-emerald-400"}>{delta>0?"+":""}{delta}%</span></p>
          <p className="text-xs text-slate-400">{CLP(prevDist.totalSpent)} → {CLP(dist.totalSpent)}</p></div>
        </div>
      )}
      {/* 50/30/20 evolution */}
      <Card>
        <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wider">Buckets 50/30/20 por mes</p>
        {monthlyData.some(m=>m.necesidades>0||m.estilo>0||m.futuro>0)?(
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}M`:v>=1000?`${Math.round(v/1000)}k`:v}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="necesidades" name="Necesidades" fill="#3B82F6" stackId="a" radius={[0,0,0,0]}/>
              <Bar dataKey="estilo" name="Estilo de vida" fill="#F59E0B" stackId="a" radius={[0,0,0,0]}/>
              <Bar dataKey="futuro" name="Futuro" fill="#10B981" stackId="a" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        ):<p className="text-slate-500 text-sm text-center py-10">Sin datos suficientes</p>}
      </Card>
      {/* Balance */}
      <Card>
        <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wider">Balance mensual</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
            <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${Math.round(v/1000)}k`:v}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="balance" name="Balance" radius={[4,4,0,0]}>
              {monthlyData.map((e,i)=><Cell key={i} fill={e.balance>=0?"#10B981":"#EF4444"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      {/* Pie by category */}
      {catData.length>0&&(
        <Card>
          <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wider">Por categoría — {fmtMo(mo)}</p>
          <div className="flex gap-4 items-center">
            <PieChart width={120} height={120}>
              <Pie data={catData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                {catData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
            </PieChart>
            <div className="flex-1 min-w-0">
              {catData.slice(0,6).map((c,i)=>(
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                  <span className="text-xs text-slate-300 truncate flex-1">{c.name}</span>
                  <span className="text-xs text-slate-400">{Math.round(c.value/totalExp*100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      {/* Distribution this month */}
      {dist.totalIncome>0&&(
        <Card>
          <p className="text-xs text-slate-400 font-medium mb-4 uppercase tracking-wider">Distribución detallada — {fmtMo(mo)}</p>
          <DistWidget dist={dist}/>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// FUTURO (Ahorro + Inversiones combined under Futuro)
// ═══════════════════════════════════════════════════
function Futuro({data,onChange}){
  const [tab2,setTab2]=useState("ahorro");
  const [activeF,setActiveF]=useState(null);
  const [confirmReset,setConfirmReset]=useState(null);
  const [op,setOp]=useState({amount:"",desc:"",type:"deposito"});
  const [editTarget,setEditTarget]=useState({});
  const [showInv,setShowInv]=useState(false);
  const [invF,setInvF]=useState({name:"",amount:"",returnAmount:"",startDate:toDay(),maturityDate:"",autoReinvest:false});
  const mo=curMo();

  const totalAhorro=Object.values(data.savings).reduce((s,f)=>s+f.balance,0);
  const totalInvActivo=data.investments.filter(i=>i.status==="activo").reduce((s,i)=>s+i.amount,0);
  const savMo=Object.values(data.savings).reduce((s,f)=>s+f.history.filter(h=>h.date.startsWith(mo)&&h.amount>0).reduce((ss,h)=>ss+h.amount,0),0);
  const invMo=data.investments.filter(i=>i.startDate.startsWith(mo)).reduce((s,i)=>s+i.amount,0);
  const totalFutMo=savMo+invMo;
  const dist=calcDistribution(data,mo);
  const targetFut=dist.totalIncome>0?Math.round(dist.totalIncome*0.2):0;

  const doOp=key=>{
    if(!op.amount)return;
    const amt=parseFloat(op.amount)*(op.type==="retiro"?-1:1);
    const fund={...data.savings[key],balance:data.savings[key].balance+amt,history:[...data.savings[key].history,{date:toDay(),amount:amt,desc:op.desc,type:op.type,id:uid()}]};
    onChange({...data,savings:{...data.savings,[key]:fund}});
    setOp({amount:"",desc:"",type:"deposito"}); setActiveF(null);
  };
  const resetFund=(key)=>{
    const fund=data.savings[key];
    onChange({...data,savings:{...data.savings,[key]:{...fund,balance:0,history:[]}}});
    setConfirmReset(null);
  };
  const delHistEntry=(key,entryId,entryIdx)=>{
    const fund=data.savings[key];
    // Support both id-based and index-based deletion (for old entries without id)
    const idx=entryId?fund.history.findIndex(h=>h.id===entryId):entryIdx;
    if(idx===-1&&entryId)return;
    const realIdx=idx!==-1?idx:entryIdx;
    const entry=fund.history[realIdx];
    if(!entry)return;
    const newHistory=fund.history.filter((_,i)=>i!==realIdx);
    const newBalance=fund.balance-entry.amount;
    onChange({...data,savings:{...data.savings,[key]:{...fund,balance:newBalance,history:newHistory}}});
  };
  const saveTarget=key=>{
    const t=parseFloat(editTarget[key])||0;
    onChange({...data,savings:{...data.savings,[key]:{...data.savings[key],target:t}}});
    setEditTarget({...editTarget,[key]:""});
  };
  const saveInv=()=>{
    if(!invF.amount||!invF.maturityDate)return;
    const inv={...invF,id:uid(),status:"activo",amount:parseFloat(invF.amount),returnAmount:parseFloat(invF.returnAmount)||0,history:[{date:invF.startDate,amount:parseFloat(invF.amount),type:"deposit",note:"Depósito inicial"}]};
    onChange({...data,investments:[...data.investments,inv]});
    setInvF({name:"",amount:"",returnAmount:"",startDate:toDay(),maturityDate:"",autoReinvest:false}); setShowInv(false);
  };
  const mature=id=>{
    const investments=data.investments.map(inv=>{
      if(inv.id!==id)return inv;
      const gain={date:toDay(),amount:(inv.returnAmount||inv.amount)-inv.amount,type:"gain",note:"Interés al vencer"};
      if(inv.autoReinvest){const reinvest={date:toDay(),amount:inv.returnAmount||inv.amount,type:"reinvest",note:"Reinversión automática"};return{...inv,amount:inv.returnAmount||inv.amount,startDate:toDay(),status:"activo",history:[...inv.history,gain,reinvest]};}
      return{...inv,status:"cobrado",history:[...inv.history,gain]};
    });
    onChange({...data,investments});
  };
  const delInv=id=>onChange({...data,investments:data.investments.filter(i=>i.id!==id)});

  return(
    <div className="space-y-4">
      <SectionHeader title="🟢 Futuro" sub="Ahorro e inversiones — objetivo 20%"/>
      {/* Futuro summary */}
      <Card className="border border-emerald-900/50">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-slate-400">Destinado al futuro este mes</p>
            <p className="text-emerald-400 text-2xl font-black">{CLP(totalFutMo)}</p>
            {targetFut>0&&<p className="text-xs text-slate-500 mt-0.5">objetivo {CLP(targetFut)} (20% de ingresos)</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Patrimonio total</p>
            <p className="text-white font-bold">{CLP(totalAhorro+totalInvActivo)}</p>
          </div>
        </div>
        {targetFut>0&&<ProgressBar value={totalFutMo} max={targetFut} color="bg-emerald-500"/>}
        {targetFut>0&&dist.pctFut<20&&<p className="text-xs text-amber-400 mt-1.5">⚡ Llevas {dist.pctFut}% — necesitas {CLP(Math.max(0,targetFut-totalFutMo))} más para el 20%</p>}
      </Card>
      <div className="flex gap-2">
        {[["ahorro","🐷 Fondos"],["inversion","📈 Inversiones"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab2(v)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab2===v?"bg-emerald-700 text-white":"bg-slate-700 text-slate-400"}`}>{l}</button>
        ))}
      </div>
      {tab2==="ahorro"&&(
        <div className="space-y-4">
          {Object.entries(data.savings).map(([key,fund])=>{
            const p2=fund.target>0?Math.min(100,(fund.balance/fund.target)*100):0;
            const isOpen=activeF===key;
            return(
              <Card key={key}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-white font-bold">{fund.emoji} {fund.label}</p>
                    <p className={`text-2xl font-black mt-1 ${fund.balance<0?"text-rose-400":"text-emerald-400"}`}>{CLP(fund.balance)}</p>
                    {fund.target>0&&<p className="text-xs text-slate-400 mt-0.5">Meta: {CLP(fund.target)} · {p2.toFixed(0)}%</p>}
                  </div>
                  <div className="flex gap-2">
                  {!isOpen&&<button onClick={()=>setConfirmReset(key)} className="text-xs text-slate-600 hover:text-rose-400 px-2 py-1 rounded-lg">Reset</button>}
                  <Btn sm color={isOpen?"gray":"green"} onClick={()=>{setActiveF(isOpen?null:key);setOp({amount:"",desc:"",type:"deposito"});}}>{isOpen?"Cerrar":"Mover"}</Btn>
                </div>
                </div>
                {fund.target>0&&<div className="mb-3"><ProgressBar value={fund.balance} max={fund.target} color="bg-emerald-500"/></div>}
                {confirmReset===key&&(
                  <div className="bg-rose-900/40 border border-rose-700/50 rounded-xl p-3 mb-2">
                    <p className="text-rose-300 text-sm font-semibold mb-2">¿Resetear saldo a $0 y borrar historial?</p>
                    <div className="flex gap-2">
                      <Btn sm color="red" onClick={()=>resetFund(key)}>Sí, resetear</Btn>
                      <Btn sm color="gray" onClick={()=>setConfirmReset(null)}>Cancelar</Btn>
                    </div>
                  </div>
                )}
                {!isOpen&&(<div className="flex gap-2"><input type="number" min="0" step="10000" value={editTarget[key]!==undefined?editTarget[key]:(fund.target||"")} onChange={e=>setEditTarget({...editTarget,[key]:e.target.value})} placeholder="Establecer meta..." className="flex-1 bg-slate-700 text-white rounded-xl px-3 py-2 text-sm border border-slate-600 focus:border-emerald-500 focus:outline-none"/><Btn sm color="gray" onClick={()=>saveTarget(key)}>✓</Btn></div>)}
                {isOpen&&(
                  <div className="space-y-3 border-t border-slate-700 pt-3 mt-2">
                    <div className="flex gap-2">{["deposito","retiro"].map(t=><button key={t} onClick={()=>setOp({...op,type:t})} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${op.type===t?t==="deposito"?"bg-emerald-600 text-white":"bg-rose-600 text-white":"bg-slate-700 text-slate-400"}`}>{t==="deposito"?"⬆️ Depositar":"⬇️ Retirar"}</button>)}</div>
                    <Inp label="Monto ($)" type="number" min="0" step="1000" value={op.amount} onChange={v=>setOp({...op,amount:v})} placeholder="0"/>
                    <Inp label="Nota" value={op.desc} onChange={v=>setOp({...op,desc:v})} placeholder="Ej: Ahorro mayo"/>
                    <Btn full color={op.type==="deposito"?"green":"red"} onClick={()=>doOp(key)} disabled={!op.amount}>Confirmar {op.type}</Btn>
                  </div>
                )}
                {fund.history.length>0&&!isOpen&&(
                  <div className="mt-3 border-t border-slate-700/60 pt-3">
                    {[...fund.history].reverse().map((h,i)=>(
                      <div key={h.id||i} className="flex justify-between items-center text-sm py-1 border-b border-slate-700/40 last:border-0">
                        <div className="flex-1 min-w-0 mr-2">
                          <span className="text-slate-300 truncate block">{h.desc||h.type}</span>
                          <span className="text-slate-500 text-xs">{fmt(h.date)}</span>
                        </div>
                        <span className={`font-semibold flex-shrink-0 mr-2 ${h.amount>=0?"text-emerald-400":"text-rose-400"}`}>{h.amount>=0?"+":""}{CLP(h.amount)}</span>
                        <button onClick={()=>delHistEntry(key,h.id,i)} className="text-slate-600 hover:text-rose-400 text-base flex-shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {tab2==="inversion"&&(
        <div className="space-y-4">
          <div className="flex justify-end"><Btn sm color={showInv?"gray":"green"} onClick={()=>setShowInv(!showInv)}>{showInv?"Cancelar":"+ Nuevo depósito"}</Btn></div>
          {showInv&&(
            <Card>
              <div className="space-y-3">
                <Inp label="Nombre / Banco" value={invF.name} onChange={v=>setInvF({...invF,name:v})} placeholder="Ej: BCI 30 días"/>
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Capital ($)" type="number" min="0" step="1000" value={invF.amount} onChange={v=>setInvF({...invF,amount:v})} placeholder="100000"/>
                  <Inp label="Monto a recibir ($)" type="number" min="0" step="1000" value={invF.returnAmount} onChange={v=>setInvF({...invF,returnAmount:v})} placeholder="101000"/>
                </div>
                {invF.amount&&invF.returnAmount&&parseFloat(invF.returnAmount)>parseFloat(invF.amount)&&(
                  <p className="text-xs text-emerald-400">Ganancia: {CLP(parseFloat(invF.returnAmount)-parseFloat(invF.amount))}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Fecha depósito" type="date" value={invF.startDate} onChange={v=>setInvF({...invF,startDate:v})}/>
                  <Inp label="Fecha vencimiento" type="date" value={invF.maturityDate} onChange={v=>setInvF({...invF,maturityDate:v})}/>
                </div>
                <Toggle value={invF.autoReinvest} onChange={v=>setInvF({...invF,autoReinvest:v})} label="Reinversión automática al vencer"/>
                <Btn full color="green" onClick={saveInv} disabled={!invF.amount||!invF.maturityDate}>Guardar</Btn>
              </div>
            </Card>
          )}
          {data.investments.filter(i=>i.status==="activo").map(inv=>{
            const gain=(inv.returnAmount||0)-inv.amount;
            const dLeft=Math.ceil((new Date(inv.maturityDate+"T12:00")-new Date())/86400000);
            const expired=dLeft<=0;
            return(
              <Card key={inv.id}>
                <div className="flex justify-between items-start mb-3">
                  <div><p className="text-white font-bold">{inv.name||"Depósito a plazo"}</p>
                    <p className="text-emerald-400 text-2xl font-black">{CLP(inv.amount)}</p>
                    {gain>0&&<p className="text-emerald-400 text-sm">+{CLP(gain)} al vencer</p>}
                    {inv.history.filter(h=>h.type==="reinvest").length>0&&<Badge color="green">Reinvertido {inv.history.filter(h=>h.type==="reinvest").length}×</Badge>}
                  </div>
                  <button onClick={()=>delInv(inv.id)} className="text-slate-600 hover:text-rose-400 text-xl">×</button>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mb-3">
                  <span>Desde: {fmt(inv.startDate)}</span>
                  <span className={expired?"text-rose-400 font-bold":dLeft<=7?"text-amber-400":""}>Vence: {fmt(inv.maturityDate)} {expired?"(VENCIDO)":dLeft<=7?`(${dLeft}d)`:""}</span>
                </div>
                <div className="flex items-center gap-2">
                  {inv.autoReinvest&&<Badge color="green">🔄 Auto-reinvierte</Badge>}
                  {expired&&<Btn sm color="green" onClick={()=>mature(inv.id)}>{inv.autoReinvest?"🔄 Reinvertir":"💰 Cobrar"}</Btn>}
                </div>
              </Card>
            );
          })}
          {data.investments.filter(i=>i.status==="activo").length===0&&!showInv&&<EmptyState msg="Sin depósitos a plazo activos"/>}
          {data.investments.filter(i=>i.status==="cobrado").length>0&&(
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider px-1 mb-2">Historial cobrado</p>
              {data.investments.filter(i=>i.status==="cobrado").map(inv=>(
                <Card key={inv.id} className="mb-2 opacity-60 !p-3">
                  <div className="flex justify-between"><div><p className="text-slate-300 font-semibold">{inv.name}</p><p className="text-slate-400 text-sm">{CLP(inv.amount)} · cobrado {fmt(inv.maturityDate)}</p></div><button onClick={()=>delInv(inv.id)} className="text-slate-600 hover:text-rose-400">×</button></div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════
// ═══ CONFIG ═══
function Config({data,onChange}){
  const [importError,setImportError]=useState("");
  const [importSuccess,setImportSuccess]=useState(false);
  const [showExport,setShowExport]=useState(false);
  const base=data.config?.budgetBase||750000;
  const [newBase,setNewBase]=useState(String(base));

  const saveBase=()=>onChange({...data,config:{...(data.config||{}),budgetBase:parseFloat(newBase)||750000}});

  const exportJson=JSON.stringify(data,null,2);



  return(
    <div className="space-y-4">
      <SectionHeader title="⚙️ Configuración"/>

      {/* Export / Import */}
      <Card>
        <p className="text-sm font-bold text-white mb-1">📦 Exportar / Importar datos</p>
        <p className="text-xs text-slate-400 mb-4">Exporta tus datos para hacer respaldo o para pasarlos a otro dispositivo. Importa para restaurarlos.</p>
        <div className="space-y-3">
          <Btn full color="blue" onClick={()=>setShowExport(!showExport)}>
            {showExport?"Ocultar datos":"⬇️ Exportar — ver mis datos"}
          </Btn>
          {showExport&&(
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Copia todo el texto de abajo y guárdalo en un archivo .txt o .json</p>
              <textarea readOnly value={exportJson} rows={6}
                className="w-full bg-slate-900 text-emerald-400 text-xs rounded-xl p-3 border border-slate-600 font-mono resize-none"
                onFocus={e=>e.target.select()}/>
              <p className="text-xs text-slate-500">Toca el texto → Ctrl+A → Ctrl+C para copiar todo</p>
            </div>
          )}
          <div className="border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-400 font-semibold mb-2">⬆️ Importar datos</p>
            <p className="text-xs text-slate-500 mb-2">Pega aquí el texto que exportaste anteriormente</p>
            <textarea id="import-textarea" rows={4} placeholder='Pega aquí el JSON exportado...'
              className="w-full bg-slate-900 text-slate-300 text-xs rounded-xl p-3 border border-slate-600 font-mono resize-none mb-2"/>
            <Btn full color="green" onClick={()=>{
              const txt=document.getElementById("import-textarea")?.value;
              if(!txt)return;
              try{
                const parsed=JSON.parse(txt);
                if(!parsed.incomes||!parsed.expenses) throw new Error();
                onChange({...INIT,...parsed,savings:{...INIT.savings,...(parsed.savings||{})},cards:parsed.cards||[],purchases:parsed.purchases||[],config:{...INIT.config,...(parsed.config||{})}});
                setImportSuccess(true); setImportError("");
                document.getElementById("import-textarea").value="";
                setTimeout(()=>setImportSuccess(false),3000);
              }catch{setImportError("Texto inválido — asegúrate de pegar el JSON completo");}
            }}>Importar datos</Btn>
          </div>
          {importError&&<p className="text-xs text-rose-400 bg-rose-900/30 px-3 py-2 rounded-xl">{importError}</p>}
          {importSuccess&&<p className="text-xs text-emerald-400 bg-emerald-900/30 px-3 py-2 rounded-xl">✅ Datos importados correctamente</p>}
        </div>
        <div className="mt-4 p-3 bg-slate-700/40 rounded-xl">
          <p className="text-xs text-slate-400 font-semibold mb-1">¿Cómo sincronizar celular ↔ PC?</p>
          <p className="text-xs text-slate-500">1. Exporta desde el celular → guarda el archivo en un lugar accesible (Drive, WhatsApp, email)</p>
          <p className="text-xs text-slate-500 mt-1">2. Desde el PC, importa ese archivo y tendrás todo al día</p>
        </div>
      </Card>

      {/* Budget base */}
      <Card>
        <p className="text-sm font-bold text-white mb-1">Presupuesto base mensual</p>
        <p className="text-xs text-slate-400 mb-3">Base para calcular el 50/30/20. Normalmente tu sueldo fijo garantizado.</p>
        <Inp label="Monto base ($)" type="number" min="0" step="10000" value={newBase} onChange={setNewBase} placeholder="750000"/>
        <div className="mt-3 space-y-1.5 text-sm">
          {[["🔵 Necesidades (50%)",0.5],["🟡 Estilo de vida (30%)",0.3],["🟢 Futuro (20%)",0.2]].map(([l,p])=>(
            <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="text-white font-semibold">{CLP(Math.round((parseFloat(newBase)||0)*p))}</span></div>
          ))}
        </div>
        <div className="mt-4"><Btn full color="blue" onClick={saveBase}>Guardar</Btn></div>
      </Card>

      {/* CMR reminder */}
      <Card>
        <p className="text-sm font-bold text-white mb-2">💳 Ciclo CMR</p>
        <p className="text-xs text-slate-400">Corte el día <span className="text-amber-400 font-semibold">19</span> de cada mes (ajustado a viernes si cae fin de semana).</p>
        <p className="text-xs text-slate-400 mt-1">Recomendación: CMR del 1 al 19 · Débito del 20 al 31</p>
      </Card>
    </div>
  );
}


const TABS=[
  {id:"dashboard", icon:"🏠", label:"Inicio"},
  {id:"ingresos",  icon:"💰", label:"Ingresos"},
  {id:"gastos",    icon:"💸", label:"Gastos"},
  {id:"alimentos", icon:"🛒", label:"Alimentos"},
  {id:"tarjetas",  icon:"💳", label:"Tarjetas"},
  {id:"stats",     icon:"📊", label:"Stats"},
  {id:"futuro",    icon:"🟢", label:"Futuro"},
  {id:"config",    icon:"⚙️", label:"Config"},
];

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [data,setData]=useState(INIT);
  const [loaded,setLoaded]=useState(false);
  const [gsStatus,setGsStatus]=useState("loading"); // "loading"|"ok"|"error"
  const navRef=useRef(null);

  useEffect(()=>{
    const link=document.createElement("link");
    link.href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap";
    link.rel="stylesheet"; document.head.appendChild(link);
    (async()=>{
      try{
        const parsed = await gsLoad();
        if(parsed){
          setData({...INIT,...parsed,savings:{...INIT.savings,...(parsed.savings||{})},cards:parsed.cards||[],purchases:parsed.purchases||[]});
          setGsStatus("ok");
        } else {
          setGsStatus("error");
        }
      }catch(e){
        console.error("gsLoad error:",e);
        setGsStatus("error");
      }
      setLoaded(true);
    })();
  },[]);

  const onChange=useCallback(async nd=>{
    setData(nd);
    try{ await gsSave(nd); }catch{}
  },[]);

  useEffect(()=>{
    if(!navRef.current)return;
    const btn=navRef.current.querySelector(`[data-tab="${tab}"]`);
    if(btn)btn.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  },[tab]);

  if(!loaded)return(
    <div style={{fontFamily:"'Sora',sans-serif"}} className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Cargando desde Google Sheets…</p>
    </div>
  );

  // If GS failed to load, show a recovery screen instead of empty app
  if(gsStatus==="error"){
    return(
      <div style={{fontFamily:"'Sora',sans-serif"}} className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-3xl">⚠️</p>
        <p className="text-white font-bold text-center text-lg">No se pudo conectar con Google Sheets</p>
        <p className="text-slate-400 text-sm text-center">Claude.ai bloquea las llamadas externas. Tus datos siguen en Sheets — no se perdieron.</p>
        <div className="bg-slate-800 rounded-2xl p-4 w-full max-w-sm border border-slate-700 space-y-2">
          <p className="text-slate-300 text-sm font-semibold">📋 Cómo recuperar tus datos:</p>
          <p className="text-slate-400 text-xs">1. Abre tu Google Sheet</p>
          <p className="text-slate-400 text-xs">2. Copia el contenido de la celda <span className="text-amber-400 font-mono">B2</span> (es un JSON largo)</p>
          <p className="text-slate-400 text-xs">3. Ve a ⚙️ Config → Importar datos → pega y guarda</p>
        </div>
        <button onClick={()=>setGsStatus("ok")}
          className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold text-sm transition-all">
          Continuar sin Sheets →
        </button>
      </div>
    );
  }

  const mo=curMo();
  const dist=calcDistribution(data,mo);
  const panels={dashboard:<Dashboard data={data}/>,ingresos:<Ingresos data={data} onChange={onChange}/>,gastos:<Gastos data={data} onChange={onChange}/>,alimentos:<Alimentacion data={data} onChange={onChange}/>,tarjetas:<Tarjetas data={data} onChange={onChange}/>,stats:<Estadisticas data={data}/>,futuro:<Futuro data={data} onChange={onChange}/>,config:<Config data={data} onChange={onChange}/>};

  return(
    <div style={{fontFamily:"'Sora',sans-serif"}} className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/95 backdrop-blur border-b border-slate-700/80 px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div>
            <p className="font-black text-white text-base">💹 FinanzasHub</p>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}</p>
          </div>
          {dist.totalIncome>0?(
            <div className="flex gap-3 text-center">
              {[["necesidades","pctNec",50],["estilo","pctEst",30],["futuro","pctFut",20]].map(([k,pk,t])=>{
                const b=BUCKETS[k]; const val=dist[pk]; const dev=val-t;
                return <div key={k}><p className={`text-xs font-black ${Math.abs(dev)>5?(dev>0?"text-rose-400":"text-emerald-400"):b.text}`}>{val}%</p><p className="text-xs text-slate-600">{t}%</p></div>;
              })}
            </div>
          ):(
            <div className="text-right"><p className="text-xs text-slate-500">Balance mes</p><p className={`text-sm font-bold ${(dist.totalIncome-dist.totalSpent)>=0?"text-emerald-400":"text-rose-400"}`}>{CLP(dist.totalIncome-dist.totalSpent)}</p></div>
          )}
        </div>
      </div>
      <div className="p-4 pb-24 max-w-lg mx-auto">{panels[tab]}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur border-t border-slate-700 z-20">
        <div ref={navRef} className="flex overflow-x-auto max-w-lg mx-auto" style={{scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {TABS.map(t=>(
            <button key={t.id} data-tab={t.id} onClick={()=>setTab(t.id)}
              className={`flex flex-col items-center py-2.5 px-3 text-xs transition-all flex-shrink-0 ${tab===t.id?"text-blue-400":"text-slate-500 hover:text-slate-300"}`}>
              <span className={`text-lg mb-0.5 transition-transform ${tab===t.id?"scale-110":""}`}>{t.icon}</span>
              <span className="font-medium whitespace-nowrap">{t.label}</span>
              {tab===t.id&&<span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5"/>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
