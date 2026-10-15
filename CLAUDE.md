# CLAUDE.md

Guidance for AI coding agents working on broadsheet, whoever sent them: a maintainer, or someone with a bug to fix or a feature to offer. Read it before changing anything. `AGENTS.md` adds one rule of its own, about the Next.js version; read that too.

## What broadsheet is

Software for a place to read and publish short-to-medium articles, presented as a digital newspaper. Anyone can post. broadsheet takes writings as input and outputs a complete application feed. Each running copy is an **instance**: one paper, with its own name and editor.

- **Newspaper UI is the defining trait.** An algorithm picks the cover story and cover image, unless the editor has put a piece on the cover. The feed scrolls infinitely. Layouts are generated per page, not static, yet must read as a natural newspaper. Treat layout quality and taste as a core requirement, not polish.
- **Instances.** Anyone can run their own. There is no global site in the code: every paper is an ordinary instance, and nothing in the code may name a particular paper or carry its words. An instance's identity is its database file (name, front-page ears, About and agents pages, writings) plus its environment. Owners can reorder and move writings.
- **Editor.** Minimalist word editor with tasteful formatting options. Contributors can also upload writings in a few sensible formats.
- **Secondary goal:** showcase good prompting and taste in LLM-built apps. Prompts used in the product are first-class artifacts: keep them readable and versioned in the repo, not buried in code strings.

## Getting set up

Needs Node.js 20.9 or newer.

```bash
npm install
npm run seed   # ~46 sample writings into data/dev.sqlite
npm run dev    # http://localhost:3000
```

