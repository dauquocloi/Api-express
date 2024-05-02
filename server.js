const express = require('express');
const app = express();
const server = require('http').createServer(app);
const port = 8080;
const routers = require('./routers');
const cors = require('cors');

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

//khai báo router
routers.routerApi(app);

server.listen(port);
console.log('Server is listening on port ' + port);
