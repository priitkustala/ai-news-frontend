// The public half of the Web Push signing key pair (priitkustala/ai-news#50, S-15): the
// applicationServerKey the client hands to pushManager.subscribe, an uncompressed P-256 point
// in base64url. Public by design: it lets the push service check that the backend's notify
// command signed a message, and signs nothing itself. This is a local test value whose private
// half was discarded when it was generated; Release and run replaces it with the public half
// of the real pair, whose private half is the owner's production secret.
export const pushPublicKey: string = 'BBEh-XONCdQQqr7OHuUU36dALp4vJyYMEo6F4Ef45vulF_5mkfczdcUupe9d01c-xCz_aK09KkfSrdyCrDBAHeo';
