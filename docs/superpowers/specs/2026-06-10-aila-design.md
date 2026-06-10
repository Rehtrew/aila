# Aila — Design Spec
*Date: 2026-06-10*

## Overview

A native iOS app for Danish parents that connects to the Aula school platform via its internal API. Goal for v1: prove the plumbing works — authenticate via MitID and display basic profile data.

Aula is operated by KOMBIT (a publicly owned Danish IT company) and has no official public API. The app uses Aula's own internal API (the same one their web app uses), documented by the community. There is no dependency on any third-party library for API access — we write our own client.

---

## Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Expo SDK 52+ | JS/web dev background, no Swift experience |
| Architecture | New Architecture enabled | Required for smooth 60fps native feel |
| Routing | Expo Router (native stack) | File-based, native UINavigationController, swipe-back works |
| Language | TypeScript | Type safety for API responses |
| Auth session | `expo-web-browser` | Wraps ASWebAuthenticationSession, handles arbitrary redirect URIs |
| Token storage | `expo-secure-store` | iOS Keychain under the hood |
| Animations | `react-native-reanimated` | UI-thread animations, no JS-thread jank |
| Gestures | `react-native-gesture-handler` | Native gesture recognizers |

No backend. The app talks directly to Aula's API.

---

## Project Structure

```
aila/
  app/
    index.tsx                  # Redirect: token exists → (app)/home, else → (auth)/login
    (auth)/
      _layout.tsx              # Unauthenticated layout (no header)
      login.tsx                # "Log ind med MitID" screen
    (app)/
      _layout.tsx              # Protected layout — redirects to login if no token
      home.tsx                 # Demo home screen
  lib/
    aula-api.ts                # Typed Aula API client
    auth.ts                    # Token exchange, refresh, secure storage helpers
  constants/
    aula.ts                    # API base URL, OAuth config, endpoint names
```

Route groups `(auth)` and `(app)` share layouts without affecting the URL path. `index.tsx` handles the initial redirect so the app always boots to the right place.

---

## Authentication

Aula uses OAuth 2.0 with PKCE. MitID is the identity provider. Parents authenticate through MitID's own UI — the app never handles credentials directly.

### OAuth Configuration

```
Authorization URL:  https://login.aula.dk/simplesaml/module.php/oidc/authorize.php
Token URL:          https://login.aula.dk/simplesaml/module.php/oidc/token.php
Client ID:          _99949a54b8b65423862aac1bf629599ed64231607a
Redirect URI:       https://app-private.aula.dk
Scope:              aula-sensitive
PKCE method:        S256
```

Source: extracted from [scaarup/aula](https://github.com/scaarup/aula) `aula_login_client/client.py`.

### Auth Flow

1. App opens → check `expo-secure-store` for access token
   - Token found and valid → navigate to `(app)/home`
   - No token → navigate to `(auth)/login`

2. User taps "Log ind med MitID"
   - Call `WebBrowser.openAuthSessionAsync(authorizationUrl, 'https://app-private.aula.dk')`
   - iOS opens ASWebAuthenticationSession (secure in-app browser, shares system cookies)
   - User completes MitID authentication in browser

3. MitID redirects back to `https://app-private.aula.dk?code=…`
   - iOS intercepts the redirect before it loads (ASWebAuthenticationSession watches for this prefix)
   - App receives the URL with the authorization code

4. Token exchange
   - POST to token URL with `code`, `client_id`, `redirect_uri`, `code_verifier`
   - Receive `access_token` and `refresh_token`
   - Store both in `expo-secure-store`

5. Navigate to `(app)/home`

### Token Refresh

When an API call returns 401:
1. POST to token URL with `grant_type: refresh_token`, `refresh_token`, `client_id`
2. Store new tokens
3. Retry the original request once
4. If refresh also fails → clear tokens, redirect to login

---

## Aula API Client

**Base URL:** `https://app-private.aula.dk/api/v22`

All requests append `?access_token=<token>` as a query parameter (not a header — the API rejects auth headers).

```typescript
// lib/aula-api.ts — interface shape
interface AulaClient {
  getProfilesByLogin(): Promise<ProfilesResponse>
  getProfileContext(): Promise<ProfileContextResponse>
}
```

The client handles 401 by delegating to `auth.ts` for token refresh, then retrying once.

---

## V1 Screens

### Login (`(auth)/login.tsx`)
- App icon + name centred on screen
- Single button: "Log ind med MitID"
- No other UI — no manual credential input

### Loading (transition state)
- Spinner with "Henter profil…" text
- Shown while token is being exchanged and profile fetched after auth callback

### Home (`(app)/home.tsx`)
- Guardian full name + institution name (from `profiles.getProfilesByLogin`)
- List of children with name and class (from `profiles.getProfileContext`)
- Small status badge: "✓ API forbundet · v22"
- Log out button (clears tokens, navigates to login)

**API calls needed for home screen:**
- `?method=profiles.getProfilesByLogin` — guardian name, institution
- `?method=profiles.getProfileContext&portalrole=guardian` — children list

---

## Out of Scope for V1

- Messages, calendar, notifications, presence — added in later iterations
- Push notifications
- Multiple guardian accounts
- iPad layout
- Offline support

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Aula changes OAuth endpoints | Low | Extracted from actively maintained source; easy to update in `constants/aula.ts` |
| API version bumped from v22 | Medium | Single constant in `constants/aula.ts` — one-line fix when it changes |
| `client_id` gets revoked | Low | Same client ID used by community integrations for years |
| ASWebAuthenticationSession rejects redirect URI intercept | Low | Standard approach; tested pattern in expo-web-browser |
