const dateformat = require('dateformat');
const puppeteer = require('puppeteer-extra'); // overkill? probably. but I'm having a good time
const path = require('path');
const fs = require('fs-extra');
const sleep = require('sleep-promise');

const pdfDir = path.join(__dirname, 'pdf');

puppeteer.use(
  require('puppeteer-extra-plugin-user-preferences')({
    userPrefs: {
      download: {
        prompt_for_download: false,
        default_directory: pdfDir,
      },
      plugins: {
        always_open_pdf_externally: true,
      },
    },
  },
));

const fetchClipperPDF = async () => {
  await fs.mkdirp(pdfDir);

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

    await (await page.mainFrame().$(`#rhStartDateTxt${process.env.CLIPPER_CARD_SERIAL}`)).type(dateformat(new Date() - 7 * 24 * 60 * 60 * 1000, 'mm/dd/yyyy'));
    await (await page.mainFrame().$(`#rhEndDateTxt${process.env.CLIPPER_CARD_SERIAL}`)).type(dateformat(new Date(), 'mm/dd/yyyy'));

    await (await page.mainFrame().$(`#rhView${process.env.CLIPPER_CARD_SERIAL}`)).click();

    let exists = false;
    const pdfPath = path.join(pdfDir, `rideHistory_${process.env.CLIPPER_CARD_SERIAL}.pdf`);
    do {
      exists = await fs.exists(pdfPath);
      if (!exists) await sleep(500);
    } while (!exists);

    const buffer = await fs.readFile(pdfPath);
    await fs.unlink(pdfPath);
    return buffer;
  } finally {
    await browser.close();
  }
};

module.exports = fetchClipperPDF;
