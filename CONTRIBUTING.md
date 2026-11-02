# Contributing to Folio

Thanks for wanting to help. Folio is a small project, mostly built by one person, so a few shared habits keep it easy to work on. This page covers how to set up, the conventions the code follows, and how to get a change merged.

## Before you start

- **Small fix** (a typo, a clear bug): open a pull request directly.
- **Anything bigger** (a new feature, a change to how something works, a new dependency): open an issue first and describe what you'd like to do. It saves you from building something that doesn't fit.
- [Where things stand](README.md#where-things-stand) in the README lists what's coming next. If you'd like to take one of those on, say so in an issue so nobody does it twice.

## Setting up

Follow [Getting started](README.md#getting-started) in the README: install, `.env.local`, the Supabase migrations, the Edge Functions and the Hocuspocus server. Then:

```bash
npm run dev
```

You don't need an account to work on the editor: the landing page (`/` when signed out) runs the real editor with nearly every block, the slash menu, the drag handle and a live two-window collaboration demo. Anything that needs pages, people or a database (page links, mentions, the sidebar, databases, chat) needs a signed-in session.

### Desktop app

The desktop app (Windows, macOS, Linux) is the same web app in a [Tauri 2](https://v2.tauri.app) window; the native side lives in `src-tauri/`. To work on it, install Rust and your system's Tauri prerequisites once ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)), then:

```bash
npm run desktop:dev     # the app in a window, reloading as you edit (runs npm run dev)
npm run desktop:build   # installers in src-tauri/target/release/bundle/
```

It reads the same `.env.local`; set `VITE_PUBLIC_APP_URL` so copied links point at the web app. In the app, links to other sites open in the default browser (`src/lib/desktop.ts`), there's no service worker, and Google and email-link sign-ins finish in the browser, then come back into the app through a `folio://auth/callback` link (`src/features/desktop/deep-links`). For that, add `folio://auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs, once per project. Other `folio://` links open the web app's paths in the app: `folio://page/<id>` is `/page/<id>`.

## Branches and commits

- Branch from an up-to-date `main`, one branch per change. To catch up with `main` later, rebase (`git fetch upstream` then `git rebase upstream/main`) rather than merging `main` into your branch: merges are how duplicate code sneaks in.

  | Prefix      | For                                      |
  | ----------- | ---------------------------------------- |
  | `feat/`     | a new feature (`feat/move-to-page`)      |
  | `fix/`      | a bug fix (`fix/drag-handle-listeners`)  |
  | `perf/`     | performance                              |
  | `refactor/` | restructuring without a behaviour change |
  | `docs/`     | documentation                            |
  | `chore/`    | tooling, dependencies, clean-up          |

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): what changed`, in the present tense, with a body when the why isn't obvious.

  ```
  fix(drag-handle): keep drag listeners when plugin views are rebuilt

  Registering any plugin after the drag handle destroyed its plugin view,
  which removed its dragstart/dragend listeners: drops did nothing.
  ```

- Keep a pull request to one topic. Several small related fixes can share one; an unrelated change gets its own.

## Code conventions

### Where code goes

[`docs/STRUCTURE.md`](docs/STRUCTURE.md) has the full layout. In short:

- Code that belongs to one feature → `src/features/<feature>/`
- Data access → `src/api/`, with a React Query hook in `src/hooks/`
- An editor node → `src/components/tiptap-node/`; editor UI → `src/components/tiptap-ui/`; an extension → `src/components/tiptap-extension/`
- Generic UI with no Folio concepts → `src/components/tiptap-ui-primitive/`
- Pure functions → `src/lib/` (logic) or `src/utils/` (factories)

### Changes

- **Keep changes small and focused.** Change what the task needs, leave the rest. Don't reformat files you didn't otherwise touch.
- **Read the code before changing it.** Most bugs here come from an assumption about how a piece works. Check the actual code (and the library's source in `node_modules` when it matters) first.
- **Don't invent APIs.** Use the types and hooks that exist. If something you need is missing, add it properly rather than casting around it.

### TipTap and React

These rules come from real bugs:

- **Never update React state from an editor event listener.** `editor.on("transaction" | "update", () => setState(...))` causes "Maximum update depth exceeded" loops. Read editor state with TipTap's `useEditorState({ editor, selector })` and return a primitive (a boolean, a number, a string) so the component re-renders only when that value changes. For an external store, use `useSyncExternalStore`.
- **No `contentEditable` inside a node view.** It fights ProseMirror for the selection. Use an `<input>` or `<textarea>` and stop key events from reaching the editor.
- **Inputs opened from the editor get focus on the next frame.** The editor takes focus back after a slash command or a click, so focus inner inputs in `requestAnimationFrame`.
- **Copy ProseMirror attrs before passing them to Yjs.** Write `{ ...node.attrs }`: Yjs rejects null-prototype objects.
- **Plugins registered at runtime rebuild every plugin view.** Anything a plugin view sets up must survive being destroyed and recreated (see `drag-handle-extension-react/DragHandle.tsx`).

### Text and languages

- Every string a user can see goes through i18next, with both languages: `src/i18n/locales/en/common.json` and `src/i18n/locales/fr/common.json`.
- Add new keys by hand, next to related ones. Search both files first and reuse a key that already says what you need (`colors.*`, `blockTypes.*`, `toolbar.*`).
- Run `node scripts/check-i18n.mjs` after changing them: it fails on a duplicate key or a key that's in one language but not the other.
- Write plainly: short sentences, everyday words, no jargon in the interface.

### Data and security

- **Database changes are migrations.** Add a new numbered file in `supabase/migrations/` (the next number after the last one). Never edit a migration that has already been applied.
- **Access rules live in Postgres.** New tables get Row Level Security policies, and the frontend never relies on hiding something as its only protection.
- **Secrets stay on the server.** API keys for third-party services go in an Edge Function (`supabase/functions/`) or the Hocuspocus server, never in a `VITE_` variable. The service role key is for the Hocuspocus server only.
- Never commit `.env.local`, `.env`, or any key.

## Before you open a pull request

1. **Type check:** `npx tsc -p tsconfig.app.json --noEmit` with no errors.
2. **Translations:** `node scripts/check-i18n.mjs` passes.
3. **Lint your files:** `npx eslint <your files>` with no new errors. (`npm run lint` on the whole repo still reports older errors; fixing those is welcome in its own pull request.)
4. **Format only what you changed:** `npx prettier --write <your files>`. Don't run it on the whole repo.
5. **Try it in the browser.** Use the landing editor for editor changes, and a signed-in page for anything that needs data. Check the console for errors, and try light and dark themes, and English and French when you've added text.
6. **Build:** `npm run build` succeeds.

The same typecheck, translation check and build run automatically on every pull request (GitHub Actions). A pull request is reviewed once those checks are green.

## Pull requests

- Give the pull request a Conventional Commit style title.
- In the description, say what changed and why, how you tested it, and anything you couldn't test. Add a screenshot or a short recording for visual changes.
- Link the issue it closes (`Closes #12`).
- Sign off every commit (`git commit -s`). See [Licence and contributor terms](#licence-and-contributor-terms).
- Expect review comments. They're about the code, not you. You'll get a first reply within a couple of days.
- Pull requests are squashed into one commit when merged, so don't worry about tidying your commit history.
- A pull request waiting on changes with no reply for 14 days is closed, and its issue goes back to open. You can always reopen it.

## Reporting a bug

Open an issue with:

- what you did, what you expected, and what happened
- the browser and whether you were signed in
- any red lines from the browser console (F12)

For a security problem (someone could see or change data they shouldn't), don't open a public issue: contact the maintainer directly through their GitHub profile.

## Licence and contributor terms

Folio is licensed under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`).

By opening a pull request, you agree to two things:

1. **Sign-off.** The contribution is your own work, or you have the right to submit it, and you submit it under the AGPL-3.0. You confirm this by signing off each commit with `git commit -s`, which adds a `Signed-off-by: Your Name <you@example.com>` line. That line means you agree to the [Developer Certificate of Origin 1.1](https://developercertificate.org).
2. **Relicensing.** You give Jule, the maintainer, a permanent, worldwide, non-exclusive, royalty-free and irrevocable licence to use, change, sublicense and distribute your contribution, including under licences other than the AGPL-3.0 (for example, a commercial licence). You keep the copyright to your contribution.

Why the second point: it keeps the option open to offer Folio under other terms later (for example, to a company that wants to build it into a closed-source product), while everything in this repository stays available under the AGPL-3.0.
