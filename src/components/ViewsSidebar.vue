<template>
  <aside class="views">
    <header class="views-head">
      <h4>Vistas</h4>
      <button class="icon" @click="$emit('refresh')" title="Refrescar">⟲</button>
    </header>

    <ul class="list">
      <li :class="{active: modelValue==='todos'}" @click="pick('todos')">
        <span>Todos</span> <span class="count">{{ counts.todos }}</span>
      </li>
      <li :class="{active: modelValue==='sin_asignar'}" @click="pick('sin_asignar')">
        <span>Sin asignar</span> <span class="count">{{ counts.sin_asignar }}</span>
      </li>
      <li :class="{active: modelValue==='abiertos'}" @click="pick('abiertos')">
        <span>Abiertos</span> <span class="count">{{ counts.abiertos }}</span>
      </li>
      <li :class="{active: modelValue==='en_proceso'}" @click="pick('en_proceso')">
        <span>En Proceso</span> <span class="count">{{ counts.en_proceso }}</span>
      </li>
      <li :class="{active: modelValue==='en_espera'}" @click="pick('en_espera')">
        <span>En Espera</span> <span class="count">{{ counts.en_espera }}</span>
      </li>
      <li :class="{active: modelValue==='completado'}" @click="pick('completado')">
        <span>Completado</span> <span class="count">{{ counts.completado }}</span>
      </li>
      <li :class="{active: modelValue==='cerrados'}" @click="pick('cerrados')">
        <span>Cerrados</span> <span class="count">{{ counts.cerrados }}</span>
      </li>

      <li class="sep"></li>

      <li v-for="u in state.usuarios" :key="u"
          :class="{active: modelValue==='usr_'+u}"
          @click="pick('usr_'+u)">
        <span>Tickets – {{ u }}</span> <span class="count">{{ perUser[u] || 0 }}</span>
      </li>
    </ul>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useTickets } from '../store/tickets'

const props = defineProps({
  modelValue: { type: String, default: 'abiertos' }
})
const emit = defineEmits(['update:modelValue', 'refresh'])
const { state } = useTickets()
const counts = computed(() => {
  const t = state.tickets
  return {
    todos: t.length,
    sin_asignar: t.filter(x => x.asignadoA === 'Sin asignar' && x.estado !== 'Cerrado').length,
    abiertos: t.filter(x => ['Abierto', 'En Proceso', 'En Espera', 'Completado'].includes(x.estado)).length,
    en_proceso: t.filter(x => x.estado === 'En Proceso').length,
    en_espera: t.filter(x => x.estado === 'En Espera').length,
    completado: t.filter(x => x.estado === 'Completado').length,
    cerrados: t.filter(x => x.estado === 'Cerrado').length,
  }
})
const perUser = computed(() => {
  const m = {}; state.usuarios.forEach(u => m[u] = 0)
  state.tickets.forEach(t => { m[t.asignadoA] = (m[t.asignadoA] || 0) + 1 })
  return m
})
function pick(val) { emit('update:modelValue', val) }
</script>

<style>
.views{ background:#fff; border:1px solid var(--border); border-radius:12px; height:100%; overflow:auto }
.views-head{ position:sticky; top:0; background:#fff; z-index:1; padding:10px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between }
.views-head h4{ margin:0; font-size:.95rem }
.icon{ background:#fff; border:1px solid var(--border); border-radius:8px; padding:4px 8px; cursor:pointer; font-size:.9rem }
.list{ list-style:none; margin:0; padding:6px }
.list li{ display:flex; justify-content:space-between; gap:8px; padding:8px 9px; border-radius:10px; cursor:pointer; color:#111827; font-size:.95rem }
.list li:hover{ background:#f3f4f6 }
.list li.active{ background:#e8fbf7; border:1px solid var(--accent-200) }
.count{ padding:1px 7px; border:1px solid var(--border); border-radius:999px; color:#6b7280; background:#fff; font-size:.85rem }
.sep{ border-bottom:1px solid var(--border); margin:6px 0; padding:0; height:0 }
</style>

