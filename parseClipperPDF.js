const PDFParser = require('pdf2json');

const getTransactions = buffer => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataReady", pdfData => resolve(parse(pdfData)) );
    pdfParser.on("pdfParser_dataError", err => reject(err) );

    pdfParser.parseBuffer(buffer);

    const parse = data => {
      const allTransactions = [];

      for (let i = 0; i < data.formImage.Pages.length; i++) {
        const texts = data.formImage.Pages[i].Texts;
        const TABLE_HEADER_Y = i === 0 ? '5.547' : '2.303'; // todo: 2.144 is wrong but I don't have enough pandemic tx history to fix it lol
        // maybe it's a font thing? my server has this as 5.121 and 2.144 but my desktop needs 5.547 and presumably 2.303

        const groupMap = {};
        for (const text of texts) {
          if (!(text.y in groupMap)) groupMap[text.y] = [];
          groupMap[text.y].push({ x: text.x, text: decodeURIComponent(text.R[0].T) });
        }

        if (!(TABLE_HEADER_Y in groupMap)) {
          // if a page (I think only page 0) has no transactions, it also has no header row
          continue;
        }

        const headerRow = groupMap[TABLE_HEADER_Y];
        const xMap = {};
        headerRow.forEach(c => xMap[c.x] = c.text);

        for (const y in groupMap) {
          if (y === TABLE_HEADER_Y) continue;
          if (parseFloat(y) < parseFloat(TABLE_HEADER_Y)) continue; // "Transaction History for Card xxx" header. this exclusion is probably unnecessary because of the one four lines down

          const row = groupMap[y];

          if (!row.every(col => col.x in xMap)) continue; // this ain't a normal table row, this is some cranky shit like the footer.

          const transaction = {};

          for (const col of row) {
            transaction[xMap[col.x]] = col.text;
          }

          allTransactions.push(transaction);
        }
      }

      return allTransactions;
    };
  });
};

module.exports = getTransactions;
