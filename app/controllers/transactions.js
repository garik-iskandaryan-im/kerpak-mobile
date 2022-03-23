
const { transactions: Transactions } = require('app/models/models');
const log = require('app/helpers/logger');
const { getListPayload, getOnePayload } = require('app/controllers/common');
const { transactions: transactionsValidator } = require('app/schemes');

module.exports.list = async (req, res) => {
    let payload = getListPayload(req);
    Transactions.findAndCountAll(payload)
        .then(({ count, rows }) => {
            return res.json({ count, data: rows });
        })
        .catch((err) => {
            log.error(err, 'transaction::controller::getTransactions');
            return res.status(500).json({ message: 'Error in get user list' });
        });
};

module.exports.get = async (req, res) => {
    const id = req.params.id;
    const payload = getOnePayload(req, id);
    return Transactions.findOne(payload)
        .then((transaction) => {
            return res.json(transaction);
        })
        .catch((err) => {
            log.error(err, 'transaction::controller::getTransaction');
            return res.status(500).json({ message: 'Error in get transaction' });
        });
};

module.exports.create = async (req, res) => {
    const payload = { ...req.body };
    isSchemeValid(transactionsValidator.create, payload)
        .then(transactions => {
            Transactions.create(transactions)
                .then(transactions => {
                    if (transactions) {
                        return res.json({ transactions, message: 'transaction has been created' });
                    }
                    return res.status(500).json({ message: 'Error in create transaction' });
                }).catch(err => {
                    log.error(err, 'transactions::controller::create');
                    return res.status(500).json({ message: 'Error in create transaction' });
                });
        })
        .catch(err => {
            log.error(err, 'transactions::controller::create');
            return res.status(404).json({ message: 'validation error' });
        });
};