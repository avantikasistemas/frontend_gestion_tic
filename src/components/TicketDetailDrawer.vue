<template>
  <transition name="slide">
    <aside v-if="open" class="drawer" @keydown.esc="$emit('close')">
      <header class="head">
        <div>
          <div class="muted tiny">Ticket</div>
          <strong>#{{ ticket.id }}</strong>
        </div>
        <button class="button" @click="$emit('close')">Cerrar</button>
      </header>

      <section class="body" v-if="ticket">
        <h3 class="title">{{ local.titulo }}</h3>
        <p class="muted">{{ local.descripcion }}</p>

        <div class="grid">
          <div>
            <label>Estado</label>
            <select v-model="local.estado">
              <option v-for="e in state.estados" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label>Asignado a</label>
            <select v-model="local.asignadoA">
              <option v-for="u in state.usuarios" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div>
            <label>Prioridad</label>
            <select v-model="local.prioridad">
              <option v-for="p in state.prioridades" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label>Vencimiento</label>
            <input class="input" type="datetime-local" v-model="venc" />
          </div>
        </div>

        <div class="sep"></div>
        <label>Agregar nota interna</label>
        <textarea rows="3" v-model="nota" placeholder="Resumen de lo realizado, próximo paso, etc."></textarea>

        <div class="actions">
          <button class="button" @click="$emit('close')">Cancelar</button>
          <button class="button primary" @click="save">Guardar</button>
        </div>
      </section>
    </aside>
  </transition>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import { useTickets } from '../store/tickets'

const props = defineProps({
  open: Boolean,
  ticket: Object
})
const emit = defineEmits(['close'])
const { state, updateTicket } = useTickets()
const local = reactive({ titulo:'', descripcion:'', prioridad:'', estado:'', asignadoA:'', vencimiento:'' })
const nota = reactive({ value:'' })

watch(() => props.ticket, (t)=>{
  if(!t) return
  Object.assign(local, {
    titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad,
    estado: t.estado, asignadoA: t.asignadoA, vencimiento: t.vencimiento
  })
  nota.value = ''
}, { immediate:true })

const venc = computed({
  get(){ return local.vencimiento ? local.vencimiento.slice(0,16) : '' },
  set(v){ local.vencimiento = v || '' }
})

function save(){
  if(!props.ticket) return
  updateTicket(props.ticket.id, {
    prioridad: local.prioridad,
    estado: local.estado,
    asignadoA: local.asignadoA,
    vencimiento: local.vencimiento || null
  })
  // Nota interna: aquí podrías guardar en backend; por ahora solo consola
  if(nota.value) console.info('Nota interna:', nota.value)
  emit('close')
}
</script>

<style>
.drawer{
  position: absolute; right:0; top:0; bottom:0; width: 420px; background:var(--panel);
  border-left:1px solid var(--border); box-shadow: -8px 0 24px rgba(0,0,0,.06);
  display:flex; flex-direction:column;
}
.slide-enter-from,.slide-leave-to{ transform: translateX(100%) }
.slide-enter-active,.slide-leave-active{ transition: transform .2s ease }
.head{ height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; border-bottom:1px solid var(--border) }
.body{ padding:14px; overflow:auto }
.title{ margin:0 0 6px }
.grid{ display:grid; gap:12px; grid-template-columns: 1fr 1fr }
@media (max-width: 820px){ .grid{ grid-template-columns: 1fr } .drawer{ width:100% } }
.sep{ height:1px; background:var(--border); margin:12px 0 }
.button{ background:#fff; border:1px solid var(--border); border-radius:10px; padding:8px 12px; cursor:pointer }
.button.primary{ background:var(--accent); border-color:var(--accent); color:#fff }
.input, select, textarea{ width:100%; background:#fff; border:1px solid var(--border); border-radius:10px; padding:10px 12px }
label{ color:var(--muted); font-size:.9rem; display:block; margin-bottom:4px }
</style>
