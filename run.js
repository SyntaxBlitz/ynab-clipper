const fetchClipperPDF = require('./fetchClipperPDF');
const parseClipperPDF = require('./parseClipperPDF');
const normalizeTransactions = require('./normalizeTransactions');
const createYnabTransactions = require('./createYnabTransactions');

require('dotenv').config();

const run = async () => {
  const pdfBuffer = await fetchClipperPDF();
  const rawTransactions = await parseClipperPDF(pdfBuffer);
  const transactions = normalizeTransactions(rawTransactions);

  const syncTransactions = transactions.filter(
    t => t.product === 'Clipper Cash'
      && ('credit' in t || 'debit' in t),
  );

  await createYnabTransactions(syncTransactions);
};

run();
