const { io } = require('./app');
class SocketService {
    constructor() {
        io.on('connection', (socket) => {
            socket.on('updatedata', function (data) {
                io.emit('update-data', { data: data });
                console.log('connected socket io')
            });
        });
    }

    emiter(event, body) {
        if (body)
            io.emit(event, body);
        // this.io.emit('update-data', req.body);
    }
}

module.exports = SocketService;