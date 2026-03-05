// models/ProductoModel.js
const db = require('../db');

class ProductosModel {
    /**
     * Inicializa la tabla en TiDB. 
     * Se ejecuta automáticamente al importar el modelo.
     */
    static async init() {
        // Query para crear la tabla si no existe
        const sqlCreateTable = `
            CREATE TABLE IF NOT EXISTS productos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                categoria VARCHAR(100) DEFAULT 'General',
                descripcion TEXT,
                precio DECIMAL(10, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        // Query de respaldo para agregar la columna categoria en tablas creadas anteriormente
        const sqlAddColumn = `
            ALTER TABLE productos 
            ADD COLUMN categoria VARCHAR(100) DEFAULT 'General' AFTER nombre
        `;

        try {
            // 1. Intentar crear la tabla
            await db.query(sqlCreateTable);
            
            // 2. Intentar agregar la columna (por si la tabla ya existía sin ella)
            try {
                // Nota: TiDB maneja ALTER TABLE de forma eficiente, 
                // pero si la columna ya existe, lanzará un error que capturamos aquí.
                await db.query(sqlAddColumn);
            } catch (colErr) {
                // Silenciamos el error si la columna ya existe (Error 1060 en MySQL/TiDB)
            }

            console.log("✅ Tabla 'productos' sincronizada con TiDB.");
        } catch (err) {
            console.error("❌ Error al inicializar la tabla productos:", err.message);
        }
    }

    /**
     * Obtiene todos los productos ordenados por los más recientes.
     */
    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM productos ORDER BY id DESC');
            return rows;
        } catch (err) {
            console.error("Error en getAll:", err.message);
            throw err;
        }
    }

    /**
     * Crea un nuevo producto.
     */
    static async create(data) {
        const { nombre, categoria, descripcion, precio, stock } = data;
        const sql = `
            INSERT INTO productos (nombre, categoria, descripcion, precio, stock) 
            VALUES (?, ?, ?, ?, ?)
        `;
        try {
            const [result] = await db.query(sql, [
                nombre, 
                categoria || 'General', 
                descripcion, 
                precio, 
                stock
            ]);
            return result;
        } catch (err) {
            console.error("Error en create:", err.message);
            throw err;
        }
    }

    /**
     * Busca un producto por su ID.
     */
    static async getById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
            return rows[0];
        } catch (err) {
            console.error("Error en getById:", err.message);
            throw err;
        }
    }

    /**
     * Actualiza los datos de un producto existente.
     */
    static async update(id, data) {
        const { nombre, categoria, descripcion, precio, stock } = data;
        const sql = `
            UPDATE productos 
            SET nombre = ?, categoria = ?, descripcion = ?, precio = ?, stock = ? 
            WHERE id = ?
        `;
        try {
            const [result] = await db.query(sql, [
                nombre, 
                categoria || 'General', 
                descripcion, 
                precio, 
                stock, 
                id
            ]);
            return result;
        } catch (err) {
            console.error("Error en update:", err.message);
            throw err;
        }
    }

    /**
     * Elimina un producto por ID.
     */
    static async delete(id) {
        const sql = 'DELETE FROM productos WHERE id = ?';
        try {
            const [result] = await db.query(sql, [id]);
            return result;
        } catch (err) {
            console.error("Error en delete:", err.message);
            throw err;
        }
    }

    /**
     * Registra una venta asociada a un producto.
     * Útil para mantener la integridad referencial en TiDB.
     */
    static async registrarVenta(datos) {
        const { id_producto, nombre_producto, categoria_producto, cantidad, precio_unitario, total_venta } = datos;
        const sql = `
            INSERT INTO ventas (producto_id, nombre_producto, categoria_producto, cantidad, precio_unitario, total_venta) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        try {
            return await db.query(sql, [
                id_producto, 
                nombre_producto, 
                categoria_producto, 
                cantidad, 
                precio_unitario, 
                total_venta
            ]);
        } catch (err) {
            console.error("Error en registrarVenta:", err.message);
            throw err;
        }
    }
}

// Inicialización automática al cargar el modelo en la aplicación
ProductosModel.init();

module.exports = ProductosModel;