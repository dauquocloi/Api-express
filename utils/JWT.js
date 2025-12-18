const { verify, sign } = require('jsonwebtoken');
const { promisify } = require('util');
const { readFile } = require('fs');
const { InternalError, TokenExpiredError, BadTokenError } = require('../AppError');
const path = require('path');

class JwtPayload {
	constructor(
		iss,
		aud,
		sub,
		prm,
		validity,
		// param
	) {
		this.iss = iss;
		this.iat = Math.floor(Date.now() / 1000);
		this.aud = aud;
		this.sub = sub;
		this.prm = prm;
		this.exp = Number(this.iat + validity);
	}
}

async function readPublicKey() {
	return promisify(readFile)(path.join(__dirname, '../Keys/public.pem'), 'utf8');
}

async function readPrivateKey() {
	return promisify(readFile)(path.join(__dirname, '../Keys/private.pem'), 'utf8');
}

async function encode(payload) {
	const cert = await readPrivateKey();
	if (!cert) throw new InternalError('Token generation failure');
	return promisify(sign)({ ...payload }, cert, { algorithm: 'RS256' });
}

async function validate(token) {
	const cert = await readPublicKey();
	try {
		return await promisify(verify)(token, cert);
	} catch (e) {
		if (e && e.name === 'TokenExpiredError') throw new TokenExpiredError();
		// throws error if the token has not been encrypted by the private key
		throw new BadTokenError();
	}
}

/**
 * Returns the decoded payload if the signature is valid even if it is expired
 */
async function decode(token) {
	const cert = await readPublicKey();
	try {
		return await promisify(verify)(token, cert, {
			ignoreExpiration: true,
		});
	} catch (e) {
		throw new BadTokenError();
	}
}

module.exports = {
	JwtPayload,
	encode,
	validate,
	decode,
};