- **Use the local dev instance, never a real paper.** With `BROADSHEET_DB` unset the app serves `data/dev.sqlite` (gitignored). Do not point a dev server at a paper's own database: opening it applies migrations, which cannot be undone.
- **The desk.** A fresh dev instance is unclaimed: `/desk` asks for the one-time code printed in the dev server's log, or set `BROADSHEET_EDITOR_KEY` (12+ characters) in `.env.local`.
- **Next.js here is version 16**, and it differs from what you may remember. Read the relevant guide in `node_modules/next/dist/docs/` before writing route, page or config code.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/core/db` | The schema, migrations and `openInstance`. One instance is one SQLite file. |
| `src/core/writings`, `src/core/writers`, `src/core/notices` | The rules about writings, pen names and bulletins, as plain functions over the database. |
| `src/core/ai` | A heuristic guess at whether a writing reads as AI-written (`detectAiInWriting`), scored on publish and each edit, shown only on the desk. |
| `src/core/layout` | The layout engine: recipes, the slicer, cover selection. Pure TypeScript. |
| `src/feed` | Turns writings into laid-out pages ready to render: sections, cursors, search, text cut to fit. |
| `src/editor` | The document vocabulary (`schema.ts`), import and export formats, and what the browser keeps (drafts, identity). |
| `src/desk` | The desk's folders and file lists, derived from the writings. |
| `src/server` | The boundary: untrusted JSON in, a call to core out. Editor key, sessions, claiming. |
| `src/widgets` | The today strip (weather, markets), which no page sets at present, and the paper's place and time zone. |
| `src/components` | React components, each with its CSS Module beside it. |
| `src/app` | Next.js routes. Pages fetch and compose; API routes are a few lines each. |
| `scripts` | `seed` (dev samples) and `paper` (export and import of a paper's own words). |

Dependencies point one way: `core` imports nothing outside itself; `feed` imports `core`; `editor` and `desk` import `core` and `feed`; `widgets` stands alone; `server` sits on top of `core` and `editor`, and `app` and `components` sit on top of everything. Keep it that way; in particular the layout engine has no React, HTML or database in it.

## Rules broadsheet enforces

Design intent. Open an issue and discuss before deviating.

- The cover story always spans the full width at the top of the front page. Front-page recipes vary only what is below it.
- Writing dates are immutable and managed by broadsheet. Never expose an API to set or change them. Core reads the clock itself; tests and the seed script simulate time instead of passing dates in.
- Edits to a writing are tracked and displayed to readers: the byline of an edited piece reads "Edited" with the date of the latest, and opens onto when each edit was made (`EditedNote`). There is no limit on how many.
- Every new writing belongs to a pen name; bylines are fixed at publication.
- A writer is a name and a key. Do not add fields to a writer.
- An editor can change exactly what `src/server/desk.ts` exposes. Format, dates and bylines have no entry there.
- Nothing in the code names or favours a particular paper, and no instance reports to anyone.

## Architecture principles

- Simplicity first. Prefer small, named, single-purpose functions over long routines. No hacks or special cases that can't be traced.
- Extensibility is a requirement. Layout strategies, cover-story selection, ingest formats, and instance behavior should be pluggable behind narrow interfaces so new ideas slot in without rewrites.
- Layout generation and story selection should be deterministic given the same inputs (and a seed), so they can be tested and debugged. The engine never calls `Math.random`; use `src/core/layout/random.ts`.
- Write code that reads like its neighbours: a doc comment on each export saying what it is for in plain words, `@/` imports from `src`, colors and measures from the variables in `src/app/globals.css`.

## Stack

TypeScript, Next.js (App Router), SQLite via Drizzle, Tiptap editor, Vitest. One instance = one SQLite database. The layout engine (`src/core/layout`) is pure TypeScript with no framework imports: `(articles, seed, cursor) -> page`, where a page is a guillotine partition of a columns x rows grid (rows are lines of body type). Page recipes frame the first cuts (cover, rails); the slicer fills each region; the renderer places modules with CSS grid and fits body text to each box in the browser.

## Adding to it

Most new things have a slot. Use it rather than adding a special case elsewhere.

- **An import format:** write an `Importer` (`src/editor/import/types.ts`) and list it in `src/editor/import/registry.ts`. The Markdown and Word importers render to HTML and reuse the HTML importer.
- **A today-strip widget:** a folder in `src/widgets/<id>/` exporting a `defineWidget(...)`, plus one line in `src/widgets/registry.ts`. It must stay one line of type and load through the shared cache.
- **A page recipe:** a `PageRecipe` in `src/core/layout/recipes.ts`. Its cover and regions must tile the page exactly; `recipes.test.ts` and `layout.test.ts` check this.
- **Cover selection:** a `CoverStrategy` in `src/core/layout/cover.ts`.
- **A markets data source:** a `MarketsProvider` in `src/widgets/markets/`.
- **A formatting option in the editor:** start from `src/editor/schema.ts`, the one list the editor, importers and server agree on. The reader's renderer and the Markdown export have to learn it too.
- **An API route:** put the work in a function in `src/server/` that takes untrusted JSON and returns a result (`{ ok: true, ... }` or `{ ok: false, status, error }`), and keep the route to a line or two. Read bodies with `readJson`; desk routes that change the paper go through `deskResponse`.
- **A schema change:** edit `src/core/db/schema.ts`, run `npm run db:generate`, and commit the new SQL and snapshot in `src/core/db/migrations`. What Drizzle cannot express (the triggers) is written by hand in the migration. Never edit a migration that has shipped: every paper applies new ones automatically the next time it starts and cannot go back, so they must be safe on a database full of someone's writing.

## Checking your work

There is no CI on pull requests, so run these yourself. All three should pass:

```bash
npm test
npm run lint
npx tsc --noEmit
```

- **Tests** sit beside the code as `*.test.ts` and run in Node, without a browser. Anything touching the database opens a throwaway one with `openInstance(":memory:")`. Keep logic in plain modules (`src/core`, `src/feed`, `src/editor`, `src/desk`, `src/server`) where it can be tested, and keep components thin.
- **A bug fix comes with a test** that fails without it.
- **Anything a reader can see, look at.** Tests cannot judge a newspaper page. Run the dev server and view the front page, later pages (scroll), a piece (`/by/<moniker>/<slug>`), the editor (`/write`) and the desk, on a wide screen and a narrow one. Screenshots can go in `.screenshots/` (gitignored); attach them to the pull request.
- **Changes to layout** should be checked against the full seed, and against a paper with very few writings, where recipes have little to work with.

## Sending a change

- **One change per pull request.** Say what a reader, writer or editor will see differently, and how you checked it.
- **Commit subjects** are a plain sentence in the imperative describing the change as it appears, with no prefix: "Put a search field above the cover story".
- **Stay inside the change.** Do not reformat or rename things you are not otherwise touching, bump the version, or add a dependency without saying why it is needed.
- **Keep the docs true.** Setup, settings and upkeep are described in `README.md`; how the software is put together is described here. Update whichever your change makes wrong.
- **`AGENTS.md`** has a block that `next dev` writes and re-adds. Leave it, and commit it if it changes.
- Contributions are accepted under the project's licence (AGPL 3.0); see `CONTRIBUTING.md`.

## Writers

- **Words on screen.** Readers and writers are shown "moniker" for a pen name and "credential" for its key, and never told how many words a credential has. The code, the API fields (`name`, `key`) and this file keep the older words. The editor's key is still called the editor key.
- **Pen names, not accounts.** A writer is a name and a secret key (`writers` table: `name`, `handle`, `key_hash`). There is no email, profile or recovery, on purpose: the aim is writers who are anonymous yet identifiable, known by what they publish.
- **The key** is six words from `src/server/words.ts`, generated by the server and returned once from `POST /api/writers`; only its scrypt hash is stored. A lost key means the name can never be used again, by anyone, including the editor.
- **Names** are 2 to 20 characters: the letters of any Latin-based alphabet (accented, Vietnamese, West African), the digits 0-9, spaces, hyphens or underscores, and no other script (`NAME_PATTERN` in `src/server/writers.ts`), and only names that fold down to plain letters, digits and single hyphens, so that one byline cannot be made to look like another; the limit (`MAX_NAME_LENGTH`) is what a writer's page can set beside the nameplate on one line. Names registered under older rules still sign in: their stored handles are brought up to the present fold each time the paper's file is opened (`refoldHandles`). `handleOf` folds case, takes off accents, maps letters that read as plainer ones (ø as o, ɑ as a) and turns spaces, hyphens and underscores into a hyphen, so look-alikes collide and "Tomás Reyes" and "Tomas Reyes" are one name; the handle is also the writer's address, `/by/<handle>`. Someone taking a new name can type one or ask for one, and is then offered two words from `src/server/words.ts` joined by a hyphen (`suggestName`, `GET /api/writers/suggestion`), which they can edit, replace or have suggested again; an offer reserves nothing, and the name is taken only when it is registered. A request with no name at all still gets a placeholder derived from a digest of the key.
- **A writer's page** is the front page kept to one writer: the full `Masthead`, with the writer's name running into the nameplate from the left ("magma on" before the paper's name, which stays centered; `Masthead`'s `writer`), then a cover story and the rest below it, with later pages as the reader scrolls. Bylines everywhere link to it and print the name in the case its writer chose. A writer on their own page, with nothing in print that would make a decent cover (`suitsCover`: a photo and at least 150 words), sees one line saying so, which they can hide (`CoverNudge`). `readWriterPage` (`src/feed/feed.ts`) lays out the first page; its cursor carries the writer's id, so later pages come from `/api/feed` like the paper's own. A cursor also carries the feed position of the last story shown, so a story spiked or moved while a reader scrolls costs them no other story.
- **What is stored is checked first.** `normalizeDoc` (`src/editor/schema.ts`) refuses a document nested more than 16 deep, drops links that lead anywhere but the web, mail or the paper itself, and refuses photos from anywhere but the web or the paper's own uploads. Request bodies stop being read at 1 MB and must be sent as exactly `application/json` (`readJson`). Names are kept in one Unicode form (NFKC).
- **Publishing and editing** (`src/server/writings.ts`) require the pen name's key. A spiked piece cannot be edited by its writer and answers as if it did not exist. The byline is the writer's name, never a typed field. Only the writer can edit their piece; the editor cannot (they can spike it). Pieces from before pen names have `writer_id` null and only the editor can change them.
- **Bulletins.** Each writer has a board of short dated notices, and the paper has one of its own (`notices` table; `writer_id` is null for the paper's). A notice is plain text on one line, 40 words at most (`MAX_NOTICE_WORDS` in `src/core/notices/limits.ts`, which the browser imports too), and a board keeps its newest 5: posting one more drops the oldest. The newest run together, each after its date (mm/dd), following the word "Bulletin" on one line above the nameplate of the front page and of a writer's page (`BulletinLine`), cut off where the page ends and never scrolling; the line leads to the board itself, `/bulletin` or `/by/<handle>/bulletin`, a plain dated list (`BulletinBoard`). An empty board still shows the label, which is the way in for whoever can post to it. A writer posts and removes on their own board with their name and key (`POST /api/notices`, `DELETE /api/notices/:id`); the editor does so for the paper's, and can take a notice off any board (`/api/desk/notices`). This is the one thing a writer has besides their pieces; it is not a profile, and notices take no links or formatting.
- **In the browser** the name and key live in localStorage (`src/editor/identity.ts`). The byline field in the editor is the whole sign-in: a newcomer's first Publish creates the name and publishes the piece in one press; the piece's page then greets them once and hands over the key (`NewWriterNote`). Wherever a header has Write, "My pieces" sits beside it, or "Sign in" in a browser that remembers no pen name, leading to `/me` (`WriterDoor`): a browser that remembers a pen name has it checked with the paper and is sent on to that writer's page; anyone else gets a form to sign in with a name and key, or to take a new name and be shown its key. Signing in only makes the browser remember; there is still no session or account on the server. On a writer's own page, in their own browser, "My pieces" reads "Sign out" instead, which asks first in a small box that drops from the control (`SignOutPrompt`, also behind "Not you?" on the Write page), with the credential at hand to copy, and then makes the browser forget them. A piece's own writer also sees "Edit" in its header (`OwnEditLink`), decided in the browser from the stored name; the server still checks the key on every save. `handleOf` lives in `src/core/writers/handle.ts`, free of database imports, so the browser folds names the same way.

## Front page furniture

- **Inside box.** `generatePage(..., { inside: true })` carves a fixed `INSIDE` box (1 col x 22 rows) out of the recipe's frame before slicing: the top of the last one-column rail, else the top-right corner of the last region (splitting it). `Page.inside` is a leaf alongside `modules` for the tiling guarantee. It is dropped when the page would set every remaining story (nothing to point to), so the feed only asks for it on page 1.
- **Today strip.** Not set on any page at present: the bulletin line has its place above the nameplate. The code is whole. It is one line of type, a ticker: each widget renders inline (label, figures, arrows), and the line scrolls sideways on narrow screens. Keep it one line tall, with no titles: weather is city and temperature (the paper's own city first, then any in `options.weather.cities`), markets is label, arrow and move. Widgets live in `src/widgets/<id>/` and are listed in `src/widgets/registry.ts`; adding one is a folder plus one line. Instance config (location, time zone, widget list, per-widget options) comes from `BROADSHEET_TODAY` (inline JSON or a JSON file path), read once per process, not from the instance db. The dateline's clock and date, and the folios' dates, follow each reader's own time zone (read in the browser); `location.timeZone` is the server-side fallback and still sets dates on the desk and in search results.
- Each widget streams behind its own Suspense boundary; loads go through an in-memory TTL cache with a 2s timeout, stale-on-error, and a 60s back-off after failures, so a dead service costs one timeout per minute and never blocks the feed.
- Markets data uses Yahoo's unofficial chart endpoint, which answers 429 without a browser-like User-Agent. Stooq's CSV quote endpoint returned 404 as of Sept 2026. Providers sit behind `MarketsProvider` so they can be swapped.
- Every surface other than the front page and a writer's page wears `RunningHead`, the compact masthead; those two wear the full `Masthead`. Keep header changes in those two components so the front page, folios, reader, and editor stay one system.

## The desk and instances

- **Editor.** `/desk` is the instance editor's file manager, opened with the editor key. There are no user accounts. The key comes from one of two places (`src/server/editorKey.ts`): `BROADSHEET_EDITOR_KEY` in the host's environment (12+ characters; always wins, and is how a lost key is replaced), or the key chosen when the paper was **claimed**, of which only a scrypt hash is stored (`instance.editor_key_hash`). Signing in opens a session (`src/server/editorSessions.ts`): a random token in the browser's cookie, of which the paper keeps only a digest keyed by the editor's key, so no session row can be turned into a working cookie, or adds anything to guess the key from. (For a claimed paper the digest is keyed by the key's stored hash.) A session lasts 30 days, ends when signed out (from one browser, or from all with "Sign out everywhere" on the desk), and ends when the key changes.
- **Guessing is counted** (`src/server/attempts.ts`), in memory, by the address asking: 10 wrong writer credentials, editor keys or claim codes in ten minutes, and 10 new names (200 across the whole paper). Past a limit the answer is 429 and the slow hash is not run. Nothing is counted against the writer or key being guessed at, or anyone could lock its owner out by guessing wrongly on purpose. The address is the last entry of `x-forwarded-for` (`clientOf`), the one the host's own proxy wrote. That is only sound behind exactly one proxy: with none, the header is whatever the sender says and the limits can be dodged; with two, every reader shares the inner proxy's address. Requests with no header at all share one, larger, count.
- **Claiming.** A new paper has neither, so `/desk` shows a claim screen. It asks for a one-time code that `src/server/claim.ts` prints to the server log (in memory, new on each restart), so only whoever can read the host's logs can claim. Claiming works once.
- **Upkeep.** The desk links to `/api/desk/backup` (SQLite's own online backup of the whole file); `npm run paper` (under Commands) keeps the paper's own words outside it.
- **What an editor can change** is exactly what `src/server/desk.ts` exposes: the paper's name and own words (`updatePaper`), feed order (`moveInFeed`), spike/restore (`spikeOrRestore`), and the front page's cover (`chooseCover`: "Make cover" on the desk stores the writing's id in `instance.cover_writing_id`, and `pinnedCoverStrategy` uses it while that piece is in print, falling back to the algorithm when none is chosen or the chosen one is spiked; a writer's page always keeps the algorithm's choice). The editor cannot edit a writer's piece: the desk offers Edit only on one with no writer. Desk routes live under `/api/desk/*`. Those that change the paper go through `deskResponse`, which checks the session; backup checks `isEditor` itself; claim and session are how a session starts.
- **Spiked** writings (`writings.spiked_at`) are hidden from the feed and 404 for readers, but keep their date, edits and feed position. `listWritings` returns writings in print; `listAllWritings` is the editor's view.
- **Folders** on the desk (sections, writers, spiked) are views derived in `src/desk/folders.ts`, not stored. `readFeedPlan` lays out the whole edition to tell the desk which page each story lands on.
- **The paper's icon** (`src/app/icon.tsx`) is the first letter of its name in the nameplate's blackletter, drawn per request from the font file in `src/app/fonts/`, so it follows a rename.
- **The paper's own words** live on the single `instance` row: `name`, `ear_left`, `ear_right` (front-page ears; first line of the right ear is set bold), `about` and `agents` (Markdown). The editor writes them at `/desk/paper`. Page titles, the nameplate, `/about` and `/agents` all read from that row; a new instance is "Untitled" with everything else empty, and `/agents` is a 404 until written. `/about` and `/agents` share `PaperNote` and are deliberately minimal: one heading, a few paragraphs, no rules or boxes.
- **Body text in the feed** keeps the writer's bold and italic, and the subheads between paragraphs as centred bold crossheads, with no space around them (`proseBlocks` in `src/feed/blocks.ts`; `FitText` sets them). A subhead is never the last line in a box, and one above the first paragraph is dropped. Links, pull quotes and photos inside the text stay on the piece's own page.
- **Photos** are uploaded or linked. An upload is kept in the paper's file (`images` table) and served at `/i/<name>`, a random name, with its type read from the bytes (`sniffImageType`: JPEG, PNG, WebP or GIF, never SVG). One is 1.5 MB at most (`MAX_IMAGE_BYTES` in `src/core/images/limits.ts`, which the browser imports too); the browser redraws a larger one as a smaller JPEG before sending it (`src/components/uploadImage.ts`). A writer uploads with their name and key, 40 a day at most (`POST /api/images`), from the Photo form of the editor; the editor uploads from the desk's paper page (`POST /api/desk/images`), which is how a comic is uploaded. Both send the photo as base64 in JSON, so the content-type rule of `readJson` still holds. Nothing removes an upload that no piece uses.
- **The comic strip** is the editor's to choose (`instance.comic_image`, `comic_link`, `comic_credit`, set on the desk's paper page): an image (uploaded or by address), where it leads, and a credit line. It runs as one band across the foot of the front page, under the first page of stories and nowhere else (`ComicStrip`); a paper with no image set has no band. The code ships no comic and names none: which strip to run, and the right to run it, are the paper's own.
- `/about` ends with the one line the software adds to every instance ("<name> is a broadsheet instance"), linked to the broadsheet repository (`BROADSHEET_SOURCE_URL` overrides it). Nobody provisions or hosts instances.

## Commands

- `npm run dev` / `npm run build` / `npm test` / `npm run lint`
- `npm run seed`: replaces the writings, writers and bulletins of the local dev instance at `data/dev.sqlite` (gitignored) with ~46 samples under 14 pen names, keeping its name and own words; a dev paper nobody has named is called "The Proof". The sample writers' keys are discarded, so their pages (`/by/<handle>`) can be read but nobody can publish as them. The exception is the dev writer, **magma**, with six pieces of their own: sign in at `/me` (or in the byline at `/write`) with the credential `ember-flint-cinder-granite-comet-harbor` to see the paper as a writer does, with Edit on their own pieces and "Sign out" on their own page. That credential is public and exists only in seeded dev databases; never seed a real paper. The app serves `BROADSHEET_DB` if set, else that file. Restart `npm run dev` after reseeding (it holds the old file open).
- `npm run db:generate`: writes a migration from changes to `src/core/db/schema.ts`.
- `npm run paper -- export|import <file>`: moves a paper's own words to and from JSON.
- Packaging: `Dockerfile` (paper at `/data/paper.sqlite`), `docker-compose.yml`, `render.yaml` (the README's deploy button), and `.github/workflows/release.yml`, which publishes the image to ghcr.io on `v*` tags. None of these has been run by the maintainers yet; test before relying on them.
