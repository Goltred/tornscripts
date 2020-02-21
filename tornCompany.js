// ==UserScript==
// @name         Torn City - Company Stock Calculator
// @namespace    Goltred.Company
// @version      0.7
// @description  Calculate stock reorder based on sales ratio and max storage capacity
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompany.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCompany.js
// @match        https://www.torn.com/companies.php
// @grant        none
// ==/UserScript==

// Globals
// Let's assume a max storage of 100k since there is no good way of knowing the actual storage.
// This should be changed to reflect the actual storage capacity
const maxStorage = 100000;
let manageCompany = $('.manage-company');

function calculateStock() {
  // Get total stock. Number comes with a ',' which is removed to have a full int
  let totalStock = parseInt($("li.total > div.stock.bold").text().trim().replace(',', ''));
  let totalSold = parseInt($("li.total > div.sold-daily.bold").text().trim().replace(',', ''));
  let availableStock = maxStorage - totalStock;

  // Start looping on rows
  let stockRows = $("ul.stock-list > li > div.acc-body");
  $.each(stockRows, (idx, row) => {
    // Get the quantity div
    let qInput = $(row).find('input:text');

    // Get the current percentages
    let soldQ = parseInt(clearText($(row).find('div.sold-daily').first()).replace(',', '').trim());
    let soldP = soldQ / totalSold;

    // Calculate amount to buy
    let amount = parseInt(availableStock * soldP);
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

function waitForStock() {
  let waitTimer = setInterval(() => {
    if ($(manageCompany).find('ul.stock-list')) {
      clearInterval(waitTimer);
      calculateStock()
    }
  }, 200)
}

$(document).ready(() => {
  // Find the link to the stocks tab
  let stockLink = manageCompany.find('#ui-id-8');
  stockLink.on('click', () => waitForStock());

  let manageTabs = manageCompany.find('#manage-tabs');
  if (manageTabs.css('display') === 'inline-block') {
    manageTabs.on('change', (evt) => {
      if (evt.target.value === 'stock') {
          waitForStock();
      }
    });
  }
});
