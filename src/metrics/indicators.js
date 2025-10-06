// src/metrics/indicators.js
// Motor ligero de indicadores (solo frontend). Centraliza fórmulas.
// Cuando definas la lógica exacta, agregamos/ajustamos funciones aquí.

const toTs = (d) => new Date(d).getTime()
const inRange = (ts, from, to) => (!from || ts >= toTs(from)) && (!to || ts <= toTs(to))

/** Normaliza filtros */
function applyFilters(rows, { from, to, tipoTicket, macroproceso, tipoSoporte } = {}) {
    return rows.filter(r => {
        const okDate = inRange(r.creadoEn, from, to)
        const okTipo = !tipoTicket || r.tipoTicket === tipoTicket
        const okMacro = !macroproceso || r.macroproceso === macroproceso
        const okSoporte = !tipoSoporte || r.tipoSoporte === tipoSoporte
        return okDate && okTipo && okMacro && okSoporte
    })
}

/** Helpers de agregación comunes */
const helpers = {
    count: (rows, pred = () => true) => rows.filter(pred).length,

    groupBy(rows, key) {
        return rows.reduce((acc, r) => {
            const k = r[key] ?? '—'
            acc[k] = (acc[k] || 0) + 1
            return acc
        }, {})
    },

    // Cumplimiento SLA: tickets con fecha de vencimiento >= ahora (en tiempo)
    // sobre tickets con fecha de vencimiento (excluye Cerrados por defecto si se desea).
    sla(rows, { excluirCerrados = true } = {}) {
        const consider = rows.filter(r => r.vencimiento && (!excluirCerrados || r.estadoTicket !== 'Cerrado'))
        const total = consider.length
        const onTime = consider.filter(r => new Date(r.vencimiento) >= new Date()).length
        const percent = total ? onTime / total : 1
        return { onTime, total, percent }
    },

    // Tasa de cierre: Cerrados / Total (en rango)
    tasaCierre(rows) {
        const total = rows.length
        const cerrados = rows.filter(r => r.estadoTicket === 'Cerrado').length
        return { cerrados, total, percent: total ? cerrados / total : 0 }
    },

    // Backlog: no cerrados
    backlog(rows) {
        return rows.filter(r => r.estadoTicket !== 'Cerrado')
    },

    // Tendencia mensual por fecha de creación
    tendenciaMensual(rows) {
        const m = new Map()
        rows.forEach(r => {
            const d = new Date(r.creadoEn)
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            m.set(k, (m.get(k) || 0) + 1)
        })
        const labels = [...m.keys()].sort()
        const data = labels.map(k => m.get(k))
        return { labels, data }
    },

    // (Opcional) Tiempo promedio de resolución:
    // Usamos actualizadoEn como proxy de cierre si está Cerrado (hasta agregar "cerradoEn" real en el backend).
    tiempoPromedioResolucion(rows) {
        const cerrados = rows.filter(r => r.estadoTicket === 'Cerrado' && r.creadoEn && r.actualizadoEn)
        const diffs = cerrados.map(r => (new Date(r.actualizadoEn) - new Date(r.creadoEn)) / (1000 * 60 * 60)) // horas
        const avg = diffs.length ? (diffs.reduce((a, b) => a + b, 0) / diffs.length) : 0
        return { avgHoras: avg, n: diffs.length }
    }
}

/** Indicadores de ejemplo (plantillas) */
export function buildIndicatorEngine(allTickets) {
    return {
        run(filters = {}) {
            const rows = applyFilters(allTickets, filters)

            // === KPIs base ===
            const sla = helpers.sla(rows)
            const cierre = helpers.tasaCierre(rows)
            const backlog = helpers.backlog(rows)
            const trend = helpers.tendenciaMensual(rows)

            // Dimensiones
            const porMacro = helpers.groupBy(rows, 'macroproceso')
            const porSoporte = helpers.groupBy(rows, 'tipoSoporte')
            const porAsignado = helpers.groupBy(rows, 'asignadoA')
            const porEstado = helpers.groupBy(rows, 'estadoTicket')
            const porPrioridad = helpers.groupBy(rows, 'prioridad')

            // Segmentación estratégica
            const estrategicos = rows.filter(r => r.tipoTicket === 'Estratégico')
            const gestion = rows.filter(r => r.tipoTicket === 'Gestión')
            const pctEstrat = rows.length ? estrategicos.length / rows.length : 0

            // Tiempo promedio (proxy)
            const tpr = helpers.tiempoPromedioResolucion(rows)

            return {
                base: {
                    total: rows.length,
                    gestion: gestion.length,
                    estrategicos: estrategicos.length,
                    prioridadAlta: helpers.count(rows, r => r.prioridad === 'Alta'),
                },
                sla, cierre, backlogCount: backlog.length, trend, tpr,
                porMacro, porSoporte, porAsignado, porEstado, porPrioridad,
                pctEstrat
            }
        },

        // Exponemos helpers para fórmulas personalizadas
        helpers
    }
}

/**
 * === Cómo definir nuevos indicadores cuando envíes la lógica ===
 * Ejemplo de plantilla mental:
 *
 *  Indicador: "% Tickets estratégicos en tiempo"
 *  Numerador: tickets tipoTicket='Estratégico' con vencimiento >= ahora
 *  Denominador: tickets tipoTicket='Estratégico' con vencimiento definido
 *  Umbral/Meta: 90%
 *
 *  Implementación (rápida):
 *   const estrat = rows.filter(r => r.tipoTicket==='Estratégico' && r.vencimiento)
 *   const onTime = estrat.filter(r => new Date(r.vencimiento) >= new Date()).length
 *   const percent = estrat.length ? onTime/estrat.length : 1
 */
