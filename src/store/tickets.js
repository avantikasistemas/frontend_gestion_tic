import { reactive, computed } from 'vue'

const now = Date.now()
const iso = (ms) => new Date(ms).toISOString()

const initialTickets = [
    {
        id: 'TCK-0001',
        asunto: 'Error al iniciar sesión en Intranet',
        titulo: 'Error al iniciar sesión en Intranet',
        descripcion: 'Usuario no puede autenticarse, error 401.',
        prioridad: 'Alta',
        // NUEVOS
        tipoTicket: 'Gestión', // Gestión | Estratégico
        tipoSoporte: 'Software',
        macroproceso: 'Ventas',
        solicitante: 'Brayan Pérez',
        estadoTicket: 'En Proceso',
        // Fechas
        creadoEn: iso(now - 1000 * 60 * 60 * 24 * 30),
        actualizadoEn: iso(now - 1000 * 60 * 30),
        vencimiento: iso(now + 1000 * 60 * 60 * 8),
        slaHoras: 8,
        // Compat historica
        estado: 'En Proceso',
        asignadoA: 'Heyder',
        categoria: 'Aplicaciones',
        origen: 'manual', meta: {}
    },
    {
        id: 'TCK-0004',
        asunto: 'Backup ERP falló anoche',
        titulo: 'Backup ERP falló anoche',
        descripcion: 'Job de SQL Agent terminó con código 1.',
        prioridad: 'Alta',
        tipoTicket: 'Estratégico',
        tipoSoporte: 'Servidores',
        macroproceso: 'TI',
        solicitante: 'Sistemas',
        estadoTicket: 'Abierto',
        creadoEn: iso(now - 1000 * 60 * 60 * 24 * 2),
        actualizadoEn: iso(now - 1000 * 60 * 60 * 1),
        vencimiento: iso(now + 1000 * 60 * 60 * 24),
        slaHoras: 6,
        estado: 'Abierto',
        asignadoA: 'Sin asignar',
        categoria: 'Servidores',
        origen: 'manual', meta: {}
    },
    {
        id: 'TCK-0002',
        asunto: 'Falla de red área comercial',
        titulo: 'Falla de red área comercial',
        descripcion: 'Intermitencia en WiFi SSID-Ventas.',
        prioridad: 'Media',
        tipoTicket: 'Gestión',
        tipoSoporte: 'Redes',
        macroproceso: 'Operaciones',
        solicitante: 'Ana M.',
        estadoTicket: 'Cerrado',
        creadoEn: iso(now - 1000 * 60 * 60 * 24 * 45),
        actualizadoEn: iso(now - 1000 * 60 * 60 * 24 * 20),
        vencimiento: null,
        slaHoras: 24,
        estado: 'Cerrado',
        asignadoA: 'Víctor',
        categoria: 'Redes',
        origen: 'manual', meta: {}
    }
]

const state = reactive({
    tickets: [...initialTickets],

    usuarios: ['Jeyson', 'Víctor', 'Heyder', 'Sin asignar'],
    categorias: ['Aplicaciones', 'Redes', 'Hardware', 'Servidores', 'Seguridad'],
    prioridades: ['Baja', 'Media', 'Alta'],
    tiposSoporte: ['Software', 'Hardware', 'Redes', 'Servidores', 'Seguridad', 'Infraestructura', 'Soporte'],
    macroprocesos: ['Ventas', 'Operaciones', 'Finanzas', 'RRHH', 'TI', 'Compras', 'Logística'],
    tiposTicket: ['Gestión', 'Estratégico'],

    threads: {}
})

function createId() { return `TCK-${String(state.tickets.length + 1).padStart(4, '0')}` }

function addTicket(payload) {
    const nowIso = new Date().toISOString()
    const id = payload.id ?? createId()
    state.tickets.unshift({
        id,
        asunto: payload.asunto ?? payload.titulo ?? '',
        titulo: payload.asunto ?? payload.titulo ?? '',
        descripcion: payload.descripcion ?? '',
        prioridad: payload.prioridad ?? 'Media',
        tipoTicket: payload.tipoTicket ?? 'Gestión',
        tipoSoporte: payload.tipoSoporte ?? 'Soporte',
        macroproceso: payload.macroproceso ?? 'TI',
        solicitante: payload.solicitante ?? 'N/A',
        estadoTicket: payload.estadoTicket ?? 'Abierto',
        creadoEn: payload.creadoEn ?? nowIso,
        actualizadoEn: nowIso,
        vencimiento: payload.vencimiento ?? null,
        slaHoras: payload.slaHoras ?? 24,
        // compat
        estado: payload.estado ?? (payload.estadoTicket ?? 'Abierto'),
        asignadoA: payload.asignadoA ?? 'Sin asignar',
        categoria: payload.categoria ?? 'Aplicaciones',
        origen: payload.origen ?? 'manual', meta: payload.meta ?? {}
    })
}

function updateTicket(id, patch) {
    const t = state.tickets.find(x => x.id === id)
    if (!t) return
    Object.assign(t, patch, { actualizadoEn: new Date().toISOString() })
}

export function useTickets() {
    const inRange = (d, from, to) => {
        const x = new Date(d).getTime()
        return (!from || x >= new Date(from).getTime()) &&
            (!to || x <= new Date(to).getTime())
    }
    const byRange = (from, to) => state.tickets.filter(t => inRange(t.creadoEn, from, to))
    return { state, addTicket, updateTicket, byRange, inRange }
}
