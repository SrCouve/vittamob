import PostHog from 'posthog-react-native';

// Substitua pela sua API Key do PostHog
const POSTHOG_API_KEY = 'phc_Tq8LhG4pmFB0wVWxfQ4y8kjL1qjwS6raEbrcCOwJRSy';
const POSTHOG_HOST = 'https://us.i.posthog.com'; // ou https://eu.i.posthog.com

export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  // Desabilita se a key não foi configurada
  disabled: !POSTHOG_API_KEY || POSTHOG_API_KEY.startsWith('YOUR_'),
});
