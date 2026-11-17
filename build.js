// Statický generátor webu TJ-ŠK Radošina: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Obsah: zápasy, tabuľky a súpisky 4 tímov zo Sportnetu (data/sportnet.json, scripts/sportnet.mjs), ročníky áčka od 2013/14
// (konečné tabuľky zo Sportnetu), správy z klubu z Radošinských novín, obec z webu obce (data/klub.json), erby zo Sportnetu.
// Podpis vzhľadu „Ročníky“: na erbe klubu je vinohradnícky nôž a strapec hrozna, Radošina je vinárska obec. Úvod ako vinárska
// etiketa, ligové zápasy áčka ako bobule strapca, ročníky ako fľaše na polici (hladina vína = umiestnenie), program ako
// visačky na hrdlách fliaš, výsledky ako dná fliaš v pivnici, menu na telefóne ako visačka. Písmo Cormorant a Jost.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const rd = (f, def) => { const p = path.join(ROOT, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : def; };
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const club = rd('klub.json');
const sn = rd('sportnet.json');
const SPACE = config.sportnet.appSpace;

// ---- pomocné -------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const todayISO = () => local.format(new Date()).slice(0, 10);
const TODAY = process.env.TODAY || todayISO();
const DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DAYS_S = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const MONTHS_G = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const dObj = (iso) => new Date(iso + 'T12:00:00Z');
const dShort = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`; };
const dDay = (iso) => DAYS_S[dObj(iso).getUTCDay()];
const DAYS_ACC = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
const dWhen = (iso) => { const d = dObj(iso); return `${DAYS_ACC[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dLong = (iso) => { const d = dObj(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dDate = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dFull = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`; };
const monthKey = (iso) => iso.slice(0, 7);
const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
// okamih výkopu s posunom časového pásma (letný čas) pre odpočet v prehliadači
function isoLocal(date, time = '12:00') {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const [ld, lt] = local.format(new Date(guess)).split(' ');
  const shown = Date.UTC(...ld.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)), ...lt.split(':').map(Number));
  const off = (shown - guess) / 6e4;
  return `${date}T${time}:00+${String(Math.floor(off / 60)).padStart(2, '0')}:${String(off % 60).padStart(2, '0')}`;
}
const acc = (league) => league.replace(/\bliga\b/, 'ligu'); // 4. pád: hrajú IV. ligu
const vLige = (league) => `${/^IV\./.test(league) ? 'vo' : 'v'} ${esc(league.replace(/\bliga\b/, 'lige'))}`; // 6. pád: vo IV. lige, v VII. lige
const SEASON = sn.season.replace(/^(\d{4})\/\d\d(\d\d)$/, '$1/$2');
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
const zo = (n) => `${/^(4|6|7|1[467]|[467]\d)$/.test(String(n)) ? 'zo' : 'z'} ${n}`; // „zo 16“, „z 11“ (podľa výslovnosti čísla)
const num = (n) => Number(n).toLocaleString('sk-SK');
const nazov = (n) => club.nazvy?.[n] || n; // čitateľný názov súpera (úradné názvy a veľké písmená zo Sportnetu)

// ---- súťaže, tímy, zápasy ------------------------------------------------------------------------
const compName = (name) => club.sutaze[name] || club.sutaze[name.replace(/\s+/g, ' ').trim()] || name.replace(/\s+/g, ' ').replace(/-ObFZ TN/, ' ObFZ Trenčín').replace(/\s*Macron \| yoursport\s*/, ' ').replace(/-/g, ' ').trim();
const ROUND = (r) => (/^\d+$/.test(r) ? `${r}. kolo` : String(r || '').replace(/\.\s*kolo/i, '. kolo').replace(/Kolo/, 'kolo'));
const teams = sn.teams.map((t) => {
  const league = t.competitions.find((c) => !c.cup);
  // tabuľka prípraviek bez zapísaných výsledkov (všetci 0:0, body len za účasť) by klamala, preto sa neukazuje
  const raw = league ? sn.tables[league.key] : null;
  const table = raw && raw.rows.some((r) => r.gf || r.ga) ? raw : null;
  const pos = table?.rows.find((r) => r.our);
  return {
    ...t, url: `timy/${t.slug}/`, code: t.adult ? t.slug[0] : norm(t.short).replace(/-/g, ''),
    full: t.adult ? t.short : `${t.short} ${t.sub}`,
    leagueName: league ? compName(league.name) : '', leagueKey: league?.key || '', table, pos: pos?.pos || null, of: table?.rows.length || 0,
  };
});
// tímy bez zápasu v sezóne (napr. prihlásený tím bez súťaže) sa na webe neukazujú
for (let i = teams.length - 1; i >= 0; i--) if (!sn.matches.some((m) => m.team === teams[i].slug)) teams.splice(i, 1);
const bySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
// kolo bez súpera (voľno) vedie Sportnet ako zápas s prázdnym súperom: na webe by z neho bol riadok bez mena
const matches = sn.matches.filter((m) => String(m.opponent || '').trim() && bySlug[m.team]).map((m) => {
  const t = bySlug[m.team];
  const past = m.played || m.date < TODAY;
  let gf = null, ga = null, res = null;
  // prípravky (U11 a mladší) výsledok nezapisujú, Sportnet pri nich dáva 0:0 bez gólov
  if (m.score === '0:0' && !(m.goals || []).length && /^U(\d|1[01])\b/.test(t.short)) m = { ...m, score: null };
  if (m.score) { const [h, a] = m.score.split(':').map(Number); [gf, ga] = m.home ? [h, a] : [a, h]; res = gf > ga ? 'w' : gf < ga ? 'l' : 'd'; }
  const opponent = nazov(m.opponent);
  const slug = `${m.date}-${t.code}-${norm(opponent)}`;
  return { ...m, opponent, past, gf, ga, res, slug, url: `zapasy/${slug}/`, comp: compName(m.competition), roundName: ROUND(m.round), teamObj: t, cup: /cup|pohár/i.test(m.competition) };
});
const teamMatches = (slug) => matches.filter((m) => m.team === slug);
const upcoming = matches.filter((m) => !m.past);
const results = matches.filter((m) => m.past).reverse();
const RES = { w: 'Výhra', d: 'Remíza', l: 'Prehra' };
const RES_S = { w: 'V', d: 'R', l: 'P' };
const noScore = (m) => (m.teamObj.adult ? 'Sportnet výsledok neuvádza' : 'Výsledky prípraviek sa nezapisujú');

// strelci tímu v sezóne (vlastné góly sa nerátajú)
function scorers(slug) {
  const c = new Map();
  for (const m of teamMatches(slug)) for (const g of m.goals || []) if (g.side === 'our' && g.kind !== 'own' && g.player) c.set(g.player, (c.get(g.player) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sk'));
}
function record(slug, filter = () => true) {
  const r = { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0 };
  for (const m of teamMatches(slug)) if (m.res && filter(m)) { r[m.res]++; r.gf += m.gf; r.ga += m.ga; r.n++; }
  return r;
}

// ---- erby ----------------------------------------------------------------------------------------
const CREST_R = 0.9; // erb je štít 480 × 532
const logoFile = (space) => space && fs.existsSync(path.join(SRC, 'img', 'kluby', `${space}.webp`));
const initials = (name) => String(name).replace(/^(TJ|OŠK|OFK|ŠK|FK|FC|MFK|MŠK|PFK|TFK|PŠK|ZFC|OTJ|AFC|TTS|Telovýchovná jednota)\s+/i, '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function logo(space, name, R, size = 40, eager = false) {
  if (space === SPACE) return `<img class="logo" src="${R}img/erb-128.webp" alt="" width="${Math.round(size * CREST_R)}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  if (logoFile(space)) return `<img class="logo" src="${R}img/kluby/${space}.webp" alt="" width="${size}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  return `<span class="logo logo--txt" aria-hidden="true">${esc(initials(name))}</span>`;
}

// ---- ikony (Lucide, ISC) -------------------------------------------------------------------------
const ico = (p, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  mail: ico('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  phone: ico('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: ico('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  route: ico('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
  cal: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  ext: ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  arrow: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  ball: ico('<circle cx="12" cy="12" r="10"/><path d="m12 7 4.2 3-1.6 5H9.4L7.8 10z"/><path d="M12 2v5M21.5 9.5 16.2 10M18 20l-3.4-5M6 20l3.4-5M2.5 9.5l5.3.5"/>'),
  trophy: ico('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>'),
  music: ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  users: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
};

// ---- CSP a rozloženie ----------------------------------------------------------------------------
// GitHub Pages nedovolí hlavičky, preto <meta>: skripty len z webu, jediný inline skript HEAD_JS povolený hashom.
// Inline atribút style CSP nepustí, preto sa výšky (hladina vína vo fľaši, bobule strapca) kreslia v SVG atribútoch.
// .flt: zoznam zápasov s filtrom v adrese (?tim=, ?kde=) je neviditeľný, kým ho site.mjs nevyfiltruje (inak skáče);
// pri zlyhaní site.mjs ho odkryje udalosť load
const HEAD_JS = `var d=document.documentElement;d.classList.add('js');if(/[?&](tim|kde)=/.test(location.search)){d.classList.add('flt');addEventListener('load',function(){d.classList.remove('flt')})}`;
const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const CONNECT = ["'self'", ...(config.supabase?.url ? [new URL(config.supabase.url).origin] : [])];
const CSP = [
  "default-src 'none'", `script-src 'self' ${sha256(HEAD_JS)}`, "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  `connect-src ${CONNECT.join(' ')}`, "base-uri 'none'", "form-action 'none'", "object-src 'none'", "manifest-src 'self'",
].join('; ');

const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['mladez/', 'Mládež'], ['klub/', 'Klub a ročníky'], ['ihrisko/', 'Ihrisko'], ['kontakt/', 'Kontakt']];
const ST = club.stadion;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ST.geo.join(',')}`;
const mapyUrl = `https://mapy.com/s/?q=${ST.geo.join(',')}`;
const A = teams[0];
const DESC = `${club.nazov} – futbal v Radošine od roku ${club.zalozenie}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}), dorastu, žiakov a prípravky, ročníky áčka od 2013/14 a titul majstra okresu 2024/25.`;
const nextHome = upcoming.find((m) => m.home && m.team === A.slug);
const winterNow = (() => { const n = upcoming.find((m) => m.team === A.slug); return !!n && (dObj(n.date) - dObj(TODAY)) / 864e5 > 14; })();

// strapec hrozna: každá bobuľa je jeden ligový zápas áčka v ročníku, najnovší na špičke, farba podľa výsledku
function strapec(list, label) {
  const ms = [...list].reverse();
  const rows = [];
  for (let i = 0, w = 1; i < ms.length; i += w, w++) rows.push(ms.slice(i, i + w));
  rows.reverse();
  const r = 11, dx = 24, dy = 20.5, maxW = Math.max(1, ...rows.map((x) => x.length));
  const W = Math.max(maxW * dx + 24, 150), top = 80, H = top + (rows.length - 1) * dy + r + 6, cx = W / 2;
  const berries = rows.map((row, ri) => row.map((m, ci) => {
    const x = cx + (ci - (row.length - 1) / 2) * dx, y = top + ri * dy;
    return `<g class="bb bb--${m.res}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/><circle class="bb-h" cx="${(x - 3.6).toFixed(1)}" cy="${(y - 4).toFixed(1)}" r="2.6"/></g>`;
  }).join('')).join('');
  const leaf = 'M0 0C-6-2-16 0-20-6C-24-12-18-16-14-15C-20-22-16-30-8-27C-6-34 0-38 4-33C10-36 18-30 14-24C20-20 22-12 16-9C12-3 6 0 0 0Z';
  return `<svg class="grape" viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="${esc(label)}" focusable="false">
  <path class="g-stem" d="M${cx} ${top - r - 1}C${cx} ${top - 24} ${cx + 3} ${top - 34} ${cx + 9} ${top - 44}"/>
  <g transform="translate(${cx + 9} ${top - 44}) rotate(32)"><path class="g-leaf" d="${leaf}"/><path class="g-vein" d="M0 0-14-12M0 0 1-30M0 0 13-16"/></g>
  <path class="g-tendril" d="M${cx + 2} ${top - 30}c-10 -2 -16 -10 -10 -16c4 -4 10 0 6 5"/>
  ${berries}
</svg>`;
}
const berryKey = (rec) => `<ul class="g-key">${[['w', 'výhra', 'výhry', 'výhier'], ['d', 'remíza', 'remízy', 'remíz'], ['l', 'prehra', 'prehry', 'prehier']].map(([k, a, b, c]) => `<li><span class="k k--${k}" aria-hidden="true"></span>${plural(rec[k], a, b, c)}</li>`).join('')}</ul>`;

// ročníky áčka ako fľaše na polici: hladina vína = umiestnenie (plná fľaša = 1. miesto), majster má zlatú kapsulu
let shelfN = 0;
function shelf() {
  const list = [...club.rocniky.zoznam, ...(A.pos ? [{ rok: SEASON, liga: A.leagueName, poz: A.pos, z: A.of, now: true }] : [])];
  const id = `btl${++shelfN}`;
  const body = 'M16 2h8v24c0 5 10 9 10 19v70a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V45c0-10 10-14 10-19Z';
  return `<div class="shelf-wrap"><svg class="shelf-defs" width="0" height="0" aria-hidden="true" focusable="false"><clipPath id="${id}"><path d="${body}"/></clipPath></svg>
  <ol class="shelf">${list.map((x) => {
    const lvl = x.poz ? (1 - (x.poz - 1) / Math.max(1, x.z - 1)) * 0.92 + 0.04 : 0;
    const y = (119 - lvl * 79).toFixed(1);
    const sr = `${x.rok}, ${x.liga}: ${x.poz ? `${x.poz}. miesto ${zo(x.z)}` : 'bez umiestnenia'}${x.body != null ? `, ${plural(x.body, 'bod', 'body', 'bodov')}` : ''}${x.skore ? `, skóre ${x.skore}` : ''}${x.now ? ', priebežne po jeseni' : ''}${x.pozn ? `, ${x.pozn}` : ''}`;
    return `<li class="btl${x.majster ? ' btl--gold' : ''}${x.now ? ' btl--now' : ''}${x.poz ? '' : ' btl--empty'}">
    <svg class="btl-s" viewBox="0 0 40 120" aria-hidden="true" focusable="false"><g clip-path="url(#${id})"><rect class="btl-glass" width="40" height="120"/><rect class="btl-wine" y="${y}" width="40" height="${(120 - y).toFixed(1)}"/><rect class="btl-cap" width="40" height="15"/><rect class="btl-lab" x="9" y="72" width="22" height="24" rx="1"/></g><path class="btl-o" d="${body}"/></svg>
    <span class="btl-p" aria-hidden="true">${x.poz ? `${x.poz}.` : '–'}</span><span class="btl-y" aria-hidden="true">${esc(x.rok.replace(/^20(\d\d)\/(\d\d)$/, '$1/$2'))}</span>
    <span class="sr">${esc(sr)}</span>
  </li>`;
  }).join('')}</ol></div>`;
}
const LIGA_S = (l) => (/^([IVX]+)\./.exec(l) || ['', ''])[1];

// menu: na počítači v riadku vpravo, na telefóne visačka zavesená pod tlačidlom (<dialog>)
function layout({ route, title, desc, body, active, bodyClass = '' }) {
  const depth = route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const cur = (u) => (active && active === u ? ' aria-current="page"' : '');
  const fullTitle = (config.ukazka ? 'Návrh webu – ' : '') + (route ? `${title} | ${club.nazov}` : `${club.nazov} – ${title}`);
  const canon = config.siteUrl ? `${config.siteUrl}${route}` : '';
  const ld = route ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SportsClub', name: club.nazov, legalName: club.pravnyNazov, sport: 'Futbal', foundingDate: String(club.zalozenie),
    email: club.kontakt.email,
    address: { '@type': 'PostalAddress', streetAddress: club.adresa[0], postalCode: club.adresa[1].slice(0, 6), addressLocality: club.mesto, addressCountry: 'SK' },
    location: { '@type': 'StadiumOrArena', name: ST.nazov, geo: { '@type': 'GeoCoordinates', latitude: ST.geo[0], longitude: ST.geo[1] } },
    sameAs: [club.sportnetUrl],
  }).replace(/</g, '\\u003c')}</script>`;
  const li = ([u, t]) => `<li><a href="${R}${u}"${cur(u)}>${t}</a></li>`;
  return `<!doctype html>
<html lang="sk" data-root="${R}"${config.ukazka ? ' class="has-demo"' : ''}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || DESC)}">
${config.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canon ? `<link rel="canonical" href="${canon}">\n` : ''}<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta name="theme-color" content="#0d2140">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
<link rel="preload" href="${R}fonts/cormorant-700.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/jost-400.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/jost-500.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${R}css/site.css">
<script>${HEAD_JS}</script>
<script type="module" src="${R}js/site.mjs"></script>
${ld}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#obsah">Preskočiť na obsah</a>
${config.ukazka ? '<p class="demo">Návrh webu · nie je to oficiálna stránka klubu</p>' : ''}
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="${R}"${route ? '' : ' aria-current="page"'}><img src="${R}img/erb-128.webp" alt="" width="42" height="47"><span class="brand-t"><span class="brand-n">${esc(club.nazov)}</span><span class="brand-s">ročník ${SEASON}<span class="brand-x"> · od ${club.zalozenie}</span></span></span><span class="sr">, úvod</span></a>
    <nav class="nav" aria-label="Hlavné menu"><ul>${NAV.map(li).join('')}</ul></nav>
    <button class="menu-btn" type="button" aria-haspopup="dialog" aria-controls="menu">${I.menu}<span>Menu</span></button>
  </div>
