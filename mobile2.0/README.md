# Raphaaa — WebView App

A minimal native Android app: one `WebView` pointed at `https://www.raphaaa.com`, wrapped just
enough to feel like a real app — back button navigates page history, file inputs open the real
picker/camera (for review photos, return-evidence uploads, product image uploads), PDF invoice
downloads go to the system Downloads folder, and links to other domains open in the system
browser instead of getting stuck inside the app.

This is deliberately **not** the same thing as `mobile/` (the full React Native app next to this
folder) — no native navigation, no push notifications, no offline screens beyond "you're offline."
It's the fast path to an installable Android app from the existing website.

## What's here

A complete, standard Android Studio (Kotlin) project — everything needed to build except the
Gradle wrapper binary itself (see Step 1 below for why, and how Android Studio fixes it for you).

```
mobile2.0/
├── app/
│   ├── build.gradle                        — app module config (package name, SDK versions)
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml             — permissions, single Activity
│       ├── java/com/raphaaa/webview/
│       │   └── MainActivity.kt             — the whole app
│       └── res/
│           ├── layout/activity_main.xml    — WebView + progress bar + offline screen
│           ├── values/{strings,colors,themes}.xml
│           ├── mipmap-*/                   — app icon, generated from your site favicon
│           └── xml/network_security_config.xml
├── build.gradle                            — project-level config
├── settings.gradle
└── gradle.properties
```

## Step 1 — Open it in Android Studio

I couldn't compile this myself in this environment (no JDK/Android SDK/Gradle installed here —
only `adb` was present), so this is as far as automated setup goes. From here:

1. Install [Android Studio](https://developer.android.com/studio) if you don't have it.
2. **File → Open** → select the `mobile2.0` folder.
3. Android Studio will notice there's no `gradlew` wrapper script yet and offer to generate one
   automatically on first sync — accept that. (If it doesn't prompt: **File → Sync Project with
   Gradle Files**, or right-click `build.gradle` → **Add Gradle Wrapper**.)
4. Let it finish syncing — first sync downloads Gradle + the Android SDK platform, so it can take
   a few minutes.

## Step 2 — Run it on a device/emulator (debug build)

Click the green **Run ▶** button in Android Studio, or from a terminal once the wrapper exists:

```bash
./gradlew installDebug
```

## Step 3 — Build the actual release APK

```bash
./gradlew assembleRelease
```

The unsigned APK lands at `app/build/outputs/apk/release/app-release-unsigned.apk`. To publish
(Play Store or direct install), it needs to be **signed**:

1. In Android Studio: **Build → Generate Signed Bundle / APK → APK**.
2. Create a new keystore the first time (or reuse one if you already have one) — **keep this
   file and its passwords somewhere safe**; you need the exact same keystore for every future
   update, or Android/Play Store will refuse the update as a different app.
3. Choose **release**, finish the wizard — the signed, installable `app-release.apk` is generated
   for you.

## Configuration

- **Target URL**: `app/src/main/res/values/strings.xml` → `site_url`. Currently
  `https://www.raphaaa.com`. For local dev testing against your machine, point it at
  `http://10.0.2.2:5173` (the Android emulator's alias for your computer's `localhost`) instead —
  `network_security_config.xml` already allows plain `http://` for that address only.
- **App icon**: generated from `frontend/public/favicon-512x512.png`. Re-run the same
  `convert`/ImageMagick commands used to build this project if you update your brand icon later,
  or just replace the PNGs under `res/mipmap-*/` directly.
- **Package name**: `com.raphaaa.webview` (set in `app/build.gradle`, `applicationId`). Deliberately
  different from the existing React Native app's `com.newapp`, so both can be installed on the
  same test device at once without conflicting.

## Known limitations of the WebView-only approach

Worth knowing before you ship this instead of (or alongside) the full React Native app:

- **Google Sign-In will not work inside the embedded WebView.** Google actively blocks its OAuth
  pages from loading inside any app's embedded WebView (it detects the WebView user agent and
  refuses, showing "This browser or app may not be secure"). This app opens Google's login page in
  the system browser instead of failing silently — but the system browser and the app's WebView
  don't share a session, so completing Google login there won't automatically log the user back
  into the app. Email/OTP login (already on the site) is unaffected and works normally. Properly
  fixing Google Sign-In here means integrating Android's native Credential Manager / Google
  Identity SDK and bridging the resulting token into the web session with JavaScript — real work,
  out of scope for a WebView wrapper.
- **No push notifications.** The site's web-push (VAPID) subscriptions don't reliably fire native
  Android notifications from inside a plain WebView. Real push here needs Firebase Cloud Messaging
  wired up natively — not included.
- **No offline app shell.** If there's no internet, the user sees the offline screen and a retry
  button — nothing is cached for offline browsing.
- Payment (Razorpay) is expected to work fine, since its checkout renders as an in-page
  iframe/modal rather than a full navigation — no special handling was needed for it beyond
  allowing third-party cookies, which is already set up.
