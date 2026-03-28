// /js/controllers/ventasController.js

function initVentas() {
    if (!document.getElementById('ven-tbody')) return;

    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    const esAdmin = Number(usuario?.id_rol) === 1;

    // Estado
    let carrito        = [];      // { id_producto, nombre, cantidad, precio_unitario, stock_actual }
    let productos      = [];      // catálogo completo para el buscador
    let paginaActual   = 1;
    let ultimaMeta     = null;    // meta de paginación de Laravel
    let ventaDetalleId = null;    // id de la venta en el modal de detalle
    let _confirmando   = false;
    let _cancelando    = false;
    let dropdownTimer  = null;

    // ── Scroll helpers ────────────────────────────────────
    function bloquearScroll()    { document.body.classList.add('modal-abierto'); }
    function desbloquearScroll() { document.body.classList.remove('modal-abierto'); }

    // ── API helper ────────────────────────────────────────
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

    function mostrarError(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent   = msg;
        el.style.display = msg ? 'block' : 'none';
    }

    function formatMXN(val) {
        return Number(val).toLocaleString('es-MX', {
            style: 'currency', currency: 'MXN',
        });
    }

    function formatFecha(str) {
        return new Date(str).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    // ════════════════════════════════════════════════════
    // HISTORIAL — carga y render
    // ════════════════════════════════════════════════════
    async function cargarVentas(pagina = 1) {
        paginaActual = pagina;

        const skeleton = document.getElementById('ven-skeleton');
        const tabla    = document.getElementById('ven-tabla');
        const vacio    = document.getElementById('ven-vacio');

        if (skeleton) skeleton.style.display = 'block';
        if (tabla)    tabla.style.display    = 'none';
        if (vacio)    vacio.style.display    = 'none';

        const folio  = document.getElementById('ven-buscar')?.value.trim()    || '';
        const estado = document.getElementById('ven-filtro-estado')?.value    || '';
        const desde  = document.getElementById('ven-filtro-desde')?.value     || '';
        const hasta  = document.getElementById('ven-filtro-hasta')?.value     || '';

        const params = new URLSearchParams({ page: pagina });
        if (folio)  params.set('folio',       folio);
        if (estado) params.set('estado',      estado);
        if (desde)  params.set('fecha_desde', desde);
        if (hasta)  params.set('fecha_hasta', hasta);

        try {
            const resp    = await api('GET', `/api/ventas?${params}`);
            const ventas  = resp.data.data;
            ultimaMeta    = resp.data;

            if (skeleton) skeleton.style.display = 'none';

            if (!ventas.length) {
                if (vacio) vacio.style.display = 'block';
                renderPaginacion(null);
                return;
            }

            if (tabla) tabla.style.display = 'block';
            renderTabla(ventas);
            renderPaginacion(ultimaMeta);

        } catch (err) {
            console.error('Error cargando ventas:', err);
            if (skeleton) skeleton.style.display = 'none';
        }
    }

    function renderTabla(ventas) {
        const tbody = document.getElementById('ven-tbody');
        if (!tbody) return;

        const badgeEstado = {
            completada: 'usu-badge-activo',
            cancelada:  'usu-badge-inactivo',
            pendiente:  'usu-badge-pendiente',
        };

        const iconoPago = {
            efectivo:      '-',
            tarjeta:       '-',
            transferencia: '-',
        };

        tbody.innerHTML = ventas.map(v => ` 
            <tr id="ven-fila-${v.id_venta}">
                <td>
                    <span style="font-weight:700;color:var(--color-pri);
                                 font-family:monospace;font-size:.9rem">
                        ${v.folio}
                    </span>
                </td>
                <td style="font-size:.85rem;color:#5a6a7a">${formatFecha(v.fecha)}</td>
                <td>${v.usuario ? v.usuario.nombre + ' ' + v.usuario.apellidos : '—'}</td>
                <td>${iconoPago[v.metodo_pago] || ''} ${v.metodo_pago}</td>
                <td style="font-weight:700">${formatMXN(v.total)}</td>
                <td>
                    <span class="usu-badge ${badgeEstado[v.estado] || ''}">
                        ${v.estado}
                    </span>
                </td>
                <td>
                    <div class="usu-acciones">
                        <button class="usu-btn" data-ven-accion="detalle"
                            data-id="${v.id_venta}" title="Ver detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${v.estado === 'completada' && esAdmin ? `
                        <button class="usu-btn danger" data-ven-accion="cancelar"
                            data-id="${v.id_venta}" data-folio="${v.folio}"
                            title="Cancelar venta">
                            <i class="fas fa-ban"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPaginacion(meta) {
        const pag = document.getElementById('ven-paginacion');
        if (!pag) return;

        if (!meta || meta.last_page <= 1) {
            pag.style.display = 'none';
            return;
        }

        pag.style.display = 'flex';
        pag.innerHTML = '';

        // Anterior
        const btnPrev = document.createElement('button');
        btnPrev.className   = 'usu-btn-cancelar';
        btnPrev.textContent = '← Anterior';
        btnPrev.disabled    = meta.current_page <= 1;
        btnPrev.style.padding = '0.4rem 0.8rem';
        btnPrev.addEventListener('click', () => cargarVentas(meta.current_page - 1));
        pag.appendChild(btnPrev);

        // Página actual / total
        const info = document.createElement('span');
        info.style.cssText  = 'font-size:.85rem;color:#5a6a7a;align-self:center';
        info.textContent    = `Página ${meta.current_page} de ${meta.last_page}`;
        pag.appendChild(info);

        // Siguiente
        const btnNext = document.createElement('button');
        btnNext.className   = 'usu-btn-cancelar';
        btnNext.textContent = 'Siguiente →';
        btnNext.disabled    = meta.current_page >= meta.last_page;
        btnNext.style.padding = '0.4rem 0.8rem';
        btnNext.addEventListener('click', () => cargarVentas(meta.current_page + 1));
        pag.appendChild(btnNext);
    }

    // ════════════════════════════════════════════════════
    // MODAL NUEVA VENTA — POS
    // ════════════════════════════════════════════════════
    async function cargarProductosCatalogo() {
        try {
            const data = await api('GET', '/api/productos');
            // Solo activos con stock
            productos = data.filter(p => Number(p.activo) && Number(p.stock_actual) > 0);
        } catch (err) {
            console.warn('Error cargando catálogo:', err);
        }
    }

    function abrirModalVenta() {
        carrito = [];
        renderCarrito();
        mostrarError('ven-modal-error', '');
        document.getElementById('ven-prod-buscar').value     = '';
        document.getElementById('ven-metodo-pago').value     = 'efectivo';
        document.getElementById('ven-observaciones').value   = '';
        document.getElementById('ven-prod-dropdown').style.display = 'none';
        document.getElementById('venModal').style.display   = 'flex';
        bloquearScroll();
        cargarProductosCatalogo();
    }

    function cerrarModalVenta() {
        document.getElementById('venModal').style.display = 'none';
        desbloquearScroll();
    }

    // ── Buscador con dropdown ─────────────────────────────
    document.getElementById('ven-prod-buscar')
        ?.addEventListener('input', function () {
            clearTimeout(dropdownTimer);
            const q = this.value.trim().toLowerCase();
            const dropdown = document.getElementById('ven-prod-dropdown');

            if (!q) {
                dropdown.style.display = 'none';
                return;
            }

            dropdownTimer = setTimeout(() => {
                const resultados = productos.filter(p =>
                    p.nombre.toLowerCase().includes(q) ||
                    (p.codigo_barras || '').toLowerCase().includes(q)
                ).slice(0, 8);

                if (!resultados.length) {
                    dropdown.style.display = 'none';
                    return;
                }

                dropdown.innerHTML = resultados.map(p => `
                    <div class="ven-dropdown-item" data-id="${p.id_producto}"
                         style="padding:.6rem 1rem;cursor:pointer;border-bottom:
                                1px solid #f0f4f8;display:flex;justify-content:
                                space-between;align-items:center;font-size:.88rem;
                                transition:background .15s">
                        <div>
                            <span style="font-weight:600">${p.nombre}</span>
                            ${p.codigo_barras
                                ? `<span style="color:#7a8a9a;font-size:.78rem;
                                          margin-left:.4rem">${p.codigo_barras}</span>`
                                : ''}
                        </div>
                        <div style="text-align:right">
                            <span style="font-weight:700;color:var(--color-pri)">
                                ${formatMXN(p.precio_venta)}
                            </span>
                            <span style="color:#7a8a9a;font-size:.78rem;display:block">
                                Stock: ${p.stock_actual}
                            </span>
                        </div>
                    </div>
                `).join('');

                // Hover effect
                dropdown.querySelectorAll('.ven-dropdown-item').forEach(item => {
                    item.addEventListener('mouseenter', () => item.style.background = '#f0f4f8');
                    item.addEventListener('mouseleave', () => item.style.background = '');
                    item.addEventListener('click', () => {
                        const prod = productos.find(p =>
                            String(p.id_producto) === item.dataset.id
                        );
                        if (prod) agregarAlCarrito(prod);
                    });
                });

                dropdown.style.display = 'block';
            }, 200);
        });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', function cerrarDropdown(e) {
        if (!document.getElementById('ven-prod-buscar')) {
            document.removeEventListener('click', cerrarDropdown);
            return;
        }
        if (!e.target.closest('#ven-prod-buscar') &&
            !e.target.closest('#ven-prod-dropdown')) {
            const dd = document.getElementById('ven-prod-dropdown');
            if (dd) dd.style.display = 'none';
        }
    });

    // ── Carrito ───────────────────────────────────────────
    function agregarAlCarrito(prod) {
        const dd = document.getElementById('ven-prod-dropdown');
        if (dd) dd.style.display = 'none';
        document.getElementById('ven-prod-buscar').value = '';

        const existente = carrito.find(i => i.id_producto === prod.id_producto);
        if (existente) {
            if (existente.cantidad >= prod.stock_actual) {
                mostrarError('ven-modal-error',
                    `Stock máximo alcanzado para "${prod.nombre}" (${prod.stock_actual})`);
                return;
            }
            existente.cantidad++;
        } else {
            carrito.push({
                id_producto:    prod.id_producto,
                nombre:         prod.nombre,
                cantidad:       1,
                precio_unitario: Number(prod.precio_venta),
                stock_actual:   Number(prod.stock_actual),
            });
        }

        mostrarError('ven-modal-error', '');
        renderCarrito();
    }

    function quitarDelCarrito(idProducto) {
        carrito = carrito.filter(i => i.id_producto !== idProducto);
        renderCarrito();
    }

    function cambiarCantidad(idProducto, delta) {
        const item = carrito.find(i => i.id_producto === idProducto);
        if (!item) return;

        const nueva = item.cantidad + delta;
        if (nueva <= 0) {
            quitarDelCarrito(idProducto);
            return;
        }
        if (nueva > item.stock_actual) {
            mostrarError('ven-modal-error',
                `Stock máximo para "${item.nombre}": ${item.stock_actual}`);
            return;
        }

        item.cantidad = nueva;
        mostrarError('ven-modal-error', '');
        renderCarrito();
    }

    function calcularTotal() {
        return carrito.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
    }

    function renderCarrito() {
        const carritoVacio = document.getElementById('ven-carrito-vacio');
        const carritoTabla = document.getElementById('ven-carrito-tabla');
        const tbody        = document.getElementById('ven-carrito-tbody');
        const totalDisplay = document.getElementById('ven-total-display');

        if (!carrito.length) {
            if (carritoVacio) carritoVacio.style.display = 'block';
            if (carritoTabla) carritoTabla.style.display = 'none';
            if (totalDisplay) totalDisplay.textContent   = '$0.00';
            return;
        }

        if (carritoVacio) carritoVacio.style.display = 'none';
        if (carritoTabla) carritoTabla.style.display = 'block';

        if (tbody) {
            tbody.innerHTML = carrito.map(item => `
                <tr>
                    <td>
                        <span style="font-weight:600;font-size:.9rem">${item.nombre}</span>
                        <span style="display:block;font-size:.75rem;color:#7a8a9a">
                            Stock disp.: ${item.stock_actual}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex;align-items:center;gap:.3rem">
                            <button class="usu-btn"
                                data-cant-accion="menos"
                                data-id="${item.id_producto}"
                                style="padding:.2rem .5rem;font-size:.8rem;min-width:28px">
                                −
                            </button>
                            <span style="font-weight:700;min-width:24px;
                                         text-align:center">${item.cantidad}</span>
                            <button class="usu-btn"
                                data-cant-accion="mas"
                                data-id="${item.id_producto}"
                                style="padding:.2rem .5rem;font-size:.8rem;min-width:28px">
                                +
                            </button>
                        </div>
                    </td>
                    <td style="font-size:.9rem">${formatMXN(item.precio_unitario)}</td>
                    <td style="font-weight:700">
                        ${formatMXN(item.cantidad * item.precio_unitario)}
                    </td>
                    <td>
                        <button class="usu-btn danger"
                            data-cant-accion="quitar"
                            data-id="${item.id_producto}"
                            style="padding:.2rem .5rem;font-size:.8rem">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        if (totalDisplay) totalDisplay.textContent = formatMXN(calcularTotal());
    }

    // Delegado para botones del carrito
    document.getElementById('ven-carrito-tbody')
        ?.addEventListener('click', e => {
            const btn = e.target.closest('[data-cant-accion]');
            if (!btn) return;
            const { cantAccion, id } = btn.dataset;
            const idNum = Number(id);
            if (cantAccion === 'mas')    cambiarCantidad(idNum,  1);
            if (cantAccion === 'menos')  cambiarCantidad(idNum, -1);
            if (cantAccion === 'quitar') quitarDelCarrito(idNum);
        });

    // ── Confirmar venta ───────────────────────────────────
    async function confirmarVenta() {
        if (_confirmando) return;

        if (!carrito.length) {
            mostrarError('ven-modal-error', 'Agrega al menos un producto');
            return;
        }

        _confirmando = true;
        const btn = document.getElementById('btnConfirmarVenta');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; }

        try {
            const body = {
                metodo_pago:   document.getElementById('ven-metodo-pago').value,
                observaciones: document.getElementById('ven-observaciones').value.trim() || null,
                items:         carrito.map(i => ({
                    id_producto:     i.id_producto,
                    cantidad:        i.cantidad,
                    precio_unitario: i.precio_unitario,
                })),
            };

            const resp = await api('POST', '/api/ventas', body);

            cerrarModalVenta();
            mostrarTicket(resp.data);
            cargarVentas(1);

        } catch (err) {
            mostrarError('ven-modal-error', err.message);
        } finally {
            _confirmando = false;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmar venta'; }
        }
    }

    // ════════════════════════════════════════════════════
    // MODAL TICKET — post-venta
    // ════════════════════════════════════════════════════
    function mostrarTicket(venta) {
        const metodos = { efectivo: ' Efectivo', tarjeta: ' Tarjeta', transferencia: ' Transferencia' };
        const totalItems = venta.detalles?.reduce((s, d) => s + d.cantidad, 0) || 0;

        document.getElementById('ticket-folio').textContent  = venta.folio;
        document.getElementById('ticket-total').textContent  = formatMXN(venta.total);
        document.getElementById('ticket-metodo').textContent = metodos[venta.metodo_pago] || venta.metodo_pago;
        document.getElementById('ticket-items').textContent  = `${totalItems} producto(s) vendido(s)`;

        document.getElementById('venTicketModal').style.display = 'flex';
        bloquearScroll();
    }

    function cerrarTicket() {
        document.getElementById('venTicketModal').style.display = 'none';
        desbloquearScroll();
    }

    // ════════════════════════════════════════════════════
    // MODAL DETALLE
    // ════════════════════════════════════════════════════
    async function abrirDetalle(id) {
        ventaDetalleId = id;

        const skeleton  = document.getElementById('ven-detalle-skeleton');
        const contenido = document.getElementById('ven-detalle-contenido');
        const btnCancel = document.getElementById('btnCancelarVenta');

        if (skeleton)  skeleton.style.display  = 'block';
        if (contenido) contenido.style.display = 'none';
        if (btnCancel) btnCancel.style.display = 'none';

        document.getElementById('ven-detalle-titulo').textContent = 'Detalle de venta';
        document.getElementById('venDetalleModal').style.display  = 'flex';
        bloquearScroll();

        try {
            const resp  = await api('GET', `/api/ventas/${id}`);
            const venta = resp.data;

            document.getElementById('ven-detalle-titulo').textContent =
                `Venta ${venta.folio}`;

            const metodos = { efectivo: ' Efectivo', tarjeta: ' Tarjeta', transferencia: ' Transferencia' };
            const estadoBadge = {
                completada: 'usu-badge-activo',
                cancelada:  'usu-badge-inactivo',
                pendiente:  'usu-badge-pendiente',
            };

            const filasDetalle = (venta.detalles || []).map(d => `
                <tr>
                    <td>${d.producto?.nombre || '—'}</td>
                    <td style="text-align:center">${d.cantidad}</td>
                    <td style="text-align:right">${formatMXN(d.precio_unitario)}</td>
                    <td style="text-align:right;font-weight:700">${formatMXN(d.subtotal)}</td>
                </tr>
            `).join('');

            contenido.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem .75rem;
                            font-size:.88rem;margin-bottom:.75rem">
                    <div><span style="color:#7a8a9a">Fecha:</span>
                         <strong style="margin-left:.25rem">${formatFecha(venta.fecha)}</strong></div>
                    <div><span style="color:#7a8a9a">Estado:</span>
                         <span class="usu-badge ${estadoBadge[venta.estado] || ''}"
                               style="margin-left:.25rem">${venta.estado}</span></div>
                    <div><span style="color:#7a8a9a">Vendedor:</span>
                         <strong style="margin-left:.25rem">
                            ${venta.usuario ? venta.usuario.nombre + ' ' + venta.usuario.apellidos : '—'}
                         </strong></div>
                    <div><span style="color:#7a8a9a">Pago:</span>
                         <strong style="margin-left:.25rem">
                            ${metodos[venta.metodo_pago] || venta.metodo_pago}
                         </strong></div>
                    ${venta.observaciones
                        ? `<div style="grid-column:1/-1">
                               <span style="color:#7a8a9a">Obs:</span>
                               <span style="margin-left:.25rem">${venta.observaciones}</span>
                           </div>`
                        : ''}
                </div>

                <div class="usu-table-wrapper">
                    <table class="usu-table" style="font-size:.88rem">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th style="text-align:center">Cant.</th>
                                <th style="text-align:right">Precio</th>
                                <th style="text-align:right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${filasDetalle}</tbody>
                        <tfoot>
                            <tr style="border-top:2px solid #dce3ea">
                                <td colspan="3"
                                    style="text-align:right;font-weight:700;
                                           padding:.6rem 1rem;color:#1a2340">
                                    TOTAL
                                </td>
                                <td style="text-align:right;font-weight:800;
                                           font-size:1rem;color:var(--color-pri);
                                           padding:.6rem 1rem">
                                    ${formatMXN(venta.total)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            if (skeleton)  skeleton.style.display  = 'none';
            if (contenido) contenido.style.display = 'block';

            // Mostrar botón cancelar solo si está completada y es admin
            if (btnCancel && venta.estado === 'completada' && esAdmin) {
                btnCancel.style.display = 'inline-flex';
            }

        } catch (err) {
            console.error('Error cargando detalle:', err);
            if (skeleton) skeleton.style.display = 'none';
        }
    }

    function cerrarDetalleModal() {
        document.getElementById('venDetalleModal').style.display = 'none';
        ventaDetalleId = null;
        desbloquearScroll();
    }

    // ── Cancelar venta desde detalle ──────────────────────
    async function cancelarVenta() {
        if (!ventaDetalleId || _cancelando) return;

        const fila   = document.getElementById(`ven-fila-${ventaDetalleId}`);
        const titulo = document.getElementById('ven-detalle-titulo')?.textContent || 'esta venta';

        if (!confirm(`¿Cancelar ${titulo}? Se revertirá el stock de todos los productos.`)) return;

        _cancelando = true;
        const btn = document.getElementById('btnCancelarVenta');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...'; }

        try {
            await api('PATCH', `/api/ventas/${ventaDetalleId}/cancelar`);
            cerrarDetalleModal();
            cargarVentas(paginaActual);
        } catch (err) {
            alert(err.message);
        } finally {
            _cancelando = false;
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-ban"></i> Cancelar venta'; }
        }
    }

    // ════════════════════════════════════════════════════
    // LISTENER DELEGADO — tabla historial
    // ════════════════════════════════════════════════════
    if (document.__venListener) {
        document.removeEventListener('click', document.__venListener);
    }
    document.__venListener = (e) => {
        if (!document.getElementById('ven-tbody')) {
            document.removeEventListener('click', document.__venListener);
            document.__venListener = null;
            return;
        }

        const btn = e.target.closest('[data-ven-accion]');
        if (!btn || btn.disabled) return;

        const { venAccion, id, folio } = btn.dataset;
        if (venAccion === 'detalle')  abrirDetalle(id);
        if (venAccion === 'cancelar') {
            ventaDetalleId = id;
            cancelarVenta();
        }
    };
    document.addEventListener('click', document.__venListener);

    // ════════════════════════════════════════════════════
    // EVENTOS — botones y filtros
    // ════════════════════════════════════════════════════

    // Nueva venta
    document.getElementById('btnNuevaVenta')
        ?.addEventListener('click', abrirModalVenta);
    document.getElementById('btnCerrarVenModal')
        ?.addEventListener('click', cerrarModalVenta);
    document.getElementById('btnCancelarVenModal')
        ?.addEventListener('click', cerrarModalVenta);
    document.getElementById('btnConfirmarVenta')
        ?.addEventListener('click', confirmarVenta);
    document.getElementById('venModal')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('venModal')) cerrarModalVenta();
        });

    // Detalle
    document.getElementById('btnCerrarDetalleModal')
        ?.addEventListener('click', cerrarDetalleModal);
    document.getElementById('btnCerrarDetalleFooter')
        ?.addEventListener('click', cerrarDetalleModal);
    document.getElementById('btnCancelarVenta')
        ?.addEventListener('click', cancelarVenta);
    document.getElementById('venDetalleModal')
        ?.addEventListener('click', e => {
            if (e.target === document.getElementById('venDetalleModal')) cerrarDetalleModal();
        });

    // Ticket
    document.getElementById('btnCerrarTicket')
        ?.addEventListener('click', cerrarTicket);
    document.getElementById('btnTicketNuevaVenta')
        ?.addEventListener('click', () => {
            cerrarTicket();
            abrirModalVenta();
        });

    // Filtros
    document.getElementById('btnBuscarVentas')
        ?.addEventListener('click', () => cargarVentas(1));
    document.getElementById('ven-buscar')
        ?.addEventListener('keydown', e => { if (e.key === 'Enter') cargarVentas(1); });

    // ── Arrancar ──────────────────────────────────────────
    cargarVentas(1);
}