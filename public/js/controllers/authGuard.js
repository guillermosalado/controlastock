(async () => {
    document.body.style.visibility = 'hidden';

    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (!token || !usuario) {
        window.location.href = '/login';
        return;
    }

    try {
        const res = await fetch('/api/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!res.ok) throw new Error('No autorizado');

        const path = window.location.pathname;

        if (path.startsWith('/admin') && usuario.id_rol !== 1) {
            window.location.href = '/vendedor/dashboard';
            return;
        }
        if (path.startsWith('/vendedor') && usuario.id_rol !== 2) {
            window.location.href = '/admin/dashboard';
            return;
        }

        document.body.style.visibility = 'visible';

    } catch (err) {
    // Error de red (servidor caído, timeout) — no limpiar sesión
    if (err instanceof TypeError) {
        console.warn('Error de red, manteniendo sesión:', err.message);
        document.body.style.visibility = 'visible';
        return;
    }
    // Error real de auth — limpiar y mandar al login
    localStorage.clear();
    window.location.href = '/login';
}
})();