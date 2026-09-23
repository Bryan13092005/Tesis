const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);
const { initializeWebsocket } = require('./service/websocket.service');

initializeWebsocket(server);

require('./config/mqttClient');
require('./service/sensores.service');
require('./service/historialSensores.service');
require('./service/luces.service.js');
require('./service/escucharCodigos.service.js');
require('./service/historial_Ingresos.service.js');

const { escucharInicio } = require('./service/escucharInicio.service.js');

escucharInicio();

const authRoutes = require('./routes/auth.routes.js');
const adminUserRoutes=require('./routes/admin/admin.users.routes.js');
const adminAccesosRoutes=require('./routes/admin/admin.accesos.routes.js');
const accionesRoutes=require('./routes/general.routes.js');
const clientesRoutes=require('./routes/users/clientes.routes.js');

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ mensaje: '¡Servidor Express funcionando correctamente!' });
});

app.use('/api', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/accesos', adminAccesosRoutes);
app.use('/api/acciones', accionesRoutes);
app.use('/api/clientes', clientesRoutes);


server.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en: http://localhost:${PORT}`);
});


module.exports = app;