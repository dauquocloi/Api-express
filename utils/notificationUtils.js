const { Expo } = require('expo-server-sdk');
const express = require('express');

const expo = new Expo();

// API gửi notification
exports.sendNotification = async (req, res, next) => {
	const { expoPushToken, title, message } = req.body;

	if (!Expo.isExpoPushToken(expoPushToken)) {
		return res.status(400).json({ message: 'Push Token không hợp lệ' });
	}

	const messages = [
		{
			to: expoPushToken,
			sound: 'default',
			title,
			body: message,
			data: { type: 'notification' },
		},
	];

	try {
		const ticket = await expo.sendPushNotificationsAsync(messages);
		res.status(200).json({ message: 'Thông báo đã gửi', ticket });
	} catch (error) {
		res.status(500).json({ message: 'Lỗi gửi thông báo', error });
	}
};
