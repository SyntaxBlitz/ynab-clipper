const crypto = require('crypto-promise');

const normalizeTransaction = transaction => {
  const obj = Object.create({
    digest: async function () {
      return await crypto.hash('sha256')(JSON.stringify(this) + process.env.TRANSACTION_SALT).then(b => b.toString('hex'));
    },
  });

  obj.date = new Date(transaction['TRANSACTION DATE']);
  obj.description = transaction['TRANSACTION TYPE'];
  obj.location = transaction['LOCATION'] || '';
  obj.route = transaction['ROUTE'] || '';
  obj.product = transaction['PRODUCT'];

  if (transaction['DEBIT'] !== undefined) {
    obj.debit = parseFloat(transaction['DEBIT'].substring(1));
  }

  if (transaction['CREDIT'] !== undefined) {
    obj.credit = parseFloat(transaction['CREDIT'].substring(1));
  }

  obj.balance = parseFloat(transaction['BALANCE'].substring(1));

  return obj;
};

const normalizeTransactions = transactions => {
  return transactions.map(normalizeTransaction);
};

module.exports = normalizeTransactions;
