// What leaves the browser for the counts: the id, the page without its fragment,
// how a command was reached, the settings on the page view, the source, the
// browser as coarse words, a session id; nothing from localhost
export const options = { flags: ['--host-resolver-rules=MAP nanotype.test 127.0.0.1'] };
export const expect = {
    none: 0, pageview: { first: false, theme: 'night', font: 'serif', size: 'm', lines: true, url: 'http://nanotype.test:3002/', profile: false },
    events: 'theme:column | theme:key | menu:key | theme:menu | slash:slash', sameId: true, secondFirst: false, noFragment: true,
    client: 'Chrome Mac OS X Desktop version=true', source: 'nanotype.test:3002|$direct', utm: 'newsletter|email|-', session: 'uuid7=true same=true', leave: true,
    noScreen: true,
};

export default async (t) => {
    const sent = () => t.requests.filter(r => r.url.includes('/stats/')).map(r => JSON.parse(r.body));
    await t.open('/#s=1.abc'); await t.click('.color-flip', 100);
    const out = { none: sent().length };

    const host = t.base.replace('localhost', 'nanotype.test');
    await t.send('Page.navigate', { url: host + '/' }); await t.sleep(1200);
    await t.ev(`localStorage.clear(); localStorage['font-scheme'] = 'font-scheme-serif'; localStorage['font-size'] = '18'; localStorage['scheme'] = 'scheme-night'; localStorage['line-numbers'] = 'true'`);
    await t.send('Page.navigate', { url: host + '/#s=1.abc' }); await t.sleep(1500);
    out.noFragment = sent().every(e => !String(e.properties.$current_url).includes('#'));
    await t.send('Page.navigate', { url: host + '/' }); await t.sleep(1500);
    const pv = sent().filter(e => e.event === '$pageview').pop();
    out.pageview = { first: pv.properties.first_visit, theme: pv.properties.theme, font: pv.properties.font, size: pv.properties.size, lines: pv.properties.lines, url: pv.properties.$current_url, profile: pv.properties.$process_person_profile };
    const id = await t.stored('visitor');
    const before = sent().length;

    await t.click('.color-flip', 150);
    await t.key('e', 'KeyE', 12); await t.sleep(150);
    await t.key('k', 'KeyK', 4); await t.sleep(200); await t.filter('theme light'); await t.key('Enter'); await t.sleep(200);
    await t.focus(); await t.type('/date'); await t.key('Enter'); await t.sleep(200);
    const events = sent().slice(before);
    out.events = events.map(e => e.event + ':' + (e.properties.via || '-')).join(' | ');
    out.sameId = events.every(e => e.distinct_id === id);
    await t.send('Page.navigate', { url: host + '/' }); await t.sleep(1200);
    out.secondFirst = sent().filter(e => e.event === '$pageview').pop().properties.first_visit;

    const all = sent();
    const last = all[all.length - 1].properties;
    out.client = `${last.$browser} ${last.$os} ${last.$device_type} version=${Number.isInteger(last.$browser_version)}`;
    out.source = `${last.$host}|${last.$referring_domain}`;
    out.session = `uuid7=${/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(last.$session_id)} same=${events.every(e => e.properties.$session_id === events[0].properties.$session_id)}`;
    // the leave on pagehide (a real navigation's keepalive request leaves with the old document, unseen by CDP)
    await t.ev(`window.dispatchEvent(new Event('pagehide'))`); await t.sleep(300);
    out.leave = sent().pop().event === '$pageleave';
    out.noScreen = all.every(e => !('$screen_width' in e.properties) && !('$viewport_width' in e.properties));
    await t.send('Page.navigate', { url: host + '/?utm_source=newsletter&utm_medium=email' }); await t.sleep(1200);
    const utm = sent().filter(e => e.event === '$pageview').pop().properties;
    out.utm = `${utm.utm_source}|${utm.utm_medium}|${utm.utm_campaign || '-'}`;

    return out;
};
