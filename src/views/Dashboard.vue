<template>
  <div class="dash">
    <!-- FILTROS (una fila, compactos, no sticky) -->
    <div class="filters card super-compact">
      <!-- Visibles -->
      <div v-if="showFilters" class="filters-inline">
        <input type="date" v-model="from" class="input" />
        <input type="date" v-model="to" class="input" />
        <select v-model="tipoSel" class="input">
          <option value="">— Tipo de ticket (Todos) —</option>
          <option v-for="t in tiposTicket" :key="t">{{ t }}</option>
        </select>

        <div class="spacer"></div>

        <button class="button sm" @click="quick('m')">Último mes</button>
        <button class="button sm" @click="quick('q')">90 días</button>
        <button class="button sm ghost" @click="clear">Limpiar</button>
        <button class="button sm ghost strong" @click="showFilters = false">Ocultar</button>
      </div>

      <!-- Colapsados (no deja hueco) -->
      <div v-else class="filters-collapsed">
        <span class="muted">Filtros</span>
        <button class="button sm" @click="showFilters = true">Mostrar</button>
      </div>
    </div>

    <!-- ====== FILA 1 (4) ====== -->
    <section class="grid grid-4">
      <div class="card kpis">
        <h3>Resumen</h3>
        <div class="kpi-wrap">
          <div class="kpi"><div class="kpi-n">{{ totals.total }}</div><div class="kpi-l">Tickets</div></div>
          <div class="kpi"><div class="kpi-n">{{ totals.gestion }}</div><div class="kpi-l">Gestión</div></div>
          <div class="kpi"><div class="kpi-n">{{ totals.estrategico }}</div><div class="kpi-l">Estratégicos</div></div>
          <div class="kpi"><div class="kpi-n">{{ totals.alta }}</div><div class="kpi-l">Prioridad alta</div></div>
        </div>
        <div class="chips">
          <span class="chip" v-for="(v,k) in estadoTicketCount" :key="k">{{ k }}: {{ v }}</span>
        </div>
        <div class="last" v-if="last">
          <div class="title-sm muted">Última actividad</div>
          <div class="last-row">
            <span class="pill">{{ last.id }}</span>
            <span class="tag blue">{{ last.estadoTicket }}</span>
            <span class="muted">{{ fmt(last.actualizadoEn) }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>Por Estado del Ticket</h3></div>
        <canvas ref="cEstado"></canvas>
      </div>

      <div class="card">
        <div class="head"><h3>Por Tipo de Soporte</h3></div>
        <canvas ref="cTipo"></canvas>
      </div>

      <div class="card">
        <div class="head"><h3>Por Macroproceso</h3></div>
        <canvas ref="cMacro"></canvas>
      </div>
    </section>

    <!-- ====== FILA 2 (4) ====== -->
    <section class="grid grid-4">
      <div class="card">
        <div class="head"><h3>Prioridad</h3></div>
        <canvas ref="cPrio"></canvas>
      </div>

      <div class="card">
        <div class="head"><h3>Asignados</h3></div>
        <canvas ref="cAsign"></canvas>
      </div>

      <div class="card">
        <div class="head"><h3>Cumplimiento SLA</h3></div>
        <canvas ref="cSla" class="gauge"></canvas>
        <div class="legend center">
          <span class="chip" :class="sla.percent>=0.8 ? 'chip-ok' : 'chip-warn'">
            {{ Math.round(sla.percent*100) }}% en tiempo
          </span>
          <span class="muted">({{ sla.onTime }}/{{ sla.total }})</span>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>Tendencia (mensual)</h3></div>
        <canvas ref="cTrend"></canvas>
      </div>
    </section>

    <!-- ====== FILA 3 (4) ====== -->
    <section class="grid grid-4">
      <div class="card">
        <div class="head"><h3>Tasa de cierre</h3></div>
        <canvas ref="cClose" class="gauge"></canvas>
        <div class="legend center">
          <span class="chip">{{ Math.round(closeRate.percent*100) }}% cerrados</span>
          <span class="muted">({{ closeRate.cerrados }}/{{ closeRate.total }})</span>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>Backlog por antigüedad</h3></div>
        <canvas ref="cAging"></canvas>
        <div class="legend">
          <span class="chip" v-for="(v,k) in aging" :key="k">{{ k }}: {{ v }}</span>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>Distribución por Tipo de ticket</h3></div>
        <canvas ref="cDonut" class="donut"></canvas>
        <div class="legend center">
          <span class="chip">Gestión: {{ tipoTicketCount['Gestión'] || 0 }}</span>
          <span class="chip">Estratégico: {{ tipoTicketCount['Estratégico'] || 0 }}</span>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>SLA por Macroproceso</h3></div>
        <canvas ref="cSlaMacro"></canvas>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useTickets } from '../store/tickets'

