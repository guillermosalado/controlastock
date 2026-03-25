-- ============================================================
--  ControlaStock - Sistema Web de Gestión de Inventario y Venta
--  Universidad Tecnológica de la Costa Grande de Guerrero
--  TSU en Tecnologías de la Información - DSM
-- ============================================================
--  Motor:   MySQL 8.0 / MariaDB 10.6
--  Charset: utf8mb4  |  Collation: utf8mb4_unicode_ci
--  Autor:   Equipo de Desarrollo ControlaStock
--  Fecha:   2026
--  Versión: 2.0 — Soporte multitienda
-- ============================================================

-- -----------------------------------------------------------
-- 0. CREAR Y SELECCIONAR BASE DE DATOS
-- -----------------------------------------------------------
CREATE DATABASE IF NOT EXISTS controlastock
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE controlastock;

-- -----------------------------------------------------------
-- 1. TABLA: tiendas
--    Cada tienda registrada en el sistema
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiendas (
    id_tienda   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(120)  NOT NULL,
    slug        VARCHAR(80)   NOT NULL COMMENT 'Identificador único para el login (ej: mi-tienda)',
    telefono    VARCHAR(20)   NULL,
    email       VARCHAR(120)  NULL,
    direccion   VARCHAR(255)  NULL,
    activo      TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_tiendas   PRIMARY KEY (id_tienda),
    CONSTRAINT uq_tiendas_slug UNIQUE (slug)
) ENGINE=InnoDB COMMENT='Tiendas registradas en el sistema';

-- -----------------------------------------------------------
-- 2. TABLA: roles
--    Catálogo de roles del sistema
--    1 = Administrador | 2 = Vendedor
--    (Globales, no por tienda)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id_rol       TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(50)      NOT NULL,
    descripcion  VARCHAR(200)     NULL,
    CONSTRAINT pk_roles        PRIMARY KEY (id_rol),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB COMMENT='Catálogo de roles del sistema';

-- -----------------------------------------------------------
-- 3. TABLA: usuarios
--    Administradores y vendedores por tienda
--    El email es único dentro de la misma tienda, no global
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario    INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    id_tienda     INT UNSIGNED     NOT NULL,
    id_rol        TINYINT UNSIGNED NOT NULL,
    nombre        VARCHAR(80)      NOT NULL,
    apellidos     VARCHAR(100)     NOT NULL,
    email         VARCHAR(120)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL COMMENT 'Hash bcrypt de la contraseña',
    activo        TINYINT(1)       NOT NULL DEFAULT 1,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_usuarios           PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_email_tienda UNIQUE (email, id_tienda),
    CONSTRAINT fk_usuarios_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Usuarios del sistema por tienda';

-- -----------------------------------------------------------
-- 4. TABLA: categorias
--    Cada tienda tiene su propio catálogo de categorías
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_tienda     INT UNSIGNED      NOT NULL,
    nombre        VARCHAR(80)       NOT NULL,
    descripcion   VARCHAR(200)      NULL,
    activo        TINYINT(1)        NOT NULL DEFAULT 1,
    created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_categorias PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categorias_nombre_tienda UNIQUE (nombre, id_tienda),
    CONSTRAINT fk_categorias_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Categorías de productos por tienda';

-- -----------------------------------------------------------
-- 5. TABLA: proveedores
--    Cada tienda gestiona sus propios proveedores
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_tienda     INT UNSIGNED  NOT NULL,
    empresa       VARCHAR(120)  NOT NULL,
    contacto      VARCHAR(120)  NULL,
    telefono      VARCHAR(20)   NULL,
    email         VARCHAR(120)  NULL,
    direccion     VARCHAR(255)  NULL,
    activo        TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_proveedores PRIMARY KEY (id_proveedor),
    CONSTRAINT fk_proveedores_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Proveedores por tienda';

