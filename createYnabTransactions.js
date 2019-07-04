const dateformat = require('dateformat');
const ynab = require('ynab');

const createYnabTransactions = async transactions => {
  if (transactions.length === 0) return;

  const api = new ynab.API(process.env.TOKEN);

  const getAutoloadPayee = async () => {
    if (!process.env.AUTOLOAD_ACCOUNT) {
      return null;
    }

    // we could do this earlier in the program in parallel to make things a little faster, but why bother
    // we could also cache this, but. why bother.
    const payees = await api.payees.getPayees(process.env.BUDGET);
    const transferPayees = payees.data.payees.filter(p => p.transfer_account_id === process.env.AUTOLOAD_ACCOUNT);
    if (transferPayees.length === 1) {
      return transferPayees[0].id;
    }

    return null;
  };

  const autoloadPayee = await getAutoloadPayee();

  const ynabMemo = transaction => {
    const afterDate = () => {
      if (transaction.location === '' && transaction.route === '') {
        return transaction.description;
      }

      return `${transaction.location}${transaction.route !== '' ? ' ' + transaction.route : ''} (${transaction.description})`;
    };

    return `${dateformat(transaction.date, 'h:MM TT')}: ${afterDate()}`;
  };

  const makeYnabTransaction = async t => {
    const common = {
      account_id: process.env.ACCOUNT,
      date: dateformat(t.date, 'yyyy-mm-dd'),
      amount: 100 * 10 * (
        ('credit' in t ? t.credit : 0)
        - ('debit' in t ? t.debit : 0)
      ),
      memo: ynabMemo(t),
      cleared: 'cleared',
      import_id: (await t.digest()).substring(0, 36), // ynab only allows 36 chars
    };

    if (autoloadPayee && t.description.startsWith('Threshold auto-load')) {
      return {
        ...common,
        payee_id: autoloadPayee,
      };
    }

    return {
      ...common,
      payee_name: 'Clipper', // TODO: different agencies
      category_id: process.env.CATEGORY,
    };
  };

  const ynabTransactions = await Promise.all(transactions.map(async t => await makeYnabTransaction(t)));

  await api.transactions.createTransactions(process.env.BUDGET, { transactions: ynabTransactions } );
};

module.exports = createYnabTransactions;
