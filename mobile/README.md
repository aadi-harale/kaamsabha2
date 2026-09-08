# KaamSabha Mobile

Expo / React Native mobile prototype for KaamSabha, derived from `aadi-harale/kaamsabha2`.

## Current branch

This mobile project is isolated on the `mobile-expo` branch so the production web app on `main` is not disturbed.

## Expo / EAS project

The app config is already wired to EAS project ID:

`874b7239-40b9-4241-9912-e3e0a59c9ab9`

Equivalent initialization command:

```bash
npx eas-cli@latest init --id 874b7239-40b9-4241-9912-e3e0a59c9ab9
```

The `app.json` also contains the project ID and EAS Updates URL.

## Requested Claude Expo plugin

Run once in the development environment that has Claude Code installed:

```bash
claude plugin install expo@claude-plugins-official
```

This cannot be installed through GitHub file APIs; it must be run in the local/cloud coding environment where Claude Code is installed.

## Run on your phone with Expo Go

```bash
git clone -b mobile-expo https://github.com/aadi-harale/kaamsabha2.git
cd kaamsabha2/mobile
npm install
npx expo start --tunnel
```

Install **Expo Go** on the phone and scan the QR code shown by Expo CLI.

`react-native-maps` 1.27.2 is included because the Expo SDK 57 docs list it as Expo Go compatible.

## EAS Update

After Expo authentication:

```bash
npx eas-cli@latest login
npx eas-cli@latest update:configure
npx eas-cli@latest update --branch preview --message "KaamSabha mobile preview"
```

The resulting EAS dashboard/update URL can be opened from Expo Go for a compatible update.

## Development build

For a reusable Android development build:

```bash
npx eas-cli@latest build --profile development --platform android
```

For an internal preview APK/build:

```bash
npx eas-cli@latest build --profile preview --platform android
```

## Quality checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

Then start Expo and test the cross-role story:

Customer books Electrical -> Worker accepts -> travels -> arrives -> proposes extra scope -> Customer approves -> Customer issues Start OTP -> Worker starts -> uploads proof -> Customer issues Completion OTP -> Worker completes -> Customer demo payment -> Worker checks earnings / Replay Court / Voice -> Admin sees cases / Governance / Federation.

## Important product boundaries

- Payment UI is demo-only until a real payment provider is integrated.
- Map positions are illustrative service positions, not worker home addresses or verified live GPS.
- AI is advisory / language assistance only.
- Federation chooses a cooperative first; that cooperative chooses its own worker second.
- The web repo remains the domain source of truth.