const { state } = useTickets()
const tiposTicket = state.tiposTicket ?? ['Gestión','Estratégico']

// ===== Filtros =====
const from = ref(''), to = ref(''), tipoSel = ref('')
const showFilters = ref(true)
function clear(){ from.value=''; to.value=''; tipoSel.value='' }
function quick(kind){
  const end = new Date(); const start = new Date()
  if(kind==='m') start.setMonth(end.getMonth()-1)
  if(kind==='q') start.setDate(end.getDate()-90)
  from.value = start.toISOString().slice(0,10)
  to.value   = end.toISOString().slice(0,10)
  showFilters.value = true
}
const inRange = (d,f,t)=>{
  const x=new Date(d).getTime()
  return (!f || x>=new Date(f).getTime()) && (!t || x<=new Date(t).getTime())
}
const tickets = computed(()=>{
  const base = state.tickets.filter(t=> inRange(t.creadoEn, from.value, to.value))
  return tipoSel.value ? base.filter(t=> t.tipoTicket===tipoSel.value) : base
})
const fmt = (iso)=> new Date(iso).toLocaleString()

// ===== Agregaciones =====
const last = computed(()=>{
  if(!tickets.value.length) return null
  return [...tickets.value].sort((a,b)=> new Date(b.actualizadoEn)-new Date(a.actualizadoEn))[0]
})
const totals = computed(()=>{
  const all = tickets.value
  return {
    total: all.length,
    gestion: all.filter(t=>t.tipoTicket==='Gestión').length,
    estrategico: all.filter(t=>t.tipoTicket==='Estratégico').length,
    alta: all.filter(t=>t.prioridad==='Alta').length
  }
})
const groupBy = (field)=> computed(()=>{
  const m = {}; tickets.value.forEach(t=>{ const k=t[field]||'—'; m[k]=(m[k]||0)+1 })
  return m
})
const estadoTicketCount = groupBy('estadoTicket')
const tipoCount = groupBy('tipoSoporte')
const macroCount = groupBy('macroproceso')
const prioCount = groupBy('prioridad')
const asignCount = groupBy('asignadoA')
const tipoTicketCount = groupBy('tipoTicket')

// SLA global
const sla = computed(()=>{
  const consider = tickets.value.filter(t=> t.vencimiento && t.estadoTicket!=='Cerrado')
  const total = consider.length || 0
  const onTime = consider.filter(t=> new Date(t.vencimiento) >= new Date()).length
  const percent = total ? onTime/total : 1
  return { onTime, total, percent }
})

// Tasa de cierre
const closeRate = computed(()=>{
  const total = tickets.value.length || 0
  const cerrados = tickets.value.filter(t=> t.estadoTicket==='Cerrado').length
  return { total, cerrados, percent: total ? cerrados/total : 0 }
})

// Backlog por antigüedad
const aging = computed(()=>{
  const now = Date.now()
  const open = tickets.value.filter(t=> t.estadoTicket!=='Cerrado')
  const b = { '0–24h':0, '1–3d':0, '3–7d':0, '>7d':0 }
  open.forEach(t=>{
    const h = (now - new Date(t.creadoEn).getTime())/36e5
    if(h<=24) b['0–24h']++
    else if(h<=72) b['1–3d']++
    else if(h<=168) b['3–7d']++
    else b['>7d']++
  })
  return b
})

