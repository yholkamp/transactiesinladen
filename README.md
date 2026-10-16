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

## Self-hosting

You can run your own copy on Cloudflare Workers; the free plan is enough. You need a Cloudflare
account, a Moneybird account and Node.js.

1. Get the code and log in to Cloudflare:

   ```bash
   git clone https://github.com/yholkamp/transactiesinladen.git
   cd transactiesinladen
   npm install
   npx wrangler login
   ```

2. Deploy once to create the Worker and get its URL:

   ```bash
   npm run deploy
   ```

   Wrangler prints the URL, e.g. `https://creditbird.<your-subdomain>.workers.dev`. To use another
   Worker name, change `name` in `wrangler.toml` before deploying. Connecting to Moneybird fails until
   the secrets from step 4 are set.

3. Register a Moneybird application at https://moneybird.com/user/applications/new (choose "API"
   access). Add a redirect URI for every origin you use:
   - `https://creditbird.<your-subdomain>.workers.dev/api/auth/callback`
   - `https://<your-custom-domain>/api/auth/callback`, if you add a custom domain to the Worker
   - `http://localhost:8787/api/auth/callback`, for [local development](#local-development)

   Keep the client ID and client secret at hand. The app requests the `bank` and `settings` scopes.

4. Set the secrets on the Worker:

   ```bash
   npx wrangler secret put MONEYBIRD_CLIENT_ID       # paste the client ID
   npx wrangler secret put MONEYBIRD_CLIENT_SECRET   # paste the client secret
   openssl rand -base64 32 | npx wrangler secret put SESSION_SECRET
   ```

   | Secret                    | Value                                                                                |
   | ------------------------- | ------------------------------------------------------------------------------------ |
   | `MONEYBIRD_CLIENT_ID`     | Client ID of your Moneybird application                                              |
   | `MONEYBIRD_CLIENT_SECRET` | Client secret of your Moneybird application                                          |
   | `SESSION_SECRET`          | Random string of at least 32 characters that encrypts the session cookie; changing it logs everyone out |

   Each `secret put` takes effect right away and secrets survive later deploys. You can also manage
   them in the Cloudflare dashboard under the Worker's Settings → Variables and Secrets. They are
   runtime secrets: don't put them in `wrangler.toml` or `.env.local`, which only holds the build-time
   [legal page](#legal-pages) variables.

5. In the Moneybird administration you import into, create a credit card financial account (the API
   cannot create accounts).

6. Open the Worker URL and connect to Moneybird.

To update, run `git pull && npm run deploy`. If you offer your instance to others, also configure the
[legal pages](#legal-pages) and see the [license](#license).

### Deploying from Git

Instead of deploying from your machine, you can connect your fork to Workers Builds (Git
integration). It deploys `main` with `npx wrangler deploy` and uploads preview versions for other
branches with `npx wrangler versions upload`. Previews only work once the Worker exists, i.e. after
the first production deploy. Set the secrets on the Worker as in step 4; `VITE_LEGAL_*` variables go
in the build variables.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # the same three secrets as in self-hosting step 4
npm run dev                      # builds and runs wrangler dev on http://localhost:8787
npm test
```

Your Moneybird application needs `http://localhost:8787/api/auth/callback` as a redirect URI. The
session cookie is `Secure`; Chrome/Firefox accept it on http://localhost, Safari may not, so use
Chrome/Firefox for local dev.

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
