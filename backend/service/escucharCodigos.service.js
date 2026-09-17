const { pool } = require('../config/supabase');
const { publicarMQTT } = require('../service/publicarMQTT.service');

const topicAccesosCodigos = '/accesos/codigos';
const topicAccesosRFID = '/accesos/RFID';
const topic = '/casa/enviar/codigos';

const client = require('../config/mqttClient');

client.subscribe(topic, (error) => {

    if (error) {
        console.error('Error al suscribirse al topic:', error);
    } else {
        console.log(`Suscrito al topic: ${topic}`);
    }

});

client.on('message', async (receivedTopic, message) => {

    if (receivedTopic !== topic) {
        return;
    }

    const [tipo, identificador] = message.toString().split('|');

    console.log(`Tipo: ${tipo}`);
    console.log(`Identificador: ${identificador}`);

    try {

        const query = `
            SELECT id, "usosPermitidos"
            FROM credenciales
            WHERE tipo = $1
            AND identificador = $2
        `;

        const valores = [tipo, identificador];

        const respuesta = await pool.query(query, valores);

        if (respuesta.rows.length === 0) {
            console.log('Credencial no disponible o inactiva');
            return;
        }

        let usos = respuesta.rows[0].usosPermitidos;
        const id = respuesta.rows[0].id;

        // ==========================================
        // USOS ILIMITADOS
        // ==========================================

        if (usos === null) {
            console.log("CREDENCIAL CON USOS ILIMITADOS");
            return;
        }

        // ==========================================
        // SIN USOS
        // ==========================================

        if (usos <= 0) {
            console.log("CREDENCIAL SIN USOS DISPONIBLES");
            return;
        }

        // ==========================================
        // DESCONTAR USO
        // ==========================================

        usos -= 1;

        console.log("Uso disminuido");
        console.log(`Usos restantes: ${usos}`);

        // ==========================================
        // ACTUALIZAR CREDENCIAL
        // ==========================================

        const activo = usos > 0;

        const queryActualizar = `
            UPDATE credenciales
            SET 
                "usosPermitidos" = $1,
                activo = $2
            WHERE id = $3
        `;

        const valoresActualizar = [
            usos,
            activo,
            id
        ];

        const respuestaActualizacion =
            await pool.query(
                queryActualizar,
                valoresActualizar
            );

        if (respuestaActualizacion.rowCount === 0) {
            console.log("ERROR AL ACTUALIZAR VALOR");
            return;
        }

        console.log("ACTUALIZACIÓN EXITOSA");

        // ==========================================
        // LLEGÓ A CERO
        // ==========================================

        if (usos === 0) {

            const topicBloqueo =
                tipo === 'rfid'
                    ? topicAccesosRFID
                    : topicAccesosCodigos;

            publicarMQTT(
                topicBloqueo,
                `BLOQUEAR|${identificador}`
            );

            console.log(
                "USUARIO SIN INTENTOS, BLOQUEADO"
            );
        }

    } catch (err) {

        console.error(
            "Error al procesar la credencial:",
            err
        );
    }

});