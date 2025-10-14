<template>
  <div class="tickets">
    <!-- Toolbar / Filtros (se ocultan en vista Bandeja) -->
    <div class="toolbar" :class="{ 'toolbar--inbox': vista==='inbox' }">
      <div class="filters" v-show="vista!=='inbox'">
        <input v-model="q" class="input search" placeholder="ID, asunto, solicitante, email…" />
        <select v-model="fEstado" class="input">
          <option value="">— Estado —</option>
          <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.id }} - {{ e.nombre }}</option>
        </select>
        <select v-model="fAsignado" class="input">
          <option value="">— Asignado a —</option>
          <option v-for="t in tecnicos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
        </select>
        <select v-model="fTipoSoporte" class="input">
          <option value="">— Tipo de Soporte —</option>
          <option v-for="t in tiposSoporte" :key="t.id" :value="t.id">{{ t.id }} - {{ t.nombre }}</option>
        </select>
        <select v-model="fMacro" class="input">
          <option value="">— Macroproceso —</option>
          <option v-for="m in macroprocesos" :key="m.id" :value="m.id">{{ m.id }} - {{ m.nombre }}</option>
        </select>
        <select v-model="fTipoTicket" class="input">
          <option value="">— Tipo de ticket —</option>
          <option v-for="t in tiposTicket" :key="t.id" :value="t.id">{{ t.id }} - {{ t.nombre }}</option>
        </select>
      </div>

      <div class="actions">
        <button class="button" @click="syncM365">Sincronizar Microsoft 365</button>
        <button 
          class="button ghost" 
          @click="clearAllFilters" 
          v-show="vista!=='inbox'" 
          title="Limpiar todos los filtros"
        >
          🗑️ Limpiar Filtros
        </button>
        <button class="button primary" @click="openNew" v-show="vista!=='inbox'">+ Nuevo Ticket</button>
      </div>
    </div>

    <div class="content">
      <!-- Sidebar de vistas -->
      <aside class="left">
        <div class="views">
          <div class="vhead">
            <span>Vistas</span>
            <!-- <button class="icon" @click="refresh" title="Refrescar">⟳</button> -->
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
                <td>{{ m.receivedAt }}</td>
                <td class="ellipsis" :title="m.from">{{ m.from_name }}</td>
                <td class="ellipsis">
                  <button class="link" @click="openMail(m)" :title="m.subject">{{ m.subject }}</button>
                </td>
                <td class="ellipsis" :title="m.preview">{{ m.preview }}</td>
                <td>
                  <div class="inbox-actions">
                    <div class="inbox-buttons">
                      <button class="button sm" @click="openMail(m)">Abrir</button>
                      <button class="button sm primary" @click="showConvertConfirmation(m)">Convertir</button>
                      <button class="button sm ghost" @click="showDiscardConfirmation(m)">Descartar</button>
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
          <!-- Indicador de resultados -->
          <div class="results-summary" v-if="ticketsCorreos.length > 0">
            <span class="results-text">
              Mostrando {{ ticketsCorreos.length }} ticket(s)
            </span>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Estado del Ticket</th>
                <th>Ticket ID</th>
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
                <td><span class="pill">{{ t.ticket_id }}</span></td>
                <td>{{ t.created_at }}</td>
                <td>{{ t.fecha_vencimiento ? t.fecha_vencimiento : '—' }}</td>
                <td>{{ t.tipo_soporte_nombre || '—' }}</td>
                <td class="ellipsis" :title="t.subject">{{ t.subject }}</td>
                <td class="ellipsis" :title="t.from_name">{{ t.from_name }}</td>
                <td>{{ t.macroproceso_nombre || '—' }}</td>
                <td>{{ t.asignadoNombre || t.asignadoNombre || 'Sin asignar' }}</td>
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
              <p><strong>{{ form.titulo }}</strong></p>
            </label>
            <label>
              <span>Solicitante</span>
              <p><strong>{{ form.solicitante }}</strong></p>
            </label>

            <label class="span2">
              <span>Descripción</span>
              <div class="ticket-body" v-html="cleanHtmlForTicketModal(form.descripcion)" ref="ticketBodyRef" :key="form.id">
              </div>
              
              <!-- Sección de attachments del ticket -->
              <div v-if="ticketAttachments.length > 0" class="ticket-attachments">
                <h4 class="attachments-title">📎 Archivos adjuntos del ticket ({{ ticketAttachments.length }})</h4>
                <div class="attachments-list">
                  <div 
                    v-for="attachment in ticketAttachments" 
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
            </label>

            <label>
              <span>Prioridad 
                <span v-if="guardandoCampo === 'prioridad'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.prioridad" class="input" :class="{ 'saving': guardandoCampo === 'prioridad' }">
                <option value="">-- Seleccionar prioridad --</option>
                <option v-for="p in prioridades" :key="p.id" :value="p.id">{{ p.id }} - {{ p.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Estado
                <span v-if="guardandoCampo === 'estado'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.estado" class="input" :class="{ 'saving': guardandoCampo === 'estado' }">
                <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.id }} - {{ e.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Tipo de Soporte
                <span v-if="guardandoCampo === 'tipoSoporte'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.tipoSoporte" class="input" :class="{ 'saving': guardandoCampo === 'tipoSoporte' }">
                <option value="">-- Seleccionar tipo de soporte --</option>
                <option v-for="t in tiposSoporte" :key="t.id" :value="t.id">{{ t.id }} - {{ t.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Tipo de ticket
                <span v-if="guardandoCampo === 'tipoTicket'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.tipoTicket" class="input" :class="{ 'saving': guardandoCampo === 'tipoTicket' }">
                <option value="">-- Seleccionar tipo de ticket --</option>
                <option v-for="t in tiposTicket" :key="t.id" :value="t.id">{{ t.id }} - {{ t.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Macroproceso
                <span v-if="guardandoCampo === 'macroproceso'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.macroproceso" class="input" :class="{ 'saving': guardandoCampo === 'macroproceso' }">
                <option value="">—</option>
                <option v-for="m in macroprocesos" :key="m.id" :value="m.id">{{ m.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Asignado a
                <span v-if="guardandoCampo === 'asignadoA'" class="saving-indicator">💾</span>
              </span>
              <select v-model="form.asignadoA" class="input" :class="{ 'saving': guardandoCampo === 'asignadoA' }">
                <option value="">Sin asignar</option>
                <option v-for="t in tecnicos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
              </select>
            </label>

            <label>
              <span>Vencimiento
                <span v-if="guardandoCampo === 'vencimiento'" class="saving-indicator">💾</span>
              </span>
              <input type="date" v-model="form.vencimiento" class="input" :class="{ 'saving': guardandoCampo === 'vencimiento' }" />
            </label>

            <label>
              <span>SLA (horas)
                <span v-if="guardandoCampo === 'slaHoras'" class="saving-indicator">💾</span>
              </span>
              <input type="number" min="1" step="1" v-model.number="form.slaHoras" class="input" :class="{ 'saving': guardandoCampo === 'slaHoras' }" />
            </label>

            <div class="span2">
              <textarea v-model="reply.texto" class="input area" rows="4" placeholder="Escribe tu respuesta…"></textarea>
            </div>
          </div>
        </div>

        <div class="sheet-foot">
          <div class="left"><span class="muted" v-if="modal.mode==='edit'">Última act.: {{ form.updated_at }}</span></div>
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
          <h3 class="subject">{{ mail.item?.subject || 'Sin asunto' }}</h3>
          <button class="icon" @click="closeMail">✕</button>
        </div>
        <div class="sheet-body">
          <div class="mail-meta">
            <div><strong>De:</strong> {{ mail.item?.from_email || 'Sin remitente' }}</div>
            <div><strong>Fecha:</strong> {{ mail.item?.receivedAt }}</div>
            <!-- <div v-if="mail.item?.estado"><strong>Estado:</strong> 
              <span class="tag" :class="mail.item.estado === 'nuevo' ? 'chip-blue' : 'chip-gray'">{{ mail.item.estado }}</span>
            </div> -->
            <div v-if="mail.item?.hasAttachments"><strong>Adjuntos:</strong> 
              <span class="tag chip-green">{{ mail.item.attachmentsCount || 0 }} archivo(s)</span>
            </div>
            <!-- <div v-if="mail.item?.preview && mail.item.preview !== mail.item?.body">
              <strong>Vista previa:</strong> <span class="muted">{{ mail.item.preview.substring(0, 100) }}{{ mail.item.preview.length > 100 ? '...' : '' }}</span>
            </div> -->
          </div>
          <div class="mail-body" v-html="cleanHtmlContent(mail.item?.body)" ref="mailBodyRef" :key="mail.item?.id">
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
            <button class="button ghost" @click="showDiscardConfirmation(mail.item)">Descartar</button>
            <button class="button primary" @click="showConvertConfirmation(mail.item)">Convertir</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Confirmación de descarte -->
    <div v-if="discardConfirmation.open" class="modal confirmation-modal" @keydown.esc="closeDiscardConfirmation" tabindex="0">
      <div class="backdrop" @click="closeDiscardConfirmation"></div>
      <div class="confirmation-sheet" role="dialog" aria-modal="true">
        <div class="confirmation-icon">
          <div class="warning-circle">
            <span class="warning-symbol">⚠️</span>
          </div>
        </div>
        
        <div class="confirmation-content">
          <h3 class="confirmation-title">¿Descartar correo?</h3>
          <p class="confirmation-message">
            ¿Estás seguro de que quieres descartar este correo? Esta acción no se puede deshacer.
          </p>
          <div class="confirmation-details">
            <div class="mail-preview">
              <div class="mail-preview-subject">
                <strong>Asunto:</strong> {{ discardConfirmation.item?.subject || 'Sin asunto' }}
              </div>
              <div class="mail-preview-from">
                <strong>De:</strong> {{ discardConfirmation.item?.from || 'Sin remitente' }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="confirmation-actions">
          <button class="button ghost" @click="closeDiscardConfirmation">Cancelar</button>
          <button class="button danger" @click="confirmDiscard">Sí, descartar</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Confirmación de conversión a ticket -->
    <div v-if="convertConfirmation.open" class="modal confirmation-modal" @keydown.esc="closeConvertConfirmation" tabindex="0">
      <div class="backdrop" @click="closeConvertConfirmation"></div>
      <div class="confirmation-sheet" role="dialog" aria-modal="true">
        <div class="confirmation-icon">
          <div class="success-circle">
            <span class="success-symbol">🎫</span>
          </div>
        </div>
        
        <div class="confirmation-content">
          <h3 class="confirmation-title">¿Convertir a ticket?</h3>
          <p class="confirmation-message">
            ¿Estás seguro de que quieres convertir este correo en un ticket de soporte?
          </p>
          <div class="confirmation-details">
            <div class="mail-preview">
              <div class="mail-preview-subject">
                <strong>Asunto:</strong> {{ convertConfirmation.item?.subject || 'Sin asunto' }}
              </div>
              <div class="mail-preview-from">
                <strong>De:</strong> {{ convertConfirmation.item?.from || 'Sin remitente' }}
              </div>
              <div class="mail-preview-info">
                <small class="convert-info">Se creará un nuevo ticket con esta información</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="confirmation-actions">
          <button class="button ghost" @click="closeConvertConfirmation">Cancelar</button>
          <button class="button success" @click="confirmConvert">Sí, convertir</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: Visor de imágenes -->
  <div v-if="imageViewer.open" class="modal image-viewer-modal" @keydown.esc="closeImageViewer" tabindex="0">
    <div class="backdrop" @click="closeImageViewer"></div>
    <div class="image-viewer-container" role="dialog" aria-modal="true">
      <div class="image-viewer-header">
        <h3 class="image-viewer-title">{{ imageViewer.title || imageViewer.alt || 'Imagen' }}</h3>
        <button class="icon close-btn" @click="closeImageViewer">✕</button>
      </div>
      
      <div class="image-viewer-content">
        <img 
          :src="imageViewer.src" 
          :alt="imageViewer.alt"
          class="viewer-image"
          @error="handleImageError"
        />
      </div>
      
      <div class="image-viewer-footer">
        <small class="image-info">{{ imageViewer.alt }}</small>
      </div>
    </div>
  </div>

  <!-- Overlay de carga -->
  <div v-if="loading" class="loading-overlay">
      <div class="custom-spinner">
          <div class="spinner-circle"></div>
      </div>
      <p class="loading-text">{{ loading_msg }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTickets } from '../store/tickets'

import { useRouter } from 'vue-router';
import axios from 'axios';
import apiUrl from "../../config.js";

const loading = ref(false);
const loading_msg = ref('');

const router = useRouter();

const { state } = useTickets()

const correos = ref([]);
const ticketsCorreos = ref([]); // Correos convertidos en tickets
const token = ref('');
const attachmentsCache = ref(new Map()); // Cache para attachments
const mailBodyRef = ref(null); // Referencia al contenedor del mail body
const currentAttachments = ref([]); // Attachments del correo actual
const ticketBodyRef = ref(null); // Referencia al contenedor del body del ticket
const ticketAttachments = ref([]); // Attachments del ticket en edición

// Visor de imágenes
const imageViewer = ref({
  open: false,
  src: '',
  alt: '',
  title: ''
});

// Catálogos
const estados = ref([]);
const tecnicos = ref([]);
const prioridades = ref([]);
const tiposSoporte = ref([]);
const tiposTicket = ref([]);
const macroprocesos = ref([]);

const asignados = computed(()=>{
  const nombres = new Set()
  // Usar técnicos cargados dinámicamente de la BD
  tecnicos.value.forEach(t => nombres.add(t.nombre))
  // Fallback técnicos por defecto si no hay técnicos cargados
  if (nombres.size === 0) {
    ;['Jeyson','Víctor','Heyder'].forEach(n => nombres.add(n))
  }
  return [...nombres]
})
// BANDEJA (mock)
const inbox = ref([])
onMounted(async ()=>{
  // Cargar catálogos dinámicos primero
  await cargarEstadosTickets();
  await cargarTecnicosGestionTic();
  
  // Sincronizar correos para la bandeja
  await syncM365();
  
  // Cargar contadores de tickets para las vistas
  await actualizarContadores();

  await obtenerPrioridades();
  await obtenerTipoSoporte();
  await obtenerTipoTicket();
  await obtenerMacroprocesos();
})
watch(inbox, v=> localStorage.setItem('inbox_m365', JSON.stringify(v)), { deep:true })

const obtenerPrioridades = async () => {
  try {
    const response = await axios.post(
        `${apiUrl}/obtener_prioridades`, {},
        {
            headers: {
                Accept: "application/json",
            }
        }
    );
    if (response.status === 200) {
        prioridades.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Error al obtener correos:', error);
  } 
};

const obtenerTipoSoporte = async () => {
  try {
    const response = await axios.post(
        `${apiUrl}/obtener_tipo_soporte`, {},
        {
            headers: {
                Accept: "application/json",
            }
        }
    );
    if (response.status === 200) {
        tiposSoporte.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Error al obtener tipos de soporte:', error);
  } 
};

const obtenerTipoTicket = async () => {
  try {
    const response = await axios.post(
        `${apiUrl}/obtener_tipo_ticket`, {},
        {
            headers: {
                Accept: "application/json",
            }
        }
    );
    if (response.status === 200) {
        tiposTicket.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Error al obtener tipos de ticket:', error);
    // Fallback a tipos por defecto si falla la carga
    tiposTicket.value = [
      {id: 1, nombre: 'Gestión'},
      {id: 2, nombre: 'Estratégico'}
    ];
  } 
};

const obtenerMacroprocesos = async () => {
  try {
    const response = await axios.post(
        `${apiUrl}/obtener_macroprocesos`, {},
        {
            headers: {
                Accept: "application/json",
            }
        }
    );
    if (response.status === 200) {
        macroprocesos.value = response.data.data || [];
    }
  } catch (error) {
    console.error('Error al obtener macroprocesos:', error);
  } 
};

const syncM365 = async () => {
  try {
    loading.value = true;
    loading_msg.value = 'Buscando...';

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
  } finally {
    loading.value = false;
    loading_msg.value = '';
  }
}

// Función para cargar tickets desde correos con vista específica
// Función para cargar tickets usando filtrado por backend
const cargarTicketsCorreos = async (vistaSeleccionada = 'todos', aplicarFiltros = false) => {
  try {
    loading.value = true;
    loading_msg.value = `Cargando ${vistaSeleccionada}...`;

    // Preparar parámetros para el backend
    const parametros = {
      vista: vistaSeleccionada,
      limite: 100,
      offset: 0
    };

    // Si aplicarFiltros es true, incluir los filtros activos
    if (aplicarFiltros) {
      if (q.value && q.value.trim()) parametros.q = q.value.trim();
      if (fEstado.value) parametros.fEstado = fEstado.value;
      if (fAsignado.value) parametros.fAsignado = fAsignado.value;
      if (fTipoSoporte.value) parametros.fTipoSoporte = fTipoSoporte.value;
      if (fMacro.value) parametros.fMacro = fMacro.value;
      if (fTipoTicket.value) parametros.fTipoTicket = fTipoTicket.value;
    }

    console.log('🔍 Parámetros enviados al backend:', parametros);

    const response = await axios.post(
      `${apiUrl}/filtrar_tickets`,
      parametros,
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      const data = response.data.data;
      ticketsCorreos.value = data.tickets || [];
      
      console.log(`✅ Tickets cargados: ${ticketsCorreos.value.length}/${data.total || 0}`);
      
      // Solo actualizar contadores si no estamos aplicando filtros específicos
      if (!aplicarFiltros) {
        await actualizarContadores();
      }
    }
  } catch (error) {
    console.error('Error al cargar tickets de correos:', error);
  } finally {
    loading.value = false;
    loading_msg.value = '';
  }
}

// Función para actualizar contadores de todas las vistas de manera eficiente
const actualizarContadores = async () => {
  try {
    // Vistas base del sistema
    const vistasActualizar = ['todos', 'sin', 'abiertos', 'proceso', 'comp'];
    
    // Agregar vistas de técnicos dinámicamente
    const vistasTecnicos = tecnicos.value.map(tecnico => `tecnico_${tecnico.id}`);
    const todasLasVistas = [...vistasActualizar, ...vistasTecnicos];
    
    // Hacer peticiones en paralelo para eficiencia
    const promesas = todasLasVistas.map(async (vistaKey) => {
      const response = await axios.post(
        `${apiUrl}/obtener_tickets_correos`,
        { 
          vista: vistaKey,
          limite: 1, // Solo necesitamos el conteo
          offset: 0
        },
        {
          headers: {
            Accept: "application/json",
          }
        }
      );
      
      if (response.status === 200) {
        return { vista: vistaKey, total: response.data.data.total };
      }
      return { vista: vistaKey, total: 0 };
    });
    
    const resultados = await Promise.all(promesas);
    
    // Actualizar contadores
    resultados.forEach(({ vista, total }) => {
      vistasCounts.value[vista] = total;
    });
    
  } catch (error) {
    console.error('Error actualizando contadores:', error);
  }
}

// Función para cargar estados de tickets desde el backend
const cargarEstadosTickets = async () => {
  try {
    const response = await axios.get(
      `${apiUrl}/obtener_estados_tickets`,
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      estados.value = response.data.data;
    }
  } catch (error) {
    console.error('Error al cargar estados de tickets:', error);
    // Fallback a estados por defecto si falla la carga
    estados.value = ['Abierto','En Proceso','En Espera','Completado','Cerrado'];
  }
}

// Función para cargar técnicos de gestión TIC desde el backend
const cargarTecnicosGestionTic = async () => {
  try {
    const response = await axios.get(
      `${apiUrl}/obtener_tecnicos_gestion_tic`,
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      tecnicos.value = response.data.data;
    }
  } catch (error) {
    console.error('Error al cargar técnicos de gestión TIC:', error);
  }
}

// Función para obtener attachments de un correo específico
const obtenerAttachments = async (messageId) => {
  try {
    console.log('obtenerAttachments llamado con messageId:', messageId, 'token disponible:', !!token.value);
    
    // Verificar si ya están en caché
    if (attachmentsCache.value.has(messageId)) {
      console.log('Attachments encontrados en caché para:', messageId);
      return attachmentsCache.value.get(messageId);
    }
    
    if (!token.value) {
      console.warn('No hay token disponible para obtener attachments');
      return [];
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
    
    console.log('Response obtener_attachments:', response.status, response.data);
    
    if (response.status === 200) {
      const attachments = response.data.data || [];
      console.log('Attachments obtenidos:', attachments.length);
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
    titulo: m.subject || 'Sin asunto',
    solicitante: m.from ? m.from.replace(/<.*?>/g,'').trim() : 'Sin remitente',
    descripcion: m.body || m.preview || 'Sin descripción',
    prioridad: m.prioridad || '',
    estado: m.estado || '',
    estadoTicket: '',
    tipoSoporte: m.tipoSoporte || '',
    tipoTicket: m.tipoTicket || '',
    macroproceso: m.macroproceso || '',
    asignadoA: m.asignadoA || '',
    creadoEn: m.receivedAt || new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
    vencimiento: '',
    slaHoras: ''
  }
  state.tickets.unshift(t)
  correos.value = correos.value.filter(x=> x.id!==m.id)
}

// Función para convertir correo a ticket con consumo al backend
async function convertToTicket(m) {
  try {
    loading.value = true;
    loading_msg.value = 'Convirtiendo a ticket...';

    const response = await axios.post(
      `${apiUrl}/convertir_correo_ticket`,
      { 
        messageId: m.id || m.messageId,
        id: m.id || m.messageId 
      },
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      // Crear el ticket localmente usando la función promote existente
      promote(m);
    } else {
      alert('Error al convertir el correo a ticket. Inténtalo de nuevo.');
    }
  } catch (error) {
    console.error('Error al convertir correo a ticket:', error);
    alert('Error de conexión al convertir el correo a ticket. Inténtalo de nuevo.');
  } finally {
    loading.value = false;
    loading_msg.value = '';
  }
}

// Función para descartar correo con consumo al backend
async function discard(m) {
  try {
    loading.value = true;
    loading_msg.value = 'Descartando correo...';

    const response = await axios.post(
      `${apiUrl}/descartar_correo`,
      { 
        messageId: m.id || m.messageId,
        id: m.id || m.messageId 
      },
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      // Remover el correo de la lista local solo si el backend confirma el descarte
      correos.value = correos.value.filter(x => x.id !== m.id);
    } else {
      console.error('Error descartando correo:', response.data.message);
      alert('Error al descartar el correo. Inténtalo de nuevo.');
    }
  } catch (error) {
    console.error('Error al descartar correo:', error);
    alert('Error de conexión al descartar el correo. Inténtalo de nuevo.');
  } finally {
    loading.value = false;
    loading_msg.value = '';
  }
}

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

// Modal de confirmación de descarte
const discardConfirmation = ref({ open: false, item: null })

function showDiscardConfirmation(mailItem) {
  discardConfirmation.value = { open: true, item: mailItem }
  lockScroll(true)
}

function closeDiscardConfirmation() {
  discardConfirmation.value = { open: false, item: null }
  lockScroll(false)
}

async function confirmDiscard() {
  if (discardConfirmation.value.item) {
    await discard(discardConfirmation.value.item)
    closeDiscardConfirmation()
    
    // Si el correo estaba abierto en el modal, cerrarlo también
    if (mail.value.open && mail.value.item?.id === discardConfirmation.value.item.id) {
      closeMail()
    }
  }
}

// Modal de confirmación de conversión a ticket
const convertConfirmation = ref({ open: false, item: null })

function showConvertConfirmation(mailItem) {
  convertConfirmation.value = { open: true, item: mailItem }
  lockScroll(true)
}

function closeConvertConfirmation() {
  convertConfirmation.value = { open: false, item: null }
  lockScroll(false)
}

async function confirmConvert() {
  if (convertConfirmation.value.item) {
    await convertToTicket(convertConfirmation.value.item)
    closeConvertConfirmation()
    
    // Si el correo estaba abierto en el modal, cerrarlo también
    if (mail.value.open && mail.value.item?.id === convertConfirmation.value.item.id) {
      closeMail()
    }
  }
}

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

// Vistas con contadores dinámicos
const vista = ref('inbox') // arrancamos en Bandeja
const vistasCounts = ref({
  todos: 0,
  sin: 0,
  abiertos: 0,
  proceso: 0,
  comp: 0
})

const vistas = computed(() => {
  // Vistas base del sistema
  const vistasBase = [
    { key:'todos', label:'Todos', count: () => vistasCounts.value.todos },
    { key:'sin', label:'Sin asignar', count: () => vistasCounts.value.sin },
    { key:'abiertos', label:'Abiertos', count: () => vistasCounts.value.abiertos },
    { key:'proceso', label:'En Proceso', count: () => vistasCounts.value.proceso },
    { key:'comp', label:'Completado', count: () => vistasCounts.value.comp },
  ];
  
  // Generar vistas dinámicas para cada técnico cargado desde el backend
  const vistasTecnicos = tecnicos.value.map(tecnico => ({
    key: `tecnico_${tecnico.id}`,
    label: `Tickets – ${tecnico.nombre}`,
    count: () => vistasCounts.value[`tecnico_${tecnico.id}`] || 0,
    tecnicoId: tecnico.id,
    tecnicoNombre: tecnico.nombre
  }));
  
  return [...vistasBase, ...vistasTecnicos];
})

const filteredBase = computed(()=>{
  // Si estamos en la bandeja, usar correos normales
  if (vista.value === 'inbox') {
    return [];
  }
  
  // Ahora el filtrado se hace por backend - solo devolvemos los tickets cargados
  // El filtrado pesado ya no se hace en frontend para mejor rendimiento
  return ticketsCorreos.value;
})

// Vista seleccionada y paginación
const pageSize = 20
const page = ref(1)
const pages = ref(1)

const filtered = computed(()=>{
  let list = filteredBase.value
  
  // Ya no necesitamos filtrar aquí porque el backend lo hace de manera optimizada
  // Solo aplicamos paginación
  pages.value = Math.max(1, Math.ceil(list.length / pageSize))
  const start = (page.value-1)*pageSize
  return list.slice(start, start+pageSize)
})

// Watcher para cambios de vista - cargar datos específicos
watch(vista, async (nuevaVista, vistaAnterior) => {
  page.value = 1;
  
  // Si cambiamos de vista a una que no sea inbox, cargar tickets correspondientes
  if (nuevaVista !== 'inbox') {
    await cargarTicketsCorreos(nuevaVista, false); // false = no aplicar filtros adicionales
  }
})

// Debounce para búsqueda de texto
let searchTimeout = null;
const debouncedSearch = (newValue, oldValue) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  
  searchTimeout = setTimeout(async () => {
    if (vista.value !== 'inbox') {
      await cargarTicketsCorreos(vista.value, true); // true = aplicar filtros
    }
  }, 500); // 500ms de debounce
};

// Watcher para filtro de búsqueda de texto (con debounce)
watch(q, debouncedSearch)

// Watchers para filtros de select (respuesta inmediata)
watch([fEstado, fAsignado, fTipoSoporte, fMacro, fTipoTicket], async () => {
  page.value = 1;
  
  if (vista.value !== 'inbox') {
    await cargarTicketsCorreos(vista.value, true); // true = aplicar filtros
  }
})

watch([filteredBase], ()=>{ page.value=1 })

// Modal Ticket
const modal = ref({ open:false, mode:'edit' })
const form = ref({})
const reply = ref({ tipo:'public', texto:'' })

// Watchers para actualización automática de campos del ticket
watch(() => form.value.prioridad, async (nuevaP, anteriorP) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevaP !== anteriorP && anteriorP !== undefined) {
    await actualizarCampoTicket('prioridad', nuevaP, 'Prioridad');
  }
});

watch(() => form.value.estado, async (nuevoE, anteriorE) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoE !== anteriorE && anteriorE !== undefined) {
    await actualizarCampoTicket('estado', nuevoE, 'Estado');
  }
});

watch(() => form.value.tipoSoporte, async (nuevoTS, anteriorTS) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoTS !== anteriorTS && anteriorTS !== undefined) {
    await actualizarCampoTicket('tipo_soporte', nuevoTS, 'Tipo de Soporte');
  }
});

watch(() => form.value.tipoTicket, async (nuevoTT, anteriorTT) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoTT !== anteriorTT && anteriorTT !== undefined) {
    await actualizarCampoTicket('tipo_ticket', nuevoTT, 'Tipo de Ticket');
  }
});

watch(() => form.value.macroproceso, async (nuevoM, anteriorM) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoM !== anteriorM && anteriorM !== undefined) {
    await actualizarCampoTicket('macroproceso', nuevoM, 'Macroproceso');
  }
});

watch(() => form.value.asignadoA, async (nuevoA, anteriorA) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoA !== anteriorA && anteriorA !== undefined) {
    await actualizarCampoTicket('asignado', nuevoA, 'Asignado');
  }
});

watch(() => form.value.vencimiento, async (nuevoV, anteriorV) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoV !== anteriorV && anteriorV !== undefined) {
    await actualizarCampoTicket('fecha_vencimiento', nuevoV, 'Fecha de Vencimiento');
  }
});

