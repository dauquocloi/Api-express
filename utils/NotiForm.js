const { notificationTypes: notiType } = require('../constants/notifications');

exports.NotiForm = (type, data) => {
	switch (type) {
		case notiType['TRANSACTION']:
			return {
				formId: 1,
				title: 'Thông báo giao dịch',
				content: `Phòng ${data.roomIndex} | Tòa ${data.buildingName} | Đã thanh toán: ${data.amount} | Hóa đơn: ${data.billContent} | Nội dung: ${data.paymentContent} | Trạng thái hóa đơn: ${data.billStatus}.`,
			};
		case notiType['TASK_COMPLETED']:
			return {
				formId: 2,
				title: 'Thông báo hoàn thành công việc',
				content: `${data.taskTitle} | Đã hoàn thành | Người thực hiện: ${data.performersName}.`,
			};
		case notiType['COLLECT_CASH']:
			return {
				formId: 3,
				title: 'Thông báo nhân viên thu tiền',
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Hóa đơn: ${data.billContent} | Số tiền thu: ${data.amount} | Người thu: ${data.collector} | Trạng thái hóa đơn: ${data.billStatus}.`,
			};
		case notiType['CONTRACT_EXPIRE']:
			return {
				formId: 4,
				title: 'Phòng sắp hết hạn hợp đồng',
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Sắp hết hạn hợp đồng ! | Ngày dự kiến kết thúc HĐ: ${data.contractEndDate}.`,
			};
		case notiType['TRANSACTION_DECLINED']:
			return {
				formId: 5,
				title: `Từ chối xác nhận giao dịch`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Hóa đơn: ${data.billContent} | Số tiền GD: ${data.transactionAmount} | Người lập GD: ${data.creatorName} | Lý do: "${data.reason}".`,
			};
		case notiType['ROOM_DEPOSITED']:
			return {
				formId: 6,
				title: `Phòng đã được đặt cọc`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Giá thuê: ${data.rent} | Tiền cọc: ${data.depositAmount} | Số tiền đã cọc: ${data.paidAmount} | Ngày bổ sung: ${data.depositCompletionDate} | Ngày checkin: ${data.checkinDate}.`,
			};
		case notiType['ROOM_CHECKOUT_EARLY']:
			return {
				formId: 7,
				title: `Trả phòng trước thời hạn hợp đồng`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Ngày trả phòng dự kiến: ${data.checkoutDate}.`,
			};
		case notiType['REQUEST_TRANSACTION_CONFIRMATION']:
			return {
				formId: 8,
				title: `Yêu cầu xác nhận giao dịch`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Hóa đơn: ${data.billContent} | Số tiền GD: ${data.transactionAmount} | Người lập GD: ${data.creatorName}.`,
			};
		case notiType['ROOM_CHECKOUT']:
			return {
				formId: 9,
				title: `Trả phòng kết thúc hợp đồng`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Ngày kết thúc hợp đồng: ${data.checkoutDate}.`,
			};
		case notiType['CONTRACT_RENEWAL']:
			return {
				formId: 10,
				title: `Hợp đồng đã được gia hạn`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Gia hạn đến ngày: ${data.renewalDate} | Giá thuê: ${data.rent} | Tiền cọc: ${data.depositAmount}.`,
			};
		case notiType['ASIGNED_TASK']: {
			return {
				formId: 11,
				title: `Thông báo công việc`,
				content: `${data.taskTitle} ${`| ${data.detail} |`} Người thực hiện: ${data.performersName}.`,
			};
		}
		case notiType['DEPOSIT_TERMINATED']: {
			return {
				formId: 12,
				title: `Thông báo phòng hủy đặt cọc`,
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Đã hủy đặt cọc | Số tiền đã cọc: ${data.paidAmount}.`,
			};
		}
	}
};
