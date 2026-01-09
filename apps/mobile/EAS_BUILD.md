# EAS Build Pipeline Documentation

## Overview

This document provides complete instructions for building and deploying the Magnus Flipper mobile app using Expo Application Services (EAS).

## Prerequisites

1. **EAS CLI Installed**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**
   - Sign up at https://expo.dev
   - Login: `eas login`

3. **Project Configured**
   - Verify `eas.json` exists
   - Verify `app.json` has:
     - `slug`: magnus-flipper-mobile
     - `ios.bundleIdentifier`: com.magnusflipper.mobile
     - `android.package`: com.magnusflipper.mobile

---

## Required Environment Secrets

These secrets MUST be configured in EAS before building.

### Configure Secrets via CLI

```bash
# API Base URL (Cloud Run endpoint)
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://your-api.run.app" --type string

# Firebase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_FIREBASE_API_KEY" --type string
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com" --type string
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id" --type string
```

### List All Secrets

```bash
eas secret:list
```

### Secret Requirements

| Secret Name | Example Value | Purpose |
|-------------|---------------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://magnus-api-prod.run.app` | Backend API endpoint |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `AIzaSyC...` | Firebase Web API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `magnus-flipper.firebaseapp.com` | Firebase Auth Domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `magnus-flipper-prod` | Firebase Project ID |

---

## Build Profiles

### 1. Development Build

**Purpose**: Local development with Expo Dev Client

**Command**:
```bash
cd apps/mobile
eas build --profile development --platform android
eas build --profile development --platform ios
```

**Output**:
- Android: Development APK
- iOS: Simulator build

**Use Case**: Testing on physical devices with hot reload

---

### 2. Preview Build

**Purpose**: Internal testing before production

**Command**:
```bash
cd apps/mobile
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

**Output**:
- Android: APK for distribution
- iOS: Ad-hoc IPA

**Use Case**: QA testing, stakeholder demos

**Distribution**:
```bash
# Share via Expo
eas build:list
```

---

### 3. Production Build

**Purpose**: App Store / Play Store submission

**Command**:
```bash
cd apps/mobile

# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

**Output**:
- Android: AAB (Android App Bundle)
- iOS: IPA for App Store

**Auto-increment**: Version codes automatically increment

---

## Build Workflow

### First Time Setup

1. **Configure EAS Project**
   ```bash
   cd apps/mobile
   eas init
   ```

2. **Configure Secrets** (see above)

3. **Configure iOS Credentials** (if building iOS)
   ```bash
   eas credentials
   ```

### Standard Build Process

1. **Clean Install**
   ```bash
   pnpm install
   ```

2. **Type Check**
   ```bash
   pnpm typecheck
   ```

3. **Build Preview**
   ```bash
   eas build --profile preview --platform android
   ```

4. **Test Build**
   - Download APK from EAS dashboard
   - Install on test device
   - Verify authentication flow
   - Verify API connectivity

5. **Build Production** (when ready)
   ```bash
   eas build --profile production --platform android
   eas build --profile production --platform ios
   ```

---

## Submission to Stores

### Android (Google Play)

1. **Configure Service Account**
   - Create service account in Google Cloud Console
   - Download JSON key
   - Save as `playstore-service-account.json`
   - DO NOT commit this file

2. **Submit**
   ```bash
   eas submit --platform android --profile production
   ```

### iOS (App Store)

1. **Configure App Store Connect**
   - Update `ascAppId` in `eas.json`
   - Update `appleTeamId` in `eas.json`

2. **Submit**
   ```bash
   eas submit --platform ios --profile production
   ```

---

## Monitoring Builds

### View Build Status

```bash
# List recent builds
eas build:list

# View specific build
eas build:view <BUILD_ID>

# View build logs
eas build:view <BUILD_ID> --logs
```

### Dashboard

https://expo.dev/accounts/YOUR_ACCOUNT/projects/magnus-flipper-mobile/builds

---

## Troubleshooting

### Build Fails: Missing Secrets

**Error**: "EXPO_PUBLIC_API_BASE_URL is not defined"

**Fix**:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "YOUR_VALUE" --type string
```

### Build Fails: TypeScript Errors

**Fix**:
```bash
cd apps/mobile
pnpm typecheck
# Fix errors, then rebuild
```

### Build Fails: Native Dependencies

**Error**: "Package X requires custom native code"

**Fix**: Verify `eas.json` uses managed workflow. If native modules needed, configure `app.json` plugins.

### iOS Build Fails: Provisioning

**Fix**:
```bash
eas credentials
# Follow prompts to regenerate certificates
```

---

## CI/CD Integration (Future)

### GitHub Actions Example

```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --profile preview --platform android --non-interactive
```

---

## Security Checklist

- ✅ No `.env` files committed
- ✅ All secrets in EAS only
- ✅ Service account JSON excluded from git
- ✅ API_BASE_URL points to production endpoint
- ✅ Firebase project uses production credentials

---

## Build Artifacts

### Where to Find Builds

1. **EAS Dashboard**: https://expo.dev
2. **Direct Download**: Use build ID from `eas build:list`
3. **Expo Go**: Preview builds can be opened in Expo Go app

### Build Output Locations

- **Android APK**: Downloads section of EAS dashboard
- **Android AAB**: Auto-submitted to Play Store (if configured)
- **iOS IPA**: Downloads section or auto-submitted to TestFlight

---

## Support

- **Expo Docs**: https://docs.expo.dev/build/introduction/
- **EAS Docs**: https://docs.expo.dev/eas/
- **Firebase Docs**: https://firebase.google.com/docs/auth

---

## Quick Reference

```bash
# Login
eas login

# Configure secrets
eas secret:create --scope project --name KEY --value VALUE --type string

# Build preview
eas build --profile preview --platform android

# Build production
eas build --profile production --platform all

# Submit to stores
eas submit --platform android --profile production

# View builds
eas build:list
```

---

**Last Updated**: 2026-01-09
**EAS CLI Version**: >= 13.2.0
**Expo SDK Version**: 52.x
