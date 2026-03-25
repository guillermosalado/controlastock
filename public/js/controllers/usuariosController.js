function initUsuarios() {
    if (!document.getElementById('usuarios-tbody')) return;

    const token     = localStorage.getItem('token');
    const usuActual = JSON.parse(localStorage.getItem('usuario') || 'null');
    let editandoId   = null;
    let cambiarPwdId = null;
    let _toggling    = false;

    function iniciales(nombre, apellidos) {
        return ((nombre?.[0] || '') + (apellidos?.[0] || '')).toUpperCase();
    }

    function mostrarError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent   = msg;
        el.style.display = msg ? 'block' : 'none';
    }

    function toBool(val) {
        return Number(val) === 1 || val === true;
    }

    async function api(method, url, body = null) {
        const opts = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept':        'application/json',
                'Content-Type':  'application/json',
            },
        };
        if (body) opts.body = JSON.stringify(body);
        const res  = await fetch(url, opts);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Error en la solicitud');
        return json;
    }

    async function cargarUsuarios() {
        try {
            const usuarios = await api('GET', '/api/usuarios');
            const skeleton = document.getElementById('usuarios-skeleton');
            const tabla    = document.getElementById('usuarios-tabla');
            const vacio    = document.getElementById('usuarios-vacio');
            const tbody    = document.getElementById('usuarios-tbody');

            if (skeleton) skeleton.style.display = 'none';

            if (!usuarios.length) {
                if (vacio) vacio.style.display = 'block';
                return;
            }

            if (tabla) tabla.style.display = 'block';
            if (!tbody) return;

            tbody.innerHTML = usuarios.map(u => {
                const activo = toBool(u.activo);
                return `
                <tr>
                    <td>
                        <div class="usu-nombre-cell">
                            <div class="usu-avatar">${iniciales(u.nombre, u.apellidos)}</div>
                            <div>
                                <div class="usu-nombre-txt">${u.nombre}</div>
                                <div class="usu-apellido-txt">${u.apellidos}</div>
                            </div>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td>
                        <span class="usu-badge ${u.id_rol === 1 ? 'usu-badge-admin' : 'usu-badge-vendedor'}">
                            ${u.rol}
                        </span>
                    </td>
                    <td>
                        <span class="usu-badge ${activo ? 'usu-badge-activo' : 'usu-badge-inactivo'}"
                              id="badge-activo-${u.id_usuario}">
                            ${activo ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div class="usu-acciones">
                            <button class="usu-btn" data-accion="editar"
                                data-id="${u.id_usuario}"
                                data-nombre="${u.nombre}"
                                data-apellidos="${u.apellidos}"
                                data-email="${u.email}"
                                data-rol="${u.id_rol}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="usu-btn" data-accion="password"
                                data-id="${u.id_usuario}">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="usu-btn ${activo ? 'danger' : 'success'}"
                                data-accion="toggle"
                                data-id="${u.id_usuario}"
                                id="btn-toggle-${u.id_usuario}"
                                ${u.id_usuario === usuActual?.id_usuario ? 'disabled' : ''}>
                                <i class="fas fa-${activo ? 'user-slash' : 'user-check'}"></i>
                            </button>
                            <button class="usu-btn danger" data-accion="eliminar"
                                data-id="${u.id_usuario}"
                                data-nombre="${u.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

        } catch (err) {
            console.error('Error cargando usuarios:', err);
        }
    }

    async function toggleActivo(id) {
        if (_toggling) return;
        _toggling = true;
        const btn = document.getElementById(`btn-toggle-${id}`);
        if (btn) btn.disabled = true;

        try {
            const res    = await api('PATCH', `/api/usuarios/${id}/toggle-activo`);
            const activo = toBool(res.activo);
            const badge  = document.getElementById(`badge-activo-${id}`);

            if (badge) {
                badge.textContent = activo ? 'Activo' : 'Inactivo';
                badge.className   = `usu-badge ${activo ? 'usu-badge-activo' : 'usu-badge-inactivo'}`;
            }
            if (btn) {
                btn.className = `usu-btn ${activo ? 'danger' : 'success'}`;
                btn.innerHTML = `<i class="fas fa-${activo ? 'user-slash' : 'user-check'}"></i>`;
                btn.disabled  = false;
            }
        } catch (err) {
            console.error('Error toggle:', err);
            if (btn) btn.disabled = false;
        } finally {
            _toggling = false;
        }
    }

    async function eliminarUsuario(id, nombre) {
        if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
        try {
            await api('DELETE', `/api/usuarios/${id}`);
            const fila = document.querySelector(`button[data-id="${id}"]`)?.closest('tr');
            if (fila) fila.remove();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirModal() {
        editandoId = null;
        document.getElementById('modalTitulo').textContent      = 'Nuevo usuario';
        document.getElementById('inp-nombre').value             = '';
        document.getElementById('inp-apellidos').value          = '';
        document.getElementById('inp-email').value              = '';
        document.getElementById('inp-rol').value                = '2';
        document.getElementById('inp-password').value           = '';
        document.getElementById('grupo-password').style.display = 'block';
        mostrarError('modal-error', '');
        document.getElementById('usuModal').style.display       = 'flex';
    }

    function abrirEditar(id, nombre, apellidos, email, rol) {
        editandoId = id;
        document.getElementById('modalTitulo').textContent      = 'Editar usuario';
        document.getElementById('inp-nombre').value             = nombre;
        document.getElementById('inp-apellidos').value          = apellidos;
        document.getElementById('inp-email').value              = email;
        document.getElementById('inp-rol').value                = rol;
        document.getElementById('grupo-password').style.display = 'none';
        mostrarError('modal-error', '');
        document.getElementById('usuModal').style.display       = 'flex';
    }

    function cerrarModal() {
        document.getElementById('usuModal').style.display = 'none';
    }

    function abrirCambiarPassword(id) {
        cambiarPwdId = id;
        document.getElementById('inp-nueva-password').value    = '';
        mostrarError('pwd-error', '');
        document.getElementById('modalPassword').style.display = 'flex';
    }

    function cerrarModalPwd() {
        document.getElementById('modalPassword').style.display = 'none';
    }

    async function guardarUsuario() {
        const nombre    = document.getElementById('inp-nombre').value.trim();
        const apellidos = document.getElementById('inp-apellidos').value.trim();
        const email     = document.getElementById('inp-email').value.trim();
        const rol       = document.getElementById('inp-rol').value;
        const password  = document.getElementById('inp-password').value;

        if (!nombre || !apellidos || !email) {
            mostrarError('modal-error', 'Completa todos los campos obligatorios');
            return;
        }

        try {
            if (editandoId) {
                await api('PUT', `/api/usuarios/${editandoId}`, {
                    nombre, apellidos, email, id_rol: rol
                });
            } else {
                if (!password || password.length < 6) {
                    mostrarError('modal-error', 'La contraseña debe tener al menos 6 caracteres');
                    return;
                }
                await api('POST', '/api/usuarios', {
                    nombre, apellidos, email, id_rol: rol, password
                });
            }
            cerrarModal();
            cargarUsuarios();
        } catch (err) {
            mostrarError('modal-error', err.message);
        }
    }

    async function guardarPassword() {
        const password = document.getElementById('inp-nueva-password').value;
        if (!password || password.length < 6) {
            mostrarError('pwd-error', 'Mínimo 6 caracteres');
            return;
        }
        try {
            await api('PATCH', `/api/usuarios/${cambiarPwdId}/password`, { password });
            cerrarModalPwd();
        } catch (err) {
            mostrarError('pwd-error', err.message);
        }
    }

    // ── Eventos modales ──────────────────────────────────
    document.getElementById('btnNuevoUsuario')
        ?.addEventListener('click', abrirModal);
    document.getElementById('btnCerrarModal')
        ?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal')
        ?.addEventListener('click', cerrarModal);
    document.getElementById('btnGuardarModal')
        ?.addEventListener('click', guardarUsuario);
    document.getElementById('usuModal')
        ?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('usuModal')) cerrarModal();
        });
    document.getElementById('btnCerrarModalPwd')
        ?.addEventListener('click', cerrarModalPwd);
    document.getElementById('btnCancelarModalPwd')
        ?.addEventListener('click', cerrarModalPwd);
    document.getElementById('btnGuardarPwd')
        ?.addEventListener('click', guardarPassword);
    document.getElementById('modalPassword')
        ?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalPassword')) cerrarModalPwd();
        });

    // ── Listener tabla — delegado al tbody limpio ────────
    const tbodyAntiguo = document.getElementById('usuarios-tbody');
    const tbodyLimpio  = tbodyAntiguo.cloneNode(false);
    tbodyAntiguo.parentNode.replaceChild(tbodyLimpio, tbodyAntiguo);

    tbodyLimpio.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn || btn.disabled) return;
        const { accion, id, nombre, apellidos, email, rol } = btn.dataset;
        if (accion === 'editar')   abrirEditar(Number(id), nombre, apellidos, email, rol);
        if (accion === 'password') abrirCambiarPassword(Number(id));
        if (accion === 'toggle')   toggleActivo(Number(id));
        if (accion === 'eliminar') eliminarUsuario(Number(id), nombre);
    });

    cargarUsuarios();
}