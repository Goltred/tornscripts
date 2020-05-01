// ==UserScript==
// @name Google Sheet Trade Tracker
// @namespace https://github.com/Goltred/tornscripts
// @version 0.0.1
// @description Tracks trade information to google sheets
// @author Goltred
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/trade-track.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/trade-track.user.js
// @match https://www.torn.com/trade.php
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant GM_xmlhttpRequest
// @require      https://raw.githubusercontent.com/Goltred/tornscripts/master/classes/TornAPI.js
// @run-at document-end
// ==/UserScript==

let webAppURL = GM_getValue('sheet');
const apiKey = GM_getValue('apikey');
let margins = GM_getValue('margin') || {};

$(document).ajaxComplete((evt, xhr, settings) => {
    if (settings.url.includes('trade.php')) {
        if (settings.data && (settings.data.includes('step=logview') || settings.data.includes('step=view') || settings.data.includes('step=addInventoryItems'))) {
            insertUI();
            if (!apiKey) {
                // showAPIInput expects a callback that will receive the apikey once it is entered
                // since our main takes two arguments, we wrap it here
                TornAPI.showAPIInput((apikey) => {
                    main(apiKey, settings.data.includes('step=logview'));
                });
            } else {
                // send post = true if this is a finished trade
                main(apiKey, settings.data.includes('step=logview'));
            }
        }
    }
});

class UILogger {
    static log(msg) {
        let text = $('#gtt-log').html();
        $('#gtt-log').html(`${text}<br />${msg}`);
    }
}

function insertUI() {
    // Add the settings controls
    const title = $('<div role="heading" aria-level="5" class="title-black top-round m-top10"><span>Goltred\'s Trade Tracker</span></div>');
    const content = $('<div class="warning-cont cont-gray10 bottom-round t-blue-cont h"></div>');
    const sellMargin = $(`<div><label for="gtt-sellmargin"><strong>Sale Margin</strong></label><input type="number" step="0.01" id="gtt-sellmargin" class="m-left5" value="${margins.sell || ''}"/></div>`);
    const buyMargin = $(`<div class="m-top10"><label for="gtt-buymargin"><strong>Buy Margin</strong></label><input type="number" step="0.01" id="gtt-buymargin" class="m-left5" value="${margins.buy || ''}"/></div>`);
    const sheetURL = $(`<div class="m-top10"><label for="gtt-sheet"><strong>WebApp URL</strong></label><input type="text" id="gtt-sheet" class="m-left5" style="width: 50%; display: inline;" value="${webAppURL}" /></div>`);
    const button = $('<div class="m-top10"><button type="button" id="gtt-save-settings">Save</button></div>');
    $('.trade-cont').before(title);
    title.after(content);
    content.append(sellMargin);
    content.append(buyMargin);
    content.append(sheetURL);
    content.append(button);
    content.append($('<hr class="page-head-delimiter m-top10">'));
    content.append($('<p id="gtt-log"></p>'));
    content.after($('<hr class="page-head-delimiter m-top10">'));

    // Attach a listener to the button
    button.on('click', saveSettings);
}

function saveSettings() {
    let newMargins = {
        sell: $('#gtt-sellmargin').val(),
        buy: $('#gtt-buymargin').val()
    }
    GM_setValue('margin', newMargins);
    margins = newMargins;

    webAppURL = $('#gtt-sheet').val();
    GM_setValue('sheet', webAppURL);
}

class Trade {
    constructor() {
        this.data = {};
        this.items = [];
    }

    itemDetails(itemEl, margin) {
        let text = $(itemEl).text();
        let re = new RegExp(' x(\\d+)');
        let match = re.exec(text);
        let quantity = match == null ? 1 : match[1];
        let name = text.split(` x${quantity}`)[0].trim();

        // Get the item from the api data
        let foundItem = this.itemByName(name);
        if (foundItem) {
            let { itemId, item } = foundItem;
            let marketPrice = parseFloat(item.market_value); // market_value comes as string from the api
            let marketTotal = marketPrice * quantity;
            let buyPrice = marketPrice * margins.buy;
            let buyTotal = buyPrice * quantity;
            let sellPrice = marketPrice * margins.sell;
            let sellTotal = sellPrice * quantity;
            let modifiedPrice = marketPrice * margin;
            let modifiedTotal = modifiedPrice * quantity;
            let itemInfo = {
                category: 'Item',
                name,
                quantity,
                marketPrice,
                modifiedPrice,
                marketTotal,
                modifiedTotal
            };

            $(itemEl).html(`
${name} x${quantity}
<p><strong>Buy</strong> | Price: $${Trade.currencyFormat(buyPrice, 2)} | Total: $${Trade.currencyFormat(buyTotal, 2)}</p>
<p><strong>Market</strong> | Price: $${Trade.currencyFormat(marketPrice, 2)} | Total: $${Trade.currencyFormat(marketTotal, 2)}</p>
<p><strong>Sell</strong> | Price: $${Trade.currencyFormat(sellPrice, 2)} | Total: $${Trade.currencyFormat(sellTotal, 2)}</p>
`);
            return itemInfo;
        }
    }

