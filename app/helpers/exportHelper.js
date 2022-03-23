const ExcelJS = require('exceljs');
const moment = require('moment');
const { getSPTimeZone } = require('./utils');

const exportHelper = (data, fileName, worksheetName, columns, columnsIds, columnNames, res, req) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    worksheet.columns = columns;

    data.forEach(item => {
        const row = {};
        columnNames.forEach(colName => {
            const currRow = columns.find(columnItem => columnItem.key === colName);
            if (currRow.isDate && item[columnsIds[colName]]) {
                row[colName] = moment(item[columnsIds[colName]]).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm');
            } else {
                row[colName] = item[columnsIds[colName]];
            }
        });
        worksheet.addRow(row);
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
    return {workbook, worksheet};
}

module.exports = { exportHelper };