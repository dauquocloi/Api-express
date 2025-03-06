const mongoose = require('mongoose');
const MongoConnect = require('../../utils/MongoConnect');
var Entity = require('../../models');
const bcrypt = require('bcrypt');
const { query } = require('express');
var XLSX = require('xlsx');
const fs = require('fs');
const { log } = require('console');

exports.addManyRooms = (data, cb) => {
	const { buildingInfo } = data;
	console.log(buildingInfo);
	MongoConnect.Connect(config.database.name)
		.then(async () => {
			const fileBuffer = fs.readFileSync(data.roomFile);
			var workBook = XLSX.read(fileBuffer, { type: 'buffer' });
			let workSheet = workBook.Sheets[workBook.SheetNames[0]];
			const jsonData = XLSX.utils.sheet_to_json(workSheet);

			// Tạo tòa nhà
			const building = await Entity.BuildingsEntity.create({
				buildingAddress: buildingInfo?.buildingAddress,
				buildingName: buildingInfo?.buildingName,
				roomQuantity: buildingInfo?.roomQuantity,
				ownerName: buildingInfo?.ownerName,
				ownerPhone: buildingInfo?.ownerPhone,
			});

			try {
				await Promise.all(
					jsonData.map(async (data) => {
						// Tạo danh sách nội thất
						let interiorArray = [];
						for (let i = 1; data[`interior${i}`]; i++) {
							interiorArray.push({
								interiorName: data[`interior${i}`],
								quantity: data[`interiorQuantity${i}`],
								interiorCode: data[`interiorCode${i}`],
							});
						}

						// Tạo phòng
						const room = await Entity.RoomsEntity.create({
							building: building._id,
							roomIndex: data.roomIndex,
							roomPrice: data.roomPrice,
							roomDeposit: data.roomDeposit,
							roomState: data.roomState,
							interior: interiorArray,
						});

						// Tạo danh sách phí phòng
						let feesToCreate = [];
						for (let i = 1; data[`nameFee${i}`]; i++) {
							feesToCreate.push({
								feeName: data[`nameFee${i}`],
								unit: data[`unitFee${i}`],
								feeAmount: data[`amountFee${i}`],
								room: room._id,
							});
						}

						if (feesToCreate.length > 0) {
							Entity.FeesEntity.insertMany(feesToCreate)
								.then(() => {
									console.log('All fees created successfully');
								})
								.catch((error) => {
									console.error('Error creating fees:', error);
								});
						}

						// Tạo hợp đồng
						await Entity.ContractsEntity.create({
							room: room._id,
							rent: data.rent,
							deposit: data.depositRoom,
							contractSignDate: data.signDate,
							contractEndDate: data.endDate,
							contractTerm: data.contractTerm,
						});

						// Tạo danh sách khách hàng
						try {
							// Tạo mảng chứa thông tin khách hàng
							const customerData = await Promise.all(
								Object.keys(data)
									.filter((key) => key.startsWith('customerName') && data[key])
									.map(async (_, i) => {
										const phone = data[`phone${i + 1}`];

										// Kiểm tra xem user đã tồn tại chưa
										const user = await Entity.UsersEntity.findOne({ username: phone });
										if (user) {
											console.log(`User với số điện thoại ${phone} đã tồn tại`);
											throw new Error(`User với số điện thoại ${phone} đã tồn tại`); // Dừng lại nếu user đã tồn tại
										}

										// Tạo user mới nếu chưa tồn tại
										const newUser = await Entity.UsersEntity.create({
											username: phone,
											password: phone,
											role: 'customer',
										});

										// Trả về thông tin khách hàng
										return {
											room: room._id,
											user: newUser._id,
											fullName: data[`customerName${i + 1}`],
											phone: phone,
											gender: data[`sex${i + 1}`],
											birthday: data[`date${i + 1}`],
											cccd: data[`CCCD${i + 1}`],
											cccdIssueDate: data[`issueDate${i + 1}`],
											temoraryResidence: data[`temporaryResidence${i + 1}`],
											permanentAddress: data[`permanentAddress${i + 1}`],
											checkinDate: data[`checkinDate${i + 1}`],
											status: data[`status${i + 1}`],
										};
									}),
							);

							// Chèn danh sách khách hàng vào MongoDB
							if (customerData.length > 0) {
								const insertedCustomers = await Entity.CustomersEntity.insertMany(customerData);

								const vehicleData = insertedCustomers
									.map((customer, i) => {
										const licensePlate = data[`licensePlate${i + 1}`];

										// Kiểm tra nếu licensePlate không tồn tại hoặc rỗng thì trả về null
										if (!licensePlate) return;

										return {
											licensePlate: data[`licensePlate${i + 1}`],
											status: data[`vehicleStatus${i + 1}`],
											owner: customer._id, // Tham chiếu đến customer vừa được tạo
											room: room._id,
										};
									})
									.filter((vehicle) => vehicle); // Lọc bỏ undefined hoặc null

								// Chèn danh sách vehicle vào MongoDB
								if (vehicleData.length > 0) {
									await Entity.VehiclesEntity.insertMany(vehicleData);
									console.log('Tất cả vehicle đã được thêm thành công');
								} else {
									//
									console.log('không có phương tiện nào được thêm vào db');
								}
							}
						} catch (error) {
							console.error('Lỗi:', error.message);
							// Hàm sẽ dừng lại ở đây nếu có bất kỳ lỗi nào xảy ra
						}
					}),
				);
			} catch (error) {
				console.error('Lỗi khi nhập dữ liệu:', error);
			}
			cb(null, jsonData);
		})
		.catch((err) => {
			console.log('addManyRooms: ' + err);
			cb(err, null);
		});
};
