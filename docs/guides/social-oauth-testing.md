# Social OAuth Testing Guide

This document describes how to obtain real tokens for testing 3 providers: **Facebook**, **GitHub**, **X (Twitter)**.

---

## Prerequisites

The API must be running:
```bash
pnpm --filter api dev
```

The corresponding env vars must be set in `.env`:

| Provider  | Env vars                                      |
|-----------|-----------------------------------------------|
| Facebook  | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`      |
| GitHub    | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`    |
| Twitter   | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`  |

All are optional — if not set, the server still starts but the endpoint will return an error when called.

---

## Facebook

### 1. Create a Facebook App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**
2. Choose app type: **Consumer** or **Business**
3. After creation: go to **Settings → Basic** to get **App ID** and **App Secret**
4. Set in `.env`:
   ```
   FACEBOOK_APP_ID=<App ID>
   FACEBOOK_APP_SECRET=<App Secret>
   ```

### 2. Get an Access Token for testing

The quickest way is via **Graph API Explorer**:

1. Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
2. **Application** → select the app you just created
3. Click **Generate Access Token**
4. Grant permissions: **email**, **public_profile**
5. Copy the token → paste into Postman environment variable `facebookAccessToken`

> Token expires in ~1–2 hours. For local testing only.

### 3. Call the endpoint

```
POST /api/v1/auth/facebook/login
Content-Type: application/json

{ "accessToken": "<facebook_user_access_token>" }
```

Successful response:
```json
{
  "token": "<jwt_access_token>",
  "tokenExpires": 1234567890,
  "user": { "id": "...", "email": "...", "firstName": "...", "provider": "facebook" }
}
```
The server also sets a `refresh_token` cookie (HttpOnly, SameSite=Strict).

### Common errors

| Error | Cause |
|-------|-------|
| `422 Facebook app credentials not configured` | `FACEBOOK_APP_ID` or `FACEBOOK_APP_SECRET` not set |
| `401 Invalid Facebook access token` | Token expired or invalid |
| `401 Access token does not belong to this app` | Token was generated from a different App, does not match App ID |

---

## GitHub

> **Architecture note:** The API (`localhost:8080`) has **no** callback route. The only endpoint is `POST /api/v1/auth/github/login` which receives an already-exchanged `accessToken`. The callback URL in your GitHub App config must point to the **frontend** (`localhost:3000`) — the frontend is responsible for exchanging the code → sending the token to the API.

### 1. Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**
2. Fill in the details:
   - **Application name**: any name
   - **Homepage URL**: `http://localhost:3000` (frontend)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback` (handled by frontend)
3. Click **Register application** → get **Client ID** and create **Client Secret**
4. Set in the API `.env`:
   ```
   GITHUB_CLIENT_ID=<Client ID>
   GITHUB_CLIENT_SECRET=<Client Secret>
   ```

### 2. Get an Access Token for testing

**Option 1 — Personal Access Token (fastest, no callback needed):**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Select scopes: `read:user`, `user:email`
3. Copy the token → paste into `githubAccessToken` in the Postman environment

> A PAT works like a real access token with the GitHub API. No OAuth flow or callback URL needed.

**Option 2 — Full OAuth flow (production flow):**

Frontend redirects the user to GitHub:
```
https://github.com/login/oauth/authorize
  ?client_id=<GITHUB_CLIENT_ID>
  &scope=read:user,user:email
  &redirect_uri=http://localhost:3000/auth/github/callback
```

GitHub redirects back to the frontend (`localhost:3000`) with `?code=...`. The frontend exchanges the code for an access token **server-side** (because `client_secret` is required):
```bash
curl -X POST https://github.com/login/oauth/access_token \
  -H "Accept: application/json" \
  -d "client_id=<ID>&client_secret=<SECRET>&code=<code>"
```

Frontend receives the `access_token` → sends it to the API:
```
POST http://localhost:8080/api/v1/auth/github/login
{ "accessToken": "<access_token>" }
```

### 3. Call the endpoint

