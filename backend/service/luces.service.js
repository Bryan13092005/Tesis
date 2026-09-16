const client = require('../config/mqttClient');
const { pool } = require('../config/supabase');

const tableName = '"dispositivos"';

const idSala='adaceb18-dc63-4d5f-936b-3433d90563d1';
const idCocina='a68f2d16-aa6c-48a2-8e6e-7bacf2b9383a';
const idDormitorio='1657eadf-bb4b-48b4-8593-468cea08ccdd';
const idBano='79ded62b-55b0-4d69-a435-de6951db09ea';
const idPasillo='34e68874-95f5-4aff-ac96-125cec25a4c3';

let estadosActuales = {
    sala: null,
    cocina: null,
    dormitorio: null,
    bano: null,
    pasillo: null
};
// ESCUCHAR MENSAJES DE LOS SENSORES

const topicEstadoLuzBaño       = "casa/luz/baño/estado";
const topicEstadoLuzDormitorio = "casa/luz/dormitorio/estado";
const topicEstadoLuzSala       = "casa/luz/sala/estado";
const topicEstadoLuzCocina     = "casa/luz/cocina/estado";
const topicEstadoLuzPasillo    = "casa/luz/pasillo/estado";


client.on('message', async (topic, message) => {

    const valor = message.toString();

    try {

        switch (topic) {

            case topicEstadoLuzBaño:
                if (Number(valor) === 1) {
                estadosActuales.bano = TRUE;
                } else {
                estadosActuales.bano = FALSE;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.bano, idBano]);

                break;


            case topicEstadoLuzDormitorio:

                if (Number(valor) === 1) {
                    estadosActuales.dormitorio = TRUE;
                } else {
                    estadosActuales.dormitorio = FALSE;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.dormitorio, idDormitorio]);

                break;


            case topicEstadoLuzSala:

                if (Number(valor) === 1) {
                    estadosActuales.sala = TRUE;
                } else {
                    estadosActuales.sala = FALSE;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.sala, idSala]);

                break;

            case topicEstadoLuzCocina:

                if (Number(valor) === 1) {
                    estadosActuales.cocina = TRUE;
                } else {
                    estadosActuales.cocina = FALSE;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.cocina, idCocina]);

                break;

            case topicEstadoLuzPasillo:

                if (Number(valor) === 1) {
                    estadosActuales.pasillo = TRUE;
                } else {
                    estadosActuales.pasillo = FALSE;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.pasillo, idPasillo]);

                break;
        }

    } catch (error) {
        console.error('Error guardando sensor:', error);
    }
});