const mammoth = require('mammoth');
const fs = require('fs');

async function convertDocxToHtml() {
	const result = await mammoth.convertToHtml({
		path: 'C:\\Users\\Admin\\OneDrive\\Desktop\\Api-Express\\Mau-CT01-tt53.docx',
	});

	const html = result.value; // nội dung HTML

	fs.writeFileSync('output.html', html);
	console.log('Convert xong -> output.html');
}

const path = 'C:\\Users\\Admin\\OneDrive\\Desktop\\Api-Express\\Mau-CT01-tt53.doc';

console.log('helo:', fs.existsSync(path));

convertDocxToHtml();