```
POST http://localhost:8080/api/v1/auth/github/login
Content-Type: application/json

{ "accessToken": "<github_access_token>" }
```

**Note on email:** If the user has set their email to private on GitHub, `email` will be `null`. The account is still created using `socialId` (GitHub numeric ID) as the identifier.

### Common errors

| Error | Cause |
|-------|-------|
| `401 GitHub API error` | Token invalid or expired |
| `408 GitHub API request timeout` | GitHub API did not respond within 10 seconds |

---

## X (Twitter)

> **Architecture note:** The API (`localhost:8080`) has **no** callback route. The only endpoint is `POST /api/v1/auth/twitter/login` which receives an already-exchanged `accessToken`. The callback URI in your Twitter App must point to the **frontend** (`localhost:3000`).

### 1. Create a Twitter App

1. Go to [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Create a Project + App (approval may be required for new accounts)
3. Go to App → **Keys and tokens** → **OAuth 2.0 Client ID and Client Secret**
4. Set in the API `.env`:
   ```
   TWITTER_CLIENT_ID=<Client ID>
   TWITTER_CLIENT_SECRET=<Client Secret>
   ```
5. In App settings → **Authentication settings**:
   - Enable **OAuth 2.0**
   - **Callback URI**: `http://localhost:3000/auth/twitter/callback` (handled by frontend)
   - **Website URL**: `http://localhost:3000`

### 2. Get an Access Token for testing

Twitter has no Explorer tool like Facebook. Perform the **Authorization Code Flow with PKCE** manually:

**Step 1 — Generate PKCE:**
```bash
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=+/' | head -c 43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr -d '=' | tr '+/' '-_')

echo "verifier: $CODE_VERIFIER"
echo "challenge: $CODE_CHALLENGE"
```

**Step 2 — Open the URL in a browser:**
```
https://twitter.com/i/oauth2/authorize
  ?response_type=code
  &client_id=<TWITTER_CLIENT_ID>
  &redirect_uri=http://localhost:3000/auth/twitter/callback
  &scope=tweet.read%20users.read%20offline.access
  &state=test_state
  &code_challenge=<CODE_CHALLENGE>
  &code_challenge_method=S256
```

The browser redirects to `localhost:3000/auth/twitter/callback?code=...` — copy the `code` value from the URL.

**Step 3 — Exchange the code for a token (run in terminal):**
```bash
curl -X POST https://api.twitter.com/2/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "<TWITTER_CLIENT_ID>:<TWITTER_CLIENT_SECRET>" \
  -d "code=<code>&grant_type=authorization_code&redirect_uri=http://localhost:3000/auth/twitter/callback&code_verifier=<CODE_VERIFIER>"
```

The response returns an `access_token` → paste it into `twitterAccessToken` in the Postman environment.

### 3. Call the endpoint

```
POST http://localhost:8080/api/v1/auth/twitter/login
Content-Type: application/json

{ "accessToken": "<twitter_access_token>" }
```

**Note on email:** Twitter API v2 does not provide email by default (special permission required). Accounts are created using the Twitter ID (`data.id`) and `name`/`username` as the display name.

### Common errors

| Error | Cause |
|-------|-------|
| `401 Twitter API error` | Token invalid or expired |
| `400 Invalid Twitter profile data` | API response did not return `id` |
| `408 Twitter API request timeout` | Twitter API did not respond within 10 seconds |

---

## Common flow for all 3 providers

```
Client                    API Server                 Provider API
  |                           |                           |
  |-- POST /auth/{p}/login -->|                           |
  |   { accessToken }         |-- verify token ---------->|
  |                           |<-- user profile ----------|
  |                           |                           |
  |                           |-- findOrCreate user (DB) -|
  |                           |-- create session ---------|
  |                           |                           |
  |<-- 200 { token, user } ---|                           |
  |    Set-Cookie: refresh_token (HttpOnly)               |
```

After a successful login, use `token` to call authenticated endpoints:
```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

And refresh when the token expires (default 15 minutes):
```
POST /api/v1/auth/refresh
# refresh_token cookie is sent automatically by the browser/Postman
```
