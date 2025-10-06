<template>
  <div class="ticket-detail">
    <header class="head">
      <div class="left">
        <div class="crumbs">
          <span class="pill light">{{ ticket?.solicitante || 'Solicitante' }}</span>
          <span class="sep">/</span>
          <span class="muted tiny">{{ ticket?.categoria }}</span>
        </div>
        <h2 class="title"><span class="id">#{{ id }}</span> {{ ticket?.titulo }}</h2>
      </div>
      <div class="right">
        <span class="tag" :class="estadoClass(ticket?.estado)">{{ ticket?.estado }}</span>
        <button class="button" @click="$router.push('/tickets')">Volver</button>
      </div>
    </header>

    <div class="body">
      <!-- Campos -->
      <aside class="fields">
        <div class="group">
          <label>Solicitante</label>
          <div class="readonly">{{ ticket?.solicitante }}</div>
        </div>
        <div class="group">
          <label>Agente asignado</label>
          <select v-model="local.asignadoA" @change="savePatch()">
            <option v-for="u in state.usuarios" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
        <div class="group">
          <label>Estado</label>
          <select v-model="local.estado" @change="savePatch()">
            <option v-for="e in state.estados" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div class="group">
          <label>Prioridad</label>
          <select v-model="local.prioridad" @change="savePatch()">
            <option v-for="p in state.prioridades" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="group">
          <label>Macroproceso</label>
          <select v-model="macroproceso">
            <option>-</option><option>Ventas</option><option>Operaciones</option><option>Finanzas</option>
          </select>
        </div>
        <div class="group">
          <label>Nivel de soporte</label>
          <select v-model="nivel"><option>-</option><option>N1</option><option>N2</option><option>N3</option></select>
        </div>
        <div class="group">
          <label>Tipo</label>
          <select v-model="tipo"><option>-</option><option>Incidente</option><option>Requerimiento</option></select>
        </div>
        <div class="group">
          <label>Vencimiento</label>
          <input class="input" type="datetime-local" v-model="venc" @change="savePatch()" />
        </div>
      </aside>

      <!-- Conversación -->
      <section class="thread">
        <div class="messages" ref="scrollBox">
          <div v-for="m in thread" :key="m.id" class="msg" :class="m.public ? 'pub' : 'priv'">
            <div class="msg-head">
              <strong>{{ m.author }}</strong>
              <span class="muted tiny">· {{ formatTime(m.at) }} · {{ m.public ? 'Público' : 'Nota interna' }}</span>
            </div>
            <div class="msg-body" v-html="renderBody(m.body)"></div>
          </div>

          <div v-if="!thread.length" class="empty">
            <div class="emoji">📭</div>
            <div class="muted">Aún no hay mensajes en este ticket.</div>
          </div>
        </div>

        <!-- Composer -->
        <div class="composer">
          <div class="bar">
            <select v-model="visibility">
              <option value="public">Respuesta pública</option>
              <option value="private">Nota interna</option>
            </select>
            <div class="sp"></div>
            <button class="button" disabled title="Adjuntos (mock)">Adjuntar</button>
          </div>
          <textarea rows="4" v-model="reply" placeholder="Escribe tu respuesta..."></textarea>
          <div class="actions">
            <button class="button" @click="clear">Cancelar</button>
            <button class="button primary" :disabled="!reply.trim()" @click="send">Enviar</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTickets } from '../store/tickets'

const route = useRoute()
const id = route.params.id
const { state, getThread, addMessage, updateTicket } = useTickets()

const ticket = computed(()=> state.tickets.find(t=>t.id===id))
const thread = computed(()=> getThread(id))

const local = reactive({ asignadoA:'', estado:'', prioridad:'', vencimiento:'' })
const macroproceso = ref('-'), nivel = ref('-'), tipo = ref('-')
const venc = computed({
  get(){ return local.vencimiento ? local.vencimiento.slice(0,16) : '' },
  set(v){ local.vencimiento = v || '' }
})
onMounted(()=>{
  if(ticket.value){
    Object.assign(local, {
      asignadoA: ticket.value.asignadoA,
      estado: ticket.value.estado,
      prioridad: ticket.value.prioridad,
      vencimiento: ticket.value.vencimiento
    })
  }
})
function savePatch(){
  if(!ticket.value) return
  updateTicket(ticket.value.id, {
    asignadoA: local.asignadoA, estado: local.estado, prioridad: local.prioridad,
    vencimiento: local.vencimiento || null
  })
}

