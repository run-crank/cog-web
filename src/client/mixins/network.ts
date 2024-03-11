import { isNullOrUndefined } from 'util';
import * as util from '@run-crank/utilities';
import { URL } from 'url';
import * as querystring from 'querystring';

const OTHER_REQUEST_METHODS = ['POST', 'PATCH', 'PUT', 'OPTIONS'];
const SUPPORTED_CONTENT_TYPES = ['application/json', 'application/json;charset=UTF-8', 'application/x-www-form-urlencoded', 'text/plain', 'none'];

export class NetworkAware {

  async getNetworkRequests(baseUrl: string, pathContains: string) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();

    let matchedRequests = requests.filter((r) => r.url.startsWith(baseUrl));

    if (pathContains) {
      matchedRequests = matchedRequests.filter((r) => (new URL(r.url).pathname.includes(pathContains) && pathContains));
    }

    return matchedRequests;
  }

  private convertParamsToObject(params: import('url').URLSearchParams) {
    const result = {};

    if (isNullOrUndefined(params)) return result;

    params.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  evaluateRequests(requests, expectedParams = {}) {
    const matches = [];
    requests.forEach((request) => {
      let actualParams = {};
      if (request.method === 'GET') {
        actualParams = this.convertParamsToObject(new URL(request.url).searchParams);
      } else if (OTHER_REQUEST_METHODS.includes(request.method)) {
        const contentType = request.rawRequest._headers['content-type'] || 'none';
        const requestHasValidContentType = SUPPORTED_CONTENT_TYPES.filter((f) => f.includes(contentType) || contentType.includes(f)).length > 0;
        const isJsonString = (string) => {
          try {
            JSON.parse(string);
          } catch (e) {
            return false;
          }
          return true;
        };
        const postData = request.postData && isJsonString(request.postData) ? JSON.parse(request.postData) : this.convertParamsToObject(new URL(request.url).searchParams);
        if (requestHasValidContentType) {
          try {
            actualParams = postData;
          } catch (e) {
            if (contentType == 'text/plain') {
              throw new Error(`Unable To Parse Body To JSON: ${postData.toString()}`);
            }
            actualParams = querystring.parse(postData.toString());
          }
        } else {
          throw new Error(`Unknown Content Type: ${contentType}`);
        }
      } else {
        throw new Error(`Unknown Request Method: ${request.method}`);
      }

      let matched = true;

      if (!isNullOrUndefined(expectedParams) && Object.keys(expectedParams).length > 0) {
        const intersection = Object.keys(actualParams).filter((f) => Object.keys(expectedParams).includes(f));

        //// No properties matched; No way requests are matching
        if (intersection.length == 0 || intersection.length != Object.keys(expectedParams).length) {
          return [];
        }

        for (const [key, value] of Object.entries(actualParams)) {
          if (expectedParams.hasOwnProperty(key) && matched) {
            matched =  util.compare('be', value, expectedParams[key]);
          }
        }
      }

      if (matched) {
        matches.push(request);
      }

    });
    return matches;
  }
}
