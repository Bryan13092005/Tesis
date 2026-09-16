const mqtt = require('mqtt');

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    port: Number(process.env.MQTT_PORT),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    protocol: 'mqtts'
});

client.on('connect', () => {

    console.log('Backend conectado a MQTT');

    client.subscribe([
        'casa/garaje/estado',
        'casa/garaje/humedad',
        'casa/garaje/temperatura',
        'casa/garaje/humedad_ambiente',
        'casa/garaje/gas',
        'casa/garaje/estado_gas',
        'casa/puerta/estado',
        'casa/seguridad'
    ], (error) => {

        if (error) {
            console.error('Error al suscribirse:', error);
            return;
        }

        console.log('Backend suscrito a los topics de garage');
    });

    client.subscribe([
        'casa/luz/baño/estado',
        'casa/luz/cocina/estado',
        'casa/luz/sala/estado',
        'casa/luz/dormitorio/estado',
        'casa/luz/pasillo/estado',
        'casa/acceso'
    ], (error) => {

        if (error) {
            console.error('Error al suscribirse:', error);
            return;
        }

        console.log('Backend suscrito a los topics de casa');
    });
});

client.on('error', (error) => {
    console.error('Error MQTT:', error);
});

module.exports = client;