const visibility = ref('public')
const reply = ref('')
const scrollBox = ref(null)
function clear(){ reply.value='' }
function send(){
  addMessage(id, {
    body: reply.value,
    public: visibility.value==='public',
    kind: visibility.value==='public' ? 'respuesta' : 'nota',
    author: local.asignadoA || 'Agente',
    role: 'agente'
  })
  reply.value=''
  requestAnimationFrame(()=>{
    const el = scrollBox.value
    if(el) el.scrollTop = el.scrollHeight
  })
}

function estadoClass(e){
  if(e==='Cerrado') return 'muted'
  if(e==='Completado') return 'ok'
  if(e==='En Espera') return 'warn'
  if(e==='En Proceso') return 'blue'
  return ''
}
function formatTime(iso){ return new Date(iso).toLocaleString() }
function renderBody(txt){
  const esc = txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const linked = esc.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')
  return linked.replace(/\n/g,'<br>')
}
</script>

<style>
.ticket-detail{ height:100%; display:grid; grid-template-rows: 56px 1fr; background:var(--bg) }

/* header */
.head{ background:#fff; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 12px }
.left .title{ margin:4px 0 6px; font-size:1.15rem }
.left .id{ color:#94a3b8; margin-right:8px }
.crumbs{ display:flex; align-items:center; gap:8px; margin-top:4px }
.sep{ color:#cbd5e1 }
.right{ display:flex; gap:8px; align-items:center }

/* body */
.body{ min-height:0; display:grid; grid-template-columns: 320px 1fr; gap:12px; padding:12px }
.fields{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; overflow:auto }
.group{ margin-bottom:12px }
label{ color:var(--muted); font-size:.9rem; display:block; margin-bottom:4px }
.readonly{ background:#f7f8fa; border:1px solid var(--border); border-radius:10px; padding:10px 12px }
select, .input, textarea{ width:100%; background:#fff; border:1px solid var(--border); border-radius:10px; padding:10px 12px; color:var(--text) }

.thread{ min-width:0; display:grid; grid-template-rows: 1fr auto; gap:12px }
.messages{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; overflow:auto }
.msg{ border:1px solid var(--border); border-radius:10px; padding:10px 12px; margin-bottom:10px }
.msg.pub{ background:#f7fffd; border-color:#bcefe6 }
.msg.priv{ background:#fff9ed; border-color:#ffe3b1 }
.msg-head{ display:flex; gap:8px; align-items:baseline; margin-bottom:6px }
.msg-body a{ color:#2563eb; text-decoration: underline }

.composer{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px }
.bar{ display:flex; gap:8px; align-items:center }
.sp{ flex:1 }
.actions{ display:flex; justify-content:flex-end; gap:8px }

/* tags / pills */
.pill{ padding:4px 10px; border-radius:999px; border:1px solid var(--border); background:#fff }
.pill.light{ background:#f8fafc }
.tag{ padding:4px 8px; border-radius:999px; border:1px solid var(--border); background:#fff; font-size:.85rem }
.tag.ok{ color:#10b981; border-color:#c7f3e4; background:#f3fff9 }
.tag.warn{ color:#f59e0b; border-color:#ffe3b1; background:#fff9ed }
.tag.muted{ color:#4b5563; background:#f3f4f6 }
.tag.blue{ color:#2563eb; border-color:#c7ddff; background:#f0f6ff }

.button{ background:#fff; border:1px solid var(--border); border-radius:10px; padding:8px 12px; cursor:pointer }
.button.primary{ background:var(--accent); border-color:var(--accent); color:#fff }
.muted{ color:var(--muted) }
.tiny{ font-size:.85rem }
</style>
