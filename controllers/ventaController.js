// controllers/ventaController.js
const Producto = require('../models/ProductoModel');
const Venta = require('../models/VentaModel');

const ventaController = {
    // Proceso de ejecución de la venta
    procesarVenta: async (req, res) => {
        try {
            const { id } = req.params;
            // Recibimos los datos enriquecidos desde main.js
            const { cantidad, nombre_producto, categoria_producto, precio_unitario } = req.body;

            // 1. Validaciones de existencia y stock
            const producto = await Producto.getById(id);
            if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

            const cantNum = parseInt(cantidad);
            if (producto.stock < cantNum) {
                return res.status(400).json({ message: "Stock insuficiente" });
            }

            // 2. Cálculos de la transacción
            // Usamos el precio unitario que viene del cliente para respetar ofertas del momento, 
            // o producto.precio para máxima seguridad.
            const totalVenta = (precio_unitario || producto.precio) * cantNum;
            const nuevoStock = producto.stock - cantNum;

            // 3. Persistencia en Base de Datos
            // Actualizamos el stock del producto manteniendo su categoría y otros datos
            await Producto.update(id, { 
                ...producto, 
                stock: nuevoStock 
            });

            // Registramos el movimiento en el historial INCLUYENDO LA CATEGORÍA
            await Venta.registrar({
                producto_id: id,
                nombre_producto: nombre_producto || producto.nombre,
                categoria_producto: categoria_producto || producto.categoria, // <-- CRÍTICO PARA EL GRÁFICO
                cantidad: cantNum,
                precio_unitario: precio_unitario || producto.precio,
                total_venta: totalVenta,
                fecha: new Date()
            });

            // 4. Notificación en tiempo real vía Socket.io
            if (req.app.get('socketio')) {
                req.app.get('socketio').emit('producto-actualizado');
            }

            res.status(200).json({ 
                success: true, 
                message: "Venta procesada", 
                total: totalVenta.toFixed(2) 
            });

        } catch (error) {
            console.error("❌ Error en ventaController:", error);
            res.status(500).json({ message: "Error interno al procesar la venta" });
        }
    },

    // Listar el historial de ventas para la vista de reportes
    verHistorial: async (req, res) => {
        try {
            // Obtenemos todas las ventas para la tabla y el gráfico de dona
            const ventas = await Venta.getAll();
            res.render('historial', { ventas });
        } catch (error) {
            console.error("❌ Error al obtener historial:", error);
            res.status(500).send("Error al cargar el historial");
        }
    }
};

module.exports = ventaController;