const client = require('../config/mqttClient');
const { pool } = require('../config/supabase');
const { emitWebsocketEvent } = require('./websocket.service');

const tableName = '"valorActual_sensores"';

let sensoresActuales = {
    temperatura: null,
    humedad: null,
    gas: null,
    humedad_planta: null,
    estado_gas:null
};
// ESCUCHAR MENSAJES DE LOS SENSORES
const topicoEstadoGas = "casa/garaje/estado_gas";

client.subscribe(topicoEstadoGas, (error) => {

    if (error) {
        console.error('Error al suscribirse al topic:', error);
    } else {
        console.log(`Suscrito al topic: ${topicoEstadoGas}`);
    }

});

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
                emitWebsocketEvent('sensorActualizado', { sensor: 'temperatura', valor: Number(valor) });

                break;


            case 'casa/garaje/humedad_ambiente':

                sensoresActuales.humedad = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET humedad = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);
                emitWebsocketEvent('sensorActualizado', { sensor: 'humedad_ambiente', valor: Number(valor) });

                break;


            case 'casa/garaje/gas':

                sensoresActuales.gas = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET gas = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);
                emitWebsocketEvent('sensorActualizado', { sensor: 'gas', valor: Number(valor) });

                break;


            case 'casa/garaje/humedad':

                sensoresActuales.humedad_planta = Number(valor);
                await pool.query(`
                    UPDATE ${tableName}
                    SET humedad_planta = $1,
                        fecha_hora = NOW()
                `, [Number(valor)]);
                emitWebsocketEvent('sensorActualizado', { sensor: 'humedad_suelo', valor: Number(valor) });

                break;
            case topicoEstadoGas:

                const estado = message.toString();
                if(estado==='ALERTA' || estado==='NORMAL'){
                    sensoresActuales.estado_gas=estado;
                    await pool.query(`UPDATE ${tableName} set estado_gas=$1,fecha_hora=NOW()`,[estado]);
                    emitWebsocketEvent('sensorActualizado', { sensor: 'estado_gas', valor: estado });
                }
        }

    } catch (error) {
        console.error('Error guardando sensor:', error);
    }
});

module.exports = {
    sensoresActuales
};