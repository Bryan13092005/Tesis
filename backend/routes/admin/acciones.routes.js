const express = require('express');
const router = express.Router();
const {actualizarPerfil}=require('../../controllers/auth.controller.js');
const {verificarAuth,autorizarRol} =require('../../middleware/auth.js');

router.put('/actualizar',verificarAuth,autorizarRol('admin'),actualizarPerfil);

module.exports = router;