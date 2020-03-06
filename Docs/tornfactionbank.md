# tornfactionbank.js

***This script makes calls to the Torn API***

## Description

This script allows you to quickly see what is the amount of money you have available in your faction bank.
For it, it adds a new element to the sidebar, just under **Money**, which displays the amount of money in the faction and adds a hoverable tooltip that shows a list of online bankers.

*Some manual setup is required for the tooltip to work*

## Torn API Uses

The script requires API access to fetch information. The first time using it, a new element is displayed in the top right corner of torn asking for the API key to be entered.
Pressing the *Save* button causes the script to record the API key to the script's local storage for later uses.

In subsequent uses of the script, the dialog should not appear and a previously saved API key should be used.

To fetch information from the faction, it makes use of the Torn API **Faction** endpoint with `selections=basic,donations` (1 request per page)

In order to accurately discover the user information, it also uses the Torn API **User** endpoint and takes the user id from there (1 request per page)

## [Optional] Manual Setup

The script needs to be able to detect who are defined as *Faction Banker* in your faction.
The script is already configured to parse the faction announcement page, looking for images with the value `banker` in its alt attribute.

So, if tootip does not work, ask your faction leader to:
1. Change the faction announcement to include images of those users that have access to the vault. A common use we gave this was to put the signature of those users so that their Online/Offline status was visible for everyone
1. The image they add needs to be setup with a value of `banker` in its alt field on the text editor UI