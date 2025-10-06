import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Tickets from '@/views/Tickets.vue'
import TicketDetail from '@/views/TicketDetail.vue'
import Backups from '@/views/Backups.vue'
import Availability from '@/views/Availability.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', name: 'dashboard', component: Dashboard },
        { path: '/tickets', name: 'tickets', component: Tickets },
        { path: '/tickets/:id', name: 'ticket-detail', component: TicketDetail, props: true },
        { path: '/backups', name: 'backups', component: Backups },
        { path: '/disponibilidad', name: 'availability', component: Availability },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior() { return { top: 0 } }
})

export default router
