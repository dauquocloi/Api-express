exports.getNotiForm = (type, data) => {
	switch (type) {
		case 'transaction':
			return {
				formId: 1,
				title: 'Thông báo giao dịch',
				content: `Phòng ${data.roomIndex} | Tòa ${data.buildingName} | Đã thanh toán: ${data.amount} | Hóa đơn: ${data.billContent} | Nội dung: ${data.paymentContent} | Trạng thái hóa đơn: ${data.billStatus}.`,
			};
		case 'task':
			return {
				formId: 2,
				title: 'Thông báo hoàn thành công việc',
				content: `${data.taskTitle} | Đã hoàn thành | Người thực hiện: ${data.performersName}.`,
			};
		case 'collectCash':
			return {
				formId: 3,
				title: 'Thông báo nhân viên thu tiền',
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Hóa đơn: ${data.billContent} | Số tiền thu: ${data.amount} | Người thu: ${data.collector} | Trạng thái hóa đơn: ${data.billStatus}.`,
			};
		case 'contractExpire':
			return {
				formId: 4,
				title: 'Thông báo phòng sắp hết hạn hợp đồng',
				content: `Phòng ${data.roomIndex} | ${data.buildingName} | Sắp hết hạn hợp đồng ! | Ngày dự kiến kết thúc HĐ: ${data.contractEndDate}.`,
			};
	}
};
