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
    console.log(`Mensaje recibido en el topic ${topic}: ${message.toString()}`);
    const valor = message.toString();

    try {

        switch (topic) {

            case topicEstadoLuzBaño:
                if (valor === 'ON') {
                estadosActuales.bano = true;
                } else {
                estadosActuales.bano = false;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.bano, idBano]);

                break;


            case topicEstadoLuzDormitorio:

                if (valor === 'ON') {
                    estadosActuales.dormitorio = true;
                } else {
                    estadosActuales.dormitorio = false;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.dormitorio, idDormitorio]);

                break;


            case topicEstadoLuzSala:

                if (valor === 'ON') {
                    estadosActuales.sala = true;
                } else {
                    estadosActuales.sala = false;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.sala, idSala]);

                break;

            case topicEstadoLuzCocina:

                if (valor === 'ON') {
                    estadosActuales.cocina = true;
                } else {
                    estadosActuales.cocina = false;
                }
                await pool.query(`
                    UPDATE ${tableName}
                    SET estado = $1 WHERE id = $2
                `, [estadosActuales.cocina, idCocina]);

                break;

            case topicEstadoLuzPasillo:

                if (valor === 'ON') {
                    estadosActuales.pasillo = true;
                } else {
                    estadosActuales.pasillo = false;
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