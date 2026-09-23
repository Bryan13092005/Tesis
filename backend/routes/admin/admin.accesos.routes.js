const express = require('express');
const router = express.Router();
const {
    agregarAcceso,
    obtenerAccesos,
    cambiarEstadoAcceso,
    eliminarAcceso,
    actualizarNumeroIntentos
} =require('../../controllers/Admin/adminAccesos.controller.js');

const {verificarAuth,autorizarRol} =require('../../middleware/auth.js');

router.post('/agregarAcceso',verificarAuth,autorizarRol('admin'),agregarAcceso);
router.get('/obtenerAccesos',verificarAuth,autorizarRol('admin'),obtenerAccesos);
router.put('/cambiarEstadoAcceso/:id',verificarAuth,autorizarRol('admin'),cambiarEstadoAcceso);
router.delete('/eliminarAcceso/:id',verificarAuth,autorizarRol('admin'),eliminarAcceso);
router.put('/actualizarIntentos/:id',verificarAuth,autorizarRol('admin'),actualizarNumeroIntentos);


module.exports = router;