</header>
<dialog class="menu" id="menu" aria-label="Menu">
  <div class="htag">
    <div class="htag-top"><span class="htag-k">Ročník ${SEASON}</span><button class="menu-x" type="button" data-close>${I.close}<span>Zavrieť</span></button></div>
    <nav aria-label="Menu na telefóne"><ol class="htag-nav"><li><a href="${R}"${route ? '' : ' aria-current="page"'}>Úvod</a></li>${NAV.map(li).join('')}</ol></nav>
    <p class="htag-foot">${esc(club.pokrik)}</p>
  </div>
</dialog>
<main id="obsah">
${body}
</main>
<footer class="ftr">
  <div class="wrap ftr-grid">
    <div class="ftr-club">
      <img src="${R}img/erb-240.webp" alt="" width="72" height="80" loading="lazy">
      <p class="ftr-cry">${esc(club.pokrik)}</p>
      <p class="ftr-motto">${esc(club.nazov)}, futbal v Radošine od roku ${club.zalozenie}.</p>
    </div>
    <div><h2 class="ftr-h">Ihrisko</h2><p>${esc(ST.nazov)}<br>${club.adresa.map(esc).join(', ')}</p><p><a href="${mapsUrl}" rel="noopener">Navigovať na ihrisko</a></p>${nextHome ? `<p>Najbližšie doma: <a href="${R}${nextHome.url}">${dShort(nextHome.date)} o ${esc(nextHome.time || '')} proti ${esc(nextHome.opponent)}</a></p>` : ''}</div>
    <div><h2 class="ftr-h">Kontakt</h2><p>${esc(club.pravnyNazov)}<br><a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email).replace('@', '<wbr>@')}</a></p></div>
    <div><h2 class="ftr-h">Zdroje</h2><p>Výsledky zo Sportnetu (Futbalnet), aktualizované ${dFull(sn.updated.slice(0, 10))}. Správy z klubu a obce podľa Radošinských novín.</p><p><a href="${club.sportnetUrl}" rel="noopener">Klub na Sportnete</a></p></div>
  </div>
  <div class="ftr-bar"><div class="wrap ftr-bar-in"><span>© ${new Date().getFullYear()} ${esc(club.pravnyNazov)}</span><a href="${R}ochrana-sukromia/">Ochrana súkromia</a>${config.adminDemo ? `<a href="${R}admin/">Administrácia (ukážka)</a>` : ''}</div></div>
