const { Server } = require('socket.io');

let io;

function initializeWebsocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });

    io.on('connection', (socket) => {
        console.log(`Cliente WebSocket conectado: ${socket.id}`);

        socket.on('disconnect', (reason) => {
            console.log(`Cliente WebSocket desconectado: ${socket.id} (${reason})`);
        });
    });

    return io;
}

function emitWebsocketEvent(event, payload) {
    if (io) {
        io.emit(event, payload);
    }
}

function getWebsocketServer() {
    return io;
}

module.exports = {
    initializeWebsocket,
    emitWebsocketEvent,
    getWebsocketServer
};
