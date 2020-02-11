export class GoogleAdsAware {
  filterGoogleAdsURLs(requests, aid, group, atag) {
    const filteredUrl = requests.filter(r => r.url.includes('ad.doubleclick.net') || r.url.includes('fls.doubleclick.net')).map(request => decodeURIComponent(request.url));
    const result = filteredUrl.filter(url => url.includes(`src=${aid};`)
                                  && url.toLowerCase().includes(`type=${group.toLowerCase()};`)
                                  && url.toLowerCase().includes(`cat=${atag.toLowerCase()};`));
    return result;
  }
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
      if (expectedParams[key] != params[key]) {
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
