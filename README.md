# Web Cog

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
<h4 id="EnterValueIntoField">Fill out a form field</h4>

- **Expression**: `fill out (?<domQuerySelector>.+) with (?<value>.+)`
- **Expected Data**:
  - `domQuerySelector`: Button's DOM Query Selector
  - `value`: Field Value
- **Step ID**: `EnterValueIntoField`

<h4 id="NavigateToPage">Navigate to a webpage</h4>

- **Expression**: `navigate to (?<webPageUrl>.+)`
- **Expected Data**:
  - `webPageUrl`: Page URL
- **Step ID**: `NavigateToPage`

<h4 id="SubmitFormByClickingButton">Submit a form by clicking a button</h4>

- **Expression**: `submit the form by clicking (?<domQuerySelector>.+)`
- **Expected Data**:
  - `domQuerySelector`: Button's DOM Query Selector
- **Step ID**: `SubmitFormByClickingButton`
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
