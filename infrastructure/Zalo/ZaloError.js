const Sentry = require('@sentry/node');

class ZaloError extends Error {
	constructor({ type, message, raw }) {
		super(message);
		this.name = 'ZaloError';
		this.type = type;
		this.raw = raw;
	}

	static fromAxiosError(error) {
		if (error.isAxiosError) {
			return new ZaloError({
				type: error.response?.data?.error,
				message: error.response?.data?.message,
				raw: error.response?.data,
			});
		}

		if (error.response) {
			return new ZaloError({
				type: error.response.data?.error,
				message: error.response.data?.message,
				raw: error.response.data,
			});
		}

		return new ZaloError({
			type: 'NETWORK_ERROR',
			message: error.message,
		});
	}

	static handle(err, context = {}) {
		switch (err.type) {
			case zaloErrorTypes.UNKNOWN_ERROR:
			case zaloErrorTypes.APP_INVALID:
			case zaloErrorTypes.APP_NOT_EXISTED:
			case zaloErrorTypes.APP_NOT_LINK_OA:
			case zaloErrorTypes.ACCESS_TOKEN_INVALID:
			case zaloErrorTypes.OA_INVALID:
			case zaloErrorTypes.NO_PERMISSION_SEND_ZNS:
			case zaloErrorTypes.OA_BLOCKED:
				Sentry.captureException(err, {
					level: 'error',
					tags: {
						provider: 'zalo',
						type: err.type,
						...context.tags,
					},
					extra: {
						...context.extra,
						raw: err.raw,
					},
				});
				break;

			case zaloErrorTypes.SEND_AT_NIGHT_RESTRICTED:
				// Tiếp tục tạo 1 job đến cho sender.
				break;

			default:
				console.error('Unhandled ZaloError: ', err);
				// có thể log nhẹ hoặc ignore
				break;
		}
	}
}

const zaloErrorTypes = {
	// Lỗi hệ thống & Ứng dụng
	UNKNOWN_ERROR: -100, // Lỗi không xác định
	APP_INVALID: -101, // Ứng dụng gửi ZNS không hợp lệ
	APP_NOT_EXISTED: -102, // Ứng dụng gửi ZNS không tồn tại
	APP_NOT_LINK_OA: -105, // Ứng dụng chưa liên kết với OA

	// Lỗi về Quyền & Xác thực
	ACCESS_TOKEN_INVALID: -124, // Access token không hợp lệ hoặc hết hạn
	OA_INVALID: -125, // ID Official Account không hợp lệ
	NO_PERMISSION_SEND_ZNS: -135, // OA chưa có quyền gửi ZNS (chưa xác thực/gói free)
	OA_BLOCKED: -1351, // OA bị chặn do vi phạm

	// Lỗi về Template & Nội dung
	TEMPLATE_NOT_EXISTED: -112, // Mẫu ZNS không tồn tại
	TEMPLATE_NOT_APPROVED: -131, // Mẫu ZNS chưa được phê duyệt
	NO_PERMISSION_TEMPLATE: -117, // OA/App chưa được cấp quyền dùng mẫu này
	PARAMETER_INVALID: -132, // Tham số trong mẫu không hợp lệ
	CHAR_LIMIT_EXCEEDED: -130, // Nội dung vượt quá giới hạn ký tự

	// Lỗi về Người nhận (User)
	USER_NOT_EXISTED: -118, // Tài khoản Zalo không tồn tại/bị vô hiệu hóa
	ACCOUNT_CANNOT_RECEIVE: -119, // Tài khoản không thể nhận ZNS
	USER_INACTIVE_OR_REJECT: -114, // Người dùng không online/từ chối nhận tin/Zalo cũ
	USER_BLOCKED_BY_OA: -120, // User chặn OA
	BODY_DATA_EMPTY: -121, // Template không có nội dung

	// Lỗi về Tài chính & Hạn mức
	OUT_OF_QUOTA_DEV: -126, // Ví (development mode) không đủ số dư
	OUT_OF_MONEY: -321, // Zalo Cloud Account (ZCA) hết tiền
	SEND_LIMIT_REACHED: -1471, // OA vượt giới hạn gửi tin hậu mãi trong tháng

	// Lỗi khác
	SEND_AT_NIGHT_RESTRICTED: -133, // Mẫu ZNS không được phép gửi ban đêm (22h-6h)
};

module.exports = { ZaloError, zaloErrorTypes };
