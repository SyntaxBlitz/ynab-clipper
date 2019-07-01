const ynab = require('ynab');
const sleep = require('sleep-promise');
const path = require('path');
const fs = require('fs-extra');
const puppeteer = require('puppeteer-extra'); // overkill? probably. but I'm having a good time

puppeteer.use(
  require('puppeteer-extra-plugin-user-preferences')({
    userPrefs: {
      download: {
        prompt_for_download: false,
        default_directory: path.join(__dirname, 'pdf'),
      },
      plugins: {
        always_open_pdf_externally: true,
      },
    },
  },
));

require('dotenv').config();

const api = new ynab.API(process.env.TOKEN);

const run = async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.clippercard.com/ClipperWeb/index.do');

    await page.mainFrame().click('#myRollover');

    const [ loginFrame ] = page.mainFrame().childFrames().filter(f => f.url() === 'https://www.clippercard.com/ClipperCard/loginFrame.jsf');

    await (await loginFrame.$('#j_idt13\\:username')).type(process.env.CLIPPER_USERNAME);
    await (await loginFrame.$('#j_idt13\\:password')).type(process.env.CLIPPER_PASSWORD);
    await (await loginFrame.$('#j_idt13\\:password')).press('Enter');

    await page.waitForNavigation();

    await (await page.mainFrame().$(`#tran${process.env.CLIPPER_CARD_SERIAL}`)).click();

    await (await page.mainFrame().$(`#rhStartDateTxt${process.env.CLIPPER_CARD_SERIAL}`)).type('06/01/2019');
    await (await page.mainFrame().$(`#rhEndDateTxt${process.env.CLIPPER_CARD_SERIAL}`)).type('06/30/2019');

    await (await page.mainFrame().$(`#rhView${process.env.CLIPPER_CARD_SERIAL}`)).click();

    let exists = false;
    do {
      exists = await fs.exists(path.join(__dirname, 'pdf', `rideHistory_${process.env.CLIPPER_CARD_SERIAL}.pdf`));
      if (!exists) await sleep(500);
    } while (!exists);
  } finally {
    await browser.close();
  }

  return;

  await api.transactions.createTransaction(process.env.BUDGET, {
    "transaction": {
      "account_id": process.env.ACCOUNT,
      "date": '2019-06-30',
      "amount": 4200,
      "payee_name": "VTA",
      "category_id": process.env.CATEGORY,
      "memo": "import from Clipper",
      "cleared": "cleared",
      "import_id": +new Date() + '',
    }
  }).catch(e => console.error(e));
};

run();
