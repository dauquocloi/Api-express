var DataProvider = require('../data_providers/files');

exports.uploadFiles = async (data, cb) => {
	try {
		const uploadFiles = [];

		const resultUpLoad = await config.cloudinary.uploader.upload(data.path, { resource_type: 'image' }); // took so long
		console.log('[cores/files<uploadFiles>resultUpLoad :', resultUpLoad);
		uploadFiles.push({
			url: resultUpLoad.secure_url,
			publicId: resultUpLoad.public_id,
		});

		DataProvider.uploadFiles(resultUpLoad, (errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		});
	} catch (error) {
		console.log(error);
	}
};