// SLA por Macroproceso
const slaPorMacro = computed(()=>{
  const by = {}
  tickets.value.forEach(t=>{
    if(!t.macroproceso) return
    if(!by[t.macroproceso]) by[t.macroproceso] = { total:0, onTime:0 }
    if(t.vencimiento && t.estadoTicket!=='Cerrado'){
      by[t.macroproceso].total++
      if(new Date(t.vencimiento) >= new Date()) by[t.macroproceso].onTime++
    }
  })
  const labels = Object.keys(by)
  const perc = labels.map(k=>{
    const o = by[k]; return o.total ? Math.round((o.onTime/o.total)*100) : 100
  })
  return { labels, perc }
})

// Tendencia mensual
const trend = computed(()=>{
  const m = new Map()
  tickets.value.forEach(t=>{
    const d = new Date(t.creadoEn)
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    m.set(k, (m.get(k)||0)+1)
  })
  const labels = [...m.keys()].sort()
  const data = labels.map(k=> m.get(k))
  return { labels, data }
})

// ===== Canvas helpers =====
const getCtx = (canvas)=>{
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width*dpr))
  canvas.height = Math.max(1, Math.floor(rect.height*dpr))
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr,0,0,dpr,0,0)
  return ctx
}
const bar = (el, labels, vals, {format=(v)=>String(v), color='#6ea8fe'}={})=>{
  if(!el) return
  const ctx = getCtx(el); const W=el.clientWidth, H=el.clientHeight
  const pad=16, lbl=18, innerH=H-pad*2-lbl
  if(!labels.length){ ctx.clearRect(0,0,W,H); return }
  const max = Math.max(1, ...vals)
  const bw=Math.max(16,(W-pad*2)/(vals.length*1.8)); const gap=bw*0.8
  ctx.clearRect(0,0,W,H); ctx.fillStyle='#f3f4f6'; ctx.fillRect(pad,pad,W-pad*2,innerH)
  vals.forEach((v,i)=>{
    const x=pad+i*(bw+gap)+gap/2, h=(v/max)*(innerH-8), y=pad+innerH-h
    ctx.fillStyle=color; ctx.fillRect(x,y,bw,Math.max(2,h))
    ctx.fillStyle='#111827'; ctx.font='12px system-ui'; ctx.textAlign='center'; ctx.fillText(format(v), x+bw/2, y-4)
    ctx.fillStyle='#6b7280'; ctx.save(); ctx.translate(x+bw/2,H-4); ctx.rotate(-Math.PI/12); ctx.fillText(String(labels[i]).slice(0,14),0,0); ctx.restore()
  })
}
const line = (el, labels, vals)=>{
  if(!el) return
  const ctx = getCtx(el); const W=el.clientWidth, H=el.clientHeight
  const pad=16, lbl=18, innerH=H-pad*2-lbl, innerW=W-pad*2
  if(!vals.length){ ctx.clearRect(0,0,W,H); return }
  const max=Math.max(1,...vals)
  ctx.clearRect(0,0,W,H); ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1
  for(let i=0;i<=4;i++){ const y=pad+(innerH/4)*i; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke() }
  ctx.strokeStyle='#6ea8fe'; ctx.lineWidth=2; ctx.beginPath()
  vals.forEach((v,i)=>{ const x=pad+(innerW/(vals.length-1))*i, y=pad+innerH-(v/max)*(innerH-4); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) })
  ctx.stroke()
  ctx.fillStyle='#6ea8fe'
  vals.forEach((v,i)=>{ const x=pad+(innerW/(vals.length-1))*i, y=pad+innerH-(v/max)*(innerH-4)
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill()
    ctx.fillStyle='#111827'; ctx.font='12px system-ui'; ctx.textAlign='center'; ctx.fillText(String(v), x, y-6)
    ctx.fillStyle='#6b7280'; ctx.fillText(labels[i], x, H-6)
  })
}
const gauge = (el, p, {okThreshold=0.8, labelOk='En tiempo', labelKo='Fuera de tiempo'}={})=>{
  if(!el) return
  const ctx = getCtx(el); const W=el.clientWidth, H=el.clientHeight
  const r=Math.min(W,H)/2-12, cx=W/2, cy=H/2+6
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=12
  ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI*0.75,Math.PI*2.25); ctx.stroke()
  const angle=Math.PI*0.75+Math.PI*1.5*p
  ctx.strokeStyle= p>=okThreshold ? '#10b981' : '#f59e0b'
  ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI*0.75, angle); ctx.stroke()
  ctx.fillStyle='#111827'; ctx.font='bold 22px system-ui'; ctx.textAlign='center'
  ctx.fillText(Math.round(p*100)+'%', cx, cy-4)
  ctx.fillStyle='#6b7280'; ctx.font='13px system-ui'
  ctx.fillText(p>=okThreshold? labelOk : labelKo, cx, cy+16)
}
const donut = (el, parts, colors=['#14b8a6','#60a5fa','#f59e0b','#ef4444','#10b981'])=>{
  if(!el) return
  const ctx = getCtx(el); const W=el.clientWidth, H=el.clientHeight
  ctx.clearRect(0,0,W,H)
  const cx=W/2, cy=H/2, r=Math.min(W,H)/2 - 10, inner=r*0.6
  const total = parts.reduce((a,b)=>a+b,0) || 1
  let start=-Math.PI/2
  parts.forEach((v,i)=>{
    const ang = (v/total)*Math.PI*2
    ctx.beginPath()
    ctx.moveTo(cx,cy)
    ctx.fillStyle = colors[i % colors.length]
    ctx.arc(cx,cy,r,start,start+ang)
    ctx.lineTo(cx,cy)
    ctx.fill()
    start += ang
  })
  ctx.globalCompositeOperation='destination-out'
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.fill()
  ctx.globalCompositeOperation='source-over'
  const sum = parts.reduce((a,b)=>a+b,0)
  ctx.fillStyle='#111827'; ctx.font='bold 20px system-ui'; ctx.textAlign='center'
  ctx.fillText(sum+'', cx, cy+6)
}