    static currencyFormat(n, decimals) {
        return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    itemByName(name) {
        let items = this.data.items;
        for (let id in items) {
            let item = items[id];
            if (name.toLowerCase() == item.name.toLowerCase()) {
                return {itemId: id, item};
            }
        }
    }

    static async fromTradePage(api) {
        let trade = new Trade();
        UILogger.log('Parsing trade');

        if (!margins) {
            UILogger.log('Items cannot be processed, margins have not been configured. Please set margins and refresh.');
            return;
        }

        let val = []
        if (!margins.sell) {
            val.push('Sales');
        }

        if (!margins.buy) {
            val.push('Buy');
        }

        if (val.length > 0) {
            UILogger.log(`${val.join(' and ')} margin${val.length > 1 ? 's have' : ' has'} not been configured. Please set margins and refresh.`);
            return;
        }

        // Get the trade ID
        let match = document.URL.match('&ID=(\\d+)');
        if (match) {
            trade.tradeID = match[1];
        }

        // Grab items data from torn for use later
        let result = await api.torn('items');
        trade.data.items = result['items'];

        // Get the username to know which side we should send data from
        let username = $('a[class*="menu-value"]').text();
        let userPosition = $(`.user .title-black:contains('${username}')`).parent().hasClass('left') ? 'left' : 'right'
        let includePosition = userPosition == 'left' ? 'right' : 'left';

        const leftTotals = {
            market: 0,
            modified: 0
        };
        const rightTotals = {
            market: 0,
            modified: 0
        };
        // Process all items
        $('div.user li.color2 div.name').each((i, e) => {
            let side = $(e).parent().closest('div').hasClass('left') ? 'left' : 'right';
            let itemMargin = userPosition == side ? margins.sell : margins.buy;
            let detailHeader = userPosition == side ? 'Sell' : 'Buy';
            let item = trade.itemDetails(e, itemMargin, detailHeader);

            if (side == includePosition) {
                trade.items.push(item);
            }

            if (side == 'left') {
                leftTotals.market += item.marketTotal;
                leftTotals.modified += item.modifiedTotal;
            } else {
                rightTotals.market += item.marketTotal;
                rightTotals.modified += item.modifiedTotal;
            }
        });

        // Update totals
        let leftName = $(`.user.left .title-black`).text().replace('\'s items traded', ''); // Remove extra text that we don't need;
        $(`.user.left .title-black`).text(`${leftName} - $${Trade.currencyFormat(leftTotals.market, 2)} - $${Trade.currencyFormat(leftTotals.modified, 2)}`);
        let rightName = $(`.user.right .title-black`).text().replace('\'s items traded', ''); // Remove extra text that we don't need;
        $(`.user.right .title-black`).text(`${rightName} - $${Trade.currencyFormat(rightTotals.market, 2)} - $${Trade.currencyFormat(rightTotals.modified, 2)}`);

        UILogger.log('Trade parsing completed');
        return trade;
    }

    postData() {
        const tradeData = {
            tradeID: this.tradeID,
            items: this.items
        };
        UILogger.log(`Starting post process for trade ID: ${this.tradeID}. With ${this.items.length} items`);

        UILogger.log('Validating if trade already exists in Google Sheet. Please wait until the validation is complete...');
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${webAppURL}?tradeId=${this.tradeID}`,
            onload: function(response) {
                let json = JSON.parse(response.responseText);
                if (json.code == 0) {
                    UILogger.log('Trade does not exist. Sending information to webapp. Please wait until the WebApp reports that it completed ingesting the request');
                    GM_xmlhttpRequest({
                        method: 'POST',
                        data: JSON.stringify(tradeData),
                        url: webAppURL,
                        onload: function (response) {
                            UILogger.log('Trade Data sent. Process completed.');
                        }
                    });
                } else {
                    UILogger.log(json.msg);
                    UILogger.log('No information sent to the WebApp. Process completed.');
                }
            },
            onerror: function(response) {
                UILogger.log(`${response.responseText}. Process completed.`);
            }
        });
    }
}

async function main(apikey, post = false) {
    let api = new TornAPI(apikey);
    let trade = await Trade.fromTradePage(api);

    if (post && trade) {
        trade.postData();
    }
}