watch(() => form.value.slaHoras, async (nuevoSLA, anteriorSLA) => {
  if (modal.value.open && modal.value.mode === 'edit' && nuevoSLA !== anteriorSLA && anteriorSLA !== undefined) {
    await actualizarCampoTicket('sla', nuevoSLA, 'SLA (horas)');
  }
});

function openTicket(t){
  modal.value = { open:true, mode:'edit' }
  form.value = { ...t }

  // Mapear campos con nombres diferentes entre backend y frontend
  form.value.titulo = t.subject || t.titulo || '';
  form.value.solicitante = t.from_name || t.solicitante || '';
  
  // Mantener HTML de la descripción para renderizado
  const rawDescription = t.body || '';
  form.value.descripcion = rawDescription;
  
  // Asegurar que los valores estén correctamente seteados para los selects
  if (t.prioridad && typeof t.prioridad === 'object') {
    form.value.prioridad = t.prioridad.id || t.prioridad;
  } else if (t.prioridad) {
    form.value.prioridad = t.prioridad;
  }
  
  // Mapear tipo_soporte (backend) a tipoSoporte (frontend)
  const tipoSoporteValue = t.tipo_soporte || t.tipoSoporte;
  if (tipoSoporteValue && typeof tipoSoporteValue === 'object') {
    form.value.tipoSoporte = tipoSoporteValue.id || tipoSoporteValue;
  } else if (tipoSoporteValue) {
    form.value.tipoSoporte = tipoSoporteValue;
  }
  
  // Mapear tipo_ticket (backend) a tipoTicket (frontend)  
  const tipoTicketValue = t.tipo_ticket || t.tipoTicket;
  if (tipoTicketValue && typeof tipoTicketValue === 'object') {
    form.value.tipoTicket = tipoTicketValue.id || tipoTicketValue;
  } else if (tipoTicketValue) {
    form.value.tipoTicket = tipoTicketValue;
  }
  
  // Mapear asignado (backend) a asignadoA (frontend)
  const asignadoValue = t.asignado || t.asignadoA;
  if (asignadoValue && typeof asignadoValue === 'object') {
    form.value.asignadoA = asignadoValue.id || asignadoValue;
  } else if (asignadoValue) {
    form.value.asignadoA = asignadoValue;
  }
  
  // Mapear macroproceso
  const macroprocesoValue = t.macroproceso;
  if (macroprocesoValue && typeof macroprocesoValue === 'object') {
    form.value.macroproceso = macroprocesoValue.id || macroprocesoValue;
  } else if (macroprocesoValue) {
    form.value.macroproceso = macroprocesoValue;
  }
  
  // Mapear estado
  form.value.estado = t.estado || '';
  
  // Mapear fecha_vencimiento
  form.value.vencimiento = t.fecha_vencimiento || t.vencimiento || '';
  
  // Mapear sla
  form.value.slaHoras = t.sla || '';
  
  reply.value = { tipo:'public', texto:'' }
  lockScroll(true)
  
  // Cargar adjuntos del ticket si viene de un correo
  nextTick(async () => {
    focusModal();
    await processTicketAttachments(t);
  })
}
function openNew(){
  modal.value = { open:true, mode:'create' }
  form.value = {
    id: genId(), titulo:'', solicitante:'', descripcion:'',
    prioridad:'', estadoTicket:'',
    tipoSoporte:'', tipoTicket:'',
    macroproceso:'', asignadoA:'',
    creadoEn:new Date().toISOString(),
    actualizadoEn:new Date().toISOString(),
    vencimiento:'', slaHoras: ''
  }
  reply.value = { tipo:'public', texto:'' }
  lockScroll(true)
  nextTick(()=> focusModal())
}
function closeModal(){ 
  modal.value.open=false; 
  // Limpiar adjuntos del ticket al cerrar modal
  ticketAttachments.value = [];
  lockScroll(false); 
}

