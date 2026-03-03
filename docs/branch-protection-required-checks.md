# Branch protection required checks (main)

Configure GitHub branch protection for `main` to require these CI checks:

- `Backend required checks`
- `Frontend admin required checks`
- `Frontend store required checks`

These checks enforce:
- Backend: `npm ci && npm run build && npm test -- app.bootstrap.spec.ts --runInBand`
- Admin frontend (Webpack build): `npm ci && npm run build && npm run check:next-build-artifacts`
- Store frontend (Webpack build): `npm ci && npm run check:runtime-entrypoint && npx tsc --noEmit && npm run build && npm run check:next-build-artifacts`
- Lockfile guardrails: each job fails if `package-lock.json` is missing or modified by `npm install --package-lock-only --ignore-scripts`.

Build artifact smoke checks require:
- `.next/BUILD_ID`
- `.next/server/app/**/[locale]/**/client-reference-manifest*`
