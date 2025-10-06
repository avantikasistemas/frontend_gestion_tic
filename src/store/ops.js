import { reactive, computed } from 'vue'

const today = new Date()
const iso = d => new Date(d).toISOString()

// Semillas simples para demo
function daysBack(n) { const d = new Date(today); d.setDate(d.getDate() - n); return d }
const backupsSeed = [
    { id: 'BKP-001', sistema: 'ERP', fecha: iso(daysBack(1)), duracionMin: 32, exito: true, tamGB: 12.3 },
    { id: 'BKP-002', sistema: 'ERP', fecha: iso(daysBack(2)), duracionMin: 35, exito: true, tamGB: 12.1 },
    { id: 'BKP-003', sistema: 'ERP', fecha: iso(daysBack(3)), duracionMin: 18, exito: false, tamGB: 0 },
    { id: 'BKP-004', sistema: 'BI', fecha: iso(daysBack(1)), duracionMin: 15, exito: true, tamGB: 5.2 },
    { id: 'BKP-005', sistema: 'Correo', fecha: iso(daysBack(0)), duracionMin: 48, exito: true, tamGB: 22.7 },
    { id: 'BKP-006', sistema: 'Correo', fecha: iso(daysBack(2)), duracionMin: 50, exito: false, tamGB: 0 },
]

const services = [
    {
        id: 'SRV-ERP', nombre: 'ERP', slo: 0.985, // 98.5%
        // uptime diario (min up/down) últimos 14 días
        uptime: Array.from({ length: 14 }, (_, i) => {
            const d = daysBack(13 - i); const up = 24 * 60 - Math.round(Math.random() * 40)
            return { date: iso(d), up, down: 24 * 60 - up }
        })
    },
    {
        id: 'SRV-CORREO', nombre: 'Correo', slo: 0.99,
        uptime: Array.from({ length: 14 }, (_, i) => {
            const d = daysBack(13 - i); const up = 24 * 60 - Math.round(Math.random() * 20)
            return { date: iso(d), up, down: 24 * 60 - up }
        })
    }
]

const state = reactive({
    backups: backupsSeed,
    services
})

function inRange(d, from, to) {
    const x = new Date(d).getTime()
    return (!from || x >= new Date(from).getTime()) &&
        (!to || x <= new Date(to).getTime())
}

export function useOps() {
    const backupsByRange = (from, to) => state.backups.filter(b => inRange(b.fecha, from, to))
    const servicesUptimeByRange = (from, to) => state.services.map(s => {
        const rec = s.uptime.filter(u => inRange(u.date, from, to))
        const up = rec.reduce((a, b) => a + b.up, 0), down = rec.reduce((a, b) => a + b.down, 0)
        return { id: s.id, nombre: s.nombre, slo: s.slo, up, down, perc: up / (up + down || 1) }
    })
    return { state, backupsByRange, servicesUptimeByRange }
}
