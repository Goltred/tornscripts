// ==UserScript==
// @name         Torn City - Company Stock Calculator (TCCSC)
// @namespace    Goltred.Company
// @version      0.8.0
// @description  Calculate stock reorder based on sales ratio and max storage capacity
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompanyStock.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompanyStock.js
// @match        https://www.torn.com/companies.php
// @grant        none
// @require      https://raw.githubusercontent.com/Goltred/tornscripts/master/classes/Logger.js
// ==/UserScript==

// Setup a listener on ajaxComplete to enter the main logic once the stocks ajax finishes loading
$(document).ajaxComplete((evt, xhr, settings) => {
  if (/companies.php\?step=stock/g.exec(settings.url)) {
    logger.debug('Found stocks element. We are done waiting!');
    calculateStock();
  }
});

// Globals
// Let's assume a max storage of 100k since there is no good way of knowing the actual storage.
// This should be changed to reflect the actual storage capacity
const maxStorage = 100000;

// Create the logger
const logger = new Logger('tornCompanyStock'); // pass 'debug' here to enable debug logging

let manageCompany = $('.manage-company');
logger.debug('menu element found', manageCompany);

function calculateStock() {
  // Get total stock. Number comes with a ',' which is removed to have a full int
  let totalStock = parseInt($("li.total > div.stock.bold").text().trim().replace(',', ''));
  logger.debug(`Total stock value: ${totalStock}`);

  let totalSold = parseInt($("li.total > div.sold-daily.bold").text().trim().replace(',', ''));
  logger.debug(`Total sold value: ${totalSold}`);

  let availableStock = maxStorage - totalStock;
  logger.debug(`Available stock to buy: ${availableStock}`);

  // Start looping on rows
  let stockRows = $("ul.stock-list > li");
  logger.debug('Rows where stock inputs should be', stockRows);
  $.each(stockRows, (idx, row) => {
    // Get the name of the thing
    let stockName = $(row).find('div.name').text().trim();
    logger.debug(`Row #${idx}: Item name: ${stockName}`);

    const rowInfo = $(row).find('div.acc-body');
    // Get the quantity div
    let qInput = $(rowInfo).find('input:text');
    logger.debug(`Row #${idx}: Input div: ${qInput}`);

    // Get the current percentages
    let soldQ = parseInt(clearText($(rowInfo).find('div.sold-daily').first()).replace(',', '').trim());
    logger.debug(`Row #${idx}: Quantity sold: ${soldQ}`);

    let soldP = soldQ / totalSold;
    logger.debug(`Row #${idx}: Sold %: ${soldP}`);

    // Calculate amount to buy
    let amount = parseInt(availableStock * soldP);
    logger.debug(`Row #${idx}: Amount to buy is ${amount}`);

    qInput.val(amount);
    qInput.blur(); // This triggers validation on the field
  });
}

// Torn stock lines usually contain a span element inside that we want to remove
function clearText(el) {
  let clone = el.clone();

  $(clone).find('span').remove()
  return clone.text().trim()
}
