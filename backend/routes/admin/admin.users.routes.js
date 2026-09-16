const express = require('express');
const router = express.Router();
const {
    verUsuarios,
    eliminarUsuario,
    eliminarMiUsuario,
    cambiarClaveUsuario,
    actualizarPerfilUsuario,
    cambiarEstadoUsuario,
    crearUsuario,
    cambiarMiClave,
    cambiarPermisosUsuario
}=require('../../controllers/Admin/adminUsers.controller.js');

const {verificarAuth,autorizarRol} =require('../../middleware/auth.js');

router.get('/verUsuarios',verificarAuth,autorizarRol('admin'),verUsuarios);
router.delete('/eliminarUsuarios/:id',verificarAuth,autorizarRol('admin'),eliminarUsuario);
router.delete('/eliminarMiUsuario',verificarAuth,autorizarRol('admin'),eliminarMiUsuario);
router.put('/cambiarClaveUsuario/:id',verificarAuth,autorizarRol('admin'),cambiarClaveUsuario);
router.put('/actualizarPerfilUsuario/:id',verificarAuth,autorizarRol('admin'),actualizarPerfilUsuario);
router.put('/cambiarEstadoUsuario/:id',verificarAuth,autorizarRol('admin'),cambiarEstadoUsuario);
router.post('/crearUsuario',verificarAuth,autorizarRol('admin'),crearUsuario);
router.put('/cambiarMiClave',verificarAuth,autorizarRol('admin'),cambiarMiClave);
router.put('/cambiarPermisosUsuario/:id',verificarAuth,autorizarRol('admin'),cambiarPermisosUsuario);

module.exports = router;