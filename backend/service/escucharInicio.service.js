const { publicarMQTT } = require('./publicarMQTT.service');
const { pool } = require('../config/supabase');

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const topicAccesosCodigos = '/accesos/codigos';
const topicAccesosRFID = '/accesos/RFID';

function escucharInicio() {
    const topic = '/casa/principal/estado';
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

        const mensaje = message.toString();

        console.log(
            `Mensaje recibido en el topic ${topic}: ${mensaje}`
        );

        if (mensaje !== 'INICIADO') {
            return;
        }

        try {

            const query = `
                SELECT tipo, identificador, activo
                FROM credenciales
                WHERE "usosPermitidos" > 0
                OR "usosPermitidos" IS NULL
            `;

            const respuesta = await pool.query(query);

            if (respuesta.rows.length === 0) {
                console.log('No hay credenciales');
                return;
            }

            console.log(
                `Se encontraron ${respuesta.rows.length} credenciales`
            );

            for (const credencial of respuesta.rows) {

                const tipo = credencial.tipo;
                const valor = credencial.identificador;
                const activo = credencial.activo;

                // =========================
                // RFID ACTIVO
                // =========================

                if (tipo === 'rfid' && activo === true) {

                    publicarMQTT(
                        topicAccesosRFID,
                        `AGREGAR|${valor}`
                    );

                    console.log(`RFID agregado: ${valor}`);

                    await esperar(500);
                }

                // =========================
                // RFID BLOQUEADO
                // =========================

                if (tipo === 'rfid' && activo === false) {

                    publicarMQTT(
                        topicAccesosRFID,
                        `AGREGAR|${valor}`
                    );

                    await esperar(500);

                    publicarMQTT(
                        topicAccesosRFID,
                        `BLOQUEAR|${valor}`
                    );

                    console.log(`RFID bloqueado: ${valor}`);

                    await esperar(500);
                }

                // =========================
                // PIN ACTIVO
                // =========================

                if (tipo === 'pin' && activo === true) {

                    publicarMQTT(
                        topicAccesosCodigos,
                        `AGREGAR|${valor}`
                    );

                    console.log(`PIN agregado: ${valor}`);

                    await esperar(500);
                }

                // =========================
                // PIN BLOQUEADO
                // =========================

                if (tipo === 'pin' && activo === false) {

                    publicarMQTT(
                        topicAccesosCodigos,
                        `AGREGAR|${valor}`
                    );

                    await esperar(500);

                    publicarMQTT(
                        topicAccesosCodigos,
                        `BLOQUEAR|${valor}`
                    );

                    console.log(`PIN bloqueado: ${valor}`);

                    await esperar(500);
                }
            }

            console.log('Sincronización de accesos terminada');

        } catch (error) {

            console.error(
                'Error al sincronizar los accesos:',
                error
            );

        }
    });
}

module.exports = { escucharInicio };