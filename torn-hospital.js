// ==UserScript==
// @name Faction Hospital - Edited (Also hides offliners)
// @namespace http://tampermonkey.net/
// @version 1.4.2
// @description Shows only faction members that are in the hospital and online, and hides the rest.
// @author muffenman and help from Pi77Bull
// @match https://www.torn.com/factions.php?step=profile&ID=*
// @grant none
// @run-at document-end
// ==/UserScript==

// What does this script do?
// It hides all members on faction pages that are not in the hospital and displays the hospital time for those who are.

$( ".faction-description" ).css("display", "none", "traveling"); //hides faction description

$('.member-list #icon2').parents("li").hide(); //hides offliners
//$('.member-list #icon62').parents("li").hide(); //hides idles
$('.member-list > li:not(:contains("Hospital"))').css("display", "none"); //hides every member that is not in hospital
$('.member-list > li:contains("Hospital")').each((i, j) => { //loops through every member that is in hospital
$(j).find(".days").text($(j).find("#icon15").attr("title").substr(-16, 8)); //displays time that is found in the hospital icon


$(".title .days").text("Time"); //changes Days column title to "Time"
});
//console.log("Made by muffenman [2002712] and Pi77Bull [2082618] . If you like it, send us a message or a gift either is fine :P \"I love your script!\".");

// Wait for the war list to load - Modified by Goltred
let wallsCheck = setInterval(() => {
  // Hide faction walls
  let el = $("#war-react-root > div > div > ul");
  if (el.length) {
    clearInterval(wallsCheck);
    el.css("display", "none");
  }
}, 1000);