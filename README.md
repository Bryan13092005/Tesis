# Casa en calma

Sistema domótico para supervisar y controlar una vivienda desde una interfaz web. La aplicación integra sensores, luces, accesos, garaje, puerta principal y modo seguro, con autenticación, permisos por usuario y administración centralizada.

> Proyecto de tesis: automatización residencial con ESP32, MQTT, PostgreSQL/Supabase, Node.js y React.

## Índice

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Estructura](#estructura)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Funcionalidades](#funcionalidades)
- [API principal](#api-principal)
- [Permisos](#permisos)
- [MQTT](#mqtt)
- [Tiempo real](#tiempo-real)
- [Validaciones de seguridad](#validaciones-de-seguridad)
- [Comprobaciones](#comprobaciones)
- [Notas de mantenimiento](#notas-de-mantenimiento)

## Descripción

Casa en calma permite que usuarios autenticados consulten el estado de su hogar y ejecuten acciones únicamente cuando cuentan con los permisos correspondientes.

El sistema contempla dos perfiles principales:

- **Administrador:** gestiona usuarios, permisos, credenciales de acceso e información general del sistema.
- **Usuario normal:** accede a su perfil y a los módulos habilitados por sus permisos.

La interfaz incluye modo oscuro y modo claro, validación de sesión contra el backend, bloqueo de usuarios, monitoreo de sensores y controles condicionados por la disponibilidad del sistema.

## Arquitectura

```mermaid
flowchart LR
    ESP[ESP32] -->|MQTT| MQTT[Broker MQTT]
    MQTT --> CLIENT[Cliente MQTT único]
    CLIENT --> SERVICES[Servicios Node.js]
    SERVICES --> DB[(PostgreSQL / Supabase)]
    SERVICES --> API[API REST Express]
    API --> FRONT[Frontend React]
    FRONT --> API
    FRONT -.->|Socket.IO, cuando el servidor está inicializado| WS[Eventos en tiempo real]
    SERVICES -.-> WS
```

### Flujo de datos

1. Los ESP32 publican lecturas y estados en el broker MQTT.
2. El backend utiliza el cliente definido en `backend/config/mqttClient.js`.
3. Los servicios MQTT persisten lecturas y eventos en PostgreSQL/Supabase.
4. Express expone las consultas y acciones mediante REST.
5. React consulta datos iniciales y muestra las vistas según el rol y los permisos.
6. Los controles no se habilitan si el sistema no tiene lecturas recientes válidas.

## Estructura

```text
Tesis/
├── backend/
│   ├── config/              # PostgreSQL, Supabase y cliente MQTT
│   ├── controllers/         # Lógica de autenticación, usuarios y acciones
│   ├── middleware/           # Autenticación, roles y disponibilidad del sistema
│   ├── routes/               # Rutas Express agrupadas por módulo
│   ├── service/              # Lectores MQTT, persistencia y lógica de eventos
│   ├── index.js              # Entrada del servidor Express
│   └── package.json
├── frontend/
│   ├── src/components/       # Paneles de usuarios, accesos, controles y sensores
│   ├── src/context/          # Autenticación y tema visual
│   ├── src/pages/            # Login y dashboard
│   ├── src/services/         # Axios, Supabase y cliente Socket.IO
│   └── package.json
└── README.md
```

## Tecnologías

### Backend

- Node.js
- Express 5
- CommonJS
- PostgreSQL mediante `pg`
- Supabase Auth y Supabase Admin
- MQTT mediante `mqtt`
- CORS y `dotenv`

### Frontend

- React 19
- Vite
- React Router
- Axios
- Supabase Auth
- Lucide React
- Socket.IO Client

## Requisitos

- Node.js 18 o superior.
- npm.
- PostgreSQL o Supabase configurado.
- Broker MQTT compatible con MQTT sobre TLS.
- Variables de entorno configuradas para backend y frontend.

## Configuración

### Backend

Crear `backend/.env` con valores equivalentes a los siguientes:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@host:5432/base_de_datos

SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role

MQTT_BROKER_URL=tu-broker-mqtt
MQTT_PORT=8883
MQTT_USERNAME=tu-usuario-mqtt
MQTT_PASSWORD=tu-contraseña-mqtt
```

La clave `SUPABASE_SERVICE_ROLE_KEY` solo debe existir en el backend. Nunca debe exponerse en el frontend ni incluirse en el repositorio.

### Frontend

Crear `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

Las variables `VITE_*` son públicas dentro del bundle del navegador. No colocar secretos administrativos allí.

## Ejecución

Instalar dependencias por proyecto:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Iniciar el backend:

```bash
cd backend
node index.js
```

Iniciar el frontend en otra terminal:

```bash
cd frontend
npm run dev
```

La aplicación frontend normalmente estará disponible en:

```text
http://localhost:5173
```

El backend estará disponible en:

```text
http://localhost:3000
```

### Nota sobre los scripts del backend

El punto de entrada actual es `backend/index.js`. Antes de usar `npm run dev` o `npm start`, verifica que los scripts de `backend/package.json` apunten a ese archivo y no a un `server.js` inexistente.

## Funcionalidades

### Autenticación y sesión

- Inicio de sesión mediante Supabase Auth.
- Validación del token contra `GET /api/clientes/perfil`.
- Redirección al login cuando la sesión es inválida.
- Mensaje específico para usuarios bloqueados.
- Revalidación periódica de sesiones.
- Protección de rutas y endpoints mediante Bearer Token.

### Perfil de usuario

Los usuarios normales pueden consultar y actualizar:

- Nombre.
- Apellido.
- Correo electrónico.
- Contraseña, únicamente si escriben una nueva.
- Rol de lectura.

La contraseña nunca se carga ni se muestra en el frontend.

### Dashboard

- Estado online/offline del sistema.
- Lecturas recientes de sensores.
- Panel de controles condicionado por permisos.
- Historiales filtrables por fechas.
- Selector de tema oscuro/claro.

### Administración

Los administradores pueden:

- Crear usuarios.
- Editar nombre, apellido, correo y contraseña.
- Cambiar permisos.
- Activar o bloquear usuarios.
- Eliminar usuarios.
- Crear credenciales PIN y RFID.
- Activar o desactivar credenciales.
- Actualizar usos permitidos.
- Eliminar credenciales.

Los metadatos de Supabase se mantienen sincronizados con el UUID del usuario.

## API principal

La base URL del backend es `/api`.

### Perfil y autenticación

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/clientes/perfil` | Obtener el perfil autenticado |
| `PUT` | `/api/actualizar` | Actualizar nombre, apellido, email o contraseña |

### Acciones del hogar

Todas requieren autenticación y el permiso específico indicado.

| Método | Ruta | Permiso |
|---|---|---|
| `PUT` | `/api/acciones/cambiarLuz` | `controlLuces` |
| `PUT` | `/api/acciones/abrirGarage` | `garage` |
| `GET` | `/api/acciones/datosSensores` | `sensores` |
| `PUT` | `/api/acciones/abrirPuerta` | `puertaPrincipal` |
| `POST` | `/api/acciones/modoSeguro` | `activarBloqueo` |

Ejemplos de payload:

```json
{
  "habitacion": "cocina",
  "estado": true
}
```

```json
{
  "accion": "ABRIR"
}
```

```json
{
  "accion": "ON"
}
```

### Historiales

| Método | Ruta | Permiso |
|---|---|---|
| `GET` | `/api/acciones/historial/ingresos` | `ingresosH` |
| `GET` | `/api/acciones/historial/luces` | `lucesH` |
| `GET` | `/api/acciones/historial/sensores` | `sensoresH` |
| `GET` | `/api/acciones/historial/acciones` | `seguroH` |

Filtros disponibles:

```text
?fechaInicio=2026-01-01&fechaFin=2026-01-31
```

### Administración de usuarios

| Método | Ruta |
|---|---|
| `GET` | `/api/admin/users/verUsuarios` |
| `POST` | `/api/admin/users/crearUsuario` |
| `PUT` | `/api/admin/users/actualizarPerfilUsuario/:id` |
| `PUT` | `/api/admin/users/cambiarEstadoUsuario/:id` |
| `PUT` | `/api/admin/users/cambiarPermisosUsuario/:id` |
| `PUT` | `/api/admin/users/cambiarClaveUsuario/:id` |
| `DELETE` | `/api/admin/users/eliminarUsuarios/:id` |
| `DELETE` | `/api/admin/users/eliminarMiUsuario` |

Todas estas rutas requieren autenticación y rol administrativo.

### Administración de accesos

| Método | Ruta |
|---|---|
| `GET` | `/api/admin/accesos/obtenerAccesos` |
| `POST` | `/api/admin/accesos/agregarAcceso` |
| `PUT` | `/api/admin/accesos/cambiarEstadoAcceso/:id` |
| `PUT` | `/api/admin/accesos/actualizarIntentos/:id` |
| `DELETE` | `/api/admin/accesos/eliminarAcceso/:id` |

## Permisos

Los permisos se almacenan en `perfiles.permisosAcceso` y se evalúan en el backend mediante `accionesPermitidas`.

| Permiso | Capacidad |
|---|---|
| `controlLuces` | Encender y apagar luces |
| `garage` | Abrir garaje |
| `puertaPrincipal` | Abrir puerta principal |
| `activarBloqueo` | Activar o desactivar modo seguro |
| `sensores` | Consultar sensores |
| `ingresosH` | Ver historial de ingresos |
| `lucesH` | Ver historial de luces |
| `sensoresH` | Ver historial de sensores |
| `seguroH` | Ver historial de acciones |
| `ALL` | Acceso total |

La interfaz oculta controles no autorizados, pero la seguridad real se aplica en el backend.

## MQTT

El cliente MQTT único se encuentra en `backend/config/mqttClient.js`.

### Topics de sensores

```text
casa/garaje/temperatura
casa/garaje/humedad_ambiente
casa/garaje/humedad
casa/garaje/gas
casa/garaje/estado_gas
```

### Topics de luces

```text
casa/luz/baño/estado
casa/luz/cocina/estado
casa/luz/sala/estado
casa/luz/dormitorio/estado
casa/luz/pasillo/estado
```

### Topics de puerta, garaje y accesos

```text
casa/puerta/estado
casa/garaje/estado
/casa/enviar/codigos
```

Los servicios existentes procesan estos mensajes y actualizan PostgreSQL o Supabase según corresponda.

## Tiempo real

El frontend contiene un cliente Socket.IO en `frontend/src/services/socket.js` y paneles preparados para recibir actualizaciones en tiempo real.

Eventos contemplados:

```text
sensorActualizado
luzActualizada
puertaActualizada
garajeActualizado
accesoRegistrado
accesoDenegado
```

Antes de probarlos, confirma que el backend tenga instalado `socket.io`, que `index.js` cree un servidor HTTP compatible y que inicialice el servicio Socket.IO. El cliente utiliza `VITE_API_URL` y elimina el sufijo `/api` para calcular el origen del WebSocket.

## Validaciones de seguridad

- No se permite acceder al dashboard sin sesión válida.
- Los usuarios bloqueados reciben `403` y son enviados al login.
- Los endpoints protegidos validan el Bearer Token.
- Los endpoints administrativos validan el rol.
- Las acciones validan permisos individuales.
- Los controles del hogar requieren datos de sensores recientes y válidos.
- Las contraseñas no se muestran ni se cargan en el frontend.
- Las credenciales administrativas de Supabase permanecen en el backend.

## Comprobaciones

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
node --check backend/index.js
node --check backend/controllers/Acciones/casa.controller.js
node --check backend/middleware/auth.js
```

Prueba rápida del backend:

```bash
curl http://localhost:3000/
```

Respuesta esperada:

```json
{
  "mensaje": "¡Servidor Express funcionando correctamente!"
}
```

## Notas de mantenimiento

- No crear un segundo cliente MQTT: reutilizar `backend/config/mqttClient.js`.
- No publicar comandos MQTT desde React; el frontend debe usar REST.
- Mantener REST para consultas iniciales, CRUD e historiales.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` ni credenciales MQTT en el frontend.
- Al cambiar un endpoint, actualizar también su referencia en `frontend/src/services/api.js` o en el componente consumidor.
- Mantener sincronizados los nombres de permisos entre frontend y middleware backend.

## Licencia

Proyecto académico para fines de tesis. La licencia definitiva puede añadirse cuando se establezcan las condiciones de distribución.
