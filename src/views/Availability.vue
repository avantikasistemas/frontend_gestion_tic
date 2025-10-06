<template>
  <div class="ops">
    <div class="filters card">
      <div class="row">
        <div class="col">
          <label>Desde</label>
          <input type="date" v-model="from" class="input" />
        </div>
        <div class="col">
          <label>Hasta</label>
          <input type="date" v-model="to" class="input" />
        </div>
        <div class="col grow"></div>
        <div class="col">
          <button class="button" @click="last30">Últimos 30 días</button>
          <button class="button" @click="clear">Limpiar</button>
        </div>
      </div>
    </div>

    <section class="grid">
      <div class="card">
        <div class="head"><h3>Disponibilidad por servicio</h3></div>
        <div class="list">
          <div class="item" v-for="s in rows" :key="s.id">
            <div class="name">{{ s.nombre }}</div>
            <div class="bar">
              <div class="fill" :style="{width: (s.perc*100).toFixed(1)+'%'}"></div>
            </div>
            <div class="perc" :class="{ok: s.perc>=s.slo}">
              {{ (s.perc*100).toFixed(2) }}% (SLO {{ (s.slo*100).toFixed(1) }}%)
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="head"><h3>Comparativo</h3></div>
        <canvas ref="cComp"></canvas>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useOps } from '../store/ops'

const { servicesUptimeByRange } = useOps()
const from = ref(''), to = ref('')
const rows = computed(()=> servicesUptimeByRange(from.value, to.value))
function clear(){ from.value=''; to.value='' }
function last30(){ const e=new Date(), s=new Date(); s.setDate(e.getDate()-30); from.value=s.toISOString().slice(0,10); to.value=e.toISOString().slice(0,10) }

const cComp = ref(null)
const redraw = ()=> nextTick(()=>{
  if(!cComp.value) return
  const dpr=window.devicePixelRatio||1
  const W=cComp.value.clientWidth, H=cComp.value.clientHeight
  cComp.value.width=W*dpr; cComp.value.height=H*dpr
  const ctx=cComp.value.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0)
  ctx.clearRect(0,0,W,H)
  const pad=16, bw=60, gap=30
  rows.value.forEach((s,i)=>{
    const x = pad + i*(bw+gap)
    const h = Math.max(4, (s.perc)* (H-pad*2))
    const y = H - pad - h
    ctx.fillStyle = s.perc>=s.slo ? '#10b981' : '#f59e0b'
    ctx.fillRect(x,y,bw,h)
    ctx.fillStyle='#111827'; ctx.font='12px system-ui'; ctx.textAlign='center'
    ctx.fillText((s.perc*100).toFixed(1)+'%', x+bw/2, y-4)
    ctx.fillStyle='#6b7280'; ctx.fillText(s.nombre, x+bw/2, H-6)
  })
})
watch(rows, redraw, {deep:true})
onMounted(()=>{ redraw(); window.addEventListener('resize',()=>setTimeout(redraw,120)) })
</script>

<style>
.ops{ display:flex; flex-direction:column; gap:12px }
.filters .row{ display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap }
.filters .col{ min-width:180px } .filters .col.grow{ flex:1 }
.input{ width:100%; border:1px solid var(--border); border-radius:10px; padding:8px 10px }
.button{ background:#fff; border:1px solid var(--border); border-radius:10px; padding:8px 12px; cursor:pointer }

.grid{ display:grid; gap:12px; grid-template-columns: 2fr 1fr }
@media (max-width:1200px){ .grid{ grid-template-columns: 1fr } }

.card{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; min-height:240px; display:flex; flex-direction:column; gap:8px }

.list{ display:flex; flex-direction:column; gap:10px }
.item{ display:grid; grid-template-columns: 160px 1fr 160px; align-items:center; gap:10px }
.name{ font-weight:600 }
.bar{ height:10px; background:#f1f5f9; border-radius:999px; overflow:hidden; border:1px solid var(--border) }
.fill{ height:100%; background:#10b981 }
.perc{ text-align:right } .perc.ok{ color:#10b981 }
</style>
