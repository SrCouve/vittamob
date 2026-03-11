# VITTA UP Mobile — React Native (Expo)

## Project
Wellness/yoga mobile app. Full rewrite of web app at `../vittaup-app` (Next.js).
Must be **pixel-perfect identical** to the web version.

## Stack
- Expo SDK 55, React Native 0.83, TypeScript
- expo-router (file-based routing)
- react-native-reanimated (animations)
- react-native-svg (background orbs, icons)
- expo-blur (glassmorphism on native)
- lottie-react-native (animated icons)
- expo-linear-gradient (gradients)

## Design
- Dark theme: #0D0D0D background
- Orange accent: #FF6C24, #FF8540, #FFAC7D
- Glassmorphism: blur + gradient + border + specular highlights
- Fonts: Montserrat (UI), Playfair Display (quotes)
- Logo: "VITTA" orange gradient, "UP" white

## Key Conventions
- Always check web reference before visual changes
- Platform-specific code via `Platform.OS === 'web'`
- Copy files to `/Users/kaiojansen/vittamob` for iOS simulator testing
- Lottie icons must use orange tones only (no black/blue)
- Commit messages: conventional commits style

## Agents
Custom agents in `.claude/agents/`:
- **mobile-builder** — Core React Native/Expo development
- **ui-designer** — Glassmorphism visual design system
- **reality-checker** — QA validation against web reference
- **performance-optimizer** — 60fps animations, render optimization
- **deploy-manager** — EAS builds, TestFlight, deployment

## Deploy
- GitHub: github.com/SrCouve/vittamob
- EAS Build: `npx eas-cli build --platform ios --profile production --non-interactive`
- TestFlight: `EXPO_APPLE_ID=kaio.jansen@outlook.com EXPO_APPLE_APP_SPECIFIC_PASSWORD="xfwh-zwmb-qkcv-tvji" npx eas-cli submit --platform ios --latest --non-interactive`
