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
              <span class="badge">{{ correos.length }}</span>
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
              <tr v-for="m in correos" :key="m.id">
                <td>{{ fmt(m.receivedDateTime) }}</td>
                <td class="ellipsis" :title="m.from">{{ m.from.emailAddress.name }}</td>
                <td class="ellipsis">
                  <button class="link" @click="openMail(m)" :title="m.subject">{{ m.subject }}</button>
                </td>
                <td class="ellipsis" :title="m.preview">{{ m.bodyPreview }}</td>
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
              <tr v-if="!correos.length">
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
            <div><strong>De:</strong> {{ mail.item?.from.emailAddress.address }}</div>
            <div><strong>Fecha:</strong> {{ fmt(mail.item?.receivedDateTime) }}</div>
          </div>
          <div class="mail-body" v-html="cleanHtmlContent(mail.item?.body.content)" ref="mailBodyRef" :key="mail.item?.id">
          </div>
          
          <!-- Sección de attachments -->
          <div v-if="currentAttachments.length > 0" class="mail-attachments">
            <h4 class="attachments-title">📎 Archivos adjuntos ({{ currentAttachments.length }})</h4>
            <div class="attachments-list">
              <div 
                v-for="attachment in currentAttachments" 
                :key="attachment.id" 
                class="attachment-item"
                @click="downloadAttachment(attachment)"
              >
                <div class="attachment-icon">
                  {{ getFileIcon(attachment.contentType || attachment.name) }}
                </div>
                <div class="attachment-info">
                  <div class="attachment-name">{{ attachment.name }}</div>
                  <div class="attachment-size">{{ formatFileSize(attachment.size) }}</div>
                </div>
                <div class="attachment-download">
                  <button class="download-btn" @click.stop="downloadAttachment(attachment)">
                    ⬇️
                  </button>
                </div>
              </div>
            </div>
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

import { useRouter } from 'vue-router';
import axios from 'axios';
import apiUrl from "../../config.js";

const router = useRouter();

const { state } = useTickets()

const correos = ref([]);
const token = ref('');
const attachmentsCache = ref(new Map()); // Cache para attachments
const mailBodyRef = ref(null); // Referencia al contenedor del mail body
const currentAttachments = ref([]); // Attachments del correo actual

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

// function syncM365(){
//   const seed = [
//     { id:'m'+Date.now()+'a', subject:'Solicitud cuenta VPN nuevo ingreso', from:'RRHH <rrhh@avantika.com.co>', receivedAt:new Date(Date.now()-3600_000).toISOString(), preview:'Por favor crear usuario VPN para Ana M. área de compras.', body:'Buenas,\n\nSolicito creación de usuario VPN para Ana M. (Compras).\n\nGracias.' },
//     { id:'m'+Date.now()+'b', subject:'Backup ERP falló anoche [servicios]', from:'Sistemas <sistemas@avantika.com.co>', receivedAt:new Date(Date.now()-2*3600_000).toISOString(), preview:'El job de SQL Agent terminó con código 1. Se requiere revisión.', body:'Hola,\n\nEl job de SQL Agent terminó con código 1. Favor revisar el servidor y logs.\n\n-- Sistemas' },
//     { id:'m'+Date.now()+'c', subject:'TELÉFONO NO FUNCIONA', from:'Brayan Pérez <brayan@avantika.com.co>', receivedAt:new Date(Date.now()-5*3600_000).toISOString(), preview:'Buenas tardes, mi teléfono de escritorio no funciona. ¿Me ayudan por favor?', body:'Buenas tardes,\n\nMi teléfono de escritorio no funciona. ¿Me pueden ayudar por favor?\n\nGracias,\nBrayan' },
//   ]
//   seed.forEach(m=>{
//     if(!inbox.value.find(x=>x.id===m.id)){
//       Object.assign(m,{ tipoTicket:'Gestión', tipoSoporte:'', macroproceso:'', prioridad:'Media', asignadoA:'' })
//       inbox.value.unshift(m)
//     }
//   })
//   alert('Bandeja sincronizada (demo).')
// }

const syncM365 = async () => {
  try {
    const response = await axios.post(
        `${apiUrl}/obtener_correos`, {},
        {
            headers: {
                Accept: "application/json",
            }
        }
    );
    if (response.status === 200) {
        correos.value = response.data.data.emails || [];
        token.value = response.data.data.token || '';
    }
  } catch (error) {
    console.error('Error al obtener correos:', error);
  }
}

