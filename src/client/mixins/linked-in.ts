import { Page } from 'puppeteer';
import { URL } from 'url';

export class LinkedInAwareMixin {
  public client: Page;

  async validateLinkedInInsightTag(pid: number) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const validRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));

    const result = validRequests.map(req => new URL(req.url)).filter(url => url.searchParams.get('pid') !== null && url.searchParams.get('pid') == pid);
    return result.length == validRequests.length; //// this means that all linkedin requests contained the right pid
  }

  async validateLinkedInConversionPixelFired(pid: number, cid: number) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const validRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));

    const result = validRequests.map(req => new URL(req.url))
                  .filter(url => url.searchParams.get('pid') !== null && url.searchParams.get('cid') !== null && url.searchParams.get('pid') == pid && url.searchParams.get('cid') == cid);
    return result.length == validRequests.length; //// this means that all linkedin requests contained the right pid and cid
  }
}
