import { sidebarLinks } from '/js/templates/sidebarTemplate.js';

const sidebar    = document.getElementById('sidebarAdmin');
const contenido  = document.getElementById('contenidoAdmin');
const toggleIcon = document.getElementById('toggleIcon');

document.getElementById('sidebarToggle').addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    contenido.classList.toggle('expanded', collapsed);
    toggleIcon.classList.toggle('fa-chevron-left',  !collapsed);
    toggleIcon.classList.toggle('fa-chevron-right',  collapsed);
});

function toggleMenu() {
    const open = sidebar.classList.toggle('open');
    document.getElementById('hamburger').classList.toggle('open', open);
    document.getElementById('sbOverlay').classList.toggle('visible', open);
    document.body.classList.toggle('sb-open', open);
}
function cerrarMenu() {
    sidebar.classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
    document.getElementById('sbOverlay').classList.remove('visible');
    document.body.classList.remove('sb-open');
}
document.getElementById('hamburger').addEventListener('click', toggleMenu);
document.getElementById('sbOverlay').addEventListener('click', cerrarMenu);
window.addEventListener('resize', () => { if (window.innerWidth > 768) cerrarMenu(); });

function poblarUI(usuario, tienda) {
    if (!usuario) return;

    const nombre    = [usuario.nombre, usuario.apellidos || ''].join(' ').trim();
    const rol       = usuario.id_rol === 1 ? 'Administrador' : 'Vendedor';
    const iniciales = ((usuario.nombre?.[0] || '') + (usuario.apellidos?.[0] || '')).toUpperCase();

    document.getElementById('sb-nombre').textContent = nombre;
    document.getElementById('sb-rol').textContent    = rol;
    document.getElementById('tb-nombre').textContent = nombre;
    document.getElementById('tb-email').textContent  = usuario.email;

    const avatarSidebar = document.getElementById('sidebar-avatar');
    const avatarDesktop = document.getElementById('topbar-avatar-desktop');
    const avatarMobile  = document.getElementById('topbar-avatar-mobile');
    if (avatarSidebar) avatarSidebar.textContent = iniciales;
    if (avatarDesktop) avatarDesktop.textContent = iniciales;
    if (avatarMobile)  avatarMobile.textContent  = iniciales;

    const tipoRol = usuario.id_rol === 1 ? 'administrador' : 'vendedor';
    document.getElementById('menuNav').innerHTML = sidebarLinks[tipoRol];

    if (tienda) {
        document.getElementById('tb-tienda').textContent = tienda.nombre;
    }
}

async function cargarSesion() {
    const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || 'null');
    const tiendaLocal  = JSON.parse(localStorage.getItem('tienda')  || 'null');
    poblarUI(usuarioLocal, tiendaLocal);

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch('/api/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.usuario) localStorage.setItem('usuario', JSON.stringify(data.usuario));
        if (data.tienda)  localStorage.setItem('tienda',  JSON.stringify(data.tienda));

        poblarUI(data.usuario || usuarioLocal, data.tienda || tiendaLocal);
    } catch (err) {
        console.warn('No se pudo actualizar sesión desde API:', err);
    }

    document.dispatchEvent(new Event('sidebarReady'));
}

// ── Cerrar sesión ─────────────────────────────────────────
async function cerrarSesion() {
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/logout', {
            method:  'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept':        'application/json',
            },
        });
    } catch (_) {
        // Si falla el endpoint igual limpiamos local
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('tienda');
        window.location.href = '/';
    }
}

document.getElementById('btnCerrarSesion')
    ?.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) cerrarSesion();
    });

document.getElementById('btnCerrarSesionMobile')
    ?.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) cerrarSesion();
    });

cargarSesion();