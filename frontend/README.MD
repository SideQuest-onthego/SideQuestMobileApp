# SideQuest

SideQuest is a mobile app that helps you discover things to do near you. Instead of scrolling endless review lists, you swipe through nearby places — attractions, restaurants, parks, and other activities — Tinder-style. The app filters and ranks results based on your preferences (budget, dietary restrictions, travel radius, mode of travel), surfaces AI-generated insights for each place, and can stitch saved places into a one-tap itinerary with walking/driving directions.

## Features

- **Swipe to discover** — A swipe deck of nearby places pulled from Google Places, ranked against your saved preferences.
- **Saved places & itineraries** — Save what you like, then generate an AI-built itinerary (Gemini) that orders stops and routes between them with Google Directions.
- **Place insights** — Gemini-generated summaries and tips for individual places.
- **Map view** — See nearby places and your itinerary on a `react-native-maps` map.
- **Account & onboarding** — Firebase Auth (email/password with verification + reset), plus a first-time flow that captures budget, dietary, travel-mode, and distance preferences.

## Tech stack

- **Framework:** React Native, Expo
- **Language / UI:** TypeScript, React 19, React Native 0.81
- **Styling:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Navigation:** `@react-navigation/*` (bottom tabs + stack) via expo-router
- **Auth & DB:** [Firebase](https://firebase.google.com) (Auth with AsyncStorage persistence, Firestore)
- **Maps & location:** `react-native-maps`, `expo-location`
- **External APIs:** Google Places, Google Directions, Google Generative AI (Gemini)
- **State / context:** React Context (e.g. `LocationContext`) + `@react-native-async-storage/async-storage`
- **Animations / gestures:** `react-native-reanimated`, `react-native-gesture-handler`, `react-native-worklets`

The Expo app lives in this `frontend/` directory. The sibling `backend/` directory currently holds a mock dataset (`sidequest.mock.json`) used during development — the app itself talks directly to Firebase and the Google APIs.

## Project layout

```
frontend/
  app/                # expo-router routes
    (auth)/           # login, signup, password reset, email verification
    (first-time)/     # onboarding: budget, dietary, distance, travel mode
    (tabs)/           # home (swipe), explore, map, saved, itinerary, account
    itinerary/        # itinerary detail screen ([placeId].tsx)
    index.tsx         # welcome screen
  components/         # SwipeDeck, PlaceCard, AiItineraryModal, etc.
  services/           # googlePlaces, googleDirections, geminiItinerary,
                      # geminiPlaceInsights, itineraryEngine, placeRanking,
                      # placeDisplay, userPreferences
  context/            # React contexts (location, etc.)
  hooks/  constants/  types/  assets/
  FirebaseConfig.ts   # Firebase init (Auth + Firestore)
  app.json            # Expo config
  tailwind.config.js  global.css   # NativeWind / Tailwind setup
```

## Running locally

### 1. Prerequisites

- **Node.js 20+** and npm
- **Git**
- An iOS or Android device with the [Expo Go](https://expo.dev/go) app, or a simulator:
  - **iOS Simulator** — macOS + Xcode (run `xcode-select --install` and open Xcode once to accept the license)
  - **Android Emulator** — Android Studio with an AVD configured
- Accounts / API keys for:
  - [Firebase](https://console.firebase.google.com) project (Auth + Firestore enabled)
  - [Google Cloud](https://console.cloud.google.com) project with **Places API**, **Directions API**, and **Maps SDK for iOS/Android** enabled
  - [Google AI Studio](https://aistudio.google.com/app/apikey) for a Gemini API key

### 2. Clone and install

```bash
git clone https://github.com/SideQuest-onthego/SideQuestMobileApp.git
cd SideQuestMobileApp/frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file in `frontend/` (Expo automatically loads `EXPO_PUBLIC_*` vars into `process.env`):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

The rest of the Firebase config (project ID, app ID, etc.) is hard-coded in [FirebaseConfig.ts](FirebaseConfig.ts) — update those fields if you're pointing at a different Firebase project.

### 4. Start the dev server

```bash
npx expo start
```

This opens the Expo dev tools. From there you can:

- Press `i` to open in the **iOS Simulator** (or `npm run ios`)
- Press `a` to open in the **Android Emulator** (or `npm run android`)
- Press `w` to open in the **web** build (or `npm run web`)
- Scan the QR code with **Expo Go** on a physical device on the same Wi-Fi network

### 5. Useful scripts

| Command                  | What it does                                              |
| ------------------------ | --------------------------------------------------------- |
| `npm start`              | Start the Expo dev server                                 |
| `npm run ios`            | Start and launch in the iOS Simulator                     |
| `npm run android`        | Start and launch in the Android Emulator                  |
| `npm run web`            | Start and launch the web build                            |
| `npm run lint`           | Run `expo lint` (ESLint)                                  |
| `npm run reset-project`  | Reset the starter app scaffolding (see `scripts/`)        |

### Troubleshooting

- **Blank map / "places not loading":** double-check that the Places, Directions, and Maps SDK APIs are all enabled on your Google Cloud project and that the key in `.env` isn't IP/bundle-restricted to a different app.
- **Firebase auth errors:** make sure Email/Password sign-in is enabled in the Firebase console and that your `EXPO_PUBLIC_FIREBASE_API_KEY` matches the project referenced in [FirebaseConfig.ts](FirebaseConfig.ts).
- **Env vars not picked up:** restart `npm start` with the `--clear` flag (`npx expo start --clear`) so Metro re-reads `.env`.
- **iOS build complains about pods / native modules:** Expo Go covers all current dependencies, so prefer Expo Go over a bare `expo run:ios` build unless you've added a native module.