-- -----------------------------------------------------------
-- 6. TABLA: productos
--    Catálogo de productos por tienda
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id_producto     INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    id_tienda       INT UNSIGNED      NOT NULL,
    id_categoria    SMALLINT UNSIGNED NOT NULL,
    id_proveedor    INT UNSIGNED      NULL COMMENT 'Proveedor principal del producto',
    codigo_barras   VARCHAR(50)       NULL,
    nombre          VARCHAR(120)      NOT NULL,
    descripcion     TEXT              NULL,
    precio_compra   DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
    precio_venta    DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
    stock_actual    INT               NOT NULL DEFAULT 0,
    stock_minimo    INT               NOT NULL DEFAULT 5 COMMENT 'Umbral para alerta de stock bajo',
    unidad_medida   VARCHAR(30)       NOT NULL DEFAULT 'pieza',
    activo          TINYINT(1)        NOT NULL DEFAULT 1,
    created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_productos PRIMARY KEY (id_producto),
    CONSTRAINT uq_productos_codigo_tienda UNIQUE (codigo_barras, id_tienda),
    CONSTRAINT fk_productos_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_productos_categoria
        FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_productos_proveedor
        FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_precio_compra CHECK (precio_compra >= 0),
    CONSTRAINT ck_precio_venta  CHECK (precio_venta  >= 0),
    CONSTRAINT ck_stock_actual  CHECK (stock_actual  >= 0)
) ENGINE=InnoDB COMMENT='Catálogo de productos por tienda';

-- -----------------------------------------------------------
-- 7. TABLA: clientes
--    Clientes registrados por tienda
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_tienda    INT UNSIGNED  NOT NULL,
    nombre       VARCHAR(80)   NOT NULL,
    apellidos    VARCHAR(100)  NOT NULL,
    telefono     VARCHAR(20)   NULL,
    email        VARCHAR(120)  NULL,
    direccion    VARCHAR(255)  NULL,
    activo       TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_clientes PRIMARY KEY (id_cliente),
    CONSTRAINT fk_clientes_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Clientes por tienda';

-- -----------------------------------------------------------
-- 8. TABLA: ventas
--    Cabecera de cada transacción de venta
--    El folio es único por tienda, no global
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
    id_venta      INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    id_tienda     INT UNSIGNED      NOT NULL,
    id_usuario    INT UNSIGNED      NOT NULL COMMENT 'Usuario que realizó la venta',
    id_cliente    INT UNSIGNED      NULL     COMMENT 'NULL = cliente mostrador (anónimo)',
    folio         VARCHAR(20)       NOT NULL,
    fecha         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal      DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
    descuento     DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
    total         DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
    metodo_pago   ENUM('efectivo','tarjeta','transferencia') NOT NULL DEFAULT 'efectivo',
    estado        ENUM('completada','cancelada','pendiente')  NOT NULL DEFAULT 'completada',
    observaciones TEXT              NULL,
    created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ventas PRIMARY KEY (id_venta),
    CONSTRAINT uq_ventas_folio_tienda UNIQUE (folio, id_tienda),
    CONSTRAINT fk_ventas_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Cabecera de ventas';

-- -----------------------------------------------------------
-- 9. TABLA: detalle_ventas
--    Líneas de productos de cada venta (sin cambios)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_venta        INT UNSIGNED  NOT NULL,
    id_producto     INT UNSIGNED  NOT NULL,
    cantidad        INT           NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal        DECIMAL(12,2) NOT NULL,
    CONSTRAINT pk_detalle_ventas PRIMARY KEY (id_detalle),
    CONSTRAINT fk_dv_venta
        FOREIGN KEY (id_venta)    REFERENCES ventas   (id_venta)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_dv_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_dv_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB COMMENT='Líneas de detalle por cada venta';

