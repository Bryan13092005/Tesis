const express = require('express');
const router = express.Router();

const {verificarAuth,autorizarRol,accionesPermitidas} =require('../middleware/auth.js');

const {cambiarLuz}=require('../controllers/Acciones/casa.controller.js');

router.put('/cambiarLuz',verificarAuth,accionesPermitidas('controlLuces'),cambiarLuz);

module.exports = router;