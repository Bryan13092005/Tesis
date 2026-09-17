const express = require('express');
const router = express.Router();

const {verificarAuth,autorizarRol,accionesPermitidas} =require('../middleware/auth.js');

const {cambiarLuz,abrirCerrarGarageAutomatico}=require('../controllers/Acciones/casa.controller.js');

router.put('/cambiarLuz',verificarAuth,accionesPermitidas('controlLuces'),cambiarLuz);
router.put('/abrirGarage',verificarAuth,accionesPermitidas('garage'),abrirCerrarGarageAutomatico);

module.exports = router;