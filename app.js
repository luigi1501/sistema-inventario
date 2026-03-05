var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

// Importamos los modelos para la inicialización controlada
const ProductosModel = require('./models/ProductoModel');
const VentaModel = require('./models/VentaModel');

// Rutas
var usersRouter = require('./routes/users');
var productosRouter = require('./routes/productosRoutes'); 

var app = express();

/**
 * INICIALIZACIÓN DE LA BASE DE DATOS (TiDB Cloud)
 * Usamos una función async para respetar el orden de las tablas
 */
async function initDatabase() {
  try {
    console.log("⏳ Conectando con TiDB en Virginia...");
    
    // Primero inicializamos Productos (Tabla Maestra)
    await ProductosModel.init();
    
    // Luego inicializamos Ventas (Tabla dependiente con Foreign Key)
    await VentaModel.init();
    
    console.log("🚀 Sistema de base de datos sincronizado correctamente.");
  } catch (error) {
    console.error("❌ Error crítico al sincronizar con TiDB:", error.message);
  }
}

// Ejecutamos la inicialización
initDatabase();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Definición de Rutas
app.use('/', productosRouter); 
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;