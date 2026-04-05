// BaseZaloClient.js
const axios = require('axios');
const qs = require('qs');
const Services = require('../../service');
const { providers } = require('../../constants/OA');
const { OAUrls } = require('../../constants/Zalo');

class BaseZaloClient {
	constructor({ baseURL, appId, secretKey, isExpiredFn, tokenProvider }) {
		this.baseURL = baseURL;
		this.appId = appId;
		this.secretKey = secretKey;
		this.tokenProvider = tokenProvider;

		this.accessToken = null;

		this.isRefreshing = false;
		this.queue = [];

		this.isExpiredFn = isExpiredFn;

		this.client = axios.create({
			baseURL: this.baseURL,
			timeout: 10000,
		});

		this._setupInterceptors();
	}

	_setupInterceptors() {
		this.client.interceptors.request.use(async (config) => {
			if (!this.accessToken || !this.refreshToken) {
				const tokenData = await this.tokenProvider.get();

				this.accessToken = tokenData.accessToken;
				this.refreshToken = tokenData.refreshToken;
			}

			config.headers.access_token = this.accessToken;
			return config;
		});

		this.client.interceptors.response.use(
			async (res) => {
				const isExpired = this.isExpiredFn(res.data?.error);

				if (isExpired) {
					return this._handleRefreshAndRetry(res.config);
				}

				return res;
			},
			async (error) => {
				const originalRequest = error.config;
				console.log('Error response: ', error.response?.data);
				console.log('originalRequest: ', originalRequest);

				const isExpired = this.isExpiredFn(error.response?.data?.error);

				if (!isExpired) {
					return Promise.reject(error);
				}

				return this._handleRefreshAndRetry(originalRequest);
			},
		);
	}

	async _refreshAccessToken() {
		const url = `https://oauth.zaloapp.com/v4/oa/access_token`;
		console.log('Refreshing access token...: ', this.refreshToken);
		const res = await axios.post(
			url,
			qs.stringify({
				refresh_token: this.refreshToken,
				app_id: this.appId,
				grant_type: 'refresh_token',
			}),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					secret_key: this.secretKey,
				},
			},
		);

		const data = res.data;
		console.log('Refresh token response: ', data);
		if (!data.access_token || !data.refresh_token) {
			throw new Error('Cannot refresh token: ');
		}

		this.accessToken = data.access_token;
		this.refreshToken = data.refresh_token;

		await this.tokenProvider.set({
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			expiredIn: data.expires_in,
		});

		return this.accessToken;
	}

	async _handleRefreshAndRetry(originalRequest) {
		if (!this.isRefreshing) {
			this.isRefreshing = true;

			try {
				const newToken = await this._refreshAccessToken();

				this.queue.forEach((cb) => cb(newToken));
				this.queue = [];

				originalRequest.headers.access_token = newToken;
				return this.client(originalRequest);
			} catch (err) {
				console.error('Error refreshing token: ', err);
				this.queue = [];
				throw err;
			} finally {
				this.isRefreshing = false;
			}
		}

		return new Promise((resolve) => {
			this.queue.push((newToken) => {
				originalRequest.headers.access_token = newToken;
				resolve(this.client(originalRequest));
			});
		});
	}

	async request(config) {
		return await this.client(config);
	}
}

module.exports = { BaseZaloClient };
