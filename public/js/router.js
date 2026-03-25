function iniciarRouter() {
    const usuario   = JSON.parse(localStorage.getItem('usuario') || 'null');
    const idRol     = usuario?.id_rol ?? null;
    const esAdmin   = idRol === 1;

    const contenido = document.getElementById('vistaContenido');
    const cache     = {};
    const base      = esAdmin ? '/admin' : '/vendedor';

    const rutas = {
        dashboard:   esAdmin ? '/views/admin/partials/dashboard.html' : '/views/users/partials/dashboard.html',
        usuarios:    '/views/admin/partials/usuarios.html',
        reportes:    '/views/admin/partials/reportes.html',
        proveedores: '/views/admin/partials/proveedores.html',
        ventas:      '/views/shared/ventas.html',
        inventario:  '/views/shared/inventario.html',
    };

    const permitidas = esAdmin
        ? ['dashboard', 'usuarios', 'reportes', 'ventas', 'inventario', 'proveedores']
        : ['dashboard', 'ventas', 'inventario'];

    let vistaActual = null;
    let destroyActual = null;

    function ejecutarScripts(contenedor) {
        contenedor.querySelectorAll('script').forEach(scriptViejo => {
            if (scriptViejo.src) return;

            const scriptNuevo = document.createElement('script');
            scriptNuevo.textContent = scriptViejo.textContent;
            scriptViejo.replaceWith(scriptNuevo);
        });
    }

    function marcarActivo(nombre) {
        document.querySelectorAll('#menuNav .nav-item').forEach(item => {
            item.classList.toggle('activo', item.dataset.vista === nombre);
        });
    }

    function inyectarSesion() {
        const u = JSON.parse(localStorage.getItem('usuario') || 'null');
        const t = JSON.parse(localStorage.getItem('tienda')  || 'null');

        const elBienvenida = contenido.querySelector('#dash-bienvenida');
        const elTienda     = contenido.querySelector('#dash-tienda');

        if (u && elBienvenida) elBienvenida.textContent = `Bienvenido, ${u.nombre}`;
        if (t && elTienda)     elTienda.textContent     = `Tienda: ${t.nombre}`;
    }

    function limpiarModales() {
        document.querySelectorAll('.usu-modal-overlay').forEach(m => m.remove());
    }

    function inicializarVista(nombre) {
        try {
            if (nombre === 'dashboard' && typeof initDashboard === 'function') {
                destroyActual = initDashboard();
            }

            if (nombre === 'usuarios' && typeof initUsuarios === 'function') {
                destroyActual = initUsuarios();
            }

            if (nombre === 'proveedores' && typeof initProveedores === 'function') {
                destroyActual = initProveedores();
            }

            if (nombre === 'inventario' && typeof initInventario === 'function') {
                destroyActual = initInventario();
            }

        } catch (err) {
            console.error('Error inicializando vista:', nombre, err);
        }
    }

    async function navegarA(nombre, pushState = true) {
        if (!rutas[nombre] || !permitidas.includes(nombre)) {
            nombre = 'dashboard';
        }

        if (nombre === vistaActual) return;

        if (typeof destroyActual === 'function') {
            destroyActual();
            destroyActual = null;
        }

        if (!cache[nombre]) {
            try {
                const res = await fetch(rutas[nombre]);
                if (!res.ok) throw new Error(`Vista no encontrada: ${nombre}`);
                cache[nombre] = await res.text();
            } catch (err) {
                console.error('Router error:', err);
                contenido.innerHTML = `<div>Error cargando vista</div>`;
                return;
            }
        }

        if (pushState) {
            history.pushState({ vista: nombre }, '', `${base}/${nombre}`);
        }

        limpiarModales();

        contenido.innerHTML = cache[nombre];

        ejecutarScripts(contenido);
        setTimeout(inyectarSesion, 0);

        marcarActivo(nombre);
        vistaActual = nombre;

        setTimeout(() => inicializarVista(nombre), 0);
    }

    document.getElementById('menuNav')?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-vista]');
        if (!item) return;
        e.preventDefault();
        navegarA(item.dataset.vista);
    });

    contenido.addEventListener('click', (e) => {
        const link = e.target.closest('[data-vista]');
        if (!link) return;
        e.preventDefault();
        navegarA(link.dataset.vista);
    });

    window.addEventListener('popstate', (e) => {
        vistaActual = null;
        navegarA(e.state?.vista ?? 'dashboard', false);
    });

    window.navegarA = navegarA;

    const segmentos = window.location.pathname.split('/').filter(Boolean);
    const ultimo    = segmentos[segmentos.length - 1];

    navegarA(permitidas.includes(ultimo) ? ultimo : 'dashboard', false);
}

document.addEventListener('sidebarReady', iniciarRouter, { once: true });