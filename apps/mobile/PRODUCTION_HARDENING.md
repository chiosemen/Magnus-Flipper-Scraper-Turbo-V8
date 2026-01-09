# Production Hardening - Mobile App

## Overview

This document describes all production-grade security and reliability features implemented in the Magnus Flipper mobile app.

---

## 🔐 Security Hardening

### 1. Secure Token Storage (`src/context/AuthContext-secure.tsx`)

**Implementation:**
- Uses `expo-secure-store` for sensitive token storage
- Stores Firebase session tokens encrypted on device
- Automatic cleanup on logout
- Session persistence check on app launch

**Why Secure Store:**
- AsyncStorage is unencrypted (not suitable for tokens)
- SecureStore uses iOS Keychain and Android Keystore
- Platform-native encryption

**Usage:**
```typescript
import { AuthProvider } from '@/context/AuthContext-secure';
// Wrap app with secure AuthProvider
```

---

### 2. Token Refresh Interceptor (`src/lib/api-secure.ts`)

**Features:**
- Automatic token refresh on 401 Unauthorized
- Request queuing during refresh
- Automatic logout on refresh failure
- Fresh JWT token on every request

**How It Works:**
1. Request fails with 401
2. Pause all pending requests
3. Call `user.getIdToken(true)` to force refresh
4. Retry original request with new token
5. If refresh fails → logout user

**Usage:**
```typescript
import { api } from '@/lib/api-secure';

// All requests automatically include fresh token
const data = await api.get('/users/me');
```

---

## 🎯 Pre-Flight Verification

### Verification Script (`scripts/verify-mobile.sh`)

**Checks:**
1. TypeScript compilation (`tsc --noEmit`)
2. Expo config validation (`expo config --check`)
3. Metro bundling
4. Workspace dependency linking

**Run Before Every Build:**
```bash
cd apps/mobile
./scripts/verify-mobile.sh
```

---

## 📱 App Store Submission Ready

### Assets Configuration

**Splash Screen:**
- Background: `#0f172a` (brand color)
- Proper sizing for all devices

**Permissions:**
- **Android:** Empty permissions array (no unnecessary permissions)
- **iOS:** Defensive permission descriptions for unused features

### Asset Generation (`scripts/generate-assets.sh`)

**Generates:**
- App icons (all sizes)
- Adaptive icons (Android)
- Splash screens
- Favicons

**Run:**
```bash
cd apps/mobile
./scripts/generate-assets.sh
```

---

## 🏗️ Build Configuration

### EAS Profiles

| Profile | Purpose | Distribution | Output |
|---------|---------|--------------|--------|
| `development` | Local dev | Internal | APK + Simulator |
| `preview` | QA testing | Internal | APK (testable) |
| `production` | Store submission | Public | AAB + IPA |

### Environment Variables (Required)

Configure via EAS CLI before building:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "https://your-api.run.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
```

---

## 🚀 Production Deployment Checklist

### Before First Build

- [ ] Run `./scripts/verify-mobile.sh`
- [ ] Configure all EAS secrets
- [ ] Run `./scripts/generate-assets.sh`
- [ ] Verify `app.json` version is `1.0.0`
- [ ] Confirm no hardcoded secrets in code

### Build Commands

```bash
# Preview build (for testing)
eas build --profile preview --platform android

# Production build (for stores)
eas build --profile production --platform android
eas build --profile production --platform ios
```

### After Build Completes

- [ ] Download APK/IPA from EAS dashboard
- [ ] Test authentication flow
- [ ] Test API connectivity
- [ ] Verify token refresh works (force 401)
- [ ] Test logout clears secure storage

---

## 🔒 Security Best Practices

### Token Management
- ✅ Tokens stored in SecureStore (encrypted)
- ✅ Automatic refresh on 401
- ✅ Logout wipes all stored tokens
- ✅ Fresh token on every API request

### Error Handling
- ✅ Session expired logs user out
- ✅ No sensitive data in error messages
- ✅ Failed requests don't retry indefinitely

### Permissions
- ✅ Zero unnecessary permissions requested
- ✅ Defensive permission descriptions
- ✅ Ready for App Store review

---

## 📊 Monitoring (Future)

### Sentry Integration (Planned)
- Error tracking
- Performance monitoring
- Release tracking

### Analytics (Planned)
- Screen view tracking
- User behavior analytics
- Conversion funnels

---

## 🧪 Testing (Future)

### Integration Tests
- API contract tests
- Type-safe mock responses
- Screen rendering tests

### E2E Tests
- Authentication flow
- API integration
- Token refresh scenarios

---

## 📚 Reference

- **EAS Build Guide:** `EAS_BUILD.md`
- **Secure Auth:** `src/context/AuthContext-secure.tsx`
- **Secure API:** `src/lib/api-secure.ts`
- **Verification:** `scripts/verify-mobile.sh`
- **Assets:** `scripts/generate-assets.sh`

---

**Last Updated:** 2026-01-09
**Ready for Production:** ✅ YES
