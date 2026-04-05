const ExcelJS = require('exceljs');

async function exportInvoices(invoices) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Invoices');

	// 🧱 Define columns
	worksheet.columns = [
		{ header: 'Phòng', key: 'room', width: 15 },
		{ header: 'Điện', key: 'electric', width: 15 },
		{ header: 'Nước', key: 'water', width: 15 },
		{ header: 'Dịch vụ', key: 'service', width: 15 },
		{ header: 'Số ngày ở', key: 'days', width: 15 },
		{ header: 'Tổng tiền', key: 'total', width: 20 },
	];

	// 🎨 Style header
	worksheet.getRow(1).font = { bold: true };

	// ➕ Add data rows
	invoices.forEach((invoice) => {
		const sumFees = invoice.electric + invoice.water + invoice.service;

		const total = (sumFees * 30) / invoice.days;

		worksheet.addRow({
			room: invoice.room,
			electric: invoice.electric,
			water: invoice.water,
			service: invoice.service,
			days: invoice.days,
			total,
		});
	});

	// 💰 Format tiền
	worksheet.getColumn('total').numFmt = '#,##0';

	// 💾 Save file
	await workbook.xlsx.writeFile('invoices.xlsx');

	console.log('✅ File Excel đã được tạo!');
}

// 👉 Test thử
const invoices = [
	{ room: 'A101', electric: 100000, water: 50000, service: 20000, days: 30 },
	{ room: 'A102', electric: 120000, water: 40000, service: 30000, days: 28 },
];

exportInvoices(invoices);
