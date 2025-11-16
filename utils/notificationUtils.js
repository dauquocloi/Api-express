const { Expo } = require('expo-server-sdk');
const express = require('express');
const { getNotiForm } = require('./getNotiForm');
const mongoose = require('mongoose');
const Entity = require('../models');

const expo = new Expo();

exports.sendNotification = async (notiType, data) => {
	console.log('log of data from sendNotification: ', data);
	const { expoPushTokens = [], title, content, metaData } = data;

	if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
		throw new Error('Danh sách Push Token không hợp lệ hoặc trống');
	}

	// Lọc ra token hợp lệ
	const validTokens = expoPushTokens.filter((token) => Expo.isExpoPushToken(token));

	if (validTokens.length === 0) {
		throw new Error('Không có Push Token hợp lệ');
	}

	// Tạo danh sách thông báo
	const messages = validTokens.map((token) => ({
		to: token,
		sound: 'default',
		title,
		body: content,
		data: {
			type: notiType || 'notification',
			metaData: metaData || {},
		},
	}));

	try {
		// Gửi thông báo đến Expo
		const tickets = await expo.sendPushNotificationsAsync(messages);

		// Trả về kết quả cho worker / service xử lý tiếp
		return {
			success: true,
			count: messages.length,
			tickets,
		};
	} catch (error) {
		console.error('Lỗi khi gửi thông báo:', error);
		return {
			success: false,
			error: error.message,
		};
	}
};
