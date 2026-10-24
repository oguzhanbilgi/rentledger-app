# AGENTS.md — MobileFactory app

This is a MobileFactory (ObAppStudio) Expo/React Native app built on the "Golden Chassis v2" template.
Read `docs/FACTORY_RULES.md` before changing anything — it is the single source of truth for product,
monetization, legal and design rules. If this file and the code disagree, the code and FACTORY_RULES win.

## Non-negotiable rules (monetization & policy)

1. **Pro is granted ONLY by an active RevenueCat entitlement.** Never set Pro from a `catch` block, a timeout,
   a missing package, a local flag, or a user-cancelled purchase. Use `purchasePlan()` / `restorePurchases()`
   from `src/services/revenuecat.ts` and handle every outcome (`success | cancelled | pending | error`).
2. **Rewards only for verified events.** A rewarded ad grants credit only on `EARNED_REWARD`
   (`showRewardedAd()` → `status: 'rewarded'`). Failed / no-fill / dismissed ads grant nothing in release.
   Share bonuses go through `grantBonus('share')`, which is capped per day and in total.
3. **No hardcoded prices, ad unit IDs or API keys in components.** Prices come from the store offering;
   IDs and public keys live in `factory.config.js`. Google sample ad IDs never ship (`npm run verify:release`).
4. **No fake ads.** Never render placeholder "AD" banners or simulated "sponsored" screens. If an ad fails, render nothing.
   Interstitials only via `maybeShowInterstitial()` at natural breaks — never on a timer.
5. **No secrets in the repo.** No RevenueCat secret keys (`sk_…`), service-account JSON, keystore files or passwords.
   Scripts read secrets from environment variables (`.env`, ignored by git).
6. **Honest claims.** Do not write "official", "DMV/notary approved", "legally binding", "bulletproof",
   "audit-proof" or similar claims in UI, PDFs or store listings. No "rate us 5 stars" prompts — use
   `recordReviewMilestone()` (official in-app review API).

## Code conventions

- Configuration: edit `factory.config.js` only; `app.config.ts` derives the Expo config from it. There is no `app.json`.
- Text: every user-facing string lives in `src/i18n/en.ts` and `src/i18n/tr.ts` (1:1 keys enforced by TypeScript).
  Use `useI18n()` in components and `t()` in services. No inline `isTr ? … : …` strings.
- Colors: token classes (`bg-surface dark:bg-surface-dark`, `text-ink dark:text-ink-dark`, `bg-primary` …) or
  `useThemeColors()` for icons. No raw hex values in JSX.
- Data: add tables by appending to `MIGRATIONS` in `src/services/database.ts` (never edit a shipped step).
  Production tables start empty. Read preferences with `getPref()` after `bootstrapApp()`; write with `setPref()`.
- Dates for "today"/day keys: `toLocalDateKey()` from `src/utils/date.ts` (never `toISOString().slice(0, 10)`).
- Money: store ISO currency codes (`USD`, `TRY`), format with `formatMoney(amount, code)`.
- PDF: build HTML with `buildPdfHtml()` and escape every user value with `escapeHtml()`.
- Quota: check `canUseUnit()` before producing output, call `consumeUnit()` only after success.
- React Compiler is enabled (`experiments.reactCompiler`). Components must NOT read mutable module state during
  render (`getPref()`, `getQuota()`, `canGrantBonus()`, `getAdsState()`, `getSubscriptionState()`…): the compiler
  memoizes those calls and the UI goes stale. Read state through the hooks (`useQuota()`, `useAds()`,
  `useSubscription()`, `useI18n()`, `useThemePreference()`); calling the getters inside event handlers is fine.

## Definition of done

```bash
npm run typecheck                      # must pass
npm run lint
npx expo export --platform android     # must bundle
npm run verify:release                 # must pass before a production build
```

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>`.
Docs: https://docs.expo.dev/eas/index.md

### Rules

- `ios/` and `android/` are generated (Continuous Native Generation). Never create or edit them by hand and never commit them — configure native behavior in `app.config.ts` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:android`, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries. Docs: https://docs.expo.dev/versions/latest/index.md
