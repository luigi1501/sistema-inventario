// controllers/productoController.js
// Importamos el modelo de productos para interactuar con la base de datos
const Producto = require('../models/ProductoModel');

const productoController = {
    // --- VISTAS (Lectura) ---

    // Listar todos los productos y calcular estadísticas para el Dashboard
    listar: async (req, res) => {
        try {
            // USAMOS .getAll() que es el método definido en tu ProductoModel
            const productos = await Producto.getAll();

            // LÓGICA DEL DASHBOARD: Cálculo de métricas clave en tiempo real
            const stats = {
                // Conteo total de ítems en el arreglo
                totalProductos: productos.length,
                // Sumatoria del valor monetario total (Precio * Stock)
                valorInventario: productos.reduce((acc, p) => acc + (p.precio * p.stock), 0).toFixed(2),
                // Conteo de productos con existencias críticas (menos de 5 unidades)
                productosBajoStock: productos.filter(p => p.stock < 5).length
            };

            // Renderizamos la vista principal enviando los productos y el objeto de estadísticas
            res.render('index', { productos, stats }); 
        } catch (error) {
            console.error("❌ Error en listar:", error);
            res.status(500).send('Error al obtener los productos');
        }
    },

    // Mostrar el formulario de edición con los datos del producto cargados
    mostrarEditar: async (req, res) => {
        try {
            const { id } = req.params;
            const producto = await Producto.getById(id);
            
            if (!producto) {
                return res.status(404).send("Producto no encontrado");
            }
            
            res.render('editar', { producto });
        } catch (error) {
            console.error("❌ Error en mostrarEditar:", error);
            res.status(500).send("Error al cargar el producto");
        }
    },

    // --- ACCIONES (Escritura/Modificación) ---

    // Proceso de guardado de un nuevo producto
    guardar: async (req, res) => {
        try {
            // Agregamos 'categoria' recibida del formulario
            const { nombre, categoria, descripcion, precio, stock } = req.body;

            // Validación de integridad: Evitar valores negativos o cero en precio
            if (parseFloat(precio) <= 0 || parseInt(stock) < 0) {
                return res.status(400).send("El precio debe ser mayor a 0 y el stock no puede ser negativo.");
            }

            // Pasamos todos los campos al modelo, incluyendo la nueva categoría
            await Producto.create({ nombre, categoria, descripcion, precio, stock });

            // NOTIFICACIÓN PUSH: Sincronización automática vía Socket.io para todos los clientes
            if (req.app.get('socketio')) {
                req.app.get('socketio').emit('producto-actualizado');
            }

            res.redirect('/');
        } catch (error) {
            console.error("❌ Error en guardar:", error);
            res.status(500).send('Error al guardar el producto');
        }
    },

    // Guardar los cambios editados en la base de datos
    actualizar: async (req, res) => {
        try {
            // Incluimos la categoría en la desestructuración de la edición
            const { nombre, categoria, descripcion, precio, stock } = req.body;
            const { id } = req.params;

            // Validación de integridad para edición
            if (parseFloat(precio) <= 0 || parseInt(stock) < 0) {
                return res.status(400).send("El precio debe ser mayor a 0 y el stock no puede ser negativo.");
            }

            // Pasamos el ID y el objeto con los nuevos datos al modelo (ahora con categoría)
            await Producto.update(id, { nombre, categoria, descripcion, precio, stock });

            // Emitir evento para que todos los clientes conectados refresquen su vista (Dashboard y Tabla)
            if (req.app.get('socketio')) {
                req.app.get('socketio').emit('producto-actualizado');
            }

            res.redirect('/');
        } catch (error) {
            console.error("❌ Error en actualizar:", error);
            res.status(500).send("Error al actualizar el producto");
        }
    },

    // Eliminar un producto físicamente de la base de datos
    eliminar: async (req, res) => {
        try {
            const { id } = req.params; 
            await Producto.delete(id);

            // Notificar la eliminación para actualización de estadísticas en tiempo real
            if (req.app.get('socketio')) {
                req.app.get('socketio').emit('producto-actualizado');
            }

            res.redirect('/'); 
        } catch (error) {
            console.error("❌ Error en eliminar:", error);
            res.status(500).send('Error al eliminar el producto');
        }
    },

    // Lógica de procesamiento de ventas e historial
    vender: async (req, res) => {
        try {
            const { id } = req.params;
            // Recibimos la data enriquecida (cantidad, nombre, categoría y precio)
            const { cantidad, nombre_producto, categoria_producto, precio_unitario } = req.body;

            // 1. Obtener el producto actual
            const producto = await Producto.getById(id);
        
            if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

            // 2. Verificar stock nuevamente en el servidor (por seguridad)
            if (producto.stock < cantidad) {
                return res.status(400).json({ message: "Stock insuficiente" });
            }

            // 3. Calcular nuevo stock
            const nuevoStock = producto.stock - cantidad;

            // 4. Actualizar en la DB usando el método update
            // Mantenemos la integridad de todos los campos incluyendo la categoría actual
            await Producto.update(id, {
                nombre: producto.nombre,
                categoria: producto.categoria,
                descripcion: producto.descripcion,
                precio: producto.precio,
                stock: nuevoStock
            });

            // --- REGISTRO EN HISTORIAL ---
            // Calculamos el total y guardamos la transacción detallada
            const total_venta = (precio_unitario * cantidad).toFixed(2);
            await Producto.registrarVenta({
                id_producto: id,
                nombre_producto,
                categoria_producto,
                cantidad,
                precio_unitario,
                total_venta,
                fecha: new Date()
            });

            // 5. Notificar a todos por Socket.io para que el Dashboard y la Tabla se actualicen
            if (req.app.get('socketio')) {
                req.app.get('socketio').emit('producto-actualizado');
            }

            res.status(200).json({ message: "Venta exitosa" });
        } catch (error) {
            console.error("❌ Error en venta:", error);
            res.status(500).json({ message: "Error al procesar la venta" });
        }
    },
};

module.exports = productoController;