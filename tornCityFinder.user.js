// ==UserScript==
// @name         Torn City - Item Finder
// @namespace    Goltred.City.Finder
// @version      0.5.0
// @description  Calculates and uses Torn's native functions to pan around to clickable objects
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.user.js
// @match        https://www.torn.com/city.php
// @grant        none
// ==/UserScript==

$(document).ajaxComplete((evt, xhr, settings) => {
  const re = new RegExp('city\\.php.*step=mapData');
  if (re.exec(settings.url)) {
    try {
      const { territoryUserItems } = JSON.parse(xhr.responseText);
      if (territoryUserItems) {
        CityMap.parse(territoryUserItems);
      }
    } catch (e) {
      console.error('[Item Finder] Error parsing response:', e);
    }
  }
});

class CityMap {
  static parse(userItems) {
    $('#torn-item-finder-panel').remove();
    const rawItems = JSON.parse(atob(userItems));

    // Container UI
    const itemsDiv = $('<div id="torn-item-finder-panel" class="cont-gray10 m-top10 p10"></div>');
    itemsDiv.append('<div><strong><p style="font-size: 14px; margin-bottom: 5px;">Torn City - Item Finder</p></strong></div>');
    itemsDiv.append(`<p style="margin-bottom: 8px;">Found <strong>${rawItems.length}</strong> items on the map:</p>`);

    if (rawItems.length > 0) {
      const itemsContainer = $('<div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;"></div>');

      rawItems.forEach((item, index) => {
        const btn = $(`
          <button style="
            background: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
          ">${item.title}</button>
        `);

        btn.hover(
          function() { $(this).css('background', '#444'); },
          function() { $(this).css('background', '#333'); }
        );

        // This uses torn map functions to pan around
        btn.on('click', () => {
          CityMap.panToItem(item);
        });

        itemsContainer.append(btn);
      });

      itemsDiv.append(itemsContainer);
    }

    $('#map').after(itemsDiv);
  }

  // Eventually, move this to centralized script
  static panToItem(item) {
    const mapContext = window.torn.map;

    if (!mapContext) {
      console.error('[Item Finder] window.torn.map is not accessible.');
      return;
    }

    const numericSystem = mapContext.options.numericSystem;
    const minZoom = mapContext.options.minZoom;
    const targetZoom = 6;

    // From addUserItems
    const rawX = parseInt(item.c.x, numericSystem);
    const rawY = parseInt(item.c.y, numericSystem);
    const point = [rawX / 2, rawY / 2];
    const lpoint = mapContext.getLPoint(point);
    const latlng = L.CRS.EPSG3857.pointToLatLng(lpoint, minZoom);


    if (typeof mapContext.setView === 'function') {
      mapContext.setView(latlng, targetZoom);
      console.log(`[Item Finder] Panned to "${item.title}" at:`, latlng);
    } else {
      console.error('[Item Finder] setView function not found on map object.');
    }
  }
}
