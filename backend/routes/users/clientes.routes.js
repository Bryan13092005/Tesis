const express = require('express');
const router = express.Router();
const {verPerfil}=require('../../controllers/User/user.controller.js');
const {verificarAuth} =require('../../middleware/auth.js');


router.get('/perfil',verificarAuth,verPerfil);

module.exports = router;