// Funciones del visor de imágenes
function openImageViewer(src, alt, title) {
  imageViewer.value = {
    open: true,
    src: src,
    alt: alt || 'Imagen',
    title: title || alt || 'Imagen'
  };
  lockScroll(true);
  nextTick(() => {
    const viewer = document.querySelector('.image-viewer-modal');
    viewer && viewer.focus();
  });
}

function closeImageViewer() {
  imageViewer.value.open = false;
  lockScroll(false);
}

function handleImageError() {
  console.error('Error al cargar la imagen en el visor');
  closeImageViewer();
  alert('Error al cargar la imagen');
}

// Estado para indicador de guardado
const guardandoCampo = ref('');

// Función para actualizar un campo específico del ticket en la BD
async function actualizarCampoTicket(campo, valor, mensaje) {
  if (modal.value.mode !== 'edit' || !form.value.id) return;
  
  try {
    guardandoCampo.value = campo;
    console.log(`🔄 Actualizando ${campo}:`, valor);
    
    const response = await axios.post(
      `${apiUrl}/actualizar_ticket`,
      {
        ticket_id: form.value.id,
        message_id: form.value.message_id, // Por si necesita el message_id como alternativa
        campo: campo,
        valor: valor
      },
      {
        headers: {
          Accept: "application/json",
        }
      }
    );

    if (response.status === 200) {
      console.log(`✅ ${mensaje} actualizado correctamente`);
      
      // Mostrar indicador de éxito temporal
      setTimeout(() => {
        if (guardandoCampo.value === campo) {
          guardandoCampo.value = '';
        }
      }, 1000);
    }
  } catch (error) {
    console.error(`❌ Error actualizando ${campo}:`, error);
    
    // Mostrar mensaje de error más específico
    const mensajeError = error.response?.data?.message || `Error al actualizar ${mensaje.toLowerCase()}`;
    alert(`${mensajeError}. Inténtalo de nuevo.`);
    
    guardandoCampo.value = '';
  }
}

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

