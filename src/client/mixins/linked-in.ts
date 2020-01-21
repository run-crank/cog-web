import { Page } from 'puppeteer';

export class LinkedInAwareMixin {
  public client: Page;

  async validateLinkedInInsightTag(pid: number) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const linkedInRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));

    const urls = linkedInRequests.map(l => l.url);
    return Object.values(urls).join('').includes(`pid=${pid.toString()}`);
  }

  async validateLinkedInConversionPixelFired(pid: number, cid: number) {
    await (this as any).waitForNetworkIdle(10000, false);
    const requests = await (this as any).getFinishedRequests();
    const linkedInRequests = requests.filter(r => r.method == 'GET'
                            && (r.url.startsWith('https://px.ads.linkedin.com/collect')
                                || r.url.startsWith('https://dc.ads.linkedin.com/collect')));

    const urls = linkedInRequests.map(l => l.url);
    const values = Object.values(urls).join('');
    return values.includes(`pid=${pid.toString()}`) && values.includes(`cid=${cid.toString()}`);
  }
}
