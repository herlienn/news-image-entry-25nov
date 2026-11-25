# News Image — 25 November 2026

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/herlienn/news-image-entry-25nov/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/herlienn/news-image-entry-25nov/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

Bounty: https://make.fun/bounty/news-image-20261125

Make your own bounty on make.fun: https://make.fun/r/4a84jcbk

## What this is

"Sum up 25 November's world news in one image" — a single 1024×1024 newspaper
front page drawn entirely in code: **43 stories across 7 regions**, 3 large
hero panels, 10 illustrated main stories, a full-width numbered-pin world map,
a UTC timeline ("By the Clock"), "Day in Numbers", and a 30-item "Also on" list.

## How it is built

`main.ts` runs on Node 22 with the standard library only — no network, no
dependencies. It writes one PNG to `/output/entry.png` (or
`$MAKEFUN_OUTPUT_DIR/entry.png`). Every shape, scene, letter and map coastline
is drawn with code; nothing is downloaded or copied. Two runs produce a
byte-identical file.

Run it:

```sh
node main.ts
```
