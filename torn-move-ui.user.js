// ==UserScript==
// @name         Move Torn UI
// @namespace    https://github.com/Goltred/tornscripts
// @version      0.4
// @description  Different tweaks to Torn UI's things
// @author       Goltred
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Modify the main container width
let mc = $('#mainContainer');
let currWidth = parseInt(mc.css('width'));
mc.css('width', currWidth + 190);

// Get the lists block
let lists = $('h2:contains("Lists")').closest('div[class^="sidebar-block"]');
// Get the areas block
let areas = $('h2:contains("Areas")').closest('div[class^="sidebar-block"]');

// append a new div after the content wrapper
let right = $('<div></div>');
$('.content-wrapper').before(right);
right.append(areas);
right.append(lists);
right.css({
    'float': 'left',
    'margin-left': '20px'
});

function waitForTable() {
    setTimeout(() => {
        let fs = $('.fullScreen');
        if (fs.length > 0) {
            fs.css('float', 'left');
        } else {
            waitForTable();
        }
    }, 100);
}

// Handle poker modifications
if (document.URL.includes('loader.php?sid=holdemFull')) {
    console.log('poker');
    $('div.content-wrapper').attr('style', 'width: 100% !important');
    let root = $('div.content-wrapper');

    waitForTable();
}
