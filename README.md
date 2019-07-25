# Web Cog

This is an Automaton Cog for basic web interactions, providing steps and
assertions for you to run against your website. This Cog leverages Chrome (via
Puppeteer) to interact with websites. Puppeteer is configured in a headful
manner in order to ensure the highest likelihood possible that websites behave
in the same way they do for real humans.

* [Installation](#installation)
* [Usage](#usage)
* [Development and Contributing](#development-and-contributing)

## Installation

Ensure you have the `crank` CLI and `docker` installed and running locally,
then run the following.

```bash
crank cog:install automatoninc/web
```

## Authentication

This Cog does not require any authentication details.

## Steps

### Navigate to a webpage
- **Expression**: `navigate to (?<webPageUrl>.+)`
- **Expected Data**:
  - `webPageUrl`: Absolute URI of the web page to navigate to

### Enter value into field
- **Expression**: `enter (?<value>.+) into field (?<domQuerySelector>.+)`
- **Expected Data**:
  - `value`: Field value to enter
  - `domQuerySelector`: DOM query selector of the field

### Submit a form by clicking a button
- **Expression**: `submit the form by clicking (?<domQuerySelector>.+)`
  - `domQuerySelector`: DOM query selector of the submit button to click

## Development and Contributing
Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Please make sure to add or update tests
as appropriate.

### Setup

1. Install node.js (v10.x+ recommended)
2. Clone this repository.
3. Install dependencies via `npm install`
4. Run `npm start` to validate the cog works locally (`ctrl+c` to kill it)
5. Run `crank cog:install --source=local --local-start-command="npm start"` to
   register your local instance of this cog. You may need to append a `--force`
   flag or run `crank cog:uninstall automatoninc/web` if you've already
   installed the distributed version of this cog.

### Adding/Modifying Steps
Modify code in `src/steps` and validate your changes by running
`crank cog:step automatoninc/web` and selecting your step.

To add new steps, create new step classes in `src/steps`. You will need to run
`crank registry:rebuild` in order for your new steps to be recognized.

### Tests and Housekeeping
Tests can be found in the `test` directory and run like this: `npm test`.
Ensure your code meets standards by running `npm run lint`.
