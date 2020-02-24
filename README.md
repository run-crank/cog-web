# Web Cog

[![CircleCI](https://circleci.com/gh/run-crank/cog-web/tree/master.svg?style=svg)](https://circleci.com/gh/run-crank/cog-web/tree/master)

This is a [Crank][what-is-crank] Cog for basic web interactions, providing
steps and assertions for you to run against your website. This Cog leverages
Chrome (via Puppeteer) to interact with websites. Puppeteer is configured in a
headful manner in order to ensure the highest likelihood possible that websites
behave in the same way they do for real humans.

* [Installation](#installation)
* [Usage](#usage)
* [Development and Contributing](#development-and-contributing)

## Installation

Ensure you have the `crank` CLI and `docker` installed and running locally,
then run the following.

```shell-session
$ crank cog:install automatoninc/web
```

## Usage

### Authentication
<!-- authenticationDetails -->
This Cog does not require any authentication details.
<!-- authenticationDetailsEnd -->

### Steps
<!-- stepDetails -->
| Name (ID) | Expression | Expected Data |
| --- | --- | --- |
| **Check current page info**<br>(`CheckCurrentPageInfo`) | `the (?<field>status\|text\|url) of the current page should (?<operator>contain\|not contain\|be) (?<expectation>.+)` | - `field`: Page Detail (status, text, or url) <br><br>- `operator`: Check Logic (contain, not contain, or be) <br><br>- `expectation`: Expected Value |
| **Check current page meta tag**<br>(`CheckCurrentPageMetaTag`) | `the (?<metaName>.+) meta tag on the current page should (?<operator>be\|contain\|not contain\|not be longer than\|exist) ?(?<expectation>.+)?` | - `metaName`: Meta Tag name <br><br>- `operator`: Check Logic (be, contain, not contain, not be longer than, exist) <br><br>- `expectation`: Expected Value |
| **Check that Google Analytics tracked an event**<br>(`CheckGoogleAnalyticsEvent`) | `google analytics should have tracked an event with category (?<ec>.+) and action (?<ea>.+) for tracking id (?<id>[a-zA-Z0-9-]+)` | - `ec`: Event Category <br><br>- `ea`: Event Action <br><br>- `id`: Tracking / Measurement ID associated with the GA instance/property (e.g. UA-75228722-5) <br><br>- `withParameters`: Parameter Checks, an optional map of Google Analytics Measurement Protocol Parameters and their expected values. |
| **Check that Google Analytics tracked a pageview**<br>(`CheckGoogleAnalyticsPageView`) | `google analytics should have tracked a pageview for tracking id (?<id>[a-zA-Z0-9-]+)` | - `id`: Tracking / Measurement ID associated with the GA instance/property (e.g. UA-75228722-5) <br><br>- `withParameters`: Parameter Checks, an optional map of Google Analytics Measurement Protocol Parameters and their expected values. |
| **Check that a Google Floodlight tag fired**<br>(`CheckGoogleFloodlightTag`) | `a floodlight tag should have fired for advertiser (?<aid>\d+), group (?<group>[a-zA-Z0-9-_]+), and activity (?<atag>[a-zA-Z0-9-_]+)` | - `aid`: Advertiser ID <br><br>- `group`: Group Tag String <br><br>- `atag`: Activity Tag String <br><br>- `cMethod`: Counting Method (standard, unique, per session) <br><br>- `withVariables`: Custom Variables, an optional map of variable names and their expected values |
| **Check a page's Lighthouse performance score**<br>(`CheckLighthousePerformance`) | `the (?<throttleTo>mobile\|desktop) lighthouse performance score should be (?<expectedScore>\d{1,3}) or higher` | - `throttleTo`: Throttle Level (mobile or desktop) <br><br>- `expectedScore`: Expected Score |
| **Check that Marketo Munchkin tracking loads**<br>(`CheckMarketoMunchkin`) | `the tracking code for munchkin account id (?<id>[a-zA-Z0-9-]+) should load` | - `id`: Munchkin Account ID associated with the user's Marketo instance (e.g. 460-tdh-945) |
| **Check for a specific network request**<br>(`CheckNetworkRequestStep`) | `there should be (?<reqCount>\d+) matching network requests? for (?<baseUrl>.+)` | - `reqCount`: # of Requests <br><br>- `baseUrl`: Base URL Is <br><br>- `pathContains`: Path Contains <br><br>- `withParameters`: Parameters Include |
| **Check that Pardot tracking loads**<br>(`CheckPardotTrackingStep`) | `the tracking code for pardot account (?<aid>\d+) and campaign (?<cid>\d+) should have loaded` | - `aid`: Pardot Account ID <br><br>- `cid`: Pardot Campaign ID <br><br>- `customDomain`: Custom Tracker Domain <br><br>- `withParameters`: Parameter Checks, an optional map of query parameters and their expected values. |
| **Click an element on a page**<br>(`ClickOnElement`) | `click the page element (?<domQuerySelector>.+)` | - `domQuerySelector`: Element's DOM Query Selector |
| **Fill out a form field**<br>(`EnterValueIntoField`) | `fill out (?<domQuerySelector>.+) with (?<value>.+)` | - `domQuerySelector`: Field's DOM Query Selector <br><br>- `value`: Field Value |
| **Focus on Frame**<br>(`FocusOnFrame`) | `focus on the (?<domQuerySelector>.+) frame` | - `domQuerySelector`: The iframe's DOM query selector, or "main" for the main frame |
| **Check that the LinkedIn Conversion Pixel fired**<br>(`CheckLinkedInConversionPixelFiredStep`) | `the linkedin conversion pixel for partner id (?<pid>\d+) should have fired` | - `pid`: LinkedIn Partner ID <br><br>- `cid`: LinkedIn Conversion ID |
| **Check that the LinkedIn Insight tag fired**<br>(`CheckLinkedInInsightTagFiredStep`) | `the linkedin insight tag for partner id (?<pid>\d+) should have fired` | - `pid`: LinkedIn Partner ID |
| **Navigate to a webpage**<br>(`NavigateToPage`) | `navigate to (?<webPageUrl>.+)` | - `webPageUrl`: Page URL |
| **Scroll to a percentage depth of a web page**<br>(`ScrollTo`) | `scroll to (?<depth>\d+)% of the page` | - `depth`: Percent Depth |
| **Submit a form by clicking a button**<br>(`SubmitFormByClickingButton`) | `submit the form by clicking (?<domQuerySelector>.+)` | - `domQuerySelector`: Button's DOM Query Selector |
<!-- stepDetailsEnd -->

## Development and Contributing
Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Please make sure to add or update tests
as appropriate.

### Setup

1. Install node.js (v10.x+ recommended)
2. Clone this repository.
3. Install dependencies via `npm install`
4. Run `npm start` to validate the Cog works locally (`ctrl+c` to kill it)
5. Run `crank cog:install --source=local --local-start-command="npm start"` to
   register your local instance of this Cog. You may need to append a `--force`
   flag or run `crank cog:uninstall automatoninc/web` if you've already
   installed the distributed version of this Cog.

### Adding/Modifying Steps
Modify code in `src/steps` and validate your changes by running
`crank cog:step automatoninc/web` and selecting your step.

To add new steps, create new step classes in `src/steps`. Use existing steps as
a starting point for your new step(s). Note that you will need to run
`crank registry:rebuild` in order for your new steps to be recognized.

Always add tests for your steps in the `test/steps` folder. Use existing tests
as a guide.

### Modifying the API Client or Authentication Details
Modify the ClientWrapper class at `src/client/client-wrapper.ts`.

- If you need to add or modify authentication details, see the
  `expectedAuthFields` static property.
- If you need to expose additional logic from the wrapped API client, add a new
  ublic method to the wrapper class, which can then be called in any step.
- It's also possible to swap out the wrapped API client completely. You should
  only have to modify code within this clase to achieve that.

Note that you will need to run `crank registry:rebuild` in order for any
changes to authentication fields to be reflected. Afterward, you can
re-authenticate this Cog by running `crank cog:auth automatoninc/web`

### Tests and Housekeeping
Tests can be found in the `test` directory and run like this: `npm test`.
Ensure your code meets standards by running `npm run lint`.

[what-is-crank]: https://crank.run?utm_medium=readme&utm_source=automatoninc%2Fweb
