const client = require('../config/mqttClient');
const { pool } = require('../config/supabase');

const tableName = '"valorActual_sensores"';

let sensoresActuales = {
    temperatura: null,
    humedad: null,
    gas: null,
    humedad_planta: null
};
// ESCUCHAR MENSAJES DE LOS SENSORES

client.on('message', async (topic, message) => {

    const valor = message.toString();

    try {

        switch (topic) {

            case 'casa/garaje/temperatura':

                sensoresActuales.temperatura = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET temperatura = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);

                break;


            case 'casa/garaje/humedad_ambiente':

                sensoresActuales.humedad = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET humedad = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);

                break;


            case 'casa/garaje/gas':

                sensoresActuales.gas = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET gas = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);

                break;


            case 'casa/garaje/humedad':

                sensoresActuales.humedad_planta = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET humedad_planta = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);

                break;
        }

    } catch (error) {
        console.error('Error guardando sensor:', error);
    }
});

module.exports = {
    sensoresActuales
};