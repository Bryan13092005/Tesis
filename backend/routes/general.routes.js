const express = require('express');
const router = express.Router();

const {verificarAuth,autorizarRol,accionesPermitidas} =require('../middleware/auth.js');

const {cambiarLuz,abrirCerrarGarageAutomatico,enviarUltimoDatoSensores,controlPuertaPrincipal,modoSeguro,estadoModoSeguro}=require('../controllers/Acciones/casa.controller.js');
const {historialIngresos,historialLuces,historialSensores,historialAcciones}=require('../controllers/Acciones/historiales.controller.js')

router.put('/cambiarLuz',verificarAuth,accionesPermitidas('controlLuces'),cambiarLuz);
router.put('/abrirGarage',verificarAuth,accionesPermitidas('garage'),abrirCerrarGarageAutomatico);
router.get('/datosSensores',verificarAuth,accionesPermitidas('sensores'), enviarUltimoDatoSensores);
router.put('/abrirPuerta',verificarAuth,accionesPermitidas('puertaPrincipal'),controlPuertaPrincipal);
router.get('/modoSeguro',verificarAuth,estadoModoSeguro);
router.post('/modoSeguro',verificarAuth,accionesPermitidas('activarBloqueo'),modoSeguro);

router.get('/historial/ingresos',verificarAuth,accionesPermitidas('ingresosH'),historialIngresos);
router.get('/historial/luces',verificarAuth,accionesPermitidas('lucesH'),historialLuces);
router.get('/historial/sensores',verificarAuth,accionesPermitidas('sensoresH'),historialSensores);
router.get('/historial/acciones',verificarAuth,accionesPermitidas('seguroH'),historialAcciones);

module.exports = router;