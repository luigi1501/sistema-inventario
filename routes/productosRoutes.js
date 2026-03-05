const express = require('express');
const router = express.Router();

// --- IMPORTACIÓN DE CONTROLADORES ---
const productoController = require('../controllers/productoController');
const ventaController = require('../controllers/ventaController');

// --- RUTAS DE INVENTARIO (PRODUCTOS) ---

// Listado principal y dashboard
router.get('/', productoController.listar);

// Formulario de edición (Vista)
router.get('/editar/:id', productoController.mostrarEditar);

// Eliminar producto
router.get('/eliminar/:id', productoController.eliminar);

// Registrar nuevo producto
router.post('/nuevo', productoController.guardar);

// Actualizar producto existente
router.post('/editar/:id', productoController.actualizar);


// --- RUTAS DE VENTAS (HISTORIAL Y ACCIÓN) ---

// Procesar la venta de un producto (Descontar stock y registrar)
router.post('/vender/:id', ventaController.procesarVenta);

// Mostrar la vista del historial de ventas con el gráfico
router.get('/historial', ventaController.verHistorial);

module.exports = router;