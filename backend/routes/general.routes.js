const express = require('express');
const router = express.Router();

const {verificarAuth,autorizarRol,accionesPermitidas} =require('../middleware/auth.js');
const verificarSistemaOnline = require('../middleware/sistemaOnline.js');
const verificarModoSeguroActivo = require('../middleware/modoSeguroActivo.js');

const {cambiarLuz,abrirCerrarGarageAutomatico,enviarUltimoDatoSensores,controlPuertaPrincipal,modoSeguro,obtenerEstadoLuces,obtenerEstadoModoSeguro}=require('../controllers/Acciones/casa.controller.js');
const {historialIngresos,historialLuces,historialSensores,historialAcciones}=require('../controllers/Acciones/historiales.controller.js')

router.put('/cambiarLuz',verificarAuth,accionesPermitidas('controlLuces'),verificarSistemaOnline,cambiarLuz);
router.get('/estadoLuces',verificarAuth,accionesPermitidas('controlLuces'),obtenerEstadoLuces);
router.put('/abrirGarage',verificarAuth,accionesPermitidas('garage'),verificarSistemaOnline,verificarModoSeguroActivo,abrirCerrarGarageAutomatico);
router.get('/datosSensores',verificarAuth,accionesPermitidas('sensores'), enviarUltimoDatoSensores);
router.put('/abrirPuerta',verificarAuth,accionesPermitidas('puertaPrincipal'),verificarSistemaOnline,verificarModoSeguroActivo,controlPuertaPrincipal);
router.post('/modoSeguro',verificarAuth,accionesPermitidas('activarBloqueo'),verificarSistemaOnline,modoSeguro);
router.get('/estadoModoSeguro',verificarAuth,obtenerEstadoModoSeguro);

router.get('/historial/ingresos',verificarAuth,accionesPermitidas('ingresosH'),historialIngresos);
router.get('/historial/luces',verificarAuth,accionesPermitidas('lucesH'),historialLuces);
router.get('/historial/sensores',verificarAuth,accionesPermitidas('sensoresH'),historialSensores);
router.get('/historial/acciones',verificarAuth,accionesPermitidas('seguroH'),historialAcciones);

module.exports = router;