import { reactive } from 'vue'

const now = new Date()
const d = (offDays) => {
    const x = new Date(now); x.setDate(x.getDate() - offDays); return x.toISOString()
}

export const itState = reactive({
    backups: [
        // id, sistema, job, estado(OK|Fallo), inicio, fin, tamanoGB, duracionMin
        { id: 'BKP-001', sistema: 'ERP', job: 'ERP-Full-Noche', estado: 'OK', inicio: d(0), fin: d(0), tamanoGB: 120, duracionMin: 45 },
        { id: 'BKP-002', sistema: 'ERP', job: 'ERP-Log', estado: 'OK', inicio: d(0), fin: d(0), tamanoGB: 3, duracionMin: 5 },
        { id: 'BKP-003', sistema: 'CRM', job: 'CRM-Full', estado: 'Fallo', inicio: d(1), fin: d(1), tamanoGB: 80, duracionMin: 50 },
        { id: 'BKP-004', sistema: 'Files', job: 'Files-Inc', estado: 'OK', inicio: d(1), fin: d(1), tamanoGB: 55, duracionMin: 30 },
        { id: 'BKP-005', sistema: 'DB', job: 'DB-Full', estado: 'OK', inicio: d(2), fin: d(2), tamanoGB: 200, duracionMin: 60 },
    ],
    services: [
        // servicio, slo target, uptime últimos 30 días [% por día], incidentes [{date, minutes}]
        {
            servicio: 'Correo', slo: 0.995,
            uptime: Array.from({ length: 30 }, (_, i) => i % 17 === 0 ? 98.0 : 100.0),
            incidentes: [{ date: d(12), minutes: 25 }]
        },
        {
            servicio: 'VPN', slo: 0.99,
            uptime: Array.from({ length: 30 }, (_, i) => i % 10 === 0 ? 97.5 : 99.9),
            incidentes: [{ date: d(7), minutes: 60 }]
        },
        {
            servicio: 'ERP', slo: 0.98,
            uptime: Array.from({ length: 30 }, (_, i) => i % 9 === 0 ? 95 : 99.5),
            incidentes: [{ date: d(3), minutes: 90 }]
        },
    ],
})
