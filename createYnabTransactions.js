const dateformat = require('dateformat');
const ynab = require('ynab');

const createYnabTransactions = async transactions => {
  const api = new ynab.API(process.env.TOKEN);

  const ynabMemo = transaction => {
    const afterDate = () => {
      if (transaction.location === '' && transaction.route === '') {
        return transaction.description;
      }

      return `${transaction.location}${transaction.route !== '' ? ' ' + transaction.route : ''} (${transaction.description})`;
    };

    return `${dateformat(transaction.date, 'h:MM TT')}: ${afterDate()}`;
  };

  const ynabTransactions = await Promise.all(transactions.map(async t => ({
    account_id: process.env.ACCOUNT,
    date: dateformat(t.date, 'yyyy-mm-dd'),
    amount: 100 * 10 * (
      ('credit' in t ? t.credit : 0)
      - ('debit' in t ? t.debit : 0)
    ),
    payee_name: 'Clipper', // TODO: transfer for auto-load, different agencies
    category_id: process.env.CATEGORY,
    memo: ynabMemo(t),
    cleared: 'cleared',
    import_id: (await t.digest()).substring(0, 36), // ynab only allows 36 chars
  })));

  await api.transactions.createTransactions(process.env.BUDGET, { transactions: ynabTransactions } );
};

module.exports = createYnabTransactions;
