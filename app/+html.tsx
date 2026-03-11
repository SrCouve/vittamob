import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0D0D0D" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Set dark background on html, body, and #root to prevent white flash */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: linear-gradient(160deg, #0D0D0D 0%, #1A1008 40%, #181010 70%, #0D0D0D 100%) !important;
                background-attachment: fixed !important;
                min-height: 100vh;
                min-height: 100dvh;
              }
              body {
                color: #FFFFFF;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                -webkit-tap-highlight-color: transparent;
              }
              #root > div[style] {
                background: transparent !important;
              }
              /* Hide scrollbar for mobile feel */
              ::-webkit-scrollbar { display: none; }
              * { scrollbar-width: none; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