// ===== Refs & redibujos =====
const cEstado=ref(null), cTipo=ref(null), cMacro=ref(null), cPrio=ref(null), cAsign=ref(null)
const cSla=ref(null), cTrend=ref(null), cClose=ref(null), cAging=ref(null), cDonut=ref(null), cSlaMacro=ref(null)

const redraw = ()=> nextTick(()=>{
  if(cEstado.value){ const L=Object.keys(estadoTicketCount.value), V=L.map(k=>estadoTicketCount.value[k]); bar(cEstado.value,L,V) }
  if(cTipo.value){ const L=Object.keys(tipoCount.value), V=L.map(k=>tipoCount.value[k]); bar(cTipo.value,L,V) }
  if(cMacro.value){ const L=Object.keys(macroCount.value), V=L.map(k=>macroCount.value[k]); bar(cMacro.value,L,V) }
  if(cPrio.value){ const L=Object.keys(prioCount.value), V=L.map(k=>prioCount.value[k]); bar(cPrio.value,L,V) }
  if(cAsign.value){ const L=Object.keys(asignCount.value), V=L.map(k=>asignCount.value[k]); bar(cAsign.value,L,V) }
  if(cSla.value){ gauge(cSla.value, sla.value.percent) }
  if(cTrend.value){ line(cTrend.value, trend.value.labels, trend.value.data) }
  if(cClose.value){ gauge(cClose.value, closeRate.value.percent, { okThreshold:0.7, labelOk:'Cerrados', labelKo:'Abiertos' }) }
  if(cAging.value){ const L=Object.keys(aging.value), V=L.map(k=>aging.value[k]); bar(cAging.value,L,V, {color:'#94a3b8'}) }
  if(cDonut.value){ const g=tipoTicketCount.value['Gestión']||0, e=tipoTicketCount.value['Estratégico']||0; donut(cDonut.value, [g,e], ['#60a5fa','#f59e0b']) }
  if(cSlaMacro.value){ const L=slaPorMacro.value.labels, V=slaPorMacro.value.perc; bar(cSlaMacro.value,L,V,{ format:(v)=>v+'%', color:'#10b981' }) }
})

const ticketsSig = ()=> tickets.value.map(t=>[
  t.id,t.creadoEn,t.actualizadoEn,t.vencimiento,t.estadoTicket,
  t.tipoSoporte,t.macroproceso,t.prioridad,t.asignadoA,t.tipoTicket
].join('|'))

watch([ticketsSig, from, to, tipoSel], redraw, {deep:true})
onMounted(()=>{ redraw(); let r=null; window.addEventListener('resize',()=>{ clearTimeout(r); r=setTimeout(redraw,120) }) })
</script>

