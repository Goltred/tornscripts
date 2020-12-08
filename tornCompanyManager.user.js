// ==UserScript==
// @name         Torn City - Company Manager
// @namespace    Goltred.Company
// @version      0.9.0
// @description  Calculate stock reorder based on sales ratio and max storage capacity
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompanyManager.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompanyManager.user.js
// @match        https://www.torn.com/companies.php
// @grant        none
// @require      https://raw.githubusercontent.com/Goltred/tornscripts/master/classes/Logger.js
// ==/UserScript==

// Setup a listener on ajaxComplete to enter the main logic once the stocks ajax finishes loading
$(document).ajaxComplete((evt, xhr, settings) => {
  if (settings.url.includes('companies.php?step=stock')) {
    logger.debug('Found stocks element. We are done waiting!');
    // Get total stock. Number comes with a ',' which is removed to have a full int
    let totalStock = parseInt(removeThousandsSep($("li.total > div.stock.bold").text().trim()));
    logger.debug(`Total stock value: ${totalStock}`);
    let inTransitStock = getStockInTransit();
    logger.debug(`Total in transit stock: ${inTransitStock}`);
    const trueTotal = inTransitStock + totalStock;

    calculateStock(trueTotal);
    addStockInTransitSpan(trueTotal);
  }
});

// Globals
// Let's assume a max storage of 100k since there is no good way of knowing the actual storage.
// This should be changed to reflect the actual storage capacity
const maxStorage = 100000;

// Create the logger
const logger = new Logger('tornCompanyManager'); // pass 'debug' here to enable debug logging

let manageCompany = $('.manage-company');
logger.debug('menu element found', manageCompany);

function calculateStock(trueStock) {
  let totalSold = parseInt(removeThousandsSep($("li.total > div.sold-daily.bold").text().trim()));
  logger.debug(`Total sold value: ${totalSold}`);

  let availableStock = maxStorage - trueStock;
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
    let soldQ = parseInt(removeThousandsSep(clearText($(rowInfo).find('div.sold-daily').first())));
    logger.debug(`Row #${idx}: Quantity sold: ${soldQ}`);

    let soldP = soldQ / totalSold;
    logger.debug(`Row #${idx}: Sold %: ${soldP}`);

    // Calculate amount to buy
    let amount = parseInt(availableStock * soldP);
    logger.debug(`Row #${idx}: Amount to buy is ${amount}`);

    // Override only when a value is not set yet
    console.log(qInput.val())
    if (qInput.val() === '') {
      qInput.val(amount);
      qInput.blur(); // This triggers validation on the field
    }
  });
}

function getStockInTransit() {
  const inTransit = $('ul.order-list').find('div.status:not(:contains("Delivered"))');
  let total = 0;
  if (inTransit.length === 0) return total;

  $.each(inTransit, (idx, el) => {
    total += parseInt(removeThousandsSep($(el.previousElementSibling).text()));
  });

  return total;
}

function addStockInTransitSpan(spanValue) {
  const totalStorage = $("li.total > div.stock.bold");
  const newSpan = $('<span style="color:red; font-weight: normal;"></span>');
  newSpan.text(`(${spanValue})`);
  totalStorage.append(newSpan);
}

function removeThousandsSep(str) {
  return str.replace(',', '');
}

// Torn stock lines usually contain a span element inside that we want to remove
function clearText(el) {
  let clone = el.clone();

  $(clone).find('span').remove();
  return clone.text().trim();
}
