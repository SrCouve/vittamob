import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0D0D0D" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root { margin:0; padding:0; height:100%; background-color:#0D0D0D; }
          body { color:#fff; -webkit-font-smoothing:antialiased; }
          #root > div[style] { background:transparent !important; }
          ::-webkit-scrollbar { display:none; }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
