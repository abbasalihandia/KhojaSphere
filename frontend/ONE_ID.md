# One ID integration (frontend, phase 1)

Mode: `VITE_ONE_ID_MODE=off|mock|live` (unset = `mock` in dev, `off` in production builds).

- `src/api/oneId/` – types, adapter interface, mock provider, http provider stub, state helpers.
  The UI only talks to the adapter via `context/OneIdContext.tsx` (`useOneId()`).
- `components/OneIdBadge.tsx` – `OneIdBadge` (states) and `OwnerBadge` (public "Verified Jamaat Member" + "Same Jamaat").
- `components/OneIdMemberCard.tsx` – ID-card style view (own design, no issuer logos; demo photo picker).
- `components/OneIdLinkModal.tsx`, `OneIdCard.tsx`, `VisibilitySettings.tsx` – linking and privacy UI (Dashboard → My Profile).

## Going live
1. Backend returns `ownerOneId: { verified, jamaat? }` on businesses, properties, marketplace items, mentors and search results.
   `resolveOwnerBadge()` already prefers real data over the mock.
2. Implement `httpProvider.ts` (routes are listed in the file) and put field mapping in `mapOneIdToProfile()`.
3. Set `VITE_ONE_ID_MODE=live`; delete `mockOwnerOneId` and the demo picker in the link modal.

Mock data is fictional. Never commit real member cards or ID numbers.