</footer>
</body>
</html>
`;
}

// ---- spoločné bloky ------------------------------------------------------------------------------
// hlavička podstránky: krémový pás s nadpisom, vpravo riadky vinohradu (CSS), dole dvojitá linka ako okraj etikety
const pageHead = ({ title, sub = '', crumbs = [], R, aside = '' }) => `<section class="phead"><div class="wrap phead-in">
  <div>${crumbs.length ? `<nav class="crumbs" aria-label="Omrvinky"><a href="${R}">Úvod</a>${crumbs.map(([u, t]) => u ? `<a href="${R}${u}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`).join('')}</nav>` : ''}
  <h1 class="h1">${esc(title).replace(/(^|\s)(TJ|FK|FC|MFK|MFC|OŠK|ŠK|OFK|MŠK|PFK|ZFC|TFK|SDM|AFC|OTJ|ŠC) (?=\S)/g, `$1$2${NB}`)}</h1>${sub ? `<p class="phead-sub">${sub}</p>` : ''}</div>${aside}
</div></section>`;
const secHead = (h, id, moreLink = '', eyebrow = '') => `<div class="sec-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="h2" id="${id}">${h}</h2></div>${moreLink}</div>`;
const more = (href, t) => `<a class="more" href="${href}">${t}${I.arrow}</a>`;
const venueName = (v) => v.replace(/\s+/g, ' ').trim();

// zápasová karta ako vinárska etiketa s vykrojenými rohmi: domáci – skóre – hostia, výsledok veľkým pätkovým písmom
function card(m, R, { big = false, label = '', self = false } = {}) {
  const ourName = m.teamObj.adult ? club.nazov : `${club.kratky} ${m.teamObj.short}`;
  const us = { name: ourName, space: SPACE }, them = { name: m.opponent, space: m.oppSpace };
  const [h, a] = m.home ? [us, them] : [them, us];
  const lbl = label || (m.score || m.past ? 'Posledný zápas' : 'Najbližší zápas');
  const side = (t, role) => `<div class="mp-side${t.space === SPACE ? ' is-us' : ''}"><span class="mp-crest">${logo(t.space, t.name, R, big ? 56 : 44, big)}</span><span class="mp-name">${esc(t.name)}</span><span class="mp-role">${role}</span></div>`;
  let mid, note = '';
  if (m.score) { mid = `<span class="sr">Výsledok </span>${esc(m.score).replace(':', '<span class="mp-colon">:</span>')}`; note = `<span class="mp-res mp-res--${m.res}">${RES[m.res]}</span>${m.half ? `<span>polčas ${esc(m.half)}</span>` : ''}`; }
  else if (m.past) { mid = '<span aria-hidden="true">–</span>'; note = `<span>${noScore(m)}</span>`; }
  else { mid = `<span class="mp-time"><span class="sr">Výkop o </span>${esc(m.time || '–')}</span>`; note = `<span class="cd" data-kickoff="${isoLocal(m.date, m.time)}" hidden></span>`; }
  const links = [];
  if (m.score && m.detail && !self) links.push(`<a class="mp-a" href="${R}${m.url}">Priebeh a zostavy${I.arrow}</a>`);
  if (!m.past && !self) links.push(`<a class="mp-a" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Do kalendára</a>`);
  const meta = [esc(m.comp) + (m.roundName ? `, ${esc(m.roundName)}` : ''), m.venue ? esc(venueName(m.venue)) : '', m.audience ? plural(m.audience, 'divák', 'diváci', 'divákov') : ''].filter(Boolean);
  return `<article class="mp${big ? ' mp--big' : ''}">
  <p class="mp-top"><span class="mp-label">${esc(lbl)}</span><span>${esc(m.teamObj.full)}</span></p>
  <p class="mp-when"><time datetime="${m.date}">${dLong(m.date)}</time></p>
  <div class="mp-row">${side(h, 'domáci')}<p class="mp-score">${mid}</p>${side(a, 'hostia')}</div>
  <p class="mp-note">${note}</p>
  <p class="mp-meta">${meta.join('<span aria-hidden="true">&nbsp;· </span>')}</p>
  ${links.length ? `<p class="mp-links">${links.join('')}</p>` : ''}
</article>`;
}

// zoznam zápasov: program ako visačky na hrdlách fliaš (dátum, čas, súper), výsledky ako dná fliaš v pivnici so skóre
function matchRow(m, R, { showTeam = true } = {}) {
  const href = m.detail || !m.past ? ` href="${R}${m.url}"` : '';
  const tag = href ? 'a' : 'div';
  const where = m.home ? 'doma' : 'vonku';
  const comp = esc(m.cup ? m.comp : m.roundName || m.comp);
  if (!m.past) {
    return `<li class="mrow mrow--tag" data-team="${m.team}" data-where="${where}"><${tag} class="vt"${href}>
  <span class="vt-d"><time datetime="${m.date}">${dShort(m.date)}</time><span>${dDay(m.date)} · ${esc(m.time || '–')}</span></span>
  <span class="vt-o">${esc(m.opponent)}</span>
  <span class="vt-k">${showTeam ? `<b>${esc(m.teamObj.short)}</b> · ` : ''}${where}, ${comp}</span>
</${tag}></li>`;
  }
  return `<li class="mrow mrow--btl" data-team="${m.team}" data-where="${where}"><${tag} class="bt bt--${m.res || 'n'}"${href}>
  <span class="bt-c">${m.score ? `<span class="sr">${RES[m.res]}, </span><span class="bt-s">${esc(m.score)}</span><span class="bt-r" aria-hidden="true">${RES[m.res]}</span>` : '<span class="bt-na">bez výsledku</span>'}</span>
  <span class="bt-l"><span class="bt-o">${esc(m.opponent)}</span><span class="bt-k">${dShort(m.date)}${showTeam ? ` · ${esc(m.teamObj.short)}` : ''} · ${where}</span></span>
</${tag}></li>`;
}
const matchList = (list, R, opts) => `<ol class="mlist ${list.length && list.every((m) => m.past) ? 'mlist--cellar' : 'mlist--tags'}">${list.map((m) => matchRow(m, R, opts)).join('')}</ol>`;

function tableHtml(tb, R, { compact = false, caption = '' } = {}) {
  let rows = tb.rows;
  if (compact) { const i = rows.findIndex((r) => r.our); const from = Math.max(0, Math.min(i - 2, rows.length - 5)); rows = rows.slice(from, from + 5); }
  return `<div class="tbl-wrap"><table class="tbl">${caption ? `<caption>${caption}</caption>` : ''}
  <thead><tr><th scope="col"><abbr title="Poradie">#</abbr></th><th scope="col" class="tl">Tím</th><th scope="col"><abbr title="Zápasy">Z</abbr></th><th scope="col" class="hm"><abbr title="Výhry">V</abbr></th><th scope="col" class="hm"><abbr title="Remízy">R</abbr></th><th scope="col" class="hm"><abbr title="Prehry">P</abbr></th><th scope="col">Skóre</th><th scope="col"><abbr title="Body">B</abbr></th></tr></thead>
  <tbody>${rows.map((r) => `<tr${r.our ? ' class="our"' : ''}><td class="pos">${r.pos}</td><th scope="row" class="tl"><span class="tteam">${logo(r.space, r.name, R, 24)}<span>${esc(nazov(r.name))}</span></span></th><td>${r.played}</td><td class="hm">${r.won}</td><td class="hm">${r.draw}</td><td class="hm">${r.lost}</td><td class="nw">${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody>
</table></div>`;
}
// forma ako rad bobúľ
const formHtml = (slug, n = 5) => {
  const last = teamMatches(slug).filter((m) => m.res).slice(-n);
  return last.length ? `<ol class="form" aria-label="Forma: ${last.length === 1 ? 'posledný zápas' : last.length <= 4 ? `posledné ${last.length} zápasy` : `posledných ${last.length} zápasov`}">${last.map((m) => `<li class="res-bg--${m.res}" title="${dShort(m.date)} ${esc(m.opponent)} ${m.score}"><span aria-hidden="true">${RES_S[m.res]}</span><span class="sr">${RES[m.res]} ${esc(m.opponent)} ${m.score}</span></li>`).join('')}</ol>` : '';
};

// kalendár zápasov (.ics): odber cez webcal/Google doplní site.mjs, inak stiahnutie
const calBox = (file, R, id) => `<details class="cal" data-cal id="${id}">
  <summary class="btn btn--line">${I.cal}<span>Zápasy do kalendára</span></summary>
  <div class="cal-pop">
    <a class="cal-o" data-webcal href="${R}kalendar/${file}" hidden><b>Odoberať v telefóne</b><span>iPhone, Mac, Outlook – rozpis sa sám aktualizuje</span></a>
    <a class="cal-o" data-gcal href="${R}kalendar/${file}" rel="noopener" hidden><b>Pridať do Google Kalendára</b><span>aj pre Android</span></a>
    <a class="cal-o" data-ics href="${R}kalendar/${file}" download><b>Stiahnuť súbor .ics</b><span>jednorazovo, bez aktualizácií</span></a>
  </div>
</details>`;

// výber zápasu: zápas v najbližších 7 dňoch, inak posledný odohraný (zimná prestávka), inak najbližší
function cardPick(slug) {
  const list = teamMatches(slug);
  const next = list.find((m) => !m.past);
  const last = [...list].reverse().find((m) => m.past && (m.score || !m.teamObj.adult));
  const soon = next && (dObj(next.date) - dObj(TODAY)) / 864e5 <= 7;
  return soon ? next : last || next;
}

// mládež na úvode: menovky tímov s posledným výsledkom alebo najbližším zápasom
function teamsBoard(R, list) {
  return `<ul class="tb">${list.map((t) => {
    const m = cardPick(t.slug);
    if (!m) return '';
    const href = m.detail || !m.past ? `${R}${m.url}` : `${R}${t.url}`;
    const right = m.score
      ? `<span class="tb-score res-bg--${m.res}"><span class="sr">${RES[m.res]} </span>${esc(m.score)}</span>`
      : m.past ? '<span class="tb-score tb-score--none">bez výsl.</span>' : `<span class="tb-score tb-score--time">${esc(m.time || '')}</span>`;
    return `<li><a class="tb-row" href="${href}">
    <span class="tb-code">${esc(t.short)}</span>
    <span class="tb-main"><span class="tb-top">${esc(t.sub)}&nbsp;· ${dDay(m.date)} ${dShort(m.date)}&nbsp;· ${m.home ? 'doma' : 'vonku'}</span><span class="tb-opp">${esc(m.opponent)}</span></span>
    ${right}
  </a></li>`;
  }).join('')}</ul>`;
}

// tímy podľa vekových skupín
const GROUPS = [['Muži', (t) => t.adult], ['Dorast', (t) => /dorast/i.test(t.sub)], ['Žiaci', (t) => /žia(ci|čky)/i.test(t.sub)], ['Prípravka', (t) => /prípravka/i.test(t.sub)]];
function teamGrid(R, only = () => true) {
  return '<ul class="tgrid">' + teams.filter(only).map((t) => `<li class="tcard${t.adult ? ' tcard--a' : ''}"><a href="${R}${t.url}">
  <span class="tcard-n">${esc(t.short)}</span>
  <span class="tcard-s">${esc(t.adult ? 'Muži' : t.sub)}</span>
  <span class="tcard-l">${esc(t.leagueName)}</span>
  ${t.pos ? `<span class="tcard-p"><b>${t.pos}.</b> ${zo(t.of)}</span>` : '<span class="tcard-p">bez tabuľky</span>'}
  ${coachOf(t) ? `<span class="tcard-k">tréner ${esc(coachOf(t))}</span>` : ''}
</a></li>`).join('') + '</ul>';
}

// ---- stránky -----------------------------------------------------------------------------------
const pages = [];
const add = (route, opts) => pages.push({ route, ...opts });
const crewRole = { coach: 'Tréner', assist_coach: 'Asistent trénera', coach_goalkeepers: 'Tréner brankárov', manager: 'Vedúci mužstva', doctor: 'Lekár', physiotherapist: 'Fyzioterapeut', masseur: 'Masér', club_representative: 'Zástupca klubu', security_manager: 'Hlavný usporiadateľ', other: 'Člen realizačného tímu' };
const POS = [['goalkeeper', 'Brankári'], ['defender', 'Obrancovia'], ['midfielder', 'Stredopoliari'], ['forward', 'Útočníci'], ['', 'Hráči']];
const coachOf = (t) => t.squad.crew.find((c) => c.role === 'coach')?.name || t.squad.crew.find((c) => c.role === 'manager')?.name || '';
const leagueMatches = (slug) => teamMatches(slug).filter((m) => !m.cup && m.res);
const T = club.titul;

// úvod
add('', {
  title: `futbal v Radošine od roku ${club.zalozenie}`, active: '', bodyClass: 'home',
  body: (R) => {
    const nextAll = upcoming.slice(0, 6);
    const lastAll = results.filter((m) => m.score).slice(0, 6);
    const lg = record(A.slug, (m) => !m.cup);
    const top = scorers(A.slug);
    const row = A.table?.rows.find((r) => r.our);
    const first = upcoming[0];
    const aNext = upcoming.find((m) => m.team === A.slug);
    const winter = first && (dObj(first.date) - dObj(TODAY)) / 864e5 > 14;
    const winterText = !first ? '' : aNext && aNext.date === first.date
      ? `Jar sa začína ${dWhen(first.date)}, áčko v ten deň hrá ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}.`
      : `Prvé jarné zápasy sú ${dWhen(first.date)} (${esc(first.teamObj.full)})${aNext ? `, áčko začína ${dWhen(aNext.date)} ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}` : ''}.`;
    const aPick = cardPick(A.slug);
    const youth = teams.filter((t) => !t.adult);
    const lm = leagueMatches(A.slug);
    const prev = club.rocniky.zoznam.at(-1);
    return `<section class="hero" aria-labelledby="hero-h"><div class="wrap hero-in">
  <div class="label">
    <p class="label-k"><span>Ročník</span> ${SEASON}</p>
    <img class="label-crest" src="${R}img/erb-240.webp" alt="" width="108" height="120" fetchpriority="high">
    <h1 class="label-h" id="hero-h">${esc(club.nazov)}</h1>
    <p class="label-s">futbal v Radošine od roku ${club.zalozenie}</p>
    <dl class="label-dl">
      <div><dt>Súťaž</dt><dd>${esc(A.leagueName)}</dd></div>
      ${A.pos ? `<div><dt>${winterNow ? 'Po jeseni' : 'Poradie'}</dt><dd>${A.pos}. ${zo(A.of)}</dd></div>` : ''}
      <div><dt>Tímy</dt><dd>${teams.length}</dd></div>
    </dl>
    <p class="label-cry">${esc(club.pokrik)}</p>
  </div>
  <div class="hero-side">
    ${lm.length ? `<figure class="hero-grape">${strapec(lm, `Strapec ročníka ${SEASON}: ${plural(lm.length, 'ligový zápas', 'ligové zápasy', 'ligových zápasov')} áčka, ${plural(lg.w, 'výhra', 'výhry', 'výhier')}, ${plural(lg.d, 'remíza', 'remízy', 'remíz')}, ${plural(lg.l, 'prehra', 'prehry', 'prehier')}`)}
      <figcaption><b>Strapec ročníka.</b> Každá bobuľa je jeden ligový zápas áčka, najnovší visí dole na špičke.${berryKey(lg)}</figcaption></figure>` : ''}
    <p class="hero-p">Majster okresu ${esc(club.rocniky.zoznam.find((x) => x.majster)?.rok || '')}. ${prev ? `V prvom ročníku po postupe skončila Radošina vo VI. lige na ${prev.poz}. mieste, teraz hrá druhý ročník medzi ${A.of} tímami Severovýchodu. ` : ''}Po desiatich rokoch zase aj s dorastom.</p>
    <p class="hero-cta"><a class="btn btn--sky" href="${R}zapasy/">Program a výsledky</a><a class="btn btn--ghost" href="${R}klub/">Ročníky áčka</a></p>
  </div>
</div></section>
${winterText && winter ? `<section class="pause"><div class="wrap"><p><b>Zimná prestávka.</b> ${winterText}</p></div></section>` : ''}
<section class="sec" aria-labelledby="now-h"><div class="wrap now">
  <div>${secHead('Zápas áčka', 'now-h', '', esc(A.leagueName))}${aPick ? card(aPick, R, { big: true }) : ''}</div>
  <div><h2 class="h3 now-h2">Mládež</h2>${teamsBoard(R, youth)}${more(`${R}mladez/`, 'Dorast, žiaci a prípravka')}</div>
</div></section>
<section class="sec sec--cream" aria-labelledby="prog-h"><div class="wrap">
  ${secHead('Program a výsledky', 'prog-h', more(`${R}zapasy/`, 'Všetky zápasy'), 'Visačky a pivnica')}
  <div class="cols2">
    <div><h3 class="h3">Najbližšie <small>visačky s dátumom a časom</small></h3>${nextAll.length ? matchList(nextAll, R) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Posledné výsledky <small>z pivnice</small></h3>${matchList(lastAll, R)}</div>
  </div>
</div></section>
${A.table ? `<section class="sec" aria-labelledby="liga-h"><div class="wrap">
  ${secHead(`Áčko, ${esc(A.leagueName)}`, 'liga-h', more(`${R}tabulky/#${A.slug}`, 'Celá tabuľka'))}
  <div class="liga">
    <div class="liga-pos"><p class="liga-n">${A.pos}.</p><p>miesto ${zo(A.of)} · ${plural(row.pts, 'bod', 'body', 'bodov')} · skóre ${lg.gf}:${lg.ga}</p></div>
    <div>${tableHtml(A.table, R, { compact: true, caption: `<span class="sr">Výrez tabuľky okolo ${esc(club.nazov)}</span>` })}</div>
    <div class="liga-side">
      <div class="liga-row"><h3 class="h4">Forma</h3>${formHtml(A.slug)}</div>
      ${top.length ? `<div class="liga-row liga-row--list"><h3 class="h4">Strelci áčka</h3><ol class="scorers">${top.slice(0, 4).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol></div>` : ''}
    </div>
  </div>
</div></section>` : ''}
<section class="sec sec--navy" aria-labelledby="roc-h"><div class="wrap">
  ${secHead('Ročníky áčka', 'roc-h', more(`${R}klub/#rocniky`, 'Všetky ročníky v tabuľke'), 'Vinotéka')}
  <p class="lead">Každý ročník od 2013/14 ako fľaša na polici. Hladina vína ukazuje konečné umiestnenie: plná fľaša je prvé miesto, prázdna posledné. Zlatú kapsulu má majstrovský ročník.</p>
  ${shelf()}
</div></section>
<section class="sec" aria-labelledby="tit-h"><div class="wrap title">
  <div class="title-score" aria-hidden="true"><span>54</span><i>:</i><span>53</span><small>body Radošina – Čermany, 2024/25</small></div>
  <div>
    <p class="eyebrow">Majster okresu 2024/25</p>
    <h2 class="h2 h2--it" id="tit-h">${esc(T.nadpis)}</h2>
    ${T.odseky.map((p) => `<p>${esc(p)}</p>`).join('')}
    <blockquote class="quote"><p>„${esc(T.citat)}“</p><footer>${esc(T.citatKto)}</footer></blockquote>
    <p class="src">Zdroj: Radošinské noviny 2/2025, konečná tabuľka zo Sportnetu.</p>
  </div>
</div></section>
<section class="sec sec--cream" aria-labelledby="ml-h"><div class="wrap">
  ${secHead('Mladé ročníky', 'ml-h', more(`${R}mladez/`, 'Mládež a nábor'), 'Mládež')}
  <p class="lead">Dorast sa do Radošiny vrátil v roku 2025 po desiatich rokoch, od ročníka ${SEASON} pribudli starší žiaci U15. Najmenší hrajú v prípravke U11.</p>
  ${teamGrid(R, (t) => !t.adult)}
</div></section>
<section class="sec" aria-labelledby="ob-h"><div class="wrap">
  ${secHead('Radošina', 'ob-h', more(`${R}klub/#obec`, 'Viac o obci'), 'Obec pod Považským Inovcom')}
  <ol class="facts5">${club.obec.fakty.map((f) => `<li><p class="f5-k">${esc(f.k)}</p><p>${esc(f.t)}</p></li>`).join('')}</ol>
  <p class="src">Zdroj: web obce Radošina (Dejiny obce, Kultúrne pamiatky), TASR, Visit Bratislava.</p>
</div></section>
<section class="sec sec--navy" aria-labelledby="ih-h"><div class="wrap pitch">
  <div>
    ${secHead(esc(ST.nazov), 'ih-h', '', `${esc(ST.ulica)}, Radošina`)}
    <ul class="mini">${ST.upravy.map((u) => `<li><b>${esc(u.rok)}</b> ${esc(u.text)}</li>`).join('')}</ul>
    <p class="btns"><a class="btn btn--sky" href="${mapsUrl}" rel="noopener">${I.route}Navigovať</a><a class="btn btn--ghost" href="${R}ihrisko/">O ihrisku</a></p>
  </div>
  ${nextHome ? `<div class="pitch-next"><p class="eyebrow">Najbližšie doma</p>${card(nextHome, R)}</div>` : ''}
</div></section>`;
  },
});

// zápasy
add('zapasy/', {
  title: 'Zápasy a výsledky', active: 'zapasy/', desc: `Program a výsledky všetkých tímov ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => {
    const grp = (list) => {
      const months = new Map();
      for (const m of list) { const k = monthKey(m.date); if (!months.has(k)) months.set(k, []); months.get(k).push(m); }
      return [...months].map(([k, l]) => `<section class="month" data-month><h3 class="month-h">${monthName(k)}</h3>${matchList(l, R)}</section>`).join('');
    };
    return `${pageHead({ title: 'Zápasy a výsledky', sub: `Ročník ${SEASON}, všetky tímy. Výsledky, góly a karty preberáme zo Sportnetu.`, R, crumbs: [[null, 'Zápasy']] })}
<section class="sec sec--first"><div class="wrap">
  <div class="filters" data-filters>
    <div class="chips" role="group" aria-label="Tím"><button type="button" class="chip" data-f-team="" aria-pressed="true">Všetky</button>${teams.map((t) => `<button type="button" class="chip" data-f-team="${t.slug}" aria-pressed="false">${esc(t.short)}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Miesto"><button type="button" class="chip" data-f-where="" aria-pressed="true">Doma aj vonku</button><button type="button" class="chip" data-f-where="doma" aria-pressed="false">Doma</button><button type="button" class="chip" data-f-where="vonku" aria-pressed="false">Vonku</button></div>
  </div>
  <div class="cols2 cols2--list">
    <section aria-labelledby="z-prog"><h2 class="h2" id="z-prog">Program</h2>${upcoming.length ? grp(upcoming) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}<p class="empty" data-empty hidden>Pre tento výber nie je naplánovaný žiadny zápas.</p></section>
    <section aria-labelledby="z-vys"><h2 class="h2" id="z-vys">Výsledky</h2>${grp(results)}<p class="empty" data-empty hidden>Pre tento výber zatiaľ nie je žiadny výsledok.</p></section>
  </div>
  <div class="cal-row">${calBox('vsetky.ics', R, 'cal-vsetky')}</div>
</div></section>`;
  },
});

// detail zápasu
function lineupHtml(l, title) {
  if (!l || (!l.start.length && !l.subs.length)) return '';
  const li = (p) => `<li><span class="ln-nr">${esc(p.nr)}</span><span>${esc(p.name)}${p.c ? ' <abbr class="cap" title="kapitán">C</abbr>' : ''}</span></li>`;
  return `<div class="lineup"><h3 class="h4">${esc(title)}</h3><ol class="ln">${l.start.map(li).join('')}</ol>${l.subs.length ? `<p class="ln-h">Náhradníci</p><ol class="ln ln--subs">${l.subs.map(li).join('')}</ol>` : ''}${l.coach ? `<p class="ln-coach">Tréner: ${esc(l.coach)}</p>` : ''}</div>`;
}
for (const m of matches) {
  if (m.past && !m.detail) continue;
  const name = m.home ? `${club.nazov} – ${m.opponent}` : `${m.opponent} – ${club.nazov}`;
  add(m.url, {
    title: `${name}${m.score ? ` ${m.score}` : ''}`, active: 'zapasy/',
    desc: `${m.teamObj.full}, ${m.comp}, ${dLong(m.date)}.`,
    body: (R) => {
      const ev = [...(m.goals || []).map((g) => ({ ...g, t: 'goal' })), ...(m.cards || []).map((c) => ({ ...c, t: 'card' })), ...((m.lineups?.subs) || []).map((s) => ({ ...s, t: 'sub' }))]
        .sort((a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0));
      const evIcon = (e) => e.t === 'goal' ? `<span class="ev-i ev-goal" aria-hidden="true">${I.ball}</span>` : e.t === 'card' ? `<span class="ev-i ev-card ev-card--${e.kind}" aria-hidden="true"></span>` : '<span class="ev-i ev-sub" aria-hidden="true">⇄</span>';
      const evText = (e) => e.t === 'goal' ? `Gól: ${esc(e.player)}${e.kind === 'penalty' ? ' (z penalty)' : e.kind === 'own' ? ' (vlastný)' : ''}` : e.t === 'card' ? `${e.kind === 'yellow' ? 'Žltá karta' : e.kind === 'red' ? 'Červená karta' : 'Druhá žltá a červená'}: ${esc(e.player)}` : `Striedanie: prichádza ${esc(e.in)}, odchádza ${esc(e.out)}`;
      const evSide = (e) => ((e.side === 'our') === m.home ? 'h' : 'a');
      const evTeam = (e) => (e.side === 'our' ? club.nazov : m.opponent);
      const prevMeet = matches.filter((x) => x.oppSpace === m.oppSpace && x.id !== m.id && x.team === m.team && x.score);
      const snUrl = sn.matches.find((x) => x.id === m.id)?.url;
      return `${pageHead({ title: name, sub: `${esc(m.teamObj.full)}, ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}`, R, crumbs: [['zapasy/', 'Zápasy'], [null, dShort(m.date)]] })}
<section class="sec sec--first"><div class="wrap match">
  <div class="match-card">${card(m, R, { big: true, self: true, label: m.score ? 'Konečný výsledok' : 'Zápas' })}</div>
  <div class="match-info">
    ${ev.length ? `<h2 class="h3">Priebeh zápasu</h2><ol class="evs">${ev.map((e) => `<li class="ev ev--${evSide(e)}"><span class="ev-min">${esc(e.min)}′</span>${evIcon(e)}<span>${evText(e)}<small>${esc(evTeam(e))}</small></span></li>`).join('')}</ol>` : m.score ? '<p>Zápis o stretnutí neobsahuje góly ani karty.</p>' : ''}
    <dl class="facts">
      <div><dt>Dátum</dt><dd>${dLong(m.date)}${m.time ? `, ${esc(m.time)}` : ''}</dd></div>
      ${m.venue ? `<div><dt>Ihrisko</dt><dd>${esc(venueName(m.venue))}</dd></div>` : ''}
      ${m.audience ? `<div><dt>Diváci</dt><dd>${num(m.audience)}</dd></div>` : ''}
      ${m.referee ? `<div><dt>Rozhodca</dt><dd>${esc(m.referee)}</dd></div>` : ''}
    </dl>
    <p class="btns">${m.score && snUrl ? `<a class="btn btn--line" href="${snUrl}" rel="noopener">${I.ext}Zápis na Sportnete</a>` : ''}${!m.past ? `<a class="btn btn--navy" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Pridať do kalendára</a>${m.home ? `<a class="btn btn--line" href="${mapsUrl}" rel="noopener">${I.route}Navigovať na ihrisko</a>` : ''}` : ''}</p>
  </div>
  ${m.lineups ? `<div class="lineups"><h2 class="h3 lineups-h">Zostavy</h2>${lineupHtml(m.home ? m.lineups.our : m.lineups.opp, m.home ? club.nazov : m.opponent)}${lineupHtml(m.home ? m.lineups.opp : m.lineups.our, m.home ? m.opponent : club.nazov)}</div>` : ''}
  ${prevMeet.length ? `<div class="meet"><h2 class="h3">Ďalšie zápasy s týmto súperom v ročníku</h2>${matchList(prevMeet, R, { showTeam: false })}</div>` : ''}
</div></section>`;
    },
  });
}

// tabuľky
add('tabulky/', {
  title: 'Tabuľky', active: 'tabulky/', desc: `Tabuľky súťaží, v ktorých hrajú tímy ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tabuľky', sub: `Ročník ${SEASON}. Poradie podľa Sportnetu, náš tím je zvýraznený.`, R, crumbs: [[null, 'Tabuľky']] })}
<section class="sec sec--first"><div class="wrap">
  <nav class="toc" aria-label="Tabuľky tímov">${teams.filter((t) => t.table).map((t) => `<a href="#${t.slug}">${esc(t.short)}</a>`).join('')}</nav>
  ${teams.filter((t) => t.table).map((t) => `<section class="tsec" id="${t.slug}" aria-labelledby="h-${t.slug}">
    <div class="sec-head"><h2 class="h2" id="h-${t.slug}">${esc(t.full)}</h2>${more(`${R}${t.url}`, 'Stránka tímu')}</div>
    <p class="tsec-l">${esc(t.leagueName)}</p>
    ${tableHtml(t.table, R)}
  </section>`).join('')}
  ${teams.some((t) => !t.table) ? `<p class="note">${teams.filter((t) => !t.table).map((t) => esc(t.short)).join(', ')}: prípravka hrá bez tabuľky.</p>` : ''}
</div></section>`,
});

// tímy
add('timy/', {
  title: 'Tímy', active: 'timy/', desc: `Všetky tímy ${club.nazov} v sezóne ${SEASON}: áčko, dorast U19, starší žiaci U15 a prípravka U11.`,
  body: (R) => `${pageHead({ title: 'Tímy', sub: `${plural(teams.length, 'tím', 'tímy', 'tímov')} v ročníku ${SEASON}, od prípravky U11 po áčko.`, R, crumbs: [[null, 'Tímy']] })}
<section class="sec sec--first"><div class="wrap">${teamGrid(R)}
</div></section>`,
});

for (const t of teams) {
  add(t.url, {
    title: t.full, active: 'timy/', desc: `${club.nazov} – ${t.full}: ${t.leagueName}, zápasy, tabuľka a súpiska v sezóne ${SEASON}.`,
    body: (R) => {
      const list = teamMatches(t.slug);
      const nx = list.filter((m) => !m.past), rs = list.filter((m) => m.past).reverse();
      const pick = cardPick(t.slug);
      const rec = record(t.slug);
      const sc = scorers(t.slug);
      const lm = leagueMatches(t.slug);
      const groups = POS.map(([k, h]) => [h, t.squad.athletes.filter((a) => (k ? a.pos === k : !POS.some(([x]) => x && x === a.pos)))]).filter(([, l]) => l.length);
      const nrCount = new Map(); for (const a of t.squad.athletes) nrCount.set(a.nr, (nrCount.get(a.nr) || 0) + 1);
      const nr = (a) => (a.nr !== '' && nrCount.get(a.nr) === 1 ? a.nr : '');
      return `${pageHead({ title: t.full, sub: `${esc(t.leagueName)}${t.pos ? `, <b>${t.pos}. miesto</b> ${zo(t.of)}` : ''}`, R, crumbs: [['timy/', 'Tímy'], [null, t.short]] })}
<section class="sec sec--first"><div class="wrap team-top">
  ${pick ? `<div>${card(pick, R, { big: true })}</div>` : ''}
  <div class="team-side">
    ${rec.n ? `<p class="stat"><span class="stat-n">${rec.w}–${rec.d}–${rec.l}</span><span class="stat-l">výhry, remízy a prehry vo všetkých súťažiach, skóre ${rec.gf}:${rec.ga}</span></p><div class="liga-row"><h2 class="h4">Forma</h2>${formHtml(t.slug)}</div>` : '<p>Prípravka hrá bez výsledkov a bez tabuľky. Rozpis zápasov je nižšie.</p>'}
    ${lm.length >= 3 ? `<figure class="team-grape">${strapec(lm, `Strapec ročníka ${SEASON}: ${plural(lm.length, 'ligový zápas', 'ligové zápasy', 'ligových zápasov')}`)}<figcaption>Strapec ročníka: bobuľa za každý ligový zápas, najnovší dole.${berryKey(record(t.slug, (m) => !m.cup))}</figcaption></figure>` : ''}
    ${sc.length && t.adult ? `<div class="liga-row liga-row--list"><h2 class="h4">Strelci v sezóne</h2><ol class="scorers">${sc.slice(0, 5).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol></div>` : ''}
    ${calBox(`${t.slug}.ics`, R, `cal-${t.slug}`)}
  </div>
</div></section>
<section class="sec sec--cream" aria-labelledby="tz-h"><div class="wrap">
  ${secHead('Zápasy', 'tz-h')}
  <div class="cols2">
    <div><h3 class="h3">Program</h3>${nx.length ? matchList(nx, R, { showTeam: false }) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Výsledky</h3>${rs.length ? matchList(rs, R, { showTeam: false }) : '<p>Tím v tomto ročníku ešte nehral.</p>'}</div>
  </div>
</div></section>
${t.table ? `<section class="sec" aria-labelledby="tt-h"><div class="wrap">${secHead('Tabuľka', 'tt-h')}<p class="tsec-l">${esc(t.leagueName)}</p>${tableHtml(t.table, R)}</div></section>` : ''}
${t.squad.athletes.length || t.squad.crew.length ? `<section class="sec sec--cream" aria-labelledby="ts-h"><div class="wrap">
  ${secHead('Súpiska', 'ts-h')}
  <p class="note">Hráči, ktorí v kalendárnom roku ${sn.updated.slice(0, 4)} nastúpili alebo boli v nominácii na zápas (podľa Sportnetu).${t.adult ? '' : ' Pri mládeži uvádzame len mená.'}</p>
  ${groups.map(([h, l]) => `<h3 class="h4 sq-h">${h}</h3><ul class="squad">${l.sort((a, b) => a.name.split(' ').at(-1).localeCompare(b.name.split(' ').at(-1), 'sk')).map((a) => `<li class="pl"><span class="pl-nr" aria-hidden="true">${esc(nr(a)) || '<span class="pl-dot"></span>'}</span><span class="pl-name">${esc(a.name)}${a.captain && t.adult ? ' <abbr class="cap" title="kapitán">C</abbr>' : ''}</span>${nr(a) ? `<span class="sr">, číslo ${nr(a)}</span>` : ''}</li>`).join('')}</ul>`).join('')}
  ${t.squad.crew.length ? `<h3 class="h4 sq-h">Realizačný tím</h3><ul class="crew">${t.squad.crew.map((c) => `<li><span class="crew-r">${esc(crewRole[c.role] || crewRole.other)}</span><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
</div></section>` : ''}`;
    },
  });
}

// mládež a nábor
add('mladez/', {
  title: 'Mládež', active: 'mladez/', desc: `Mládež ${club.nazov}: dorast U19 (späť po desiatich rokoch), starší žiaci U15 a prípravka U11, tréneri a súťaže.`,
  body: (R) => {
    const youth = teams.filter((t) => !t.adult);
    return `${pageHead({ title: 'Mládež', sub: `${plural(youth.length, 'mládežnícky tím', 'mládežnícke tímy', 'mládežníckych tímov')} v ročníku ${SEASON}: dorast, žiaci a prípravka.`, R, crumbs: [[null, 'Mládež']] })}
<section class="sec sec--first"><div class="wrap youth-top">
  <div>
    <p class="lead">Dorast sa vrátil v roku 2025 po desiatich rokoch. Klubu bolo ľúto, že chlapci z obce musia chodiť hrávať do susedných dedín, a tak tím obnovil. Hrá IV. ligu U19 Západoslovenského futbalového zväzu. Od ročníka ${SEASON} pribudli starší žiaci U15, prípravka U11 hrá súťaž Oblastného futbalového zväzu Topoľčany.</p>
    <ul class="coaches">${youth.map((t) => `<li><a href="${R}${t.url}"><b>${esc(t.short)}</b><span>${esc(t.sub)} · ${esc(t.leagueName)}${t.pos ? ` · ${t.pos}. miesto` : ''}</span>${coachOf(t) ? `<small>${t.squad.crew.some((c) => c.role === 'coach') ? 'tréner' : 'vedúci'} ${esc(coachOf(t))}</small>` : ''}</a></li>`).join('')}</ul>
    <p class="src">Tréneri, súťaže a poradie podľa Sportnetu, história dorastu podľa Radošinských novín 2/2025.</p>
  </div>
  <aside class="join">
    <p class="eyebrow">Nábor</p>
    <h2 class="h3">Prvý tréning</h2>
    <p>Chcete, aby vaše dieťa hralo futbal v Radošine? Napíšte klubu, kedy trénuje jeho vekový tím. Klub pozýva aj chlapcov do dorastu.</p>
    <p class="btns"><a class="btn btn--navy" href="mailto:${club.kontakt.email}?subject=${encodeURIComponent('Nábor do mládeže')}">${I.mail}Napísať klubu</a></p>
  </aside>
</div></section>
<section class="sec sec--cream" aria-labelledby="ymt-h"><div class="wrap">
  ${secHead('Tímy mládeže', 'ymt-h', more(`${R}tabulky/`, 'Tabuľky'))}
  ${teamGrid(R, (t) => !t.adult)}
</div></section>
<section class="sec" aria-labelledby="ynext-h"><div class="wrap">
  ${secHead('Najbližšie zápasy mládeže', 'ynext-h', more(`${R}zapasy/`, 'Všetky zápasy'))}
  ${matchList(upcoming.filter((m) => !m.teamObj.adult).slice(0, 8), R)}
</div></section>`;
  },
});

// klub, ročníky a obec
add('klub/', {
  title: 'Klub a ročníky', active: 'klub/', desc: `${club.nazov}: futbal v Radošine od roku ${club.zalozenie}, ročníky áčka od 2013/14, titul majstra okresu 2024/25 a obec Radošina.`,
  body: (R) => `${pageHead({ title: 'Klub a ročníky', sub: `${esc(club.pravnyNazov)}. Futbal v Radošine od roku ${club.zalozenie}, farby ${esc(club.farby)}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first"><div class="wrap klub-grid">
  <div>
    <h2 class="h2">Z kroniky</h2>
    <ol class="annals">${club.historia.map((x) => `<li><p class="annals-y">${esc(x.rok)}</p><div><p>${esc(x.text)}</p><small>${esc(x.zdroj)}</small></div></li>`).join('')}<li class="annals-now"><p class="annals-y">${SEASON}</p><div><p>Áčko hrá ${esc(acc(A.leagueName))}${A.pos ? ` a ${winterNow ? 'po jeseni ' : ''}je na ${A.pos}. mieste` : ''}. V klube hrajú ${plural(teams.length, 'tím', 'tímy', 'tímov')}, od tohto ročníka aj starší žiaci U15, takže po rokoch zase od prípravky po áčko.</p><small>Sportnet</small></div></li></ol>
  </div>
  <aside class="klub-aside">
    <img src="${R}img/erb-480.webp" alt="${esc(club.erbAlt)}" width="180" height="200" loading="lazy">
    <p class="note">Na erbe klubu je vinohradnícky nôž a strapec hrozna, Radošina je vinárska obec.</p>
    <h2 class="h4">Úspechy</h2>
    <ul class="wins">${club.uspechy.map((u) => `<li>${I.trophy}<span><b>${esc(u.rok)}</b> ${esc(u.text)}</span></li>`).join('')}</ul>
    <p class="cry">${esc(club.pokrik)}</p>
  </aside>
</div></section>
<section class="sec sec--navy" id="rocniky" aria-labelledby="roc2-h"><div class="wrap">
  ${secHead('Ročníky áčka', 'roc2-h', '', 'Vinotéka')}
  <p class="lead">Hladina vína vo fľaši je konečné umiestnenie: plná fľaša je prvé miesto. Posledná fľaša je rozpitý ročník ${SEASON}.</p>
  ${shelf()}
  <div class="tbl-wrap tbl-wrap--inv"><table class="tbl tbl--roc"><caption class="sr">Ročníky áčka od 2013/14</caption>
    <thead><tr><th scope="col" class="tl">Ročník</th><th scope="col" class="tl">Súťaž</th><th scope="col">Miesto</th><th scope="col" class="hm">Skóre</th><th scope="col">Body</th></tr></thead>
    <tbody>${club.rocniky.zoznam.map((x) => `<tr${x.majster ? ' class="our"' : ''}><th scope="row" class="tl">${esc(x.rok)}</th><td class="tl">${esc(x.liga)}${x.pozn ? `<small>${esc(x.pozn)}</small>` : ''}</td><td class="nw">${x.poz ? `${x.poz}. ${zo(x.z)}` : '–'}</td><td class="hm nw">${esc(x.skore || '–')}</td><td>${x.body ?? '–'}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="src src--inv">Zdroj: konečné tabuľky zo Sportnetu.</p>
</div></section>
<section class="sec" id="obec" aria-labelledby="ob2-h"><div class="wrap">
  ${secHead('Obec Radošina', 'ob2-h', '', 'Pod Považským Inovcom')}
  <ol class="facts5">${club.obec.fakty.map((f) => `<li><p class="f5-k">${esc(f.k)}</p><p>${esc(f.t)}</p></li>`).join('')}</ol>
  <p class="src">Zdroj: web obce Radošina (Dejiny obce, Kultúrne pamiatky), TASR a Rok divadla (Radošinské naivné divadlo), Visit Bratislava a Wikipédia (víno). Správy z klubu vychádzajú v <a href="${club.noviny}" rel="noopener">Radošinských novinách</a>.</p>
</div></section>`,
});

// ihrisko
add('ihrisko/', {
  title: 'Ihrisko', active: 'ihrisko/', desc: `${ST.nazov}, ${club.adresa.join(', ')}: zápasy doma, cesta na ihrisko a úpravy areálu.`,
  body: (R) => {
    const home = upcoming.filter((m) => m.home).slice(0, 6);
    return `${pageHead({ title: ST.nazov, sub: `${club.adresa.map(esc).join(', ')}. Tu hrajú doma všetky tímy klubu.`, R, crumbs: [[null, 'Ihrisko']] })}
<section class="sec sec--first"><div class="wrap stad">
  <div>
    <h2 class="h3">Areál sa zlepšuje</h2>
    <ul class="mini mini--light">${ST.upravy.map((u) => `<li><b>${esc(u.rok)}</b> ${esc(u.text)}</li>`).join('')}</ul>
    <p>Na ihrisku sa hrá aj Vianočný futbalový turnaj. V decembri 2025 na ňom hrali štyri tímy: Fratelli, Káčerovské, Starí páni a Princezné.</p>
    <p class="btns"><a class="btn btn--navy" href="${mapsUrl}" rel="noopener">${I.route}Navigovať (Google Mapy)</a><a class="btn btn--line" href="${mapyUrl}" rel="noopener">${I.pin}Mapy.com</a></p>
    <p class="src">Zdroj: Radošinské noviny 3/2023, 2/2025 a 1/2026, poloha zo Sportnetu.</p>
  </div>
  <div>${home.length ? `<h2 class="h3">Najbližšie zápasy doma</h2>${matchList(home, R)}` : ''}</div>
</div></section>`;
  },
});

// kontakt
add('kontakt/', {
  title: 'Kontakt', active: 'kontakt/', desc: `Kontakt na ${club.nazov}: e-mail, sídlo a ihrisko.`,
  body: (R) => `${pageHead({ title: 'Kontakt', sub: 'Zápasy, nábor do mládeže, partnerstvo a spolupráca.', R, crumbs: [[null, 'Kontakt']] })}
<section class="sec sec--first"><div class="wrap contact">
  <div class="ccard">
    <p class="eyebrow">Kontakt klubu</p>
    <p class="ccard-n">${esc(club.nazov)}</p>
    <p class="btns"><a class="btn btn--navy" href="mailto:${club.kontakt.email}">${I.mail}<span>${esc(club.kontakt.email).replace('@', '<wbr>@')}</span></a></p>
    <p class="note">E-mail klubu podľa Sportnetu. Telefónne čísla klub verejne neuvádza.</p>
  </div>
  <dl class="facts">
    <div><dt>Názov</dt><dd>${esc(club.pravnyNazov)}</dd></div>
    <div><dt>Adresa</dt><dd>${club.adresa.map(esc).join(', ')}</dd></div>
    <div><dt>Ihrisko</dt><dd>${esc(ST.nazov)}</dd></div>
    <div><dt>Farby</dt><dd>${esc(club.farby)}</dd></div>
  </dl>
  <div>
    <h2 class="h3">Klub na webe</h2>
    <ul class="docs">
      <li><a href="${club.sportnetUrl}" rel="noopener">${I.ext}<span>Profil klubu na Sportnete</span><small>zápisy o stretnutí, súpisky, prestupy</small></a></li>
      <li><a href="${club.noviny}" rel="noopener">${I.ext}<span>Radošinské noviny</span><small>štvrťročník obce, rubrika „Čo nové v TJ ŠK Radošina“</small></a></li>
    </ul>
    <p class="src">Vlastný web, Facebook ani Instagram klubu sme nenašli. Tréneri tímov sú na stránkach <a href="${R}timy/">tímov</a>.</p>
  </div>
</div></section>`,
});

add('ochrana-sukromia/', {
  title: 'Ochrana súkromia', desc: `Ako web ${club.nazov} pracuje s údajmi.`,
  body: (R) => `${pageHead({ title: 'Ochrana súkromia', R, crumbs: [[null, 'Ochrana súkromia']] })}
<section class="sec sec--first"><div class="wrap prose">
  <p>Web nepoužíva cookies, analytiku ani reklamné nástroje a nenačítava nič z iných serverov. Všetky súbory vrátane písma a erbov sú uložené priamo na webe. Odkazy na Sportnet a mapy sú obyčajné odkazy.</p>
  <p>Mená hráčov, trénerov a rozhodcov, výsledky, strelcov, karty a počty divákov preberáme z verejného systému Sportnet (Futbalnet), kam ich zapisujú kluby a zväzy pri zápasoch. Vek hráčov nezverejňujeme, pri mládeži uvádzame len mená a zostavy zápasov len pri dospelých.</p>
  <p>Ak chcete niečo opraviť alebo odstrániť, napíšte na <a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a>.</p>
</div></section>`,
});

add('404/', {
  title: 'Stránka sa nenašla',
  body: (R) => `${pageHead({ title: 'Stránka sa nenašla', sub: 'Táto fľaša v pivnici chýba. Adresa je chybná alebo sa stránka presunula.', R })}
<section class="sec sec--first"><div class="wrap"><p class="btns"><a class="btn btn--navy" href="${R}">Na úvod</a><a class="btn btn--line" href="${R}zapasy/">Zápasy a výsledky</a></p></div></section>`,
});


// ---- kalendár (.ics, RFC 5545) ----------------------------------------------------------------
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsFold = (line) => {
  const out = []; let cur = '';
  for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur);
  return out.join('\r\n');
};
const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Bratislava',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
function ics(list, calName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = list.map((m) => {
    const us = m.teamObj.adult ? club.nazov : `${club.nazov} ${m.teamObj.short}`;
    const [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
    const d = m.date.replace(/-/g, '');
    const t = (m.time || '').slice(0, 5);
    const when = t ? [`DTSTART;TZID=Europe/Bratislava:${d}T${t.replace(':', '')}00`, 'DURATION:PT2H'] : [`DTSTART;VALUE=DATE:${d}`];
    const desc = [m.comp + (m.roundName ? `, ${m.roundName}` : ''), m.home ? 'Domáci zápas' : 'Zápas vonku'].join('\n');
    return ['BEGIN:VEVENT', `UID:zapas-${m.id}@${config.sportnet.club}.sportnet`, `DTSTAMP:${stamp}`, ...when,
      `SUMMARY:${icsEsc(`${m.teamObj.short}: ${h} – ${a}${m.score ? ` ${m.score}` : ''}`)}`,
      `DESCRIPTION:${icsEsc(desc)}`, m.venue && `LOCATION:${icsEsc(venueName(m.venue))}`, 'END:VEVENT'].filter(Boolean);
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${club.nazov}//Zapasy//SK`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEsc(calName)}`, 'X-WR-TIMEZONE:Europe/Bratislava', ...VTZ, ...events.flat(), 'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n';
}

// ---- ukážka administrácie (dist/admin/demo.json pre src/admin/admin.js) ------------------------------
function writeAdminDemo() {
  // rovnaký tvar dát ako administrácia OK Častkovce (src/admin/admin.js je spoločný základ)
  const R = '../';
  const snById = Object.fromEntries(sn.matches.map((m) => [m.id, m]));
  const people = (t) => t.squad.athletes.map((a) => ({ name: a.name, number: a.nr === '' ? '' : String(a.nr), role: '', photo: null }));
  const demo = {
    club: { nazov: club.nazov, crest: `${R}img/erb-128.webp` },
    updated: sn.updated, season: sn.season,
    teams: teams.map((t) => ({ slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub })),
    matches: matches.map((m) => ({
      id: m.id, team: m.team, date: m.date, time: m.time, home: m.home, opponent: m.opponent, competition: m.comp, part: '',
      round: (/\d+/.exec(m.round) || [''])[0], played: m.past, score: m.score, goals: m.goals || [], cards: m.cards || [],
      venue: venueName(m.venue || ''), url: snById[m.id]?.url || null, gallery: null, video: null,
    })),
    rosters: Object.fromEntries(teams.map((t) => [t.slug, people(t).map(({ name, number, photo }) => ({ name, number, photo }))])),
    news: [],
    info: {
      nazov: club.nazov, pravnyNazov: club.pravnyNazov, adresa: club.adresa, osoba: '', telefon: '', email: club.kontakt.email,
      facebook: '', ico: '', ucet: '', stadion: { nazov: ST.nazov, kapacita: '', rozmery: '', vip: '' },
    },
    allTeams: teams.map((t) => ({
      slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub, league: t.leagueName, url: t.url, photo: null,
      groups: [{ title: 'Hráči', people: people(t) }, { title: 'Realizačný tím', people: t.squad.crew.map((c) => ({ name: c.name, number: '', role: crewRole[c.role] || crewRole.other, photo: null })) }],
    })),
    coaches: [],
    pages: {
      historia: { title: 'História', url: 'klub/', html: `<ul>${club.historia.map((h) => `<li><b>${esc(h.rok)}</b> – ${esc(h.text)}</li>`).join('')}</ul>` },
      rocniky: { title: 'Ročníky áčka', url: 'klub/', html: `<ul>${club.rocniky.zoznam.map((x) => `<li>${esc(x.rok)} ${esc(x.liga)}: ${x.poz ? `${x.poz}. miesto` : 'bez umiestnenia'}</li>`).join('')}</ul>` },
      'ochrana-sukromia': { title: 'Ochrana súkromia', url: 'ochrana-sukromia/', html: '<p>Web nepoužíva cookies, analytiku ani reklamné nástroje.</p>' },
    },
    home: {
      heroTitle: club.nazov, heroText: `Futbal v Radošine od roku ${club.zalozenie}. Áčko hrá ${acc(A.leagueName)}.`, hero: null,
      stadion: { title: ST.nazov, text: ST.upravy.map((u) => u.text).join(' ') },
    },
    galleries: [], videos: [], fanshop: { pozn: '', email: club.kontakt.email, produkty: [] }, partners: [],
  };
  fs.writeFileSync(path.join(OUT, 'admin', 'demo.json'), JSON.stringify(demo));
}

// ---- zápis -------------------------------------------------------------------------------------
// obsah dist/ sa maže po súboroch: koreň môže držať náhľadový server (fs.watch) alebo otvorený terminál
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
const copy = (from, to) => { if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true }); };
copy(path.join(SRC, 'img'), path.join(OUT, 'img'));
copy(path.join(SRC, 'fonts'), path.join(OUT, 'fonts'));
copy(path.join(SRC, 'js'), path.join(OUT, 'js'));
copy(path.join(ROOT, 'media', 'foto-web'), path.join(OUT, 'foto'));
if (config.adminDemo !== false && fs.existsSync(path.join(SRC, 'admin', 'index.html'))) { copy(path.join(SRC, 'admin'), path.join(OUT, 'admin')); writeAdminDemo(); }
fs.rmSync(path.join(OUT, 'fonts', 'fonts.css'), { force: true });
fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
const fontsCss = fs.readFileSync(path.join(SRC, 'fonts', 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, 'url(../fonts/$1)');
fs.writeFileSync(path.join(OUT, 'css', 'site.css'), fontsCss + fs.readFileSync(path.join(SRC, 'css', 'site.css'), 'utf8'));

// slovenská sadzba v texte stránok (nie v <script>, <style> ani v atribútoch): jednopísmenová predložka alebo spojka
// nezostane na konci riadka („v Trenčíne“), skóre „1 : 0“, čísla „2 730“, dátumy, „V. liga“ a „1. miesto“ sa nerozdelia
const NB = ' ';
const typo = (html) => html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/).map((part, i) => (i % 2 ? part : part.replace(/>([^<]+)</g, (m, t) => '>' + t
  .replace(/(?<=^|[\s(„])([AaIiKkOoSsUuVvZz])[ \t]+(?=\S)/g, `$1${NB}`)
  .replace(/(\d) : (\d)/g, `$1${NB}:${NB}$2`)
  .replace(/ - /g, ' – ') // spojovník medzi medzerami (názvy klubov a ihrísk zo Sportnetu) -> pomlčka
  .replace(/\b(U\d{1,2}) ([A-D])\b/g, `$1${NB}$2`) // „U15 A“ sa nerozdelí
  .replace(/(?<=^|[\s(])(po|ut|st|št|pi|so|ne) (?=\d{1,2}\.)/g, `$1${NB}`) // „ne 15. 11.“
  .replace(/(\d\.) (?=(?:kol[oae]|miest[oea])\b)/g, `$1${NB}`)
  .replace(/\b(\d{1,2}\.) (?=(?:\d{1,2}\.|januára|februára|marca|apríla|mája|júna|júla|augusta|septembra|októbra|novembra|decembra)(?!\d))/g, `$1${NB}`) // „7. marca“, „15. 11.“
  .replace(/\b([IVX]{1,4}\.) (?=lig)/g, `$1${NB}`) // „V. liga“
  .replace(/\b(\d{3}) (\d{2})\b/g, `$1${NB}$2`) // PSČ 913 11
  .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`) + '<'))).join('');
for (const p of pages) {
  const depth = p.route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const html = typo(layout({ ...p, body: p.body(R) }));
  const file = path.join(OUT, p.route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
// GitHub Pages: 404 v koreni (absolútne cesty, lebo sa zobrazuje na ľubovoľnej adrese)
const BASE = process.env.BASE_PATH || config.basePath || '/';
const notFound = fs.readFileSync(path.join(OUT, '404', 'index.html'), 'utf8').replace(/(href|src|data-root)="(\.\.\/)+/g, `$1="${BASE}`);
fs.writeFileSync(path.join(OUT, '404.html'), notFound);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, '.gitattributes'), '*.ics -text\n'); // RFC 5545 chce CRLF, git na Windowse by ho zmenil

// kalendáre .ics: každý tím, všetky zápasy a jednotlivé budúce zápasy
fs.mkdirSync(path.join(OUT, 'kalendar'), { recursive: true });
for (const t of teams) fs.writeFileSync(path.join(OUT, 'kalendar', `${t.slug}.ics`), ics(teamMatches(t.slug), `${club.nazov} – ${t.full}`));
fs.writeFileSync(path.join(OUT, 'kalendar', 'vsetky.ics'), ics(matches, `${club.nazov} – všetky zápasy`));
for (const m of upcoming) fs.writeFileSync(path.join(OUT, 'kalendar', `zapas-${m.id}.ics`), ics([m], `${club.nazov} – ${m.teamObj.full}`));
console.log(`Hotovo: ${pages.length} stránok -> dist/ (dnes = ${TODAY})`);
