import { Page } from 'puppeteer';
import { URL } from 'url';

export class LinkedInAwareMixin {
  public client: Page;

  async filterLinkedInInsightTag(pid: string) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const validRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));
    const result = validRequests.map(req => new URL(req.url)).filter(url => url.searchParams.get('pid') !== null && url.searchParams.get('pid').split(',').includes(pid));
    return result;
  }

  async filterLinkedInConversionPixelFired(pid: string, cid: string) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const validRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));

    const result = validRequests.map(req => new URL(req.url))
                  .filter(url => url.searchParams.get('pid') !== null && url.searchParams.get('cid') !== null && url.searchParams.get('pid').split(',').includes(pid) && url.searchParams.get('cid').split(',').includes(cid));
    return result;
  }
}
