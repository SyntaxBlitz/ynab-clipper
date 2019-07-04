# ynab-clipper

Syncs Clipper Cash into a YNAB account. Run the script once a day and it'll fetch your Clipper card transactions for auto import into YNAB.

## Installation

Clone the repository. Run `npm install`.

## Configuration

Copy `.env.example` to `.env` and fill out the fields. You'll tell the script which budget/account to insert transactions into and which category they should be placed into. The budget/account UUIDs are easy enough to find by snooping URLs. The category UUID is a little trickier to find. One easy way is to plop this into your JS console (Ctrl+Shift+J in the ynab tab and just uhhhh ignore the big red text telling you not to paste anything in) to see each category's UUID:

    ynab.YNABSharedLib.defaultInstance.entityManager.getAllSubCategories().map(c => c.name + ': ' + c.entityId).join('\n')

## Usage

Run `node run.js`. You'll probably want to automate doing this periodically, at least once a week (the script will fetch and upload all transactions from the last seven days, and YNAB is smart enough to ignore already-imported transactions).

## Todo

- Allow for other products than Clipper Cash (I don't use these, so I don't know how they work)
- Figure out how to do it headlessly (PDF downloads are awkward)
  - honestly can probably just use raw http(s) requests, I just wanted to try using puppeteer because I'd never done it before
  - for now, can use `xvfb-run node run.js` on the server
- Set payee dynamically to the correct transport agency depending on the description

## License

MIT license. Check the LICENSE file for more info.
