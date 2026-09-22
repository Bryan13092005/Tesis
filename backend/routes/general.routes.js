const express = require('express');
const router = express.Router();

const {verificarAuth,autorizarRol,accionesPermitidas} =require('../middleware/auth.js');

const {cambiarLuz,abrirCerrarGarageAutomatico,enviarUltimoDatoSensores}=require('../controllers/Acciones/casa.controller.js');
const {historialIngresos,historialLuces,historialSensores}=require('../controllers/Acciones/historiales.controller.js')

router.put('/cambiarLuz',verificarAuth,accionesPermitidas('controlLuces'),cambiarLuz);
router.put('/abrirGarage',verificarAuth,accionesPermitidas('garage'),abrirCerrarGarageAutomatico);
router.get('/datosSensores',verificarAuth,accionesPermitidas('sensores'), enviarUltimoDatoSensores);

router.get('/historial/ingresos',verificarAuth,accionesPermitidas('ingresosH'),historialIngresos)
router.get('/historial/luces',verificarAuth,accionesPermitidas('lucesH'),historialLuces)
router.get('/historial/sensores',verificarAuth,accionesPermitidas('sensoresH'),historialSensores)

module.exports = router;