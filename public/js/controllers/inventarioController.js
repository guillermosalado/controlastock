// /js/controllers/inventarioController.js

function initInventario() {
    if (!document.getElementById('inv-tbody')) return;

    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    const esAdmin = Number(usuario?.id_rol) === 1;

    let productos     = [];
    let categorias    = [];
    let editandoId    = null;
    let ajusteId      = null;
    let catEditandoId = null;
    let _ajustando    = false;
    let _toggling     = false;

    // ── Helper: bloquear/desbloquear scroll del body ─────
    function bloquearScroll()    { document.body.classList.add('modal-abierto'); }
    function desbloquearScroll() { document.body.classList.remove('modal-abierto'); }

    // ── Mostrar elementos de admin ───────────────────────
    if (esAdmin) {
        const btnNuevo = document.getElementById('btnNuevoProducto');
        const btnCats  = document.getElementById('btnGestionCategorias');
        if (btnNuevo) btnNuevo.style.display = 'flex';
        if (btnCats)  btnCats.style.display  = 'flex';
        document.querySelectorAll('.inv-col-admin').forEach(el => {
            el.style.display = '';
        });
    }

    // ── API helper ───────────────────────────────────────
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
        if (!res.ok) throw new Error(json.error || json.message || 'Error');
        return json;
    }

    function mostrarError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent   = msg;
        el.style.display = msg ? 'block' : 'none';
    }

    function formatMXN(val) {
        return Number(val).toLocaleString('es-MX', {
            style: 'currency', currency: 'MXN'
        });
    }

    // ── Llenar selects de categorías ─────────────────────
    function llenarSelectsCategorias() {
        const selCat = document.getElementById('inv-inp-categoria');
        const filCat = document.getElementById('inv-filtro-categoria');
        if (!selCat || !filCat) return;

        const opciones = categorias.map(c =>
            `<option value="${c.id_categoria}">${c.nombre}</option>`
        ).join('');

        selCat.innerHTML = '<option value="">Selecciona categoría</option>' + opciones;
        filCat.innerHTML = '<option value="">Todas las categorías</option>' + opciones;
    }

    // ── Cargar categorías, proveedores y productos ───────
    async function cargarSelects() {
        try {
            const [cats, provs] = await Promise.all([
                api('GET', '/api/categorias'),
                api('GET', '/api/proveedores'),
            ]);

            categorias = cats;
            llenarSelectsCategorias();

            const selProv = document.getElementById('inv-inp-proveedor');
            if (!selProv) return;

            selProv.innerHTML = '<option value="">Sin proveedor</option>' +
                provs.map(p =>
                    `<option value="${p.id_proveedor}">${p.empresa}</option>`
                ).join('');

        } catch (err) {
            console.warn('Error cargando selects:', err);
        }
    }

    async function cargarProductos() {
        try {
            productos = await api('GET', '/api/productos');
            renderTabla(productos);
        } catch (err) {
            console.error('Error cargando productos:', err);
        }
    }

    function renderTabla(lista) {
        const skeleton = document.getElementById('inv-skeleton');
        const tabla    = document.getElementById('inv-tabla');
        const vacio    = document.getElementById('inv-vacio');
        const tbody    = document.getElementById('inv-tbody');

        if (skeleton) skeleton.style.display = 'none';

        if (!lista.length) {
            if (vacio) vacio.style.display = 'block';
            if (tabla) tabla.style.display = 'none';
            return;
        }

        if (vacio) vacio.style.display = 'none';
        if (tabla) tabla.style.display = 'block';
        if (!tbody) return;

        const stockBajo = p => Number(p.stock_actual) <= Number(p.stock_minimo);

        tbody.innerHTML = lista.map(p => `
            <tr id="inv-fila-${p.id_producto}">
                <td>
                    <div class="inv-producto-cell">
                        <span class="inv-producto-nombre">${p.nombre}</span>
                        ${p.codigo_barras
                            ? `<span class="inv-codigo">${p.codigo_barras}</span>`
                            : ''}
                    </div>
                </td>
                <td>${p.categoria || '—'}</td>
                <td>
                    <span class="inv-stock ${stockBajo(p) ? 'inv-stock-bajo' : ''}">
                        ${p.stock_actual}
                        <span class="inv-stock-min">/ ${p.stock_minimo}</span>
                    </span>
                </td>
                <td>${formatMXN(p.precio_venta)}</td>
                <td ${esAdmin ? '' : 'style="display:none"'} class="inv-col-admin">
                    ${esAdmin ? formatMXN(p.precio_compra) : ''}
                </td>
                <td>
                    <span class="usu-badge ${Number(p.activo) ? 'usu-badge-activo' : 'usu-badge-inactivo'}">
                        ${Number(p.activo) ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="usu-acciones">
                        ${esAdmin ? `
                        <button class="usu-btn" data-accion="editar"
                            data-id="${p.id_producto}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="usu-btn" data-accion="ajuste"
                            data-id="${p.id_producto}" data-nombre="${p.nombre}"
                            title="Ajuste de stock">
                            <i class="fas fa-boxes"></i>
                        </button>
                        <button class="usu-btn ${Number(p.activo) ? 'danger' : 'success'}"
                            data-accion="toggle" data-id="${p.id_producto}"
                            title="${Number(p.activo) ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${Number(p.activo) ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="usu-btn danger" data-accion="eliminar"
                            data-id="${p.id_producto}" data-nombre="${p.nombre}"
                            title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ── Filtros ──────────────────────────────────────────
    function aplicarFiltros() {
        const buscar   = (document.getElementById('inv-buscar')?.value || '').toLowerCase();
        const catId    = document.getElementById('inv-filtro-categoria')?.value || '';
        const estadoId = document.getElementById('inv-filtro-estado')?.value ?? '';

        const filtrados = productos.filter(p => {
            const matchBuscar = !buscar ||
                p.nombre.toLowerCase().includes(buscar) ||
                (p.codigo_barras || '').toLowerCase().includes(buscar);
            const matchCat    = !catId    || String(p.id_categoria) === catId;
            const matchEstado = estadoId === '' || String(Number(p.activo)) === estadoId;
            return matchBuscar && matchCat && matchEstado;
        });

        renderTabla(filtrados);
    }

    document.getElementById('inv-buscar')
        ?.addEventListener('input', aplicarFiltros);
    document.getElementById('inv-filtro-categoria')
        ?.addEventListener('change', aplicarFiltros);
    document.getElementById('inv-filtro-estado')
        ?.addEventListener('change', aplicarFiltros);

    // ════════════════════════════════════════════════════
    // MODAL PRODUCTO
    // ════════════════════════════════════════════════════
    function abrirModalProducto() {
        editandoId = null;
        document.getElementById('invModalTitulo').textContent            = 'Nuevo producto';
        document.getElementById('inv-inp-nombre').value                  = '';
        document.getElementById('inv-inp-categoria').value               = '';
        document.getElementById('inv-inp-proveedor').value               = '';
        document.getElementById('inv-inp-precio-venta').value            = '';
        document.getElementById('inv-inp-precio-compra').value           = '';
        document.getElementById('inv-inp-stock').value                   = '';
        document.getElementById('inv-inp-stock-min').value               = '';
        document.getElementById('inv-inp-codigo').value                  = '';
        document.getElementById('inv-inp-unidad').value                  = 'pieza';
        document.getElementById('inv-inp-descripcion').value             = '';
        document.getElementById('inv-grupo-stock-inicial').style.display = 'block';
        mostrarError('inv-modal-error', '');
        document.getElementById('invModal').style.display = 'flex';
        bloquearScroll();
    }

    function abrirEditar(id) {
        const p = productos.find(x => String(x.id_producto) === String(id));
        if (!p) return;
        editandoId = id;
        document.getElementById('invModalTitulo').textContent            = 'Editar producto';
        document.getElementById('inv-inp-nombre').value                  = p.nombre;
        document.getElementById('inv-inp-categoria').value               = p.id_categoria;
        document.getElementById('inv-inp-proveedor').value               = p.id_proveedor || '';
        document.getElementById('inv-inp-precio-venta').value            = p.precio_venta;
        document.getElementById('inv-inp-precio-compra').value           = p.precio_compra;
        document.getElementById('inv-inp-stock-min').value               = p.stock_minimo;
        document.getElementById('inv-inp-codigo').value                  = p.codigo_barras || '';
        document.getElementById('inv-inp-unidad').value                  = p.unidad_medida || 'pieza';
        document.getElementById('inv-inp-descripcion').value             = p.descripcion || '';
        document.getElementById('inv-grupo-stock-inicial').style.display = 'none';
        mostrarError('inv-modal-error', '');
        document.getElementById('invModal').style.display = 'flex';
        bloquearScroll();
    }

    function cerrarModalProducto() {
        document.getElementById('invModal').style.display = 'none';
        desbloquearScroll();
    }

    async function guardarProducto() {
        const nombre        = document.getElementById('inv-inp-nombre').value.trim();
        const id_categoria  = document.getElementById('inv-inp-categoria').value;
        const id_proveedor  = document.getElementById('inv-inp-proveedor').value || null;
        const precio_venta  = document.getElementById('inv-inp-precio-venta').value;
        const precio_compra = document.getElementById('inv-inp-precio-compra').value || 0;
        const stock_actual  = document.getElementById('inv-inp-stock').value || 0;
        const stock_minimo  = document.getElementById('inv-inp-stock-min').value || 5;
        const codigo_barras = document.getElementById('inv-inp-codigo').value.trim() || null;
        const unidad_medida = document.getElementById('inv-inp-unidad').value;
        const descripcion   = document.getElementById('inv-inp-descripcion').value.trim() || null;

        if (!nombre || !id_categoria || precio_venta === '') {
            mostrarError('inv-modal-error', 'Nombre, categoría y precio venta son obligatorios');
            return;
        }

        const body = {
            nombre,
            id_categoria:  Number(id_categoria),
            id_proveedor:  id_proveedor ? Number(id_proveedor) : null,
            precio_venta:  Number(precio_venta),
            precio_compra: Number(precio_compra),
            stock_minimo:  Number(stock_minimo),
            codigo_barras,
            unidad_medida,
            descripcion,
        };

        if (!editandoId) body.stock_actual = Number(stock_actual);

        try {
            if (editandoId) {
                await api('PUT', `/api/productos/${editandoId}`, body);
            } else {
                await api('POST', '/api/productos', body);
            }
            cerrarModalProducto();
            await cargarProductos();
        } catch (err) {
            mostrarError('inv-modal-error', err.message);
        }
    }

    // ════════════════════════════════════════════════════
    // TOGGLE Y ELIMINAR PRODUCTO
    // ════════════════════════════════════════════════════
    async function toggleActivo(id) {
        if (_toggling) return;
        _toggling = true;
        try {
            await api('PATCH', `/api/productos/${id}/toggle-activo`);
            await cargarProductos();
        } catch (err) {
            console.error('Error toggle:', err);
        } finally {
            _toggling = false;
        }
    }

    async function eliminarProducto(id, nombre) {
        if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
        try {
            await api('DELETE', `/api/productos/${id}`);
            await cargarProductos();
        } catch (err) {
            alert(err.message);
        }
    }

    // ════════════════════════════════════════════════════
    // MODAL AJUSTE DE STOCK
    // ════════════════════════════════════════════════════
    function abrirAjuste(id, nombre) {
        ajusteId = id;
        document.getElementById('inv-ajuste-producto').textContent = nombre;
        document.getElementById('inv-ajuste-tipo').value           = 'entrada';
        document.getElementById('inv-ajuste-cantidad').value       = '';
        document.getElementById('inv-ajuste-obs').value            = '';
        mostrarError('inv-ajuste-error', '');
        document.getElementById('invModalAjuste').style.display = 'flex';
        bloquearScroll();
    }

    function cerrarAjusteModal() {
        document.getElementById('invModalAjuste').style.display = 'none';
        desbloquearScroll();
    }

    async function guardarAjuste() {
        if (_ajustando) return;
        const cantidad = document.getElementById('inv-ajuste-cantidad').value;
        const tipo     = document.getElementById('inv-ajuste-tipo').value;
        const obs      = document.getElementById('inv-ajuste-obs').value.trim() || null;

        if (!cantidad || Number(cantidad) <= 0) {
            mostrarError('inv-ajuste-error', 'Ingresa una cantidad válida');
            return;
        }

        _ajustando = true;
        try {
            await api('PATCH', `/api/productos/${ajusteId}/ajuste-stock`, {
                cantidad: Number(cantidad), tipo, observaciones: obs,
            });
            cerrarAjusteModal();
            await cargarProductos();
        } catch (err) {
            mostrarError('inv-ajuste-error', err.message);
        } finally {
            _ajustando = false;
        }
    }

    // ════════════════════════════════════════════════════
    // MODAL MOVIMIENTOS
    // ════════════════════════════════════════════════════
    function cerrarMovModal() {
        document.getElementById('invModalMovimientos').style.display = 'none';
        desbloquearScroll();
    }

    async function abrirMovimientos() {
        const skeleton = document.getElementById('mov-skeleton');
        const lista    = document.getElementById('mov-lista');
        const vacio    = document.getElementById('mov-vacio');

        if (skeleton) skeleton.style.display = 'block';
        if (lista)    lista.innerHTML        = '';
        if (vacio)    vacio.style.display    = 'none';
        document.getElementById('invModalMovimientos').style.display = 'flex';
        bloquearScroll();

        try {
            const movs = await api('GET', '/api/movimientos');
            if (skeleton) skeleton.style.display = 'none';

            if (!movs.length) {
                if (vacio) vacio.style.display = 'block';
                return;
            }

            const iconos = {
                entrada: { icon: 'fa-arrow-down', color: '#28a745' },
                salida:  { icon: 'fa-arrow-up',   color: '#dc3545' },
                ajuste:  { icon: 'fa-sliders-h',  color: '#ffc107' },
            };

            if (lista) lista.innerHTML = movs.map(m => {
                const ic = iconos[m.tipo_movimiento] || { icon: 'fa-circle', color: '#7a8a9a' };
                const fecha = new Date(m.fecha).toLocaleString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                });
                return `
                <div class="inv-mov-item">
                    <div class="inv-mov-icon" style="color:${ic.color}">
                        <i class="fas ${ic.icon}"></i>
                    </div>
                    <div class="inv-mov-info">
                        <p class="inv-mov-producto">${m.producto}</p>
                        <p class="inv-mov-detalle">
                            ${m.cantidad > 0 ? '+' : ''}${m.cantidad} uds
                            · Stock: ${m.stock_anterior} → ${m.stock_nuevo}
                            ${m.observaciones ? `· ${m.observaciones}` : ''}
                        </p>
                        <p class="inv-mov-meta">${fecha} · ${m.usuario}</p>
                    </div>
                    <span class="inv-mov-tipo">${m.tipo_movimiento}</span>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Error movimientos:', err);
            if (skeleton) skeleton.style.display = 'none';
        }
    }

    // ════════════════════════════════════════════════════
    // MODAL CATEGORÍAS
    // ════════════════════════════════════════════════════
    function renderListaCategorias() {
        const lista = document.getElementById('cat-lista');
        const vacio = document.getElementById('cat-lista-vacio');
        if (!lista) return;

        if (!categorias.length) {
            lista.innerHTML     = '';
            vacio.style.display = 'block';
            return;
        }

        vacio.style.display = 'none';
        lista.innerHTML = categorias.map(c => `
            <div class="inv-mov-item" style="border-left-color:#304270;background:#f7f9fb"
                 id="cat-item-${c.id_categoria}">
                <div class="inv-mov-info">
                    <p class="inv-mov-producto" style="margin:0">${c.nombre}</p>
                    ${c.descripcion
                        ? `<p class="inv-mov-detalle" style="margin:0.15rem 0 0">${c.descripcion}</p>`
                        : ''}
                </div>
                <div class="usu-acciones">
                    <button class="usu-btn" data-cat-accion="editar"
                        data-id="${c.id_categoria}"
                        data-nombre="${c.nombre}"
                        data-descripcion="${c.descripcion || ''}"
                        title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="usu-btn danger" data-cat-accion="eliminar"
                        data-id="${c.id_categoria}"
                        data-nombre="${c.nombre}"
                        title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async function abrirGestionCategorias() {
        catEditandoId = null;
        document.getElementById('cat-inp-nombre').value        = '';
        document.getElementById('cat-inp-descripcion').value   = '';
        document.getElementById('cat-form-titulo').textContent = 'Nueva categoría';
        document.getElementById('cat-btn-texto').textContent   = 'Agregar';
        document.getElementById('cat-btn-icon').className      = 'fas fa-plus';
        document.getElementById('btnCancelarEditCat').style.display = 'none';
        mostrarError('cat-form-error', '');

        document.getElementById('cat-lista-skeleton').style.display = 'block';
        document.getElementById('cat-lista').innerHTML               = '';
        document.getElementById('cat-lista-vacio').style.display     = 'none';
        document.getElementById('invModalCategorias').style.display  = 'flex';
        bloquearScroll();

        try {
            categorias = await api('GET', '/api/categorias');
            document.getElementById('cat-lista-skeleton').style.display = 'none';
            renderListaCategorias();
            llenarSelectsCategorias();
        } catch (err) {
            console.error('Error cargando categorías:', err);
            document.getElementById('cat-lista-skeleton').style.display = 'none';
        }
    }

    function cerrarCatModal() {
        document.getElementById('invModalCategorias').style.display = 'none';
        catEditandoId = null;
        desbloquearScroll();
    }

    function iniciarEditarCat(id, nombre, descripcion) {
        catEditandoId = id;
        document.getElementById('cat-inp-nombre').value              = nombre;
        document.getElementById('cat-inp-descripcion').value         = descripcion;
        document.getElementById('cat-form-titulo').textContent        = 'Editar categoría';
        document.getElementById('cat-btn-texto').textContent          = 'Guardar cambios';
        document.getElementById('cat-btn-icon').className             = 'fas fa-save';
        document.getElementById('btnCancelarEditCat').style.display   = 'inline-flex';
        mostrarError('cat-form-error', '');
        document.getElementById('cat-inp-nombre').focus();
    }

    function cancelarEditarCat() {
        catEditandoId = null;
        document.getElementById('cat-inp-nombre').value              = '';
        document.getElementById('cat-inp-descripcion').value         = '';
        document.getElementById('cat-form-titulo').textContent        = 'Nueva categoría';
        document.getElementById('cat-btn-texto').textContent          = 'Agregar';
        document.getElementById('cat-btn-icon').className             = 'fas fa-plus';
        document.getElementById('btnCancelarEditCat').style.display   = 'none';
        mostrarError('cat-form-error', '');
    }

    async function guardarCategoria() {
        const nombre      = document.getElementById('cat-inp-nombre').value.trim();
        const descripcion = document.getElementById('cat-inp-descripcion').value.trim() || null;

        if (!nombre) {
            mostrarError('cat-form-error', 'El nombre es obligatorio');
            return;
        }

        try {
            if (catEditandoId) {
                await api('PUT', `/api/categorias/${catEditandoId}`, { nombre, descripcion });
            } else {
                await api('POST', '/api/categorias', { nombre, descripcion });
            }
            categorias = await api('GET', '/api/categorias');
            renderListaCategorias();
            llenarSelectsCategorias();
            cancelarEditarCat();
        } catch (err) {
            mostrarError('cat-form-error', err.message);
        }
    }

    async function eliminarCategoria(id, nombre) {
        if (!confirm(`¿Eliminar la categoría "${nombre}"?\nLos productos con esta categoría no se pueden reasignar automáticamente.`)) return;
        try {
            await api('DELETE', `/api/categorias/${id}`);
            categorias = await api('GET', '/api/categorias');
            renderListaCategorias();
            llenarSelectsCategorias();
        } catch (err) {
            alert(err.message);
        }
    }

    // ── Listener delegado ────────────────────────────────
    if (document.__invListener) {
        document.removeEventListener('click', document.__invListener);
    }
    document.__invListener = (e) => {
        if (!document.getElementById('inv-tbody')) {
            document.removeEventListener('click', document.__invListener);
            document.__invListener = null;
            return;
        }

        const btnProd = e.target.closest('[data-accion]');
        if (btnProd && !btnProd.disabled) {
            const { accion, id, nombre } = btnProd.dataset;
            if (accion === 'editar')   abrirEditar(id);
            if (accion === 'ajuste')   abrirAjuste(id, nombre);
            if (accion === 'toggle')   toggleActivo(id);
            if (accion === 'eliminar') eliminarProducto(id, nombre);
        }

        const btnCat = e.target.closest('[data-cat-accion]');
        if (btnCat && !btnCat.disabled) {
            if (btnCat.dataset.catAccion === 'editar')
                iniciarEditarCat(btnCat.dataset.id, btnCat.dataset.nombre, btnCat.dataset.descripcion);
            if (btnCat.dataset.catAccion === 'eliminar')
                eliminarCategoria(btnCat.dataset.id, btnCat.dataset.nombre);
        }
    };
    document.addEventListener('click', document.__invListener);

    // ── Eventos modales ──────────────────────────────────

    // Producto
    document.getElementById('btnNuevoProducto')
        ?.addEventListener('click', abrirModalProducto);
    document.getElementById('btnCerrarInvModal')
        ?.addEventListener('click', cerrarModalProducto);
    document.getElementById('btnCancelarInvModal')
        ?.addEventListener('click', cerrarModalProducto);
    document.getElementById('btnGuardarProducto')
        ?.addEventListener('click', guardarProducto);
    document.getElementById('invModal')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('invModal')) cerrarModalProducto();
        });

    // Ajuste
    document.getElementById('btnCerrarAjusteModal')
        ?.addEventListener('click', cerrarAjusteModal);
    document.getElementById('btnCancelarAjusteModal')
        ?.addEventListener('click', cerrarAjusteModal);
    document.getElementById('btnGuardarAjuste')
        ?.addEventListener('click', guardarAjuste);
    document.getElementById('invModalAjuste')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('invModalAjuste')) cerrarAjusteModal();
        });

    // Movimientos
    document.getElementById('btnVerMovimientos')
        ?.addEventListener('click', abrirMovimientos);
    document.getElementById('btnCerrarMovModal')
        ?.addEventListener('click', cerrarMovModal);
    document.getElementById('btnCerrarMovModalFooter')
        ?.addEventListener('click', cerrarMovModal);
    document.getElementById('invModalMovimientos')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('invModalMovimientos')) cerrarMovModal();
        });

    // Categorías
    document.getElementById('btnGestionCategorias')
        ?.addEventListener('click', abrirGestionCategorias);
    document.getElementById('btnCerrarCatModal')
        ?.addEventListener('click', cerrarCatModal);
    document.getElementById('btnCerrarCatModalFooter')
        ?.addEventListener('click', cerrarCatModal);
    document.getElementById('btnGuardarCat')
        ?.addEventListener('click', guardarCategoria);
    document.getElementById('btnCancelarEditCat')
        ?.addEventListener('click', cancelarEditarCat);
    document.getElementById('invModalCategorias')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('invModalCategorias')) cerrarCatModal();
        });

    // ── Arrancar ─────────────────────────────────────────
    cargarSelects();
    cargarProductos();
}