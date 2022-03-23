const { reviews: Reviews, orders: Orders, sequelize } = require("app/models/models");
const { getListPayload, addOrderById } = require('app/controllers/common');
const log = require("app/helpers/logger");
const moment = require('moment');
const { getSPTimeZone } = require("app/helpers/utils");

/**
 * @swagger
 * '/reviews':
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Get reviews list
 *     description: ''
 *     produces:
 *       - application/json
 *     responses:
 *       '200':
 *         description: Successful operation
 *     security:
 *      - cookieAuth: []
 */
module.exports.list = async (req, res) => {
    let payload = {
        ...getListPayload(req),
        include: [{
            model: Orders,
            as: "order",
            required: true,
            attributes: ["id", "kiosk_name", "consumer_id", "kiosk_id", "service_provider_id"],
        }],
    };
    payload = addOrderById(payload);

    Reviews.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, "menu::controller::getReviews");
            return res.status(500).json({ message: "Error in get reviews list" });
        });
};

module.exports.listForConsumer = async (req, res) => {
    const id = req.params.id;
    const payload = {
        ...getListPayload(req),
        attributes: [
            [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
            [sequelize.fn('count', sequelize.col('id')), 'ordersRated']
        ],
    };
    payload.where.consumerId = id

    Reviews.findAll(payload)
        .then((data) => {
            return res.json(data[0]);
        })
        .catch((err) => {
            log.error(err, "menu::controller::listForConsumer");
            return res.status(500).json({ message: "Error in get reviews list for consumer" });
        });
};

module.exports.exportAllDataXLSX = async (req, res) => {
    try {
        let payload = getListPayload(req);

        payload.include = [
            {
                model: Orders,
                attributes: ['id', 'kiosk_name', 'service_provider_id'],
                required: true,
            },
        ];

        const fileName = 'Reviews.xlsx';
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('reviews');
        payload = addOrderById(payload);
        const reviews = await Reviews.findAll(payload);

        worksheet.columns = [
            { header: 'Customer', key: 'A', width: 16 },
            { header: 'Rating', key: 'B', width: 16 },
            { header: 'Date', key: 'C', width: 24 },
            { header: 'OrderID', key: 'D', width: 16 },
            { header: 'Message', key: 'E', width: 48 },
            { header: 'Kiosk', key: 'F', width: 48 },
        ];

        reviews.forEach(element => {
            worksheet.addRow({
                A: element.consumerId,
                B: element.rating,
                C: element.createdAt ? moment(element.createdAt).utcOffset(getSPTimeZone(req.user)).format('DD.MM.YYYY, HH:mm') : '-',
                D: element.orderId,
                E: element.message,
                F: element.order.dataValues.kiosk_name,
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getColumn('A').alignment = { horizontal: 'left' };
        worksheet.getColumn('B').alignment = { horizontal: 'left' };
        worksheet.getColumn('C').alignment = { horizontal: 'left' };
        worksheet.getColumn('D').alignment = { horizontal: 'left' };
        worksheet.getColumn('E').alignment = { horizontal: 'left' };
        worksheet.getColumn('F').alignment = { horizontal: 'left' };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        log.error(err, 'reviews::controller::reviewsExport');
        return res.status(500).json({ message: 'Error in get XLSX' });
    }
};