# Magnus Flipper Mobile

Production-safe Expo mobile app scaffold.

## Stack

- **Expo SDK 52** (managed workflow)
- **TypeScript** (strict mode)
- **Expo Router** (file-based routing)
- **React Query** (data fetching)
- **Firebase Auth** (client-side authentication)

## Prerequisites

- Node.js 18+
- pnpm (monorepo package manager)
- iOS Simulator (Mac) or Android Emulator

## Quick Start

### 1. Install Dependencies

```bash
cd apps/mobile
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_FIREBASE_API_KEY=your-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
```

### 3. Start Development Server

```bash
pnpm start
```

This opens Expo DevTools. Press:
- `i` for iOS Simulator
- `a` for Android Emulator
- `w` for web browser

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout (React Query provider)
│   ├── index.tsx          # Home screen
│   ├── (auth)/            # Auth flow
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/            # Main app tabs
│       ├── deals.tsx
│       ├── monitors.tsx
│       └── profile.tsx
├── src/
│   ├── api/
│   │   └── client.ts      # API client stub
│   ├── config/
│   │   └── env.ts         # Environment loader
│   └── lib/
│       └── firebase.ts    # Firebase client setup
├── app.json               # Expo configuration
├── package.json
└── tsconfig.json
```

## Available Scripts

```bash
pnpm start          # Start Expo DevTools
pnpm android        # Run on Android
pnpm ios            # Run on iOS
pnpm web            # Run in web browser
pnpm typecheck      # Type check without building
```

## Environment Variables

All environment variables **must** use the `EXPO_PUBLIC_` prefix to be accessible in the app.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.example.com` |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `my-project` |

## API Integration

The API client is stubbed and ready to use:

```typescript
import { apiClient } from '@/api/client';

// Example usage (wire endpoints when ready)
const response = await apiClient.get('/deals');
if (response.success) {
  console.log(response.data);
}
```

## Firebase Auth

Firebase is initialized but not yet wired to UI. Authentication flow placeholders exist in `app/(auth)/`.

## Routing

File-based routing using Expo Router:

- `/` → `app/index.tsx` (Home)
- `/(auth)/sign-in` → `app/(auth)/sign-in.tsx` (Sign In)
- `/(tabs)/deals` → `app/(tabs)/deals.tsx` (Deals Tab)

## Type Safety

TypeScript strict mode is enabled. Run type checking:

```bash
pnpm typecheck
```

## Production Deployment

**Not configured yet.** To deploy:

1. Set up EAS Build (`eas build:configure`)
2. Configure app signing
3. Build for production (`eas build --platform all`)

## Troubleshoads

### "Metro bundler can't find module"

```bash
rm -rf node_modules .expo
pnpm install
```

### "Environment variable not found"

Ensure all env vars use `EXPO_PUBLIC_` prefix and restart the dev server after changes.

### "Firebase initialization failed"

Check `.env.local` has valid Firebase config values.

## Notes

- **No backend dependency**: App runs standalone with placeholder screens
- **No hardcoded endpoints**: API client uses env vars
- **No demo data**: All screens are placeholders
- **No Stripe integration**: Payment flow not implemented
- **Monorepo safe**: Does not import from backend packages

## Next Steps

1. Wire Firebase Auth to sign-in screens
2. Implement deal/monitor list screens
3. Connect API client to real endpoints
4. Add error boundaries
5. Configure EAS Build for deployment
