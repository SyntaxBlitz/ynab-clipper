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
    await page.goto('https://www.clippercard.com/ClipperWeb/login.html');

    await (await page.mainFrame().$('#input-email')).type(process.env.CLIPPER_USERNAME);
    await (await page.mainFrame().$('#input-password')).type(process.env.CLIPPER_PASSWORD);
    await (await page.mainFrame().$('#input-password')).press('Enter');

    await page.waitForNavigation();

    // we don't actually need to do this, the link shows up either way lol
    // const accordionButton = await page.mainFrame().$(`[aria-controls="#clipper-card-info-${process.env.CLIPPER_CARD_SERIAL}"][aria-expanded="false"]`);
    // if (accordionButton !== null) { // isn't expanded yet
    //   await accordionButton.evaluate(el => {
    //     el.scrollIntoView();
    //   });
    //   await sleep(500);
    //   await accordionButton.click();
    //   await sleep(500);
    // }

    const activityMenuButton = await page.mainFrame().$(`[data-current-card="${process.env.CLIPPER_CARD_SERIAL}"][data-form-action="/ClipperWeb/view-activity"]`);
    const moreOptions = await activityMenuButton.evaluate(el => {
      el.parentElement.parentElement.parentElement.querySelector('a').click();
    });
    await sleep(100);
    await activityMenuButton.click();

    await page.waitForNavigation();

    const startField = await page.mainFrame().$(`#input-start-date`);
    const endField = await page.mainFrame().$(`#input-end-date`);

    await startField.focus();
    await startField.click({ clickCount: 3 }); // goofy select-all
    await startField.type(dateformat(new Date() - 7 * 24 * 60 * 60 * 1000, 'mmmm d, yyyy'));

    await endField.focus();
    await endField.click({ clickCount: 3 });
    await endField.type(dateformat(new Date(), 'mmmm d, yyyy'));

    await (await page.mainFrame().$(`button[type=submit]`)).click();

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
