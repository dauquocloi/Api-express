//Tạo code_verifier và code_challenge cho quy trình xác thực PKCE (Zalo OA OAuth)

const { randomBytes, createHash } = require('crypto');

/**
 * Hàm Base64 URL-safe encode
 * Loại bỏ các ký tự không an toàn và dấu "=" padding
 */
function base64URLEncode(buffer) {
	return buffer
		.toString('base64')
		.replace(/\+/g, '-') // thay '+' bằng '-'
		.replace(/\//g, '_') // thay '/' bằng '_'
		.replace(/=+$/, ''); // bỏ '=' ở cuối
}

/**
 * Tạo chuỗi verifier ngẫu nhiên (độ dài 43–128 ký tự)
 */
function generateCodeVerifier(length = 64) {
	return base64URLEncode(randomBytes(length));
}

/**
 * Tạo code_challenge từ code_verifier theo chuẩn PKCE
 */
function generateCodeChallenge(codeVerifier) {
	const hash = createHash('sha256').update(codeVerifier).digest();
	return base64URLEncode(hash);
}

// ============================
//  Thực thi
// ============================

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

console.log('✅ Code Verifier:', codeVerifier);
console.log('✅ Code Challenge:', codeChallenge);
