const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
require('./config/mqttClient');
require('./service/sensores.service');
require('./service/historialSensores.service');

const authRoutes = require('./routes/users/auth.routes.js');
const accionesRoutes=require('./routes/admin/acciones.routes.js');
const clientesRoutes=require('./routes/users/clientes.routes.js');

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: '¡Servidor Express funcionando correctamente!' });
});

app.use('/api/auth', authRoutes);
//app.use('/api/productos', accionesRoutes);
//app.use('/api/clientes', clientesRoutes);


app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en: http://localhost:${PORT}`);
});


module.exports = app;