-- -----------------------------------------------------------
-- 10. TABLA: compras
--     Cabecera de órdenes de compra a proveedores
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras (
    id_compra     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_tienda     INT UNSIGNED  NOT NULL,
    id_usuario    INT UNSIGNED  NOT NULL COMMENT 'Usuario que registró la compra',
    id_proveedor  INT UNSIGNED  NOT NULL,
    folio         VARCHAR(20)   NOT NULL,
    fecha         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado        ENUM('recibida','pendiente','cancelada') NOT NULL DEFAULT 'recibida',
    observaciones TEXT          NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_compras PRIMARY KEY (id_compra),
    CONSTRAINT uq_compras_folio_tienda UNIQUE (folio, id_tienda),
    CONSTRAINT fk_compras_tienda
        FOREIGN KEY (id_tienda) REFERENCES tiendas (id_tienda)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_compras_usuario
        FOREIGN KEY (id_usuario)   REFERENCES usuarios   (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_compras_proveedor
        FOREIGN KEY (id_proveedor) REFERENCES proveedores (id_proveedor)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Cabecera de compras a proveedores';

-- -----------------------------------------------------------
-- 11. TABLA: detalle_compras
--     Líneas de productos de cada compra (sin cambios)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_compras (
    id_detalle      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_compra       INT UNSIGNED  NOT NULL,
    id_producto     INT UNSIGNED  NOT NULL,
    cantidad        INT           NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal        DECIMAL(12,2) NOT NULL,
    CONSTRAINT pk_detalle_compras PRIMARY KEY (id_detalle),
    CONSTRAINT fk_dc_compra
        FOREIGN KEY (id_compra)   REFERENCES compras   (id_compra)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_dc_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_dc_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB COMMENT='Líneas de detalle por cada compra';

-- -----------------------------------------------------------
-- 12. TABLA: inventario_movimientos
--     Bitácora — se deriva de id_producto que ya tiene id_tienda
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id_movimiento   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_producto     INT UNSIGNED  NOT NULL,
    id_usuario      INT UNSIGNED  NOT NULL,
    tipo_movimiento ENUM('entrada','salida','ajuste') NOT NULL,
    origen          ENUM('compra','venta','ajuste_manual','devolucion') NOT NULL,
    id_referencia   INT UNSIGNED  NULL COMMENT 'id_venta o id_compra según origen',
    cantidad        INT           NOT NULL COMMENT 'Positivo = entrada, Negativo = salida',
    stock_anterior  INT           NOT NULL,
    stock_nuevo     INT           NOT NULL,
    observaciones   VARCHAR(255)  NULL,
    fecha           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventario_mov PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_imov_producto
        FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_imov_usuario
        FOREIGN KEY (id_usuario)  REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Bitácora de movimientos de inventario';

-- -----------------------------------------------------------
-- 13. TABLA: sesiones_log
--     Auditoría — se deriva de id_usuario que ya tiene id_tienda
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones_log (
    id_log      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    id_usuario  INT UNSIGNED  NOT NULL,
    accion      ENUM('login','logout') NOT NULL,
    ip_address  VARCHAR(45)   NULL,
    user_agent  VARCHAR(255)  NULL,
    fecha       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sesiones_log PRIMARY KEY (id_log),
    CONSTRAINT fk_sl_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Auditoría de sesiones de usuarios';

-- -----------------------------------------------------------
-- ÍNDICES ADICIONALES
-- -----------------------------------------------------------

CREATE INDEX idx_productos_nombre       ON productos (nombre);
CREATE INDEX idx_productos_stock        ON productos (stock_actual);
CREATE INDEX idx_productos_tienda       ON productos (id_tienda);

CREATE INDEX idx_ventas_fecha           ON ventas (fecha);
CREATE INDEX idx_ventas_estado          ON ventas (estado);
CREATE INDEX idx_ventas_usuario         ON ventas (id_usuario);
CREATE INDEX idx_ventas_tienda          ON ventas (id_tienda);

CREATE INDEX idx_compras_fecha          ON compras (fecha);
CREATE INDEX idx_compras_proveedor      ON compras (id_proveedor);
CREATE INDEX idx_compras_tienda         ON compras (id_tienda);

CREATE INDEX idx_imov_producto_fecha    ON inventario_movimientos (id_producto, fecha);

-- ============================================================
-- DATOS INICIALES (Seed Data)
-- ============================================================

INSERT INTO roles (nombre, descripcion) VALUES
    ('Administrador', 'Acceso total al sistema: usuarios, inventario, compras, ventas y reportes'),
    ('Vendedor',      'Acceso a ventas, consulta de productos y registro de clientes');

-- Tienda de ejemplo
INSERT INTO tiendas (nombre, slug, telefono, email, direccion) VALUES
    ('Tienda Demo', 'tienda-demo', '758 100 0000', 'demo@controlastock.com', 'Guerrero, México');

-- Admin de la tienda demo (password: Admin@2025 — cambiar en producción)
INSERT INTO usuarios (id_tienda, id_rol, nombre, apellidos, email, password_hash) VALUES
    (1, 1, 'Administrador', 'Demo', 'admin@demo.com',
     '$2y$12$placeholder_hash_reemplazar_con_bcrypt');

-- Categorías de la tienda demo
INSERT INTO categorias (id_tienda, nombre, descripcion) VALUES
    (1, 'Bebidas',              'Refrescos, agua, jugos y bebidas en general'),
    (1, 'Abarrotes',            'Cereales, leche, arroz, frijol y productos básicos'),
    (1, 'Botanas y Dulces',     'Galletas, papas, dulces y golosinas'),
    (1, 'Limpieza',             'Detergentes, jabones, escobas y productos de aseo'),
    (1, 'Higiene Personal',     'Shampoo, jabón corporal, pasta dental y artículos de higiene'),
    (1, 'Aceites y Condimentos','Aceites de cocina, salsas, vinagres y especias'),
    (1, 'Papelería',            'Cuadernos, lápices, bolígrafos y útiles escolares'),
    (1, 'Lácteos',              'Queso, crema, yogur y derivados lácteos');

-- Proveedores de la tienda demo
INSERT INTO proveedores (id_tienda, empresa, contacto, telefono, email, direccion) VALUES
    (1, 'Distribuidora El Pirata', 'Juan Pérez',  '758 100 0001', 'ventas@elpirata.com', 'Calle Principal #1, Guerrero'),
    (1, 'Abastecedora del Sur',    'María López', '758 100 0002', 'pedidos@absur.com',   'Av. Comercio #45, Guerrero'),
    (1, 'Refrescos y Más S.A.',    'Pedro Ruiz',  '758 100 0003', 'contacto@rymas.com',  'Blvd. Industrial #200, Guerrero');

-- ============================================================
-- VISTAS (actualizadas con filtro id_tienda donde aplica)
-- ============================================================

CREATE OR REPLACE VIEW vw_stock_bajo AS
SELECT
    p.id_tienda,
    p.id_producto,
    p.codigo_barras,
    p.nombre               AS producto,
    c.nombre               AS categoria,
    p.stock_actual,
    p.stock_minimo,
    p.precio_venta,
    pr.empresa             AS proveedor
FROM productos p
JOIN categorias   c  ON c.id_categoria  = p.id_categoria
LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
WHERE p.activo = 1
  AND p.stock_actual <= p.stock_minimo
ORDER BY p.id_tienda, p.stock_actual ASC;

CREATE OR REPLACE VIEW vw_reporte_ventas_diario AS
SELECT
    v.id_tienda,
    DATE(v.fecha)                          AS dia,
    COUNT(v.id_venta)                      AS total_transacciones,
    SUM(CASE WHEN v.estado = 'completada'
             THEN 1 ELSE 0 END)            AS ventas_completadas,
    SUM(CASE WHEN v.estado = 'cancelada'
             THEN 1 ELSE 0 END)            AS ventas_canceladas,
    SUM(CASE WHEN v.estado = 'completada'
             THEN v.total ELSE 0 END)      AS ingresos_totales,
    SUM(CASE WHEN v.estado = 'completada'
             THEN v.descuento ELSE 0 END)  AS descuentos_otorgados
FROM ventas v
GROUP BY v.id_tienda, DATE(v.fecha)
ORDER BY v.id_tienda, dia DESC;

CREATE OR REPLACE VIEW vw_productos_mas_vendidos AS
SELECT
    p.id_tienda,
    p.id_producto,
    p.nombre                     AS producto,
    c.nombre                     AS categoria,
    SUM(dv.cantidad)             AS unidades_vendidas,
    SUM(dv.subtotal)             AS ingresos_generados,
    COUNT(DISTINCT dv.id_venta)  AS num_ventas
FROM detalle_ventas dv
JOIN ventas     v  ON v.id_venta     = dv.id_venta AND v.estado = 'completada'
JOIN productos  p  ON p.id_producto  = dv.id_producto
JOIN categorias c  ON c.id_categoria = p.id_categoria
GROUP BY p.id_tienda, p.id_producto, p.nombre, c.nombre
ORDER BY p.id_tienda, unidades_vendidas DESC;

-- ============================================================
-- STORED PROCEDURE: sp_registrar_venta (actualizado)
-- ============================================================
DELIMITER $$

CREATE PROCEDURE sp_registrar_venta(
    IN  p_id_tienda    INT UNSIGNED,
    IN  p_id_usuario   INT UNSIGNED,
    IN  p_id_cliente   INT UNSIGNED,
    IN  p_metodo_pago  VARCHAR(20),
    IN  p_items        JSON,
    OUT p_id_venta     INT UNSIGNED,
    OUT p_folio        VARCHAR(20),
    OUT p_total        DECIMAL(12,2),
    OUT p_error        VARCHAR(255)
)
sp_registrar_venta: BEGIN
    DECLARE v_folio    VARCHAR(20);
    DECLARE v_subtotal DECIMAL(12,2) DEFAULT 0;
    DECLARE v_i        INT DEFAULT 0;
    DECLARE v_n        INT;
    DECLARE v_id_prod  INT UNSIGNED;
    DECLARE v_cant     INT;
    DECLARE v_precio   DECIMAL(10,2);
    DECLARE v_line_sub DECIMAL(12,2);
    DECLARE v_stock    INT;

    SET p_error = NULL;

    SET v_folio = CONCAT('VTA-', DATE_FORMAT(NOW(),'%Y%m%d'), '-',
                         LPAD(FLOOR(RAND()*99999), 5, '0'));

    START TRANSACTION;

    INSERT INTO ventas (id_tienda, id_usuario, id_cliente, folio, metodo_pago, subtotal, total)
    VALUES (p_id_tienda, p_id_usuario, p_id_cliente, v_folio, p_metodo_pago, 0, 0);

    SET p_id_venta = LAST_INSERT_ID();

    SET v_n = JSON_LENGTH(p_items);
    WHILE v_i < v_n DO
        SET v_id_prod  = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[',v_i,'].id_producto')));
        SET v_cant     = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[',v_i,'].cantidad')));
        SET v_precio   = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[',v_i,'].precio')));
        SET v_line_sub = v_cant * v_precio;

        -- Verificar que el producto pertenece a esta tienda y tiene stock
        SELECT stock_actual INTO v_stock
        FROM productos
        WHERE id_producto = v_id_prod AND id_tienda = p_id_tienda
        FOR UPDATE;

        IF v_stock IS NULL THEN
            SET p_error = CONCAT('Producto id=', v_id_prod, ' no pertenece a esta tienda');
            ROLLBACK;
            LEAVE sp_registrar_venta;
        END IF;

        IF v_stock < v_cant THEN
            SET p_error = CONCAT('Stock insuficiente para producto id=', v_id_prod);
            ROLLBACK;
            LEAVE sp_registrar_venta;
        END IF;

        INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (p_id_venta, v_id_prod, v_cant, v_precio, v_line_sub);

        UPDATE productos
        SET stock_actual = stock_actual - v_cant
        WHERE id_producto = v_id_prod;

        INSERT INTO inventario_movimientos
            (id_producto, id_usuario, tipo_movimiento, origen, id_referencia,
             cantidad, stock_anterior, stock_nuevo)
        VALUES
            (v_id_prod, p_id_usuario, 'salida', 'venta', p_id_venta,
             -v_cant, v_stock, v_stock - v_cant);

        SET v_subtotal = v_subtotal + v_line_sub;
        SET v_i = v_i + 1;
    END WHILE;

    UPDATE ventas SET subtotal = v_subtotal, total = v_subtotal
    WHERE id_venta = p_id_venta;

    SET p_folio = v_folio;
    SET p_total = v_subtotal;

    COMMIT;
END$$

-- ============================================================
-- TABLA: personal_access_tokens (Laravel Sanctum)
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    tokenable_type VARCHAR(255)    NOT NULL,
    tokenable_id   BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(255)    NOT NULL,
    token          VARCHAR(64)     NOT NULL,
    abilities      TEXT            NULL,
    last_used_at   TIMESTAMP       NULL,
    expires_at     TIMESTAMP       NULL,
    created_at     TIMESTAMP       NULL,
    updated_at     TIMESTAMP       NULL,
    CONSTRAINT pk_personal_access_tokens PRIMARY KEY (id),
    CONSTRAINT uq_personal_access_tokens_token UNIQUE (token),
    INDEX idx_pat_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB COMMENT='Tokens de autenticación Laravel Sanctum';
DELIMITER ;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================X