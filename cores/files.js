var DataProvider = require('../data_providers/files');

exports.upLoadImages = async (data, cb) => {
	try {
		const uploadImages = [];

		const resultUpLoad = await config.cloudinary.uploader.upload(data.path, { resource_type: 'image' }); // took so long
		console.log('[cores/files<upLoadImages>resultUpLoad :', resultUpLoad);
		uploadImages.push({
			url: resultUpLoad.secure_url,
			publicId: resultUpLoad.public_id,
		});

		DataProvider.upLoadImages(resultUpLoad, (errs, result) => {
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