// Función para obtener attachments de un correo específico
const obtenerAttachments = async (messageId) => {
  try {
    // Verificar si ya están en caché
    if (attachmentsCache.value.has(messageId)) {
      return attachmentsCache.value.get(messageId);
    }
    
    const response = await axios.post(
      `${apiUrl}/obtener_attachments`, 
      { messageId: messageId, token: token.value },
      {
        headers: {
          Accept: "application/json",
        }
      }
    );
    
    if (response.status === 200) {
      const attachments = response.data.data || [];
      // Guardar en caché
      attachmentsCache.value.set(messageId, attachments);
      return attachments;
    }
    return [];
  } catch (error) {
    console.error('Error al obtener attachments:', error);
    return [];
  }
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
function openMail(m){ 
  mail.value={ open:true, item:m }; 
  lockScroll(true) 
}
function closeMail(){ 
  mail.value.open=false; 
  mail.value.item=null; // Limpiar el item para forzar re-renderizado
  lockScroll(false) 
}
function promoteFromModal(){ if(mail.value.item){ promote(mail.value.item); closeMail() } }
function discardFromModal(){ if(mail.value.item){ discard(mail.value.item); closeMail() } }

// Watcher optimizado para procesar imágenes CID y cargar attachments con una sola llamada API
watch([() => mail.value.item, () => mail.value.open], async ([newMail, isOpen]) => {
  if (newMail && isOpen) {
    // Limpiar attachments anteriores
    currentAttachments.value = []
    
    await nextTick() // Esperar a que el DOM se actualice
    
    // Una sola llamada a la API para obtener todos los attachments
    await processMailAttachments(newMail.id)
  } else if (!isOpen) {
    // Limpiar attachments al cerrar
    currentAttachments.value = []
  }
})

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

// Función para limpiar y formatear el contenido HTML del correo (síncrona)
function cleanHtmlContent(htmlContent) {
  if (!htmlContent) return ''
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  
  // Procesar imágenes para mejorar la visualización
  const images = tempDiv.querySelectorAll('img')
  
  images.forEach(img => {
    const src = img.getAttribute('src')
    const alt = img.getAttribute('alt') || 'Imagen'
    
    // Para imágenes CID, mostrar placeholder inmediatamente
    if (src && src.startsWith('cid:')) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-placeholder cid-image'
      placeholder.dataset.cidSrc = src
      
      const cidId = src.replace('cid:', '')
      const cidInfo = `<br><small style="font-family: monospace; font-size: 11px; color: #9ca3af;">CID: ${cidId.substring(0, 8)}...</small>`
      
      placeholder.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
          border: 2px dashed #d1d5db; 
          border-radius: 12px; 
          padding: 24px 16px; 
          text-align: center; 
          color: #6b7280; 
          margin: 12px 0;
          font-size: 14px;
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
          <div style="font-weight: 600; margin-bottom: 4px;">Imagen adjunta</div>
          <div style="font-size: 13px;">${alt}</div>
          ${cidInfo}
          <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
            Esta imagen está incluida como archivo adjunto en el correo original
          </div>
        </div>
        </div>
      `
      img.parentNode.replaceChild(placeholder, img)
    } else {
      // Para imágenes con URLs válidas, aplicar estilos y manejo de errores
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '8px 0'
      img.style.borderRadius = '8px'
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
      
      // Manejo de errores para imágenes externas
      img.onerror = function() {
        const errorPlaceholder = document.createElement('div')
        errorPlaceholder.innerHTML = `
          <div style="
            background: #fef2f2; 
            border: 2px dashed #fca5a5; 
            border-radius: 8px; 
            padding: 16px; 
            text-align: center; 
            color: #dc2626; 
            margin: 8px 0;
            font-size: 14px;
          ">
            <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
            <div style="font-weight: 600;">Error al cargar imagen</div>
            <div style="font-size: 12px; margin-top: 4px; opacity: 0.8;">${alt}</div>
          </div>
        `
        this.parentNode.replaceChild(errorPlaceholder, this)
      }
    }
  })
  
  // Limpiar atributos potencialmente peligrosos
  const allElements = tempDiv.querySelectorAll('*')
  allElements.forEach(el => {
    // Mantener solo atributos seguros
    const allowedAttrs = ['href', 'src', 'alt', 'title', 'class', 'style']
    const attrs = [...el.attributes]
    attrs.forEach(attr => {
      if (!allowedAttrs.includes(attr.name.toLowerCase()) && 
          !attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name)
      }
    })
    
    // Limpiar hrefs javascript:
    if (el.hasAttribute('href') && el.getAttribute('href').startsWith('javascript:')) {
      el.removeAttribute('href')
    }
  })
  
  // Aplicar estilos básicos para mejorar la presentación
  const content = tempDiv.innerHTML
  return content || htmlContent.replace(/<[^>]*>/g, '') // fallback a texto plano si falla
}

// Función asíncrona para procesar imágenes CID después de renderizar el HTML
async function processCidImages(messageId) {
  if (!messageId || !mailBodyRef.value) return
  
  const cidPlaceholders = mailBodyRef.value.querySelectorAll('.cid-image')
  
  if (cidPlaceholders.length === 0) return
  
  try {
    const attachments = await obtenerAttachments(messageId)
    
    cidPlaceholders.forEach(placeholder => {
      const cidSrc = placeholder.dataset.cidSrc
      if (!cidSrc) return
      
      const cidId = cidSrc.replace('cid:', '')
      const attachment = attachments.find(att => 
        att.contentId === cidId || 
        att.contentId === `<${cidId}>` ||
        att.id === cidId
      )
      
      if (attachment && attachment.contentBytes) {
        // Convertir attachment a data URL
        const mimeType = attachment.contentType || 'image/png'
        const dataUrl = `data:${mimeType};base64,${attachment.contentBytes}`
        
        // Crear nueva imagen
        const img = document.createElement('img')
        img.src = dataUrl
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '8px 0'
        img.style.borderRadius = '8px'
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        
        // Reemplazar placeholder con imagen real
        placeholder.parentNode.replaceChild(img, placeholder)
      }
    })
  } catch (error) {
    console.error('Error procesando imágenes CID:', error)
  }
}

// Función optimizada que procesa attachments con una sola llamada API
async function processMailAttachments(messageId) {
  if (!messageId || !mailBodyRef.value) return
  
  try {
    // Una sola llamada a la API para obtener todos los attachments
    const attachments = await obtenerAttachments(messageId)
    
    // Procesar imágenes CID
    const cidPlaceholders = mailBodyRef.value.querySelectorAll('.cid-image')
    cidPlaceholders.forEach(placeholder => {
      const cidSrc = placeholder.dataset.cidSrc
      if (!cidSrc) return
      
      const cidId = cidSrc.replace('cid:', '')
      const attachment = attachments.find(att => 
        att.contentId === cidId || 
        att.contentId === `<${cidId}>` ||
        att.id === cidId
      )
      
      if (attachment && attachment.contentBytes) {
        // Convertir attachment a data URL
        const mimeType = attachment.contentType || 'image/png'
        const dataUrl = `data:${mimeType};base64,${attachment.contentBytes}`
        
        // Crear nueva imagen
        const img = document.createElement('img')
        img.src = dataUrl
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '8px 0'
        img.style.borderRadius = '8px'
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        
        // Reemplazar placeholder con imagen real
        placeholder.parentNode.replaceChild(img, placeholder)
      }
    })
    
    // Filtrar y cargar attachments para la lista (excluir CID embebidas)
    currentAttachments.value = attachments.filter(att => {
      // Excluir attachments que son imágenes CID embebidas (tienen contentId)
      return !att.contentId || att.contentId === null || att.contentId === ''
    })
    
  } catch (error) {
    console.error('Error procesando attachments del correo:', error)
    currentAttachments.value = []
  }
}

// Función para cargar todos los attachments de un correo
async function loadAttachments(messageId) {
  if (!messageId) return
  
  try {
    const attachments = await obtenerAttachments(messageId)
    
    // Filtrar attachments que no son imágenes CID embebidas
    currentAttachments.value = attachments.filter(att => {
      // Excluir attachments que son imágenes CID embebidas (tienen contentId)
      return !att.contentId || att.contentId === null || att.contentId === ''
    })
  } catch (error) {
    console.error('Error cargando attachments:', error)
    currentAttachments.value = []
  }
}

// Función para obtener el ícono según el tipo de archivo
function getFileIcon(contentTypeOrName) {
  const contentType = contentTypeOrName?.toLowerCase() || ''
  const name = contentTypeOrName?.toLowerCase() || ''
  
  // Documentos
  if (contentType.includes('pdf') || name.includes('.pdf')) return '📄'
  if (contentType.includes('word') || name.includes('.doc') || name.includes('.docx')) return '📝'
  if (contentType.includes('excel') || contentType.includes('spreadsheet') || name.includes('.xls') || name.includes('.xlsx')) return '📊'
  if (contentType.includes('powerpoint') || contentType.includes('presentation') || name.includes('.ppt') || name.includes('.pptx')) return '📋'
  
  // Imágenes
  if (contentType.includes('image') || name.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/)) return '🖼️'
  
  // Video y Audio
  if (contentType.includes('video') || name.match(/\.(mp4|avi|mov|wmv|flv)$/)) return '🎥'
  if (contentType.includes('audio') || name.match(/\.(mp3|wav|ogg|m4a)$/)) return '🎵'
  
  // Comprimidos
  if (contentType.includes('zip') || contentType.includes('rar') || name.match(/\.(zip|rar|7z|tar|gz)$/)) return '📦'
  
  // Texto
  if (contentType.includes('text') || name.includes('.txt')) return '📃'
  
  // Por defecto
  return '📁'
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Función para descargar un attachment
async function downloadAttachment(attachment) {
  try {
    if (attachment.contentBytes) {
      // Si ya tenemos el contenido, crear el download directamente
      const blob = new Blob([Uint8Array.from(atob(attachment.contentBytes), c => c.charCodeAt(0))], {
        type: attachment.contentType || 'application/octet-stream'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name || 'attachment'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      // Si no tenemos el contenido, hacer petición al backend para descargar
      const response = await axios.post(
        `${apiUrl}/descargar_attachment`,
        { 
          messageId: mail.value.item?.id,
          attachmentId: attachment.id 
        },
        {
          responseType: 'blob',
          headers: {
            Accept: "application/octet-stream",
          }
        }
      )
      
      const blob = new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.name || 'attachment'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Error descargando attachment:', error)
    alert('Error al descargar el archivo. Por favor, inténtalo de nuevo.')
  }
}
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
.mail-body{ 
  background:#f8fafc; 
  border:1px solid var(--border); 
  border-radius:10px; 
  padding:12px; 
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.5;
}

/* Estilos para el contenido HTML del correo */
.mail-body p { margin: 0 0 8px 0; }
.mail-body br { margin: 4px 0; }
.mail-body div { margin: 2px 0; }
.mail-body table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.mail-body td, .mail-body th { padding: 4px 8px; border: 1px solid #ddd; }
.mail-body a { color: #0ea5e9; text-decoration: underline; }
.mail-body strong, .mail-body b { font-weight: 600; }
.mail-body em, .mail-body i { font-style: italic; }
.mail-body ul, .mail-body ol { margin: 8px 0; padding-left: 20px; }
.mail-body li { margin: 2px 0; }

/* Estilos para attachments */
.mail-attachments {
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}

.attachments-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attachment-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.attachment-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.attachment-download {
  display: flex;
  align-items: center;
}

.download-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.download-btn:hover {
  background: #e5e7eb;
}
.mail-body blockquote { 
  border-left: 3px solid #ddd; 
  margin: 8px 0; 
  padding-left: 12px; 
  color: #666; 
}

/* Estilos para imágenes en correos */
.mail-body img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 8px 0;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Placeholder para imágenes que no cargan */
.mail-body .image-placeholder {
  margin: 12px 0;
  border-radius: 12px;
  overflow: hidden;
}

.mail-body .image-placeholder:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

/* Mejorar visualización de tablas en correos */
.mail-body table {
  font-size: 14px;
  border: 1px solid #e5e7eb;
}

.mail-body td, .mail-body th {
  border: 1px solid #e5e7eb;
  font-size: 13px;
}

/* Fallback para contenido de texto plano */
.mail-body pre{ 
  margin:0; 
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
  white-space:pre-wrap;
  font-size: 14px;
}

@media (max-width: 900px){
  .content{ grid-template-columns: 1fr }
  .grid2{ grid-template-columns: 1fr }
  .ellipsis{ max-width: 220px }
}
</style>
