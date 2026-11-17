// Statický generátor webu TJ-ŠK Radošina: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Zostavuje ho kluby-siet/engine/assemble.py zo spoločného jadra v2 a tohto súboru (vzhľad, úvod, stránka Klub).
// Kostra „Úzky stĺpec“: celý úvod je jeden úzky stĺpec ako v časopise – titulok, najbližší zápas, výsledky, program,
// pokrik „Pome ŠK!“ ako veľký citát, začiatok príbehu „Titul je náš!“ a výrez tabuľky. Biely papier, tmavomodrá
// a svetlomodrá z klubových farieb. Písmo Gloock (titulky) a Literata (text).
const SKIN = {
  nav: 'bar', theme: '#1f3a68', brand: 'TJ-ŠK Radošina', brandSub: '',
  fonts: ['gloock-400.woff', 'literata-400.woff', 'literata-600.woff'],
  sources: 'Príbeh titulu a správy z klubu podľa Radošinských novín, obec podľa webu obce.',
  adminHero: 'Futbal v Radošine od roku 1933',
  adminFacts: club.historia.map((h) => ({ k: h.rok, t: h.text })),
  links: [[club.noviny, 'Radošinské noviny']],
};
const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['klub/', 'Klub'], ['kontakt/', 'Kontakt']];
const DESC = `${club.nazov} – futbal v Radošine od roku ${club.zalozenie}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}) a mládeže, titul vo VII. lige 2024/25.`;

add('', {
  title: `futbal od roku ${club.zalozenie}`, active: '', bodyClass: 'home',
  body: (R) => {
    const n = nextA, l = lastA;
    return `<article class="col">
  <header class="col-head">
    <p class="kicker">Ročník ${SEASON} · ${esc(A.leagueName)}${A.pos ? ` · ${A.pos}. miesto` : ''}</p>
    <h1 class="h1">TJ-ŠK Radošina</h1>
    <p class="col-lead">Futbal v Radošine od roku ${club.zalozenie}. Majster VII. ligy ObFZ Topoľčany 2024/25, od jesene 2025 v krajskej VI. lige.</p>
  </header>
  ${n ? `<section class="match-box" aria-labelledby="nx-h">
    <h2 class="label" id="nx-h">${winterNow ? 'Áčko po zimnej prestávke' : 'Najbližší zápas áčka'}</h2>
    <p class="mb-o">${n.home ? `Radošina${NB}– ${glueAbbr(esc(n.opponent))}` : `${glueAbbr(esc(n.opponent))}${NB}– Radošina`}</p>
    <p class="mb-d"><time datetime="${n.date}">${dLong(n.date)}</time>, ${esc(n.time || '')}${n.home ? `, ${esc(ST.nazov)}` : ''}</p>
    ${winterNow ? '' : `<p class="mb-p"><span class="cd" data-kickoff="${isoLocal(n.date, n.time)}" hidden></span></p>`}
    <p class="mb-a"><a href="${R}kalendar/zapas-${n.id}.ics" download>${I.cal}Do kalendára</a><a href="${R}${n.url}">Detail zápasu</a></p>
  </section>` : ''}
  <section aria-labelledby="res-h">${secHead('Výsledky', 'res-h', more(`${R}zapasy/#z-vys`, 'Všetky'))}${fxList(homeRes(5), R)}</section>
  <section aria-labelledby="prog-h">${secHead('Program', 'prog-h', more(`${R}zapasy/`, 'Všetky'))}${homeUp(4).length ? fxList(homeUp(4), R) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</section>
  <p class="cry" aria-label="Pokrik klubu">${esc(club.pokrik)}</p>
  <section class="story" aria-labelledby="st-h">
    <h2 class="h2" id="st-h">${esc(club.titul.nadpis)}</h2>
    <p>${esc(club.titul.odseky[0])}</p>
    ${more(`${R}klub/`, 'Celý príbeh titulu')}
  </section>
  ${A.table ? `<section aria-labelledby="tab-h">${secHead(esc(A.leagueName), 'tab-h', more(`${R}tabulky/`, 'Celá tabuľka'))}${tableHtml(A.table, R, { compact: true, caption: '<span class="sr">Výrez tabuľky</span>' })}</section>` : ''}
</article>`;
  },
});

add('klub/', {
  title: 'Klub', active: 'klub/', desc: `${club.nazov}: príbeh titulu 2024/25, história od roku ${club.zalozenie}, ročníky áčka, štadión a obec Radošina.`,
  body: (R) => `<article class="col col--page">
  <header class="col-head">
    <nav class="crumbs" aria-label="Omrvinky"><a href="${R}">Úvod</a><span aria-current="page">Klub</span></nav>
    <p class="kicker">${esc(club.pravnyNazov)}</p>
    <h1 class="h1">${esc(club.titul.nadpis)}</h1>
    <p class="col-lead">Ročník 2024/25 podľa trénera áčka v Radošinských novinách.</p>
  </header>
  ${club.titul.odseky.map((p) => `<p>${esc(p)}</p>`).join('')}
  <blockquote class="pull"><p>„${esc(club.titul.citat)}“</p><footer>${esc(club.titul.citatKto)}</footer></blockquote>
  <h2 class="h2">História</h2>
  <ol class="hist">${club.historia.map((h) => `<li><b>${esc(h.rok)}</b> ${esc(h.text)}</li>`).join('')}</ol>
  <h2 class="h2">Ročníky áčka</h2>
  ${seasonsTable(club.rocniky.zoznam)}
  <h2 class="h2">${esc(ST.nazov)}</h2>
  <ol class="hist">${ST.upravy.map((u) => `<li><b>${esc(u.rok)}</b> ${esc(u.text)}</li>`).join('')}</ol>
  <h2 class="h2">Radošina</h2>
  ${facts(club.obec.fakty)}
  <p class="note">Zdroje: Radošinské noviny, web obce Radošina, Sportnet, TASR, Wikipédia.</p>
</article>`,
});
