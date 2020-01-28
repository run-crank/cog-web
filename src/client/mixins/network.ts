
import { URL } from 'url';
import * as querystring from 'querystring';

const OTHER_REQUEST_METHODS = ['POST', 'PATCH', 'PUT'];
const VALID_CONTENT_TYPES = ['application/json', 'application/json;charset=UTF-8', 'application/x-www-form-urlencoded'];

export class NetworkAware {

  async getNetworkRequests(baseUrl: string, pathContains: string) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();

    const matchedRequests = requests.filter(r => r.url.startsWith(baseUrl) && (new URL(r.url).pathname.includes(pathContains) && pathContains));
    return matchedRequests;
  }

  evaluateRequests(requests, expectedParams) {
    const matching = [];

    requests.forEach((request) => {
      //// The Iterator logic can be factored out
      if (request.method == 'GET') {
        const url = new URL(request.url);

        let matched = true;

        url.searchParams.forEach((value, key) => {
          if (expectedParams.hasOwnProperty(key) && matched) {
            matched = expectedParams[key] == value;
          }
        });

        if (matched) {
          matching.push(request);
        }

      } else if (OTHER_REQUEST_METHODS.includes(request.method)) {
        const requestHasValidContentType = VALID_CONTENT_TYPES.filter(f => f.includes(request.rawRequest._headers['content-type'])).length > 0;
        if (requestHasValidContentType) {
          let matched = true;

          let postData;
          try { postData = JSON.parse(request.postData); } catch (e) { postData = querystring.parse(request.postData); }

          for (const [key, value] of Object.entries(postData)) {
            if (expectedParams.hasOwnProperty(key) && matched) {
              matched = expectedParams[key] == value;
            }
          }

          if (matched) {
            matching.push(request);
          }
        }
      }
    });

    return matching;
  }
}
