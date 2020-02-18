// ==UserScript==
// @name         Torn City - Company Stock
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calculate stock reorder based on sales/ratio override and max storage capacity
// @author       Goltred
// @match        https://www.torn.com/companies.php
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Let's assume a max storage of 100k
const maxStorage = 100000;

(function() {
  'use strict';

  $("#manage-tabs").on("change", (evt) => {
    if (evt.target.value === 'stock') calculateStock();
  });

  $("ul.company-tabs").find("i.stock-icon").parent("a").on("click", () => calculateStock());
})();

function calculateStock() {
  // Get total stock. Number comes with a ',' which is removed to have a full int
  let totalStock = parseInt($("li.total > div.stock.bold").text().trim().replace(',', ''));
  let totalSold = parseInt($("li.total > div.sold-daily.bold").text().trim().replace(',', ''));
  let availableStock = maxStorage - totalStock;

  // Start looping on rows
  let stockRows = $("ul.stock-list > li > div.acc-body");
  $.each(stockRows, (idx, row) => {
    // Get the quantity div
    let qInput = $(row).find('div.quantity');

    // Get the current percentages
    let soldQ = parseInt(clearText($(row).find('div.sold-daily').first()).replace(',', '').trim());
    let soldP = soldQ / totalSold;

    // Calculate amount to buy
    let amount = parseInt(availableStock * soldP);
    qInput.append(`<p>${amount}</p>`);
  });
}

// Torn stock lines usually contain a span element inside that we want to remove
function clearText(el) {
  let clone = el.clone();

  $(clone).find('span').remove()
  return clone.text().trim()
}
