# tornHospital.user.js

## Description

This script's main use is for reviving. Presenting its user a mechanism to filter out people in the faction view.

Currently, the script allows to filter based on:
* Idle
* Offline
* Time in hospital threshold (default 1h)

Alternatively, a couple of extra modifications are made to allow easier access to the members list, especially useful in mobile devices:
* Members list is moved just below the faction information block
* Wars/Walls are hidden
* Faction Description is hidden

All of the above can be configured to your own preferences. For this, the script also adds a new element above the members list with checkboxes to control what is hidden or not. These options are persistent, meaning that you should not have to re-set them every time you load the page.

Lastly, two extra features were added to the script to make it easier to revive:
1. When loading a player profile, if that user has revives turned off, the script will record the user id and hide it from the faction view for the next 5 minutes
1. A `Refresh` button is present on the Filter Controls box. This button is a shortcut to refresh the webpage.
1. Keyboard shortcuts can now be used to open someone's mini profile from Faction View, and then interact with the Revive mechanics in the profile

## Keyboard Shortcuts

Since 4.0.0, keyboard shortcuts are enabled to further help your reviving efforts. This feature allows to open mini Profiles for the first
ten (10) rows of the member list of a faction, and then allows you to interact with the buttons on the opened mini profile.

### Intended flow:

1. Open member list of target faction
1. Press **1** through **0** to open the desired row mini profile.
1. Once mini profile is open: Press **R** to interact with the *Revive* button
1. Once yes/no confirmation appears: Press **Y** for *yes*, or **N** for *no*

While a mini profile is open, any key press other than R, Y or N will cause the mini profile to close. 


## Known Issues

* None...?