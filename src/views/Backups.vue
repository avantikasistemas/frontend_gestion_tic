<template>
  <div class="backups-view">
    <!-- Toolbar compacta (como Dashboard/Tickets) -->
    <div class="toolbar">
      <div class="filters">
        <input
          type="date"
          v-model="desde"
          class="input date"
          :max="hoy"
          title="Desde"
        />
        <input
          type="date"
          v-model="hasta"
          class="input date"
          :max="hoy"
          title="Hasta"
        />
      </div>
      <div class="actions">
        <button class="button sm" @click="ultimos(7)">Últimos 7 días</button>
        <button class="button sm ghost" @click="limpiar">Limpiar</button>
      </div>
    </div>

    <!-- Grid principal -->
    <div class="grid">
      <!-- Izquierda: gráfico -->
      <div class="card">
        <div class="card-title">Éxito / Falla</div>
        <div class="chart-wrap">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>

      <!-- Derecha: tabla detalle -->
      <div class="card">
        <div class="card-title">Detalle</div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Tamaño</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in filtrados" :key="b.id">
                <td>{{ b.sistema }}</td>
                <td>{{ fmt(b.fecha) }}</td>
                <td>{{ b.duracionMin }} min</td>
                <td>{{ b.tamanoGB ? (b.tamanoGB.toFixed(1)+' GB') : '—' }}</td>
                <td>
                  <span class="tag" :class="b.resultado==='OK' ? 'ok' : 'fail'">
                    {{ b.resultado }}
                  </span>
                </td>
              </tr>
              <tr v-if="!filtrados.length">
                <td colspan="5" class="empty">Sin ejecuciones en el rango seleccionado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Buenas prácticas -->
      <div class="card span2">
        <div class="card-title">Buenas prácticas (checklist)</div>
        <ul class="list">
          <li>Retenciones: diarias 7d, semanales 4w, mensuales 12m</li>
          <li>Pruebas de restauración mensuales</li>
          <li>Offsite/Immutable para ransomware</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Utils
function toYMD (d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function isoDaysAgo (n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function fmt (iso) {
  try { return new Date(iso).toLocaleString() } catch { return '—' }
}

// Mock de datos de copias
const backups = ref([
  { id: 'b1', sistema: 'ERP',    fecha: isoDaysAgo(1), duracionMin: 32, tamanoGB: 12.3, resultado: 'OK'   },
  { id: 'b2', sistema: 'ERP',    fecha: isoDaysAgo(2), duracionMin: 35, tamanoGB: 12.1, resultado: 'OK'   },
  { id: 'b3', sistema: 'ERP',    fecha: isoDaysAgo(3), duracionMin: 18, tamanoGB: null,  resultado: 'FALLA'},
  { id: 'b4', sistema: 'BI',     fecha: isoDaysAgo(4), duracionMin: 15, tamanoGB: 5.2,  resultado: 'OK'   },
  { id: 'b5', sistema: 'Correo', fecha: isoDaysAgo(0), duracionMin: 48, tamanoGB: 22.7, resultado: 'OK'   },
  { id: 'b6', sistema: 'Correo', fecha: isoDaysAgo(2), duracionMin: 50, tamanoGB: null,  resultado: 'FALLA'}
])

// Filtros (fecha)
const hoy = new Date().toISOString().slice(0, 10)
const desde = ref('')
const hasta = ref('')

function ultimos (dias) {
  const end = new Date()
  const start = new Date(end.getTime() - (dias - 1) * 24 * 3600 * 1000)
  desde.value = toYMD(start)
  hasta.value = toYMD(end)
}
function limpiar () {
  desde.value = ''
  hasta.value = ''
}

// Filtrado por rango
const filtrados = computed(() => {
  const d = desde.value ? new Date(desde.value + 'T00:00:00') : null
  const h = hasta.value ? new Date(hasta.value + 'T23:59:59') : null
  return backups.value
    .filter(b => {
      const f = new Date(b.fecha)
      if (d && f < d) return false
      if (h && f > h) return false
      return true
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
})

// Conteos para el gráfico
const okCount = computed(() => filtrados.value.filter(x => x.resultado === 'OK').length)
const failCount = computed(() => filtrados.value.filter(x => x.resultado !== 'OK').length)

// Gráfico canvas simple
const chartRef = ref(null)
let resizeObserver = null

function drawChart () {
  const canvas = chartRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  const rect = parent.getBoundingClientRect()

  const dpr = Math.max(1, window.devicePixelRatio || 1)
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const pad = { top: 16, right: 16, bottom: 30, left: 28 }
  const w = rect.width - pad.left - pad.right
  const h = rect.height - pad.top - pad.bottom

  const data = [
    { label: 'OK',    value: okCount.value,   color: '#10b981' }, // verde
    { label: 'Falla', value: failCount.value, color: '#ef4444' }  // rojo
  ]
  const max = Math.max(1, ...data.map(d => d.value))
  const barW = Math.min(120, w / (data.length * 2))
  const gap = barW

  // Ejes base
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, rect.height - pad.bottom)
  ctx.lineTo(rect.width - pad.right, rect.height - pad.bottom)
  ctx.stroke()

  // Barras y etiquetas
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto'
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'center'

  data.forEach((d, i) => {
    const x = pad.left + i * (barW + gap) + gap
    const bh = max ? (d.value / max) * (h - 10) : 0
    const y = rect.height - pad.bottom - bh

    // barra
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.roundRect(x, y, barW, bh, 8)
    ctx.fill()

    // valor
    ctx.fillStyle = '#111827'
    ctx.fillText(String(d.value), x + barW / 2, y - 6)

    // label
    ctx.fillStyle = '#6b7280'
    ctx.fillText(d.label, x + barW / 2, rect.height - pad.bottom + 16)
  })
}

// Redraw en cambios
onMounted(() => {
  // Primer dibujado
  drawChart()
  // Resize observer
  resizeObserver = new ResizeObserver(drawChart)
  resizeObserver.observe(chartRef.value.parentElement)
})

watch([okCount, failCount], drawChart)
watch([desde, hasta], drawChart)
</script>

<style scoped>
/* ===== Layout general ===== */
.backups-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== Toolbar igual a otras vistas ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.input {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
  height: 36px;
}
.input.date {
  width: 170px;
  min-width: 160px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.button {
  background: #fff;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
}
.button.sm { padding: 6px 10px; border-radius: 10px; font-size: .92rem; }
.button.ghost { background: #f8fafc; }

/* ===== Grid principal ===== */
.grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}
.card {
  background: #fff;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 220px;
}
.card-title {
  font-weight: 600;
  color: #374151;
  margin: 2px 4px 10px;
}
.chart-wrap {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 240px;
}
.chart-wrap canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* tabla */
.table-wrap { overflow: auto; }
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  text-align: left;
  padding: 10px 10px;
  border-bottom: 1px solid #eef2f7;
  vertical-align: middle;
}
.table thead th {
  color: #667085;
  font-weight: 600;
}
.empty {
  text-align: center;
  color: #6b7280;
  padding: 28px 0;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border, #e5e7eb);
  background: #fff;
  font-size: .9rem;
  white-space: nowrap;
}
.tag.ok   { color: #047857; border-color: #bbf7d0; background: #ecfdf5; }
.tag.fail { color: #991b1b; border-color: #fecaca; background: #fef2f2; }

.list {
  margin: 0;
  padding: 4px 20px 10px 20px;
  line-height: 1.6;
}

.span2 { grid-column: 1 / -1; }

/* Responsive */
@media (max-width: 1000px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
