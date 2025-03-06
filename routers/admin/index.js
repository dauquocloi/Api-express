const Room = require('./room');
const upload = require('../../middleware/multer');

exports.adminRouters = (app) => {
	app.post('/admin/addManyRooms', upload.single('file'), Room.addManyRooms);
};
