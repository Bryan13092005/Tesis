const { pool } = require('../config/supabase');
const client = require('../config/mqttClient');

const topic = 'casa/garaje/estado';
const idGarage = '22d6391c-4d1a-4676-97ed-2bfc782ff4ef';

const topicPrincipal = 'casa/puerta/estado';
const idPuerta = 'aee70eea-9efa-4d1f-9cbe-f94c62a51758';

const escucharCodigo = '/casa/enviar/codigos';

const topics = [
    topic,
    topicPrincipal
];

client.subscribe(topics, (error) => {
    if (error) {
        console.error('Error al suscribirse:', error);
    } else {
        console.log('Suscripciones MQTT realizadas correctamente');
    }
});

client.subscribe(escucharCodigo, (error) => {
    if (error) {
        console.error('Error al suscribirse:', error);
    } else {
        console.log('Suscripción MQTT realizada para escuchar el código');
    }
});
let ultimoAcceso = null;

client.on('message', async (receivedTopic, message) => {

    // =====================================================
    // GARAJE
    // =====================================================

    if (receivedTopic === topic) {

        const estado = message.toString().trim();

        try {

            let estadoFinal;

            if (estado === 'ABIERTO') {
                estadoFinal = true;
            } else if (estado === 'CERRADO') {
                estadoFinal = false;
            } else {
                console.log(`Estado desconocido: ${estado}`);
                return;
            }

            const queryEstado = `
                UPDATE dispositivos
                SET estado = $1
                WHERE id = $2
                RETURNING *
            `;

            const respuestaEstado = await pool.query(
                queryEstado,
                [estadoFinal, idGarage]
            );

            if (respuestaEstado.rows.length === 0) {
                console.log('Error al guardar estado del garaje');
                return;
            }

            if (estado === 'ABIERTO') {

                const query = `
                    INSERT INTO historial_ingresos
                    (forma_ingreso, puerta)
                    VALUES ($1, $2)
                    RETURNING *
                `;

                await pool.query(query, ['manual', 'GARAGE']);

                console.log('Ingreso de garaje registrado');
            }

        } catch (err) {
            console.error('Error procesando garaje:', err);
        }

        return;
    }


    // =====================================================
    // CÓDIGO RFID / PIN
    // =====================================================

    if (receivedTopic === escucharCodigo) {

        const [tipo, identificador] = message
            .toString()
            .trim()
            .split('|');

        console.log(`Tipo: ${tipo}`);
        console.log(`Identificador: ${identificador}`);

        try {

            const query = `
                SELECT "nombreUsuario"
                FROM credenciales
                WHERE identificador = $1
            `;

            const respuesta = await pool.query(query, [identificador]);

            if (respuesta.rows.length === 0) {
                console.log('Sin credencial');
                return;
            }

            // Guardamos TODO el acceso como una sola unidad
            ultimoAcceso = {
                nombre: respuesta.rows[0].nombreUsuario,
                codigo: identificador,
                forma: tipo
            };

            console.log('Último acceso autorizado:', ultimoAcceso);

        } catch (err) {
            console.error('Error buscando credencial:', err);
        }

        return;
    }


    // =====================================================
    // PUERTA PRINCIPAL
    // =====================================================

    if (receivedTopic === topicPrincipal) {

        const estado = message.toString().trim();

        try {

            let estadoFinal;

            if (estado === 'ABIERTO') {
                estadoFinal = true;
            } else if (estado === 'CERRADO') {
                estadoFinal = false;
            } else {
                console.log(`Estado desconocido: ${estado}`);
                return;
            }

            const queryEstado = `
                UPDATE dispositivos
                SET estado = $1
                WHERE id = $2
                RETURNING *
            `;

            const respuestaEstado = await pool.query(
                queryEstado,
                [estadoFinal, idPuerta]
            );

            if (respuestaEstado.rows.length === 0) {
                console.log('Error al actualizar puerta principal');
                return;
            }

            console.log(`Estado puerta principal: ${estado}`);

            // =============================================
            // REGISTRAR INGRESO
            // =============================================

            if (estado === 'ABIERTO') {

                if (!ultimoAcceso) {
                    console.log(
                        'La puerta se abrió pero no existe un acceso autorizado previo'
                    );
                    return;
                }

                const query = `
                    INSERT INTO historial_ingresos
                    (nombre, forma_ingreso, identificador, puerta)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `;

                const valores = [
                    ultimoAcceso.nombre,
                    ultimoAcceso.forma,
                    ultimoAcceso.codigo,
                    'PRINCIPAL'
                ];

                await pool.query(query, valores);

                console.log('Ingreso registrado correctamente');

                // =============================================
                // LIMPIAR EL ÚLTIMO ACCESO
                // =============================================

                ultimoAcceso = null;

                console.log('Último acceso limpiado');
            }

        } catch (err) {
            console.error(
                'Error procesando puerta principal:',
                err
            );
        }

        return;
    }
});