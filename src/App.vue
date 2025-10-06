<template>
  <div class="app-top">
    <header class="topbar">
      <div class="brand" @click="$router.push('/')">
        <div class="logo">🎟️</div>
        <div class="title">Gestión TIC</div>
      </div>

      <nav class="tabs">
        <router-link to="/" class="tab" :class="{active: $route.name==='dashboard'}">Dashboard</router-link>
        <router-link to="/tickets" class="tab" :class="{active: ['tickets','ticket-detail'].includes($route.name)}">Tickets</router-link>
        <router-link to="/backups" class="tab" :class="{active: $route.name==='backups'}">Copias de seguridad</router-link>
        <router-link to="/disponibilidad" class="tab" :class="{active: $route.name==='availability'}">Disponibilidad</router-link>
      </nav>

      <div class="who"><span class="muted">soporte@avantika.com.co</span></div>
    </header>

    <main class="page">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// No hay lógica, solo script setup vacío
</script>

<style>
:root{
  --header-h: 52px; --border:#e5e7eb; --bg:#f6f7f8; --panel:#fff; --muted:#6b7280;
  --accent:#17C1A4; --accent-600:#0f9f8b; --accent-200:#bcefe6;
}
html,body,#app{height:100%} body{margin:0;background:var(--bg);color:#111827;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto}
.app-top{height:100vh;display:grid;grid-template-rows:var(--header-h) 1fr}
.topbar{height:var(--header-h);background:var(--panel);border-bottom:1px solid var(--border);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding-inline:clamp(10px,1.2vw,20px)}
.page{height:calc(100vh - var(--header-h));overflow:auto;padding:clamp(8px,1vw,16px)}

.brand{display:flex;align-items:center;gap:10px;cursor:pointer}
.logo{width:28px;height:28px;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px}
.title{font-weight:700;white-space:nowrap}
.tabs{display:flex;gap:6px;justify-content:center}
.tab{padding:8px 12px;border-radius:999px;border:1px solid transparent;color:#334155}
.tab:hover{background:#f1f5f9}
.tab.active{background:#e8fbf7;border-color:var(--accent-200);color:var(--accent-600)}
.muted{color:var(--muted)}
.card{background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.04)}
.button{background:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 12px;cursor:pointer}
</style>
