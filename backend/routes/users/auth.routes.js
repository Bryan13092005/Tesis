const express = require('express');
const router = express.Router();
const {actualizarPerfil}=require('../../controllers/auth.controller.js');
const {verificarAuth} =require('../../middleware/auth.js');

router.put('/actualizar',verificarAuth,actualizarPerfil);

module.exports = router;