<style>
.dash{ display:flex; flex-direction:column; gap:12px }

/* ===== FILTROS: una fila, compactos, NO sticky ===== */
.filters.card.super-compact{
  position: static !important; top:auto !important; z-index:auto !important;
  min-height: auto !important;
  padding: 6px 8px;
}
.filters-inline{
  display:flex; align-items:center; gap:8px;
  flex-wrap: nowrap;              /* en desktop NO se apilan */
  overflow-x: auto;               /* si no cabe, scroll solo en la barra */
  -webkit-overflow-scrolling: touch;
}
.filters-collapsed{ display:flex; align-items:center; gap:8px; justify-content:flex-end }
.filters.card.super-compact .filters-inline .input,
.filters.card.super-compact .filters-inline select{
  height:30px; padding:4px 8px;
  border:1px solid var(--border); border-radius:8px; font-size:.86rem; background:#fff;
  flex: 0 0 180px;                /* ancho fijo */
  width: 180px !important;        /* evita width:100% global */
  min-width: 160px;
}
.button{ background:#fff; border:1px solid var(--border); border-radius:10px; padding:8px 12px; cursor:pointer }
.button.sm{ height:30px; padding:4px 10px; font-size:.86rem; border-radius:8px; white-space:nowrap }
.button.ghost{ background:#fafafa }
.button.strong{ font-weight:600 }
.spacer{ flex:1 1 auto }

@media (max-width: 1024px){
  .filters.card.super-compact .filters-inline .input,
  .filters.card.super-compact .filters-inline select{
    flex-basis: 160px; width:160px !important;
  }
}
@media (max-width: 720px){
  .filters-inline{ flex-wrap: wrap; }   /* en móvil sí permitimos que bajen */
}

/* ===== GRID 4× por fila ===== */
.dash > .grid.grid-4{
  display:grid; gap:12px;
  grid-template-columns: repeat(4, minmax(260px, 1fr)) !important; /* forzado */
  align-items: stretch;
}
@media (max-width: 1280px){
  .dash > .grid.grid-4{ grid-template-columns: repeat(3, minmax(240px,1fr)) !important; }
}
@media (max-width: 900px){
  .dash > .grid.grid-4{ grid-template-columns: repeat(2, minmax(220px,1fr)) !important; }
}
@media (max-width: 560px){
  .dash > .grid.grid-4{ grid-template-columns: 1fr !important; }
}

/* ===== TARJETAS ===== */
.card{
  background:#fff; border:1px solid var(--border); border-radius:12px;
  padding:12px; display:flex; flex-direction:column; gap:8px; min-height:240px;
}
.card .head{ display:flex; align-items:center; justify-content:space-between }
.card h3{ margin:0; font-size:1rem }
.card canvas{ width:100%; height:220px; display:block }
.card canvas.gauge{ height:200px }
.card canvas.donut{ height:220px }
.legend{ display:flex; flex-wrap:wrap; gap:6px; margin-top:auto }
.legend.center{ justify-content:center }

/* ===== RESUMEN ===== */
.kpis{ min-height:240px }
.kpis .kpi-wrap{ display:grid; grid-template-columns: repeat(4,1fr); gap:8px }
.kpi{ background:#f9fafb; border:1px solid var(--border); border-radius:12px; padding:10px; text-align:center }
.kpi-n{ font-size:28px; font-weight:800 }
.kpi-l{ color:#6b7280; font-size:.9rem }
.last{ margin-top:8px }
.last-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }

/* Chips */
.chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px }
.chip{ padding:4px 8px; border-radius:999px; border:1px solid var(--border); background:#fff; font-size:.85rem }
.chip-ok{ color:#10b981; border-color:#c7f3e4; background:#f3fff9 }
.chip-warn{ color:#f59e0b; border-color:#ffe3b1; background:#fff9ed }

/* Utilidades */
.pill{ padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:#fff; white-space:nowrap }
.tag{ padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:#fff; font-size:.85rem }
.tag.blue{ color:#2563eb; border-color:#c7ddff; background:#f0f6ff }

/* Parche de contenedor */
.app-top .page{ max-width: 100% !important; }
.muted{ color:var(--muted) }
</style>
