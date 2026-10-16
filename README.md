# Moneybird credit card CSV import

Cloudflare Workers app (static assets + Worker) that connects to a Moneybird administration via OAuth and imports credit card
transactions from a CSV file as a financial statement.

- CSV parsing, column mapping, preview and duplicate detection run in the browser.
- The Worker (`server/worker.ts`) routes `/api/*` to the handlers in `functions/api`, which handle OAuth and proxy the Moneybird API. The OAuth token is
  kept in an AES-GCM encrypted, HttpOnly cookie; nothing is stored server-side.
- Column mappings are remembered per CSV header layout in the browser's localStorage. A preset for
  ICS/ABN AMRO credit card exports is built in.
- The UI is available in Dutch (default) and English via the NL/EN switch; the choice is remembered
  in localStorage. Texts live in `src/i18n/nl.ts` (source of truth) and `src/i18n/en.ts`.
- Dutch-only legal pages: `/privacy` (privacybeleid) and `/voorwaarden` (algemene voorwaarden), in
  `src/pages/`, shown only when operator details are configured (see [Legal pages](#legal-pages)).
  Update `LAST_UPDATED` in `src/pages/LegalPage.tsx` when changing either text.

## Moneybird setup

1. Register an application at https://moneybird.com/user/applications/new (choose "API" access).
2. Add redirect URIs for every origin you use:
   - `https://creditbird.<your-subdomain>.workers.dev/api/auth/callback`
   - `http://localhost:8787/api/auth/callback` (local development)
3. In the administration you import into, create a credit card financial account
   (the API cannot create accounts).

The app requests the `bank` and `settings` scopes.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in client id/secret and a random SESSION_SECRET
npm run dev                      # builds and runs wrangler dev on http://localhost:8787
npm test
```

`SESSION_SECRET` must be at least 32 characters (`openssl rand -base64 32`). The session cookie is `Secure`; Chrome/Firefox accept it on http://localhost, Safari may not, so use Chrome/Firefox for local dev.

## Deploy

```bash
npm run deploy                   # first deploy creates the creditbird Worker
npx wrangler secret put MONEYBIRD_CLIENT_ID
npx wrangler secret put MONEYBIRD_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Workers Builds (Git integration) deploys `main` with `npx wrangler deploy` and uploads preview
versions for other branches with `npx wrangler versions upload`. Previews only work once the Worker
exists, i.e. after the first production deploy.

## Legal pages

The privacy policy, terms of use, the consent notice under the connect button and the footer contact
link are only included when the operator's details are set. They are read at build time from
`VITE_LEGAL_*` variables: copy `.env.example` to `.env.local` for local builds and deploys, and add
the same variables as build variables in Workers Builds.

| Variable            | Required | Example                     |
| ------------------- | -------- | --------------------------- |
| `VITE_LEGAL_NAME`   | yes      | `Voorbeeld B.V.`            |
| `VITE_LEGAL_EMAIL`  | yes      | `info@example.com`          |
| `VITE_LEGAL_STREET` | no       | `Straatweg 1`               |
| `VITE_LEGAL_CITY`   | no       | `1234 AB Amsterdam`         |
| `VITE_LEGAL_KVK`    | no       | `12345678`                  |
| `VITE_LEGAL_COURT`  | no       | `Amsterdam` (court for disputes; otherwise "de bevoegde Nederlandse rechter") |

Without a name and email none of it is shown, which is fine for personal use. If you offer the tool to
others, review the texts in `src/pages/` yourself; they describe this app as published here and are
not legal advice.

## How amounts are imported

- Debits (purchases) are imported as negative amounts, credits (repayments, refunds) as positive.
- With a debit/credit column, the amount's absolute value is used and the column decides the sign.
- Transactions already present in the selected Moneybird account (same amount, date within 3 days,
  matching description) are flagged as duplicates and skipped by default.
- Imports larger than 500 transactions are split into multiple statements.

## License

[GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) (AGPL-3.0-only). See [LICENSE](LICENSE).
If you run a modified version as a service, the AGPL requires you to offer its source code to its users.
