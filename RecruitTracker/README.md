# Torn Recruit Assistant and Tracker

This script's purpose is to help you quickly assess if a player meets your requirements/criteria for them to join your
faction while keeping track of potential recruits, rejects and people who has already been messaged.

The userscript sends information to a Google App which is able to record player information into a sheet, and then be 
updated by subsequent visits to the player.

## Userscript Data

The userscript sends information to a web application as a JSON object. The JSON object that is sent has the following format:
```
## Structure sent to web app
{
  id: number,
  name: string,
  lastDecision: string,
  lastScouted: number
  <stat name as shown in torn UI>: <processed value>
}
```

For flexibility purposes, all information readable in the `personalstats` webpage of a player is sent to the web application
in the form of key:value pairs, with the key being the name of the stat as it appears in Torn, and the value being processed as follows:

Numerical values: Cleared thousands separator (,)
Currency values: Cleared thousands separator (,) and dollar sign ($)
Values with percentage stat (e.g. Hits, Critical Hits): Cleared thousands separator and removed percentage stat
Others (-- or formatted time): As shown

## Setting up the Web App

1. To setup a web app for this script, just create a new sheet and then go to Tools -> Script Editor.
![Step 1 Image](images/step1.png)
1. This will open a new window, where you can write code. The code is supplied in the [recruitAPI.gs](recruitAPI.gs) file
![Step 2 Image](images/step2.png)
1. After the code is there, click the `Deploy` button on the top right 
![Step 3 Image](images/step3.png)
1. Fill the details on the deployment windows as you see fit, making sure to:
* Type of application is **Web App**
* Set the permissions of the application to **Anyone**
![Step 4 Image](images/step4.png)

After this point, you should receive a URL, this is the URL for your web application and **needs** to be provided in 
the userscript settings

## Using the script

Once the script has been installed, the following UI should appear whenever you open the personal stats page of any player
in Torn:

![UI Overview](images/ui1.png)

Numbered elements are:
1. Save changes button
1. Google Application URL where data will be sent
1. Message template that will be used to generate the final message based on watched stats
1. Controls to add a specific stat to the Stats Watch list
1. Current Stats Watch list
1. Button to remove selected stat from the Stats Watch list
1. Decision area

### Process

The current process the script executes is the following:

1. Once the page finishes loading, it will go over any stat added to the Stats Watch list and look for the corresponding
value on the player's stats
1. If ALL requirements are met, one of two decisions are displayed:
    1. Reject: The player does not meet your criteria
    1. Recruit: The player meets your criteria
1. Once a decision is shown, the script will send data to the web application with the player information and the 
current decision
1. If the `Recruit` decision is displayed, the message template you set will be shown under the image. You will also be 
able to click on the `Recruit` button to copy the pre-generated message to your clipboard.
    1. If the `Recruit` button is clicked, another request will be sent to the web application to update the decision 
    to: `Messaged`. This is useful to keep track of who's been contacted already or not. 