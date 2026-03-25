function initDashboard() {
    const token = localStorage.getItem('token');

    // 🛑 GUARD: si no existe el DOM, no hacer nada
    if (!document.getElementById('stat-ventas-hoy')) {
        return;
    }

    async function cargarDashboard() {
        try {
            const res = await fetch('/api/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) throw new Error('Error al cargar dashboard');
            const data = await res.json();

            // ── Fecha ────────────────────────────────────────
            const ahora = new Date();
            const opciones = {
                weekday: 'long', year: 'numeric',
                month: 'long',   day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            };

            const fecha = ahora.toLocaleDateString('es-MX', opciones);
            const elFecha = document.getElementById('dash-fecha');
            if (elFecha) {
                elFecha.textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
            }

            // ── Stats ────────────────────────────────────────
            setText('stat-ventas-hoy', `$${data.ventas_hoy.total}`);
            setText('stat-ventas-hoy-badge', data.ventas_hoy.variacion);

            setText('stat-ventas-mes', `$${data.ventas_mes.total}`);
            setText('stat-ventas-mes-badge', data.ventas_mes.variacion);

            setText('stat-inventario', data.inventario.total_productos);
            setText('stat-inventario-badge', `${data.inventario.bajo_stock} bajo stock`);

            setText('stat-empleados', data.empleados.activos);
            setText('stat-empleados-badge', `${data.empleados.inactivos} inactivos`);

            renderStockBajo(data.stock_bajo);
            renderActividad(data.actividad);
            renderVentasRecientes(data.ventas_recientes);

        } catch (err) {
            console.error('Dashboard error:', err);
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function renderStockBajo(items) {
        const lista = document.getElementById('stock-lista');
        if (!lista) return;

        if (!items || items.length === 0) {
            lista.innerHTML = `<p style="color:#888;font-size:.85rem">Sin productos en stock bajo.</p>`;
            return;
        }

        lista.innerHTML = items.map(p => `
            <div class="stock-row">
                <div class="stock-row-header">
                    <span class="stock-nombre">${p.nombre}</span>
                    <span class="stock-cantidad">${p.stock_actual}/${p.stock_minimo}</span>
                </div>
                <div class="stock-bar-bg">
                    <div class="stock-bar-fill"
                         data-nivel="${p.nivel}"
                         style="width:${p.porcentaje}%">
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderActividad(items) {
        const lista = document.getElementById('actividad-lista');
        if (!lista) return;

        if (!items || items.length === 0) {
            lista.innerHTML = `<p style="color:#888;font-size:.85rem">Sin actividad reciente.</p>`;
            return;
        }

        const iconos = {
            entrada:  'fas fa-arrow-down',
            salida:   'fas fa-arrow-up',
            ajuste:   'fas fa-sliders-h',
        };

        lista.innerHTML = items.map(m => `
            <div class="actividad-item">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>
                        <i class="${iconos[m.tipo] || 'fas fa-circle'}"
                           style="margin-right:.4rem"></i>
                        ${capitalizar(m.origen.replace('_', ' '))}
                    </span>
                    <span class="tiempo">${m.hace}</span>
                </div>
                <div style="font-size:.82rem;color:#888;margin-top:.2rem">
                    ${m.cantidad} uds. de ${m.producto} — ${m.usuario}
                </div>
            </div>
        `).join('');
    }

    function renderVentasRecientes(items) {
        const lista = document.getElementById('ventas-lista');
        if (!lista) return;

        if (!items || items.length === 0) {
            lista.innerHTML = `<p style="color:#888;font-size:.85rem">Sin ventas recientes.</p>`;
            return;
        }

        lista.innerHTML = items.map(v => `
            <div class="venta-row">
                <div>
                    <p class="venta-folio">${v.folio}</p>
                    <p class="venta-meta">${v.hace} • ${v.vendedor} • ${v.cliente}</p>
                </div>
                <span class="venta-total">$${v.total}</span>
            </div>
        `).join('');
    }

    function capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 🚀 INIT
    cargarDashboard();

    // 🧹 DESTROY (por ahora vacío, pero necesario para arquitectura)
    return () => {
        console.log('DESTROY dashboard');
    };
}