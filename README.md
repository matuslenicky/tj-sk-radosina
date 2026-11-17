# TJ-ŠK Radošina – návrh webu

Návrh nového webu futbalového klubu TJ-ŠK Radošina (Telovýchovná jednota – Športový klub Radošina). **Nie je to oficiálna stránka klubu.** Ukážka má v hlavičke pás s týmto upozornením a vyhľadávače ju neindexujú (`noindex`).

Ukážka: https://matuslenicky.github.io/tj-sk-radosina/ · administrácia (ukážka bez ukladania): https://matuslenicky.github.io/tj-sk-radosina/admin/

## Vzhľad

**„Ročníky“.** Na erbe klubu je vinohradnícky nôž a strapec hrozna, Radošina je vinárska obec. Sezóna je preto „ročník“ ako pri víne.

- úvod ako **vinárska etiketa**: krémový papier, vykrojené rohy, dvojitý rám, ročník, súťaž, poradie a pokrik „Pome ŠK!“,
- **strapec ročníka**: každý ligový zápas áčka je jedna bobuľa (výhra plná, remíza svetlejšia, prehra prázdna), najnovší visí na špičke,
- **vinotéka**: ročníky áčka od 2013/14 ako fľaše na polici, hladina vína = konečné umiestnenie, majstrovský ročník 2024/25 má zlatú kapsulu,
- program ako **visačky na hrdlách fliaš**, výsledky ako **dná fliaš v pivnici** (regál s krížovými latkami),
- forma ako rad bobúľ, riadky vinohradu ako jemné šikmé linky, menu na telefóne ako **visačka zavesená pod tlačidlom**,
- farby z erbu (tmavomodrá, svetlomodrá), k tomu krémová etiketa, slamová farba vína a vínová farba pre prehry,
- písmo **Cormorant** (etiketa; rovné číslice sú zapečené do písma v `scripts/fonts.py`) a **Jost**.

## Obsah a zdroje

- Zápasy, výsledky, strelci, karty, počty divákov, zostavy dospelých, tabuľky a súpisky 4 tímov (áčko, dorast U19, starší žiaci U15, prípravka U11) zo Sportnetu (Futbalnet), verejné API súťaží (`scripts/sportnet.mjs` → `data/sportnet.json`). Vek hráčov sa neukladá, zostavy len pri dospelých.
- Ročníky áčka 2013/14 – 2025/26 (súťaž, miesto, skóre, body) z konečných tabuliek na Sportnete, zapísané v `data/klub.json`.
- Správy z klubu z Radošinských novín (štvrťročník obce, rubrika „Čo nové v TJ ŠK Radošina“, čísla 3/2023 – 1/2026): titul 2024/25 napriek odpočítaným trom bodom, návrat dorastu po desiatich rokoch, úpravy areálu, Vianočný turnaj. Obec (Čertova pec, potok Radusna 1249, mestečko, kaštieľ nitrianskych biskupov) z webu obce, Radošinské naivné divadlo podľa TASR a Roku divadla, víno podľa Visit Bratislava a Wikipédie (Klevner).
- Rok 1933 je z erbu klubu, inú zmienku o založení sme nenašli. E-mail a adresa zo Sportnetu, telefóny klub verejne neuvádza. Vlastný web ani sociálne siete klubu sme nenašli (17. 11. 2026).
- Erb TJ-ŠK Radošina a erby súperov zo Sportnetu (`scripts/logos.py`). Patria príslušným klubom.
- Písmo Cormorant a Jost, licencia SIL Open Font License 1.1 (`scripts/fonts.py`).

## Zostavenie

Statický generátor bez závislostí (Node 20+, Python 3 s Pillow na erby a fontTools na písmo):

```
node scripts/sportnet.mjs        # zápasy, tabuľky a súpisky (FULL=1 stiahne znova aj detaily zápasov)
python -I scripts/logos.py       # erby súperov a náš erb do src/img (FORCE=1 stiahne znova)
node build.js                    # data/ + src/ -> dist/ (TODAY=2026-11-17 prepíše dnešný dátum)
node scripts/serve.mjs dist 5370 # náhľad na http://127.0.0.1:5370/ (?nolr = bez obnovovania, s CSP)
node scripts/deploy.mjs          # nasadenie dist/ na vetvu gh-pages (GitHub Pages)
```

Výsledky sa po zápasoch aktualizujú samé cez GitHub Actions (`.github/workflows/sportnet.yml`). Ročníky v `data/klub.json` treba po skončení sezóny doplniť ručne (posledná fľaša na polici je rozpitý aktuálny ročník zo Sportnetu).