// Función para limpiar todos los filtros
async function clearAllFilters() {
  q.value = '';
  fEstado.value = '';
  fAsignado.value = '';
  fTipoSoporte.value = '';
  fMacro.value = '';
  fTipoTicket.value = '';
  
  // Recargar vista base sin filtros
  if (vista.value !== 'inbox') {
    await cargarTicketsCorreos(vista.value, false);
  }
}

function mapEstado(e){
  if(e==='Abierto') return 'chip-gray'
  if(e==='En Proceso') return 'chip-blue'
  if(e==='Completado') return 'chip-green'
  return ''
}

function lockScroll(on){
  if(on){ document.body.dataset.prevOverflow=document.body.style.overflow; document.body.style.overflow='hidden' }
  else{ document.body.style.overflow=document.body.dataset.prevOverflow||''; delete document.body.dataset.prevOverflow }
}
function focusModal(){ const el=document.querySelector('.modal'); el && el.focus() }

// Función para limpiar y formatear el contenido HTML del correo (síncrona)
function cleanHtmlContent(htmlContent) {
  if (!htmlContent) return '<div class="empty">Sin contenido</div>'
  
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
      img.style.width = '50%'
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '8px 0'
      img.style.borderRadius = '8px'
      img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
      img.style.cursor = 'pointer'
      img.style.transition = 'all 0.3s ease'
      img.className = 'mail-image-clickable'
      
      // Agregar evento de clic para abrir el visor
      img.addEventListener('click', () => {
        openImageViewer(src, alt, alt);
      })
      
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
        img.alt = attachment.name || 'Imagen CID'
        img.style.maxWidth = '100%'
        img.style.width = '50%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '8px 0'
        img.style.borderRadius = '8px'
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        img.style.cursor = 'pointer'
        img.style.transition = 'all 0.3s ease'
        img.className = 'mail-image-clickable cid-processed'
        
        // Agregar evento de clic para abrir el visor
        img.addEventListener('click', () => {
          openImageViewer(dataUrl, img.alt, img.alt);
        })
        
        // Reemplazar placeholder con imagen real
        placeholder.parentNode.replaceChild(img, placeholder)
      }
    })
  } catch (error) {
    console.error('Error procesando imágenes CID:', error)
  }
}

