// Root Probe dashboard configuration
const SUPABASE_URL = "https://unnvwlhgxeamjnwbgkgz.supabase.co";
const SUPABASE_KEY = "sb_publishable_46jKJH30q8qzWUEYtivyiw_8aLgsGVk";
const TABLE = "root_probe_data";
const POLL_MS = 5000;
const OFFLINE_MS = 30000;

// Temporary estimates only. Replace with separate calibration values for each probe.
const CALIBRATION = {
  top: { dry: 4095, wet: 1800 },
  bottom: { dry: 4095, wet: 1800 }
};

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
let latestTimestamp = null;
let historyRows = [];

function moisturePercent(raw, calibration) {
  if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return null;
  const value = (calibration.dry - Number(raw)) / (calibration.dry - calibration.wet) * 100;
  return Math.max(0, Math.min(100, Math.round(value)));
}
function setText(id, value) { $(id).textContent = value === null || value === undefined ? "—" : value; }
function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ru-RU", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
function renderStatus() {
  const age = latestTimestamp ? Date.now() - new Date(latestTimestamp).getTime() : Infinity;
  const offline = age > OFFLINE_MS;
  $("status-banner").classList.toggle("offline", offline);
  $("connection-dot").style.background = offline ? "#ff9a72" : "#a6ed83";
  $("connection-label").textContent = offline ? "Устройство не отвечает" : "База подключена";
  $("status-title").textContent = offline ? "Нет свежих данных от устройства" : "Устройство передаёт данные";
  $("status-message").textContent = !latestTimestamp ? "Ожидаем первое измерение от ESP32-S3." : offline ? "Последнее измерение старше 30 секунд. Проверь питание, Wi-Fi и подключение устройства." : "Последние показания получены. Мониторинг активен.";
  $("status-banner").querySelector(".status-symbol").textContent = offline ? "!" : "✓";
  $("last-update").textContent = latestTimestamp ? "ОБНОВЛЕНО " + formatTime(latestTimestamp) : "ОЖИДАНИЕ";
}
function renderReading(row) {
  const topRaw = row.soil_top_raw;
  const bottomRaw = row.soil_bottom_raw;
  const topPct = row.soil_top_percent ?? moisturePercent(topRaw, CALIBRATION.top);
  const bottomPct = row.soil_bottom_percent ?? moisturePercent(bottomRaw, CALIBRATION.bottom);
  setText("top-moisture", topPct);
  setText("bottom-moisture", bottomPct);
  setText("top-raw", topRaw);
  setText("bottom-raw", bottomRaw);
  setText("temperature", row.temperature);
  setText("air-humidity", row.air_humidity);
  $("top-meter").style.width = (topPct ?? 0) + "%";
  $("bottom-meter").style.width = (bottomPct ?? 0) + "%";
  latestTimestamp = row.created_at;
  renderStatus();
}
async function loadData() {
  try {
    const { data, error } = await db.from(TABLE).select("*").order("created_at", {ascending:false}).limit(30);
    if (error) throw error;
    $("connection-label").textContent = "База подключена";
    if (data && data.length) {
      historyRows = data.slice().reverse();
      renderReading(data[0]);
      drawChart();
    }
    renderStatus();
  } catch (error) {
    $("connection-label").textContent = "Ошибка базы данных";
    $("connection-dot").style.background = "#ff9a72";
    $("status-title").textContent = "Не удалось получить данные";
    $("status-message").textContent = error.message || "Проверь настройки Supabase и политики RLS.";
    $("status-banner").classList.add("offline");
    console.error("Root Probe Supabase:", error);
  }
}
function drawChart() {
  const canvas = $("history-chart");
  const empty = $("chart-empty");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  const w = rect.width, h = rect.height, pad = {l:34,r:12,t:12,b:28};
  ctx.clearRect(0,0,w,h);
  if (!historyRows.length) { empty.style.display = "grid"; return; }
  empty.style.display = "none";
  const innerW = w-pad.l-pad.r, innerH = h-pad.t-pad.b;
  ctx.font = "10px DM Mono"; ctx.fillStyle = "#71877a"; ctx.strokeStyle = "rgba(176,218,190,.12)"; ctx.lineWidth = 1;
  for(let v=0;v<=100;v+=25){const y=pad.t+innerH-(v/100)*innerH;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(v+"%",2,y+3);}
  const series = [
    {key:"soil_top_percent",raw:"soil_top_raw",cal:CALIBRATION.top,color:"#a6ed83"},
    {key:"soil_bottom_percent",raw:"soil_bottom_raw",cal:CALIBRATION.bottom,color:"#5dd6a0"}
  ];
  series.forEach(s=>{
    const points=historyRows.map((r,i)=>({x:pad.l+(historyRows.length===1?innerW/2:(i/(historyRows.length-1))*innerW),y:pad.t+innerH-(Math.max(0,Math.min(100,Number(r[s.key] ?? moisturePercent(r[s.raw],s.cal) ?? 0)))/100)*innerH}));
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.stroke();
    points.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();});
  });
  ctx.fillStyle="#71877a";ctx.font="9px DM Mono";
  if(historyRows.length){ctx.fillText(formatTime(historyRows[0].created_at),pad.l,h-5);const last=formatTime(historyRows[historyRows.length-1].created_at);ctx.fillText(last,Math.max(pad.l,w-pad.r-65),h-5);}
}
window.addEventListener("resize",drawChart);
loadData();
setInterval(()=>{loadData();renderStatus();},POLL_MS);
setInterval(renderStatus,1000);