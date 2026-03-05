var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

// Importamos los modelos
const ProductosModel = require('./models/ProductoModel');
const VentaModel = require('./models/VentaModel');

// Rutas
var usersRouter = require('./routes/users');
var productosRouter = require('./routes/productosRoutes'); 

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * MIDDLEWARE DE INICIALIZACIÓN
 * En entornos Serverless, a veces es mejor inicializar bajo demanda
 * o dejar que el Pool de conexiones lo maneje.
 */
let dbInitialized = false;
app.use(async (req, res, next) => {
    if (!dbInitialized) {
        try {
            // Solo logueamos en desarrollo para no ensuciar los logs de Vercel
            if (process.env.NODE_ENV !== 'production') {
                console.log("⏳ Verificando tablas en TiDB...");
            }
            await ProductosModel.init();
            await VentaModel.init();
            dbInitialized = true;
        } catch (error) {
            console.error("❌ Error en DB:", error.message);
        }
    }
    next();
});

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