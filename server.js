const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = 8080;
const http = require('http').Server(app);
const routers = require('./routers');
const cors = require('cors');
const io = require('socket.io')(http, {
	cors: {
		origin: 'http://localhost:3000/',
	},
});

let chatgroups = [];

app.use(cors());

app.use(
	express.json({
		limit: '500mb',
	}),
);
app.use(
	express.urlencoded({
		limit: '500mb',
		extended: true,
	}),
);

io.on('connection', (socket) => {
	console.log(`${socket.id} user is just connected`);
});

//khai báo router
routers.routerApi(app);

server.listen(port);
console.log('Server is listening on port ' + port);