// Función para procesar attachments del ticket en el modal de edición
async function processTicketAttachments(ticket) {
  // Debug: verificar qué campos tiene el ticket
  console.log('Ticket object:', ticket);
  console.log('Available keys:', Object.keys(ticket));
  
  // Buscar el message_id en diferentes posibles campos
  const messageId = ticket?.message_id || ticket?.messageId || ticket?.id || ticket?.correo_id;
  
  if (!messageId || !ticketBodyRef.value) {
    console.log('No messageId found or ticketBodyRef not available:', { messageId, ticketBodyRef: !!ticketBodyRef.value });
    ticketAttachments.value = [];
    return;
  }
  
  try {
    console.log('Intentando obtener attachments para messageId:', messageId);
    // Obtener attachments del correo original usando el message_id del ticket
    const attachments = await obtenerAttachments(messageId);
    
    // Procesar imágenes CID en el modal de ticket
    const cidPlaceholders = ticketBodyRef.value.querySelectorAll('.cid-image-ticket');
    cidPlaceholders.forEach(placeholder => {
      const cidSrc = placeholder.dataset.cidSrc;
      if (!cidSrc) return;
      
      const cidId = cidSrc.replace('cid:', '');
      const attachment = attachments.find(att => 
        att.contentId === cidId || 
        att.contentId === `<${cidId}>` ||
        att.id === cidId
      );
      
      if (attachment && attachment.contentBytes) {
        // Convertir attachment a data URL
        const mimeType = attachment.contentType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${attachment.contentBytes}`;
        
        // Crear nueva imagen más pequeña para el modal de ticket
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = attachment.name || 'Imagen CID';
        img.style.maxWidth = '100%';
        img.style.width = '30%'; // Más pequeña que en modal de correo
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '4px 0';
        img.style.borderRadius = '6px';
        img.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
        img.style.cursor = 'pointer';
        img.style.transition = 'all 0.3s ease';
        img.className = 'ticket-image-clickable cid-processed';
        
        // Agregar evento de clic para abrir el visor
        img.addEventListener('click', () => {
          openImageViewer(dataUrl, img.alt, img.alt);
        });
        
        // Reemplazar placeholder con imagen real
        placeholder.parentNode.replaceChild(img, placeholder);
      }
    });
    
    // Filtrar y cargar attachments para la lista (excluir CID embebidas)
    ticketAttachments.value = attachments.filter(att => {
      // Excluir attachments que son imágenes CID embebidas (tienen contentId)
      return !att.contentId || att.contentId === null || att.contentId === '';
    });
    
    console.log('Attachments procesados:', {
      totalAttachments: attachments.length,
      cidPlaceholders: ticketBodyRef.value.querySelectorAll('.cid-image-ticket').length,
      ticketAttachments: ticketAttachments.value.length
    });
    
  } catch (error) {
    console.error('Error procesando attachments del ticket:', error);
    ticketAttachments.value = [];
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

// Función para limpiar HTML y convertir a texto plano para textarea
function cleanHtmlForTextarea(htmlContent) {
  if (!htmlContent) return '';
  
  // Crear un elemento temporal para procesar el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Reemplazar algunos elementos HTML comunes con equivalentes de texto
  const brElements = tempDiv.querySelectorAll('br');
  brElements.forEach(br => br.replaceWith('\n'));
  
  const pElements = tempDiv.querySelectorAll('p');
  pElements.forEach(p => {
    p.replaceWith(p.textContent + '\n\n');
  });
  
  const divElements = tempDiv.querySelectorAll('div');
  divElements.forEach(div => {
    div.replaceWith(div.textContent + '\n');
  });
  
  // Obtener solo el texto plano
  let cleanText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Limpiar espacios múltiples y saltos de línea excesivos
  cleanText = cleanText
    .replace(/\s+/g, ' ')           // Múltiples espacios a uno solo
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Múltiples saltos de línea a máximo dos
    .trim();                        // Eliminar espacios al inicio y final
  
  return cleanText;
}

// Función para limpiar y formatear el contenido HTML del ticket (similar a cleanHtmlContent pero con imágenes más pequeñas)
function cleanHtmlForTicketModal(htmlContent) {
  if (!htmlContent) return '<div class="empty">Sin contenido</div>'
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  
  // Procesar imágenes para el modal de ticket (más pequeñas)
  const images = tempDiv.querySelectorAll('img')
  
  images.forEach(img => {
    const src = img.getAttribute('src')
    const alt = img.getAttribute('alt') || 'Imagen'
    
    // Para imágenes CID, mostrar placeholder inmediatamente
    if (src && src.startsWith('cid:')) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-placeholder cid-image-ticket'
      placeholder.dataset.cidSrc = src
      
      const cidId = src.replace('cid:', '')
      const cidInfo = `<br><small style="font-family: monospace; font-size: 10px; color: #9ca3af;">CID: ${cidId.substring(0, 8)}...</small>`
      
      placeholder.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
          border: 2px dashed #d1d5db; 
          border-radius: 8px; 
          padding: 12px 8px; 
          text-align: center; 
          color: #6b7280; 
          margin: 6px 0;
          font-size: 12px;
          position: relative;
          overflow: hidden;
        ">
          <div style="font-size: 20px; margin-bottom: 4px;">🖼️</div>
          <div style="font-weight: 600; margin-bottom: 2px; font-size: 11px;">Imagen adjunta</div>
          <div style="font-size: 10px;">${alt}</div>
          ${cidInfo}
        </div>
      `
      img.parentNode.replaceChild(placeholder, img)
    } else {
      // Para imágenes con URLs válidas, aplicar estilos más pequeños
      img.style.maxWidth = '100%'
      img.style.width = '30%' // Más pequeñas que en el modal de correo (era 50%)
      img.style.height = 'auto'
      img.style.display = 'block'
      img.style.margin = '4px 0' // Menos margen
      img.style.borderRadius = '6px'
      img.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)'
      img.style.cursor = 'pointer'
      img.style.transition = 'all 0.3s ease'
      img.className = 'ticket-image-clickable'
      
      // Agregar evento de clic para abrir el visor
      img.addEventListener('click', () => {
        openImageViewer(src, alt, alt);
      })
      
      // Manejo de errores para imágenes externas
      img.onerror = function() {
        const errorPlaceholder = document.createElement('div')
        errorPlaceholder.innerHTML = `
          <div style="
            background: #fef2f2; 
            border: 1px dashed #fca5a5; 
            border-radius: 6px; 
            padding: 8px; 
            text-align: center; 
            color: #dc2626; 
            margin: 4px 0;
            font-size: 12px;
          ">
            <div style="font-size: 16px; margin-bottom: 4px;">❌</div>
            <div style="font-weight: 600; font-size: 11px;">Error al cargar imagen</div>
            <div style="font-size: 10px; margin-top: 2px; opacity: 0.8;">${alt}</div>
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

/* Indicador de resultados */
.results-summary {
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #64748b;
}

.results-text {
  font-weight: 500;
}

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
.sheet{ position:relative; width:min(1200px, 95vw); max-height:95vh; background:#fff; border:1px solid var(--border);
        border-radius:14px; display:flex; flex-direction:column; overflow:hidden }

/* Modal de correo más grande */
.modal .sheet:has(.mail-body) { 
  width:min(1600px, 98vw); 
  max-height:98vh; 
}
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
  max-height: 500px;
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

/* Estilos para el modal de tickets */
.ticket-body{ 
  background:#f8fafc; 
  border:1px solid var(--border); 
  border-radius:10px; 
  padding:10px; 
  max-height: 300px; /* Más compacto que el modal de correo */
  overflow-y: auto;
  line-height: 1.4;
  font-size: 0.9rem;
}

/* Estilos para el contenido HTML del ticket (más compactos) */
.ticket-body p { margin: 0 0 6px 0; }
.ticket-body br { margin: 2px 0; }
.ticket-body div { margin: 1px 0; }
.ticket-body table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 0.85rem; }
.ticket-body td, .ticket-body th { padding: 3px 6px; border: 1px solid #ddd; }
.ticket-body a { color: #0ea5e9; text-decoration: underline; }
.ticket-body strong, .ticket-body b { font-weight: 600; }
.ticket-body em, .ticket-body i { font-style: italic; }
.ticket-body ul, .ticket-body ol { margin: 6px 0; padding-left: 16px; }
.ticket-body li { margin: 1px 0; }

/* Estilos para imágenes en modal de ticket (más pequeñas) */
.ticket-body img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 4px 0;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Placeholder para imágenes en modal de ticket */
.ticket-body .image-placeholder {
  margin: 6px 0;
  border-radius: 8px;
  overflow: hidden;
}

/* Estilos para attachments del ticket */
.ticket-attachments {
  margin-top: 12px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

.ticket-attachments .attachments-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 6px 0;
}

.ticket-attachments .attachment-item {
  padding: 4px 6px;
  font-size: 0.85rem;
}

.ticket-attachments .attachment-name {
  font-size: 12px;
}

.ticket-attachments .attachment-size {
  font-size: 10px;
}

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
  gap: 8px;
  padding: 6px 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-size {
  font-size: 11px;
  color: #6b7280;
  margin-top: 1px;
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

/* Modal de ticket - estilos para contenido HTML */
.ticket-body{ 
  background:#f8fafc; 
  border:1px solid var(--border); 
  border-radius:10px; 
  padding:10px; 
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.4;
  font-size: 0.9rem;
}

/* Estilos para el contenido HTML del ticket (más compactos) */
.ticket-body p { margin: 0 0 6px 0; }
.ticket-body br { margin: 2px 0; }
.ticket-body div { margin: 1px 0; }
.ticket-body table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 0.85rem; }
.ticket-body td, .ticket-body th { padding: 3px 6px; border: 1px solid #ddd; }
.ticket-body a { color: #0ea5e9; text-decoration: underline; }
.ticket-body strong, .ticket-body b { font-weight: 600; }
.ticket-body em, .ticket-body i { font-style: italic; }
.ticket-body ul, .ticket-body ol { margin: 6px 0; padding-left: 16px; }
.ticket-body li { margin: 1px 0; }

/* Estilos para imágenes en modal de ticket (más pequeñas) */
.ticket-body img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 4px 0;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

/* Placeholder para imágenes en modal de ticket */
.ticket-body .image-placeholder {
  margin: 6px 0;
  border-radius: 8px;
  overflow: hidden;
}

/* Estilos para attachments del ticket */
.ticket-attachments {
  margin-top: 12px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

.ticket-attachments .attachments-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 6px 0;
}

.ticket-attachments .attachment-item {
  padding: 4px 6px;
  font-size: 0.85rem;
}

.ticket-attachments .attachment-name {
  font-size: 12px;
}

.ticket-attachments .attachment-size {
  font-size: 10px;
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

/* Overlay de carga */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(44, 62, 80, 0.45);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* Spinner circular personalizado */
.custom-spinner {
    position: relative;
    width: 60px;
    height: 60px;
    margin-bottom: 20px;
}

.spinner-circle {
    width: 100%;
    height: 100%;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top: 4px solid #17c1a4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
}

@keyframes spin {
    0% { 
        transform: rotate(0deg); 
    }
    100% { 
        transform: rotate(360deg); 
    }
}

.loading-text {
    color: #fff;
    font-size: 1.15rem;
    text-align: center;
    text-shadow: 0 1px 4px rgba(0,0,0,0.18);
    font-weight: 500;
    margin: 0;
}

/* ===== Modal de Confirmación ===== */
.confirmation-modal {
  z-index: 70; /* Más alto que otros modales */
}

.confirmation-sheet {
  position: relative;
  width: min(480px, 90vw);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 24px 24px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.confirmation-icon {
  margin-bottom: 20px;
}

.warning-circle {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(251, 191, 36, 0.3);
}

.warning-symbol {
  font-size: 28px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.confirmation-content {
  margin-bottom: 24px;
  width: 100%;
}

.confirmation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.confirmation-message {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.confirmation-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
}

.mail-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mail-preview-subject,
.mail-preview-from {
  font-size: 0.875rem;
  color: #374151;
}

.mail-preview-subject strong,
.mail-preview-from strong {
  color: #111827;
  font-weight: 600;
}

.confirmation-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

.confirmation-actions .button {
  flex: 1;
  max-width: 140px;
  justify-content: center;
  font-weight: 500;
}

.button.danger {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
  transition: all 0.2s ease;
}

.button.danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.button.danger:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
}

/* Estilos para modal de conversión */
.success-circle {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #dcfce7 0%, #22c55e 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(34, 197, 94, 0.3);
}

.success-symbol {
  font-size: 28px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.convert-info {
  color: #6b7280;
  font-style: italic;
  margin-top: 8px;
  display: block;
}

.button.success {
  background: #22c55e;
  color: #fff;
  border-color: #22c55e;
  transition: all 0.2s ease;
}

.button.success:hover {
  background: #16a34a;
  border-color: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.3);
}

.button.success:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);
}

/* ===== Efectos de hover para imágenes ===== */
.mail-image-clickable:hover,
.ticket-image-clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2) !important;
  opacity: 0.9;
  filter: brightness(1.1);
}

.mail-image-clickable:active,
.ticket-image-clickable:active {
  transform: scale(0.98);
}

/* ===== Modal del visor de imágenes ===== */
.image-viewer-modal {
  z-index: 70; /* Por encima de otras modales */
}

.image-viewer-modal .backdrop {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.image-viewer-container {
  position: relative;
  width: min(90vw, 1200px);
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e2e8f0;
}

.image-viewer-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  max-width: calc(100% - 40px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 16px;
  color: #64748b;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #475569;
  transform: scale(1.05);
}

.image-viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f8fafc;
  overflow: hidden;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  object-fit: contain;
  transition: transform 0.3s ease;
}

.viewer-image:hover {
  transform: scale(1.02);
}

.image-viewer-footer {
  padding: 12px 20px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.image-info {
  color: #64748b;
  font-size: 0.9rem;
  font-style: italic;
}

/* Responsive para dispositivos móviles */
@media (max-width: 768px) {
  .image-viewer-container {
    width: 95vw;
    max-height: 95vh;
  }
  
  .image-viewer-header {
    padding: 12px 16px;
  }
  
  .image-viewer-title {
    font-size: 1.1rem;
  }
  
  .image-viewer-content {
    padding: 15px;
  }
  
  .image-viewer-footer {
    padding: 10px 16px;
  }
}

/* ===== Estilos para indicadores de guardado ===== */
.saving-indicator {
  font-size: 0.8em;
  opacity: 0.7;
  animation: pulse 1.5s ease-in-out infinite alternate;
  margin-left: 4px;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.input.saving {
  border-color: #0ea5e9 !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1) !important;
  background-color: rgba(14, 165, 233, 0.02) !important;
}

.input.saving:focus {
  border-color: #0ea5e9 !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2) !important;
}
</style>
