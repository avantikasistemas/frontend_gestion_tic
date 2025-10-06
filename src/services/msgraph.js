// src/services/msgraph.js
// Servicio mínimo para autenticación (MSAL) y lectura de correos en la carpeta "tickets".
import { PublicClientApplication } from '@azure/msal-browser'

const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,          // App registration (SPA)
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false }
}

const loginRequest = {
    scopes: [
        'openid', 'profile', 'offline_access',
        'Mail.Read', // para leer correos
        'User.Read'  // básico
    ]
}

const msalInstance = new PublicClientApplication(msalConfig)

async function getToken() {
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length === 0) {
        const res = await msalInstance.loginPopup(loginRequest)
        return (await msalInstance.acquireTokenSilent({ ...loginRequest, account: res.account })).accessToken
    }
    const account = accounts[0]
    const tok = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
    return tok.accessToken
}

async function graph(path, token) {
    const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!r.ok) throw new Error(`Graph error ${r.status}`)
    return r.json()
}

export async function listTicketsEmails() {
    const token = await getToken()

    // 1) Buscar carpeta "tickets" en el buzón de soporte
    const user = encodeURIComponent(import.meta.env.VITE_SUPPORT_MAIL || 'soporte@avantika.com.co')
    const folders = await graph(`/users/${user}/mailFolders?$top=100`, token)
    const target = folders.value.find(f => f.displayName?.toLowerCase() === 'tickets')
    if (!target) throw new Error('No se encontró la carpeta "tickets" en el buzón.')

    // 2) Traer mensajes recientes
    const messages = await graph(
        `/users/${user}/mailFolders/${target.id}/messages?$top=25&$orderby=receivedDateTime desc&$select=id,subject,from,sender,receivedDateTime,bodyPreview,internetMessageId`,
        token
    )
    return messages.value || []
}

// Utilidad para logout (si la necesitas)
export function logoutMsal() {
    const accounts = msalInstance.getAllAccounts()
    if (accounts[0]) msalInstance.logoutPopup({ account: accounts[0] })
}
