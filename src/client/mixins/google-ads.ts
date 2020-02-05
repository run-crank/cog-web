export class GoogleAdsAware {
  getParameters(url) {
    const test = url.split(';');
    const parameters = {};
    test.shift();
    test.forEach((param: string) => {
      const splitParameter = param.split('=');
      parameters[splitParameter[0]] = splitParameter[1];
    });

    return parameters;
  }

  includesParameters(url, expectedParams) {
    const params = this.getParameters(url);
    for (const key in expectedParams) {
      if (expectedParams[key] != decodeURIComponent(params[key])) {
        return false;
      }
    }
    return true;
  }

  conversionMethodUrlFilter(method, urls) {
    let result = [];
    if (method == 'standard') {
      result = urls.filter((url) => {
        const params = this.getParameters(url);
        return !isNaN(params['ord']) && params['ord'] != '1' && !params['num'];
      });
    } else if (method == 'unique') {
      result = urls.filter((url) => {
        const params = this.getParameters(url);
        return (
          params['ord'] == '1' && !isNaN(params['num']) && params['num'] != '1'
        );
      });
    } else if (method == 'session') {
      result = urls.filter((url) => {
        const params = this.getParameters(url);
        return isNaN(params['ord']) && params['ord'] != '1' && !params['num'];
      });
    }

    return result;
  }
}
