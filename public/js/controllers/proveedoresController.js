function initProveedores() {
    if (!document.getElementById('prov-tbody')) return;

    const token = localStorage.getItem('token');
    let editandoId = null;

    function mostrarError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent   = msg;
        el.style.display = msg ? 'block' : 'none';
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

    async function cargarProveedores() {
        try {
            const proveedores = await api('GET', '/api/proveedores');
            const skeleton    = document.getElementById('prov-skeleton');
            const tabla       = document.getElementById('prov-tabla');
            const vacio       = document.getElementById('prov-vacio');
            const tbody       = document.getElementById('prov-tbody');

            if (skeleton) skeleton.style.display = 'none';

            if (!proveedores.length) {
                if (vacio) vacio.style.display = 'block';
                return;
            }

            if (tabla) tabla.style.display = 'block';
            if (!tbody) return;

            tbody.innerHTML = proveedores.map(p => `
                <tr>
                    <td>
                        <div class="usu-nombre-cell">
                            <div class="usu-avatar">
                                <i class="fas fa-truck" style="font-size:.85rem"></i>
                            </div>
                            <div>
                                <div class="usu-nombre-txt">${p.empresa}</div>
                            </div>
                        </div>
                    </td>
                    <td>${p.contacto || '—'}</td>
                    <td>${p.telefono || '—'}</td>
                    <td>${p.email    || '—'}</td>
                    <td>
                        <div class="usu-acciones">
                            <button class="usu-btn" data-accion="editar"
                                data-id="${p.id_proveedor}"
                                data-empresa="${p.empresa}"
                                data-contacto="${p.contacto  || ''}"
                                data-telefono="${p.telefono  || ''}"
                                data-email="${p.email        || ''}"
                                data-direccion="${p.direccion || ''}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="usu-btn danger" data-accion="eliminar"
                                data-id="${p.id_proveedor}"
                                data-empresa="${p.empresa}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (err) {
            console.error('Error cargando proveedores:', err);
        }
    }

    function abrirModal(titulo = 'Nuevo proveedor') {
        editandoId = null;
        document.getElementById('prov-modal-titulo').textContent = titulo;
        document.getElementById('prov-inp-empresa').value        = '';
        document.getElementById('prov-inp-contacto').value       = '';
        document.getElementById('prov-inp-telefono').value       = '';
        document.getElementById('prov-inp-email').value          = '';
        document.getElementById('prov-inp-direccion').value      = '';
        mostrarError('prov-modal-error', '');
        document.getElementById('provModal').style.display       = 'flex';
    }

    function abrirEditar(id, empresa, contacto, telefono, email, direccion) {
        editandoId = Number(id);
        document.getElementById('provModal').dataset.editandoId = id;
        document.getElementById('prov-modal-titulo').textContent = 'Editar proveedor';
        document.getElementById('prov-inp-empresa').value        = empresa;
        document.getElementById('prov-inp-contacto').value       = contacto;
        document.getElementById('prov-inp-telefono').value       = telefono;
        document.getElementById('prov-inp-email').value          = email;
        document.getElementById('prov-inp-direccion').value      = direccion;
        mostrarError('prov-modal-error', '');
        document.getElementById('provModal').style.display       = 'flex';
    }

    function cerrarModal() {
        document.getElementById('provModal').style.display = 'none';
    }

    async function guardarProveedor() {
        editandoId = editandoId || Number(document.getElementById('provModal').dataset.editandoId) || null;
        const empresa   = document.getElementById('prov-inp-empresa').value.trim();
        const contacto  = document.getElementById('prov-inp-contacto').value.trim();
        const telefono  = document.getElementById('prov-inp-telefono').value.trim();
        const email     = document.getElementById('prov-inp-email').value.trim();
        const direccion = document.getElementById('prov-inp-direccion').value.trim();

        if (!empresa) {
            mostrarError('prov-modal-error', 'El nombre de la empresa es obligatorio');
            return;
        }

        try {
            if (editandoId) {
                await api('PUT', `/api/proveedores/${editandoId}`, {
                    empresa, contacto, telefono, email, direccion
                });
            } else {
                await api('POST', '/api/proveedores', {
                    empresa, contacto, telefono, email, direccion
                });
            }
            cerrarModal();
            cargarProveedores();
        } catch (err) {
            mostrarError('prov-modal-error', err.message);
        }
    }

    async function eliminarProveedor(id, empresa) {
        if (!confirm(`¿Eliminar a "${empresa}"? Esta acción no se puede deshacer.`)) return;
        try {
            await api('DELETE', `/api/proveedores/${id}`);
            cargarProveedores();
        } catch (err) {
            alert(err.message);
        }
    }

    // ── Modales en body — solo si no existen ────────────
    if (!document.getElementById('provModal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="usu-modal-overlay" id="provModal" style="display:none">
                <div class="usu-modal-card">
                    <div class="usu-modal-header">
                        <h5 class="usu-modal-titulo" id="prov-modal-titulo">Nuevo proveedor</h5>
                        <button class="usu-modal-close" id="prov-btnCerrar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="usu-modal-body">
                        <div class="usu-form-group">
                            <label>Empresa <span style="color:#dc3545">*</span></label>
                            <input type="text" id="prov-inp-empresa" class="usu-input" placeholder="Nombre de la empresa">
                        </div>
                        <div class="usu-form-row">
                            <div class="usu-form-group">
                                <label>Contacto</label>
                                <input type="text" id="prov-inp-contacto" class="usu-input" placeholder="Nombre del contacto">
                            </div>
                            <div class="usu-form-group">
                                <label>Teléfono</label>
                                <input type="text" id="prov-inp-telefono" class="usu-input" placeholder="758 000 0000">
                            </div>
                        </div>
                        <div class="usu-form-group">
                            <label>Email</label>
                            <input type="email" id="prov-inp-email" class="usu-input" placeholder="contacto@empresa.com">
                        </div>
                        <div class="usu-form-group">
                            <label>Dirección</label>
                            <input type="text" id="prov-inp-direccion" class="usu-input" placeholder="Calle, ciudad, estado">
                        </div>
                        <p id="prov-modal-error" style="display:none;color:#dc3545;font-size:.85rem"></p>
                    </div>
                    <div class="usu-modal-footer">
                        <button class="usu-btn-cancelar" id="prov-btnCancelar">Cancelar</button>
                        <button class="usu-btn-guardar" id="prov-btnGuardar">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </div>
            </div>
        `);

        document.getElementById('prov-btnCerrar')
            .addEventListener('click', cerrarModal);
        document.getElementById('prov-btnCancelar')
            .addEventListener('click', cerrarModal);
        document.getElementById('prov-btnGuardar')
            .addEventListener('click', guardarProveedor);
        document.getElementById('provModal')
            .addEventListener('click', (e) => {
                if (e.target === document.getElementById('provModal')) cerrarModal();
            });
    }

    // ── Botón nuevo ──────────────────────────────────────
    document.getElementById('btnNuevoProveedor')
        ?.addEventListener('click', () => abrirModal());

    // ── Listener tabla limpio ────────────────────────────
    const tbodyAntiguo = document.getElementById('prov-tbody');
    const tbodyLimpio  = tbodyAntiguo.cloneNode(false);
    tbodyAntiguo.parentNode.replaceChild(tbodyLimpio, tbodyAntiguo);

    tbodyLimpio.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const { accion, id, empresa, contacto, telefono, email, direccion } = btn.dataset;
        if (accion === 'editar') {
            abrirEditar(Number(id), empresa, contacto, telefono, email, direccion);
        } else if (accion === 'eliminar') {
            eliminarProveedor(Number(id), empresa);
        }
    });

    cargarProveedores();
}