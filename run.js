process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});


const dateformat = require('dateformat');
const ynab = require('ynab');

const fetchClipperPDF = require('./fetchClipperPDF');
const parseClipperPDF = require('./parseClipperPDF');
const normalizeTransactions = require('./normalizeTransactions');

require('dotenv').config();

const api = new ynab.API(process.env.TOKEN);

const run = async () => {
  const pdfBuffer = await fetchClipperPDF();
  const rawTransactions = await parseClipperPDF(pdfBuffer);
  const transactions = normalizeTransactions(rawTransactions);

  const syncTransactions = transactions.filter(
    t => t.product === 'Clipper Cash'
      && ('credit' in t || 'debit' in t),
  );

  const ynabTransactions = await Promise.all(syncTransactions.map(async t => ({
    account_id: process.env.ACCOUNT,
    date: dateformat(t.date, 'yyyy-mm-dd'),
    amount: 100 * 10 * (
      ('credit' in t ? t.credit : 0)
      - ('debit' in t ? t.debit : 0)
    ),
    payee_name: 'Clipper', // TODO
    category_id: process.env.CATEGORY,
    memo: `${dateformat(t.date, 'h:MM TT')}: ${t.location || '-'} ${t.route || '-'} (${t.description})`,
    cleared: 'cleared',
    import_id: (await t.digest()).substring(0, 36),
  })));

  await api.transactions.createTransactions(process.env.BUDGET, { transactions: ynabTransactions } );

  // await api.transactions.createTransaction(process.env.BUDGET, {
  //   "transaction": {
  //     "account_id": process.env.ACCOUNT,
  //     "date": '2019-06-30',
  //     "amount": 4200,
  //     "payee_name": "VTA",
  //     "category_id": process.env.CATEGORY,
  //     "memo": "import from Clipper",
  //     "cleared": "cleared",
  //     "import_id": +new Date() + '',
  //   }
  // }).catch(e => console.error(e));
};

run();
