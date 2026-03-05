// models/VentaModel.js
const db = require('../db');

class VentaModel {
    /**
     * Inicializa la tabla 'ventas' en TiDB.
     * Se asegura de que la tabla exista y tenga las columnas necesarias.
     */
    static async init() {
        const sqlCreateTable = `
            CREATE TABLE IF NOT EXISTS ventas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                producto_id INT,
                nombre_producto VARCHAR(150),
                categoria_producto VARCHAR(100) DEFAULT 'General',
                cantidad INT,
                precio_unitario DECIMAL(10, 2),
                total_venta DECIMAL(10, 2),
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
            )
        `;

        // SQL de respaldo para agregar la columna si la tabla ya existía
        const sqlAddColumn = `
            ALTER TABLE ventas 
            ADD COLUMN categoria_producto VARCHAR(100) DEFAULT 'General' AFTER nombre_producto
        `;

        try {
            // 1. Intentar crear la tabla
            await db.query(sqlCreateTable);
            
            try {
                // 2. Intentar agregar la columna de categoría (en caso de actualización)
                // TiDB lanzará un error si ya existe, el cual capturamos en el catch.
                await db.query(sqlAddColumn);
            } catch (colErr) {
                // Silenciamos si el error es porque la columna ya existe
            }
            
            console.log("✅ Tabla 'ventas' sincronizada con TiDB.");
        } catch (err) {
            console.error("❌ Error al inicializar la tabla ventas:", err.message);
        }
    }

    /**
     * Registra una nueva transacción de venta.
     */
    static async registrar(data) {
        const { 
            producto_id, 
            nombre_producto, 
            categoria_producto, 
            cantidad, 
            precio_unitario, 
            total_venta 
        } = data;

        const sql = `
            INSERT INTO ventas 
            (producto_id, nombre_producto, categoria_producto, cantidad, precio_unitario, total_venta) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        try {
            const [result] = await db.query(sql, [
                producto_id, 
                nombre_producto, 
                categoria_producto || 'General', 
                cantidad, 
                precio_unitario, 
                total_venta
            ]);
            return result;
        } catch (err) {
            console.error("❌ Error al registrar venta en TiDB:", err.message);
            throw err; 
        }
    }

    /**
     * Obtiene el historial completo de ventas.
     */
    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM ventas ORDER BY fecha DESC');
            return rows;
        } catch (err) {
            console.error("❌ Error al obtener ventas de TiDB:", err.message);
            return [];
        }
    }
}

// Inicialización automática al cargar el modelo
VentaModel.init();

module.exports = VentaModel;