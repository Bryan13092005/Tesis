const client = require('../config/mqttClient');

function publicarMQTT(topic, mensaje) {

    client.publish(topic, mensaje, (error) => {

        if (error) {
            console.error('Error al publicar en MQTT:', error);
        }

    });
}

module.exports = { publicarMQTT };