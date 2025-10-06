<template>
  <div class="tickets">
    <!-- Toolbar / Filtros (se ocultan en vista Bandeja) -->
    <div class="toolbar" :class="{ 'toolbar--inbox': vista==='inbox' }">
      <div class="filters" v-show="vista!=='inbox'">
        <input v-model="q" class="input search" placeholder="ID, asunto/título, descripción, solicitante…" />
        <select v-model="fEstado" class="input">
          <option value="">— Estado —</option>
          <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
        </select>
        <select v-model="fPrioridad" class="input">
          <option value="">— Prioridad —</option>
          <option v-for="p in prioridades" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="fAsignado" class="input">
          <option value="">— Asignado a —</option>
          <option v-for="p in asignados" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="fTipoSoporte" class="input">
          <option value="">— Tipo de Soporte —</option>
          <option v-for="t in tiposSoporte" :key="t">{{ t }}</option>
        </select>
        <select v-model="fMacro" class="input">
          <option value="">— Macroproceso —</option>
          <option v-for="m in macros" :key="m">{{ m }}</option>
        </select>
        <select v-model="fTipoTicket" class="input">
          <option value="">— Tipo de ticket —</option>
          <option v-for="t in tiposTicket" :key="t">{{ t }}</option>
        </select>
      </div>

      <div class="actions">
        <button class="button" @click="syncM365">Sincronizar Microsoft 365</button>
        <button class="button primary" @click="openNew" v-show="vista!=='inbox'">+ Nuevo Ticket</button>
      </div>
    </div>

    <div class="content">
      <!-- Sidebar de vistas -->
      <aside class="left">
        <div class="views">
          <div class="vhead">
            <span>Vistas</span>
            <button class="icon" @click="refresh" title="Refrescar">⟳</button>
          </div>
          <ul>
            <li :class="{active: vista==='inbox'}" @click="vista='inbox'">
              <span>Bandeja (M365)</span>
              <span class="badge">{{ inbox.length }}</span>
            </li>
            <li v-for="v in vistas" :key="v.key" :class="{active: vista===v.key}" @click="vista=v.key">
              <span>{{ v.label }}</span>
              <span class="badge">{{ v.count(filteredBase) }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <!-- CONTENIDO PRINCIPAL -->
      <section class="table-wrap">
        <!-- Bandeja (M365) -->
        <template v-if="vista==='inbox'">
          <div class="inbox-help">
            Revisa los correos entrantes y decide si se convierten en ticket o se descartan.
          </div>
          <table class="table inbox-table">
            <thead>
              <tr>
                <th style="width: 200px;">Fecha</th>
                <th style="width: 220px;">De</th>
                <th>Asunto</th>
                <th>Vista previa</th>
                <th style="width: 260px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in inbox" :key="m.id">
                <td>{{ fmt(m.receivedAt) }}</td>
                <td class="ellipsis" :title="m.from">{{ m.from }}</td>
                <td class="ellipsis">
                  <button class="link" @click="openMail(m)" :title="m.subject">{{ m.subject }}</button>
                </td>
                <td class="ellipsis" :title="m.preview">{{ m.preview }}</td>
                <td>
                  <div class="inbox-actions">
                    <div class="inbox-buttons">
                      <button class="button sm" @click="openMail(m)">Abrir</button>
                      <button class="button sm primary" @click="promote(m)">Convertir</button>
                      <button class="button sm ghost" @click="discard(m)">Descartar</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="!inbox.length">
                <td colspan="5" class="empty">No hay correos pendientes. Pulsa “Sincronizar Microsoft 365”.</td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Tabla de Tickets -->
        <template v-else>
          <table class="table">
            <thead>
              <tr>
                <th>Estado del Ticket</th>
                <th>ID</th>
                <th>Fecha de Solicitud</th>
                <th>Fecha de Vencimiento</th>
                <th>Tipo de Soporte</th>
                <th>Asunto</th>
                <th>Solicitante</th>
                <th>Macroproceso</th>
                <th>Asignado</th>
                <th style="width: 92px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in filtered" :key="t.id" @click="openTicket(t)">
                <td><span class="tag" :class="mapEstado(t.estadoTicket)">{{ t.estadoTicket }}</span></td>
                <td><span class="pill">{{ t.id }}</span></td>
                <td>{{ fmt(t.creadoEn) }}</td>
                <td>{{ t.vencimiento ? fmt(t.vencimiento) : '—' }}</td>
                <td>{{ t.tipoSoporte || '—' }}</td>
                <td class="ellipsis" :title="t.titulo">{{ t.titulo }}</td>
                <td class="ellipsis" :title="t.solicitante">{{ t.solicitante }}</td>
                <td>{{ t.macroproceso || '—' }}</td>
                <td>{{ t.asignadoA || 'Sin asignar' }}</td>
                <td>
                  <button class="button sm ghost" @click.stop="openTicket(t)">Editar</button>
                </td>
              </tr>
              <tr v-if="!filtered.length">
                <td colspan="10" class="empty">No hay resultados.</td>
              </tr>
            </tbody>
          </table>

          <!-- Paginación -->
          <div class="pager" v-if="filtered.length">
            <button class="button sm" :disabled="page===1" @click="page--">Anterior</button>
            <span>Página {{ page }} / {{ pages }}</span>
            <button class="button sm" :disabled="page===pages" @click="page++">Siguiente</button>
          </div>
        </template>
      </section>
    </div>

    <!-- MODAL: Crear / Editar Ticket -->
    <div v-if="modal.open" class="modal" @keydown.esc="closeModal" tabindex="0">
      <div class="backdrop" @click="closeModal"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-head">
          <h3>{{ modal.mode==='create' ? 'Nuevo Ticket' : 'Editar Ticket' }}</h3>
          <button class="icon" @click="closeModal">✕</button>
        </div>

        <div class="sheet-body">
          <div class="grid2">
            <label>
              <span>Título</span>
              <input v-model.trim="form.titulo" class="input" />
            </label>
            <label>
              <span>Solicitante</span>
              <input v-model.trim="form.solicitante" class="input" />
            </label>

            <label class="span2">
              <span>Descripción</span>
              <textarea v-model="form.descripcion" class="input area" rows="3" />
            </label>

            <label>
              <span>Prioridad</span>
              <select v-model="form.prioridad" class="input">
                <option v-for="p in prioridades" :key="p">{{ p }}</option>
              </select>
            </label>

            <label>
              <span>Estado</span>
              <select v-model="form.estadoTicket" class="input">
                <option v-for="e in estados" :key="e">{{ e }}</option>
              </select>
            </label>

            <label>
              <span>Tipo de Soporte</span>
              <select v-model="form.tipoSoporte" class="input">
                <option v-for="t in tiposSoporte" :key="t">{{ t }}</option>
              </select>
            </label>

            <label>
              <span>Tipo de ticket</span>
              <select v-model="form.tipoTicket" class="input">
                <option v-for="t in tiposTicket" :key="t">{{ t }}</option>
              </select>
            </label>

            <label>
              <span>Macroproceso</span>
              <select v-model="form.macroproceso" class="input">
                <option value="">—</option>
                <option v-for="m in macros" :key="m">{{ m }}</option>
              </select>
            </label>

            <label>
              <span>Asignado a</span>
              <select v-model="form.asignadoA" class="input">
                <option value="">Sin asignar</option>
                <option v-for="p in asignados" :key="p">{{ p }}</option>
              </select>
            </label>

            <label>
              <span>Vencimiento</span>
              <input type="datetime-local" v-model="form.vencimiento" class="input" />
            </label>

            <label>
              <span>SLA (horas)</span>
              <input type="number" min="1" step="1" v-model.number="form.slaHoras" class="input" />
            </label>

            <div class="span2">
              <div class="reply-head">
                <select v-model="reply.tipo" class="input sm">
                  <option value="public">Respuesta pública</option>
                  <option value="private">Nota interna</option>
                </select>
              </div>
              <textarea v-model="reply.texto" class="input area" rows="4" placeholder="Escribe tu respuesta…"></textarea>
            </div>
          </div>
        </div>

        <div class="sheet-foot">
          <div class="left"><span class="muted" v-if="modal.mode==='edit'">Última act.: {{ fmt(form.actualizadoEn) }}</span></div>
          <div class="right">
            <button class="button ghost" @click="closeModal">Cancelar</button>
            <button class="button primary" @click="save">{{ modal.mode==='create' ? 'Crear' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Vista del correo -->
    <div v-if="mail.open" class="modal" @keydown.esc="closeMail" tabindex="0">
      <div class="backdrop" @click="closeMail"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-head">
          <h3 class="subject">{{ mail.item?.subject }}</h3>
          <button class="icon" @click="closeMail">✕</button>
        </div>
        <div class="sheet-body">
          <div class="mail-meta">
            <div><strong>De:</strong> {{ mail.item?.from }}</div>
            <div><strong>Fecha:</strong> {{ fmt(mail.item?.receivedAt) }}</div>
          </div>
          <div class="mail-body">
            <pre>{{ mail.item?.body || mail.item?.preview }}</pre>
          </div>
        </div>
        <div class="sheet-foot">
          <div class="left"></div>
          <div class="right">
            <button class="button ghost" @click="discardFromModal">Descartar</button>
            <button class="button primary" @click="promoteFromModal">Convertir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTickets } from '../store/tickets'

const { state } = useTickets()

// Catálogos
const estados = ['Abierto','En Proceso','En Espera','Completado','Cerrado']
const prioridades = ['Baja','Media','Alta']
const tiposSoporte = state.tiposSoporte ?? ['Software','Hardware','Redes','Servidores']
const macros = state.macros ?? ['Ventas','TI','Operaciones','Finanzas']
const tiposTicket = state.tiposTicket ?? ['Gestión','Estratégico']

const asignados = computed(()=>{
  const a = new Set()
  state.tickets.forEach(t=> t.asignadoA && a.add(t.asignadoA))
  ;['Jeyson','Víctor','Heyder'].forEach(n=>a.add(n))
  return [...a]
})

// BANDEJA (mock)
const inbox = ref([])
onMounted(()=>{
  try{ const raw=localStorage.getItem('inbox_m365'); if(raw) inbox.value=JSON.parse(raw) }catch{}
})
watch(inbox, v=> localStorage.setItem('inbox_m365', JSON.stringify(v)), { deep:true })

function syncM365(){
  const seed = [
    { id:'m'+Date.now()+'a', subject:'Solicitud cuenta VPN nuevo ingreso', from:'RRHH <rrhh@avantika.com.co>', receivedAt:new Date(Date.now()-3600_000).toISOString(), preview:'Por favor crear usuario VPN para Ana M. área de compras.', body:'Buenas,\n\nSolicito creación de usuario VPN para Ana M. (Compras).\n\nGracias.' },
    { id:'m'+Date.now()+'b', subject:'Backup ERP falló anoche [servicios]', from:'Sistemas <sistemas@avantika.com.co>', receivedAt:new Date(Date.now()-2*3600_000).toISOString(), preview:'El job de SQL Agent terminó con código 1. Se requiere revisión.', body:'Hola,\n\nEl job de SQL Agent terminó con código 1. Favor revisar el servidor y logs.\n\n-- Sistemas' },
    { id:'m'+Date.now()+'c', subject:'TELÉFONO NO FUNCIONA', from:'Brayan Pérez <brayan@avantika.com.co>', receivedAt:new Date(Date.now()-5*3600_000).toISOString(), preview:'Buenas tardes, mi teléfono de escritorio no funciona. ¿Me ayudan por favor?', body:'Buenas tardes,\n\nMi teléfono de escritorio no funciona. ¿Me pueden ayudar por favor?\n\nGracias,\nBrayan' },
  ]
  seed.forEach(m=>{
    if(!inbox.value.find(x=>x.id===m.id)){
      Object.assign(m,{ tipoTicket:'Gestión', tipoSoporte:'', macroproceso:'', prioridad:'Media', asignadoA:'' })
      inbox.value.unshift(m)
    }
  })
  alert('Bandeja sincronizada (demo).')
}

function promote(m){
  const t = {
    id: genId(),
    titulo: m.subject,
    solicitante: m.from.replace(/<.*?>/g,'').trim(),
    descripcion: m.body || m.preview,
    prioridad: m.prioridad || 'Media',
    estadoTicket: 'Abierto',
    tipoSoporte: m.tipoSoporte || '',
    tipoTicket: m.tipoTicket || 'Gestión',
    macroproceso: m.macroproceso || '',
    asignadoA: m.asignadoA || '',
    creadoEn: m.receivedAt,
    actualizadoEn: new Date().toISOString(),
    vencimiento: '',
    slaHoras: 24
  }
  state.tickets.unshift(t)
  inbox.value = inbox.value.filter(x=> x.id!==m.id)
}
function discard(m){ inbox.value = inbox.value.filter(x=> x.id!==m.id) }

// Modal correo
const mail = ref({ open:false, item:null })
function openMail(m){ mail.value={ open:true, item:m }; lockScroll(true) }
function closeMail(){ mail.value.open=false; lockScroll(false) }
function promoteFromModal(){ if(mail.value.item){ promote(mail.value.item); closeMail() } }
function discardFromModal(){ if(mail.value.item){ discard(mail.value.item); closeMail() } }

// Filtros
const q = ref('')
const fEstado = ref(''); const fPrioridad = ref('')
const fAsignado = ref(''); const fTipoSoporte = ref('')
const fMacro = ref(''); const fTipoTicket = ref('')

// Vistas
const vista = ref('inbox') // arrancamos en Bandeja
const vistas = computed(()=>[
  { key:'todos', label:'Todos', count: list=> list.length },
  { key:'sin', label:'Sin asignar', count: list=> list.filter(t=>!t.asignadoA).length },
  { key:'abiertos', label:'Abiertos', count: list=> list.filter(t=>t.estadoTicket==='Abierto').length },
  { key:'proceso', label:'En Proceso', count: list=> list.filter(t=>t.estadoTicket==='En Proceso').length },
  { key:'espera', label:'En Espera', count: list=> list.filter(t=>t.estadoTicket==='En Espera').length },
  { key:'comp', label:'Completado', count: list=> list.filter(t=>t.estadoTicket==='Completado').length },
  { key:'cerr', label:'Cerrados', count: list=> list.filter(t=>t.estadoTicket==='Cerrado').length },
  { key:'j', label:'Tickets – Jeyson', count: list=> list.filter(t=>t.asignadoA==='Jeyson').length },
  { key:'v', label:'Tickets – Víctor', count: list=> list.filter(t=>t.asignadoA==='Víctor').length },
  { key:'h', label:'Tickets – Heyder', count: list=> list.filter(t=>t.asignadoA==='Heyder').length },
])

const filteredBase = computed(()=>{
  const text = q.value.trim().toLowerCase()
  return state.tickets.filter(t=>{
    if(fEstado.value && t.estadoTicket!==fEstado.value) return false
    if(fPrioridad.value && t.prioridad!==fPrioridad.value) return false
    if(fAsignado.value && (t.asignadoA||'')!==fAsignado.value) return false
    if(fTipoSoporte.value && (t.tipoSoporte||'')!==fTipoSoporte.value) return false
    if(fMacro.value && (t.macroproceso||'')!==fMacro.value) return false
    if(fTipoTicket.value && (t.tipoTicket||'')!==fTipoTicket.value) return false
    if(!text) return true
    const blob = `${t.id} ${t.titulo} ${t.descripcion||''} ${t.solicitante||''}`.toLowerCase()
    return blob.includes(text)
  })
})

// Vista seleccionada y paginación
const pageSize = 20
const page = ref(1)
const pages = ref(1)

const filtered = computed(()=>{
  let list = filteredBase.value
  switch(vista.value){
    case 'sin': list=list.filter(t=>!t.asignadoA); break
    case 'abiertos': list=list.filter(t=>t.estadoTicket==='Abierto'); break
    case 'proceso': list=list.filter(t=>t.estadoTicket==='En Proceso'); break
    case 'espera': list=list.filter(t=>t.estadoTicket==='En Espera'); break
    case 'comp': list=list.filter(t=>t.estadoTicket==='Completado'); break
    case 'cerr': list=list.filter(t=>t.estadoTicket==='Cerrado'); break
    case 'j': list=list.filter(t=>t.asignadoA==='Jeyson'); break
    case 'v': list=list.filter(t=>t.asignadoA==='Víctor'); break
    case 'h': list=list.filter(t=>t.asignadoA==='Heyder'); break
  }
  pages.value = Math.max(1, Math.ceil(list.length / pageSize))
  const start = (page.value-1)*pageSize
  return list.slice(start, start+pageSize)
})

watch([filteredBase, vista], ()=>{ page.value=1 })

// Modal Ticket
const modal = ref({ open:false, mode:'edit' })
const form = ref({})
const reply = ref({ tipo:'public', texto:'' })

function openTicket(t){
  modal.value = { open:true, mode:'edit' }
  form.value = { ...t }
  reply.value = { tipo:'public', texto:'' }
  lockScroll(true)
  nextTick(()=> focusModal())
}
function openNew(){
  modal.value = { open:true, mode:'create' }
  form.value = {
    id: genId(), titulo:'', solicitante:'', descripcion:'',
    prioridad:'Media', estadoTicket:'Abierto',
    tipoSoporte: tiposSoporte[0], tipoTicket: tiposTicket[0],
    macroproceso:'', asignadoA:'',
    creadoEn:new Date().toISOString(),
    actualizadoEn:new Date().toISOString(),
    vencimiento:'', slaHoras:24
  }
  reply.value = { tipo:'public', texto:'' }
  lockScroll(true)
  nextTick(()=> focusModal())
}
function closeModal(){ modal.value.open=false; lockScroll(false) }

function save(){
  if(!form.value.titulo?.trim()){ alert('El título es obligatorio'); return }
  form.value.actualizadoEn = new Date().toISOString()
  const idx = state.tickets.findIndex(x=> x.id===form.value.id)
  if(idx>=0){ state.tickets[idx] = { ...form.value } }
  else{ state.tickets.unshift({ ...form.value }) }
  if(reply.value.texto.trim()){ console.log('Respuesta', reply.value.tipo, reply.value.texto) }
  closeModal()
}

// Utils
function genId(){ const n=(state.tickets.length+1).toString().padStart(4,'0'); return `TCK-${n}` }
function fmt(iso){ try{ return new Date(iso).toLocaleString() }catch{ return '—' } }
function refresh(){}

function mapEstado(e){
  if(e==='Abierto') return 'chip-gray'
  if(e==='En Proceso') return 'chip-blue'
  if(e==='En Espera') return 'chip-yellow'
  if(e==='Completado') return 'chip-green'
  if(e==='Cerrado') return 'chip-dark'
  return ''
}

function lockScroll(on){
  if(on){ document.body.dataset.prevOverflow=document.body.style.overflow; document.body.style.overflow='hidden' }
  else{ document.body.style.overflow=document.body.dataset.prevOverflow||''; delete document.body.dataset.prevOverflow }
}
function focusModal(){ const el=document.querySelector('.modal'); el && el.focus() }
</script>

<style>
.tickets{ display:flex; flex-direction:column; gap:12px }

/* ===== Toolbar / Filtros ===== */
.toolbar{ display:flex; align-items:center; justify-content:space-between; gap:12px }
.toolbar--inbox .filters{ display:none }

.filters{
  display:flex; gap:8px; align-items:center;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.filters .input{
  height:34px; padding:6px 10px; border:1px solid var(--border);
  border-radius:10px; background:#fff;
  flex: 0 0 180px; width:180px !important; min-width:160px;
}
.input.search{ min-width:280px; flex: 0 0 280px; width:280px !important }
.actions{ display:flex; gap:8px; flex-shrink:0 }
.button{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:8px 12px; cursor:pointer }
.button.primary{ background:#0ea5e9; color:#fff; border-color:#0ea5e9 }
.button.sm{ padding:6px 10px; border-radius:10px; font-size:.9rem }
.button.ghost{ background:#f8fafc }

@media (max-width: 900px){
  .filters{ flex-wrap: wrap }
  .input.search{ flex-basis: 100%; min-width: 220px }
}

/* ===== Layout ===== */
.content{ display:grid; grid-template-columns: 260px 1fr; gap:12px }
.left{ min-width:220px }
.views{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px }
.vhead{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.views ul{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px }
.views li{ display:flex; align-items:center; justify-content:space-between; padding:10px 10px; border-radius:10px; cursor:pointer }
.views li:hover{ background:#f6f8fb }
.views li.active{ background:#ebf8ff; border:1px solid #dbeafe }
.badge{ padding:2px 8px; border-radius:999px; border:1px solid var(--border); font-size:.85rem }

/* ===== Tablas ===== */
.table-wrap{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:8px; overflow:auto }
.table{ width:100%; border-collapse:collapse }
.table th, .table td{ text-align:left; padding:12px 10px; border-bottom:1px solid #eef2f7; vertical-align:middle }
.table thead th{ color:#667085; font-weight:600 }
.pill{ padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:#fff; white-space:nowrap }
.tag{ padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:#fff; font-size:.9rem; white-space:nowrap }
.chip-blue{ color:#2563eb; border-color:#c7ddff; background:#f0f6ff }
.chip-yellow{ color:#92400e; border-color:#fde68a; background:#fffbeb }
.chip-green{ color:#047857; border-color:#bbf7d0; background:#ecfdf5 }
.chip-dark{ color:#111827; border-color:#d1d5db; background:#f3f4f6 }
.chip-gray{ color:#374151; border-color:#e5e7eb; background:#f9fafb }
.ellipsis{ max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.empty{ text-align:center; color:#6b7280; padding:32px 0 }

.link{ background:none; border:none; color:#0ea5e9; cursor:pointer; padding:0; font:inherit; text-decoration:underline }

/* ===== Bandeja (acciones simplificadas) ===== */
.inbox-help{ color:#6b7280; margin:4px 8px 10px }
.inbox-table .ellipsis{ max-width: 360px }
.inbox-actions{ display:flex; align-items:center; justify-content:flex-end }
.inbox-buttons{ display:flex; gap:8px }

/* Paginación */
.pager{ display:flex; gap:12px; align-items:center; justify-content:flex-end; padding:10px }

/* ===== Modales comunes ===== */
.modal{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:60; outline:none }
.backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.35) }
.sheet{ position:relative; width:min(980px, 90vw); max-height:90vh; background:#fff; border:1px solid var(--border);
        border-radius:14px; display:flex; flex-direction:column; overflow:hidden }
.sheet-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #eef2f7 }
.sheet-body{ padding:12px; overflow:auto }
.sheet-foot{ padding:10px 12px; border-top:1px solid #eef2f7; display:flex; align-items:center; justify-content:space-between; gap:8px }

.icon{ border:1px solid var(--border); background:#fff; border-radius:10px; padding:6px 8px; cursor:pointer }
.muted{ color:#6b7280 }

/* Form modal */
.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:10px }
.grid2 .span2{ grid-column: 1 / -1 }
label{ display:flex; flex-direction:column; gap:6px; font-size:.92rem }
.input{ border:1px solid var(--border); border-radius:10px; padding:8px 10px; background:#fff }
.input.area{ resize:vertical }

/* Modal correo */
.subject{ max-width: calc(100% - 48px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.mail-meta{ display:flex; gap:20px; flex-wrap:wrap; color:#475569; margin-bottom:10px }
.mail-body{ background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:12px; }
.mail-body pre{ margin:0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space:pre-wrap }

@media (max-width: 900px){
  .content{ grid-template-columns: 1fr }
  .grid2{ grid-template-columns: 1fr }
  .ellipsis{ max-width: 220px }
}
</style>
