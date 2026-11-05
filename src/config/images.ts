// The hosts the per-source image policy allows images from (priitkustala/ai-news#46, S-09 plan
// step 4; Locked B-10): the client's Content-Security-Policy is img-src 'self' plus this list,
// which scripts/build.mjs writes into the meta element of index.html at build time. Each entry
// is an origin (scheme, host and port). The local default is the fixture feeds host of the
// local stack, which serves the images of the seeded licensed and owner-accepted hotlink
// sources; the hosts of the real sources for the hosted client belong to Release and run
// (priitkustala/ai-news#56).
export const imageHosts: readonly string[] = ['http://ai-news-feeds:8081'];
