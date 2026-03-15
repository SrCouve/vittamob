# VITTA UP Mobile — Apontamentos do aplicativo

Documento de referência rápida da estrutura, fluxos, estado e integrações do app.

---

## 1. Visão geral

- **Produto:** App de wellness (yoga, meditação, corrida, comunidade) com área de membros.
- **Plataforma:** React Native (Expo SDK 55), iOS/Android/Web.
- **Referência:** Réplica pixel-perfect do app web em `../vittaup-app` (Next.js).
- **Identidade:** Glassmorphism quente, fundo escuro (#0D0D0D), laranja #FF6C24, fontes Montserrat + Playfair Display.

---

## 2. Estrutura de pastas

| Pasta | Função |
|-------|--------|
| **`app/`** | Rotas expo-router (file-based). Layout raiz, grupos (auth), (tabs), social, user. |
| **`app/(auth)/`** | Login e cadastro. Stack com header oculto. Redirecionamento: não logado → login; logado → tabs. |
| **`app/(tabs)/`** | Abas principais: Início, Módulos, Social (slot), Perfil. Usa `Slot` + `BottomNav`. |
| **`app/social/`** | Busca, amigos, seguidores, seguindo (fora da tab bar). |
| **`app/user/`** | Perfil público de outro usuário (`[id].tsx`). |
| **`src/components/`** | Componentes reutilizáveis: Logo, GlassCard, BottomNav, UserCard, FollowButton, BackgroundOrbs, SplashTransition. |
| **`src/constants/`** | Tema: `theme.ts` (COLORS, FONTS). |
| **`src/context/`** | Ex.: ScrollContext (scrollY para efeitos). |
| **`src/lib/`** | Cliente Supabase, notificações push. |
| **`src/stores/`** | Zustand: auth, user, content, social, community, points, strava, medal. |
| **`assets/`** | Ícones, imagens, Lottie (.json), splash, favicon, ícones Android. |
| **`widgets/`** | Widget iOS (expo-widgets): Meta Semanal (corrida). |
| **`supabase/`** | Migrações SQL, Edge Functions (ex.: strava-auth). |
| **`plugins/`** | Plugin Expo (ex.: withSwiftConcurrencyFix). |

---

## 3. Rotas e telas (expo-router)

### Raiz (`app/_layout.tsx`)
- Carrega fontes (Montserrat, Playfair).
- Tema escuro (VittaTheme), LinearGradient de fundo, BackgroundOrbs, SplashTransition.
- Inicializa auth; após login: fetchProfile, fetchBalance, checkConnection (Strava), registerPushToken, clearBadge.
- Redirecionamento: não logado → `/(auth)/login`; logado em (auth) → `/(tabs)`.
- Handler de notificação tap → deep link (ex.: post_id → comunidade).
- Stack com header oculto.

### Autenticação `(auth)`
| Rota | Arquivo | Função |
|------|---------|--------|
| Login | `(auth)/login.tsx` | Email/senha, Apple Sign-In, link cadastro e recuperação de senha. |
| Cadastro | `(auth)/signup.tsx` | Email/senha; cria perfil e bônus de boas-vindas (points_ledger). |

### Abas principais `(tabs)`
| Rota | Arquivo | Função |
|------|---------|--------|
| Início | `(tabs)/index.tsx` | Home: logo, continuar assistindo, grid de módulos, recentes/populares. |
| Módulos | `(tabs)/modulos/index.tsx` | Lista de módulos (GlassCard) → `modulos/[id]`. |
| Módulo | `(tabs)/modulos/[id].tsx` | Detalhe do módulo, progresso, lista de aulas → `aulas/[id]`. |
| Aulas | `(tabs)/aulas/index.tsx` | Lista de aulas com categorias e busca → `aulas/[id]`. |
| Aula (player) | `(tabs)/aulas/[id].tsx` | Player de vídeo, progresso, descrição. |
| Comunidade | `(tabs)/comunidade.tsx` | Feed de posts, reações “energia”, comentários, top membros; criar post (texto/foto). |
| Perfil | `(tabs)/perfil.tsx` | Perfil com abas: Perfil (dados, stats, Strava), Corridas, Records. Links: editar-perfil, corridas, medalhas. |
| Editar perfil | `(tabs)/editar-perfil.tsx` | Nome, bio, avatar, peso, altura, interesses. |
| Corridas | `(tabs)/corridas.tsx` | Strava: km semanais, meta, histórico, records (5K, 10K, meia, maratona), Medalhas. |
| Medalhas | `(tabs)/medalhas.tsx` | Lista de medalhas de corrida (race_medals), foto na medalha. |

### Social (sem tab bar)
| Rota | Arquivo | Função |
|------|---------|--------|
| Busca | `social/search.tsx` | Busca de usuários; UserCard + follow/unfollow. |
| Amigos | `social/friends.tsx` | Seguidores mútuos. |
| Seguidores / Seguindo | `social/followers.tsx`, `following.tsx` | Listas do perfil visualizado. |

### Usuário
| Rota | Arquivo | Função |
|------|---------|--------|
| Perfil público | `user/[id].tsx` | Perfil de outro usuário; follow/unfollow, bloqueio; stats e posts. |

---

## 4. Design system

### Cores (`src/constants/theme.ts`)
```ts
COLORS = {
  orange: '#FF6C24',      // CTA, brand
  orangeLight: '#FF8540',
  peach: '#FFAC7D',
  dark: '#0D0D0D',       // fundo
  darkCard: '#1A1008',
  white: '#FFFFFF',
  glass: {
    bg: 'rgba(255,255,255,0.10)',
    bgLight: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.15)',
    borderLight: 'rgba(255,255,255,0.08)',
  },
};
```

### Fontes
- **Montserrat:** 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold.
- **Playfair Display:** 400 Regular, 600 SemiBold, 700 Bold.
- Uso: logo VITTA (ExtraBold) + UP (Light); títulos elegantes Playfair; UI Montserrat.

### Navegação (VittaTheme em `_layout.tsx`)
- Base DarkTheme; `primary` e `notification` #FF6C24; `background`/`card` transparent; `text` branco; `border` rgba(255,255,255,0.1).

### Componentes de UI
- **GlassCard:** variantes `light` | `medium` | `heavy` | `orange`; blur (expo-blur) + gradiente; web: backdropFilter/boxShadow.
- **BottomNav:** barra inferior com glass, ícones SVG (home, grid, users, user), animações Reanimated.
- Fundo: LinearGradient (#0D0D0D → #1A1008 → #181010 → #0D0D0D) + BackgroundOrbs.
- CTAs: gradiente laranja, bordas glass, sombra; feedback com Reanimated (scale, borderOpacity).

---

## 5. Estado global (Zustand) — `src/stores/`

| Store | Dados principais | Ações principais |
|-------|------------------|-------------------|
| **authStore** | session, user, isLoading, isInitialized | initialize, signInWithEmail, signUpWithEmail, signOut, resetPassword |
| **userStore** | profile (nome, avatar, bio, interesses, peso, altura, points, streak, aulas, tier) | fetchProfile, updateProfile, refreshPoints |
| **contentStore** | modules, lessons por módulo, progress por aula | fetchModules, fetchLessons, fetchProgress, updateProgress, getModuleProgress, getCompletedCount, getRecentLesson |
| **socialStore** | viewingProfile, followers, following, friends, searchResults, contagens | fetchPublicProfile, followUser, unfollowUser, blockUser, unblockUser, fetchFollowers, fetchFollowing, fetchFriends, fetchMyCounts, searchUsers, clearProfile |
| **communityStore** | posts, comments por post (cache LRU), topMembers | fetchPosts, loadMorePosts, createPost, deletePost, toggleEnergia, fetchComments, addComment, deleteComment, fetchTopMembers |
| **pointsStore** | balance, transactions | fetchBalance, fetchTransactions, awardPoints |
| **stravaStore** | conexão, km semanais, meta, stats vitalícias, runs, records (5K/10K/21k/42k) | checkConnection, connectStrava, disconnectStrava, syncAllStats, syncWeeklyStats, setWeeklyGoal, fetchRuns, syncAndAwardRuns; atualiza widget Meta Semanal |
| **medalStore** | medals (RaceMedal[]) | fetchMedals, updatePhoto |

---

## 6. Modelo de dados (Supabase) — resumo

- **profiles:** id, name, avatar_url, bio, interests[], points_balance, streak_days, streak_last_date, total_lessons, total_hours, subscription_tier, expo_push_token, etc. RLS: usuário lê/atualiza/insere próprio.
- **modules:** id, title, description, thumbnail_url, lesson_count, order, is_free. Leitura pública.
- **lessons:** id, module_id, title, description, video_url, thumbnail_url, duration_seconds, order, is_free. Leitura pública.
- **user_lesson_progress:** user_id, lesson_id, watch_seconds, completed, completed_at. RLS: próprio usuário.
- **points_ledger:** user_id, amount, type, description. RLS: próprio usuário. Função `increment_points(user_id, amount)`.
- **community_posts, post_reactions, post_comments:** feed, reações “energia”, comentários; storage `community-images`.
- **strava_connections, strava_stats_cache, strava_awarded_runs:** integração Strava.
- **race_medals:** medalhas de corrida (foto na medalha).
- **Triggers:** `handle_new_user()` cria perfil ao signup; funções como `update_streak`.

---

## 7. Integrações

### Supabase
- Cliente em `src/lib/supabase.ts`: auth em memória (MemoryStorageAdapter), autoRefreshToken, persistSession, detectSessionInUrl: false.
- Auth: email/senha, Apple (expo-apple-authentication), Google (UI presente; OAuth depende de config no Supabase).

### Strava
- Edge Function `supabase/functions/strava-auth`: troca code por tokens; secrets STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET; escreve em strava_connections.
- App: stravaStore usa a function para connect e refresh; sincroniza atividades (Run, TrailRun, VirtualRun, Walk, Hike), km semanais, estatísticas vitalícias, corridas premiadas (sparks por km).

### Notificações push
- `src/lib/notifications.ts`: handler, registro token Expo Push em profiles.expo_push_token, clearBadge, tap → deep link (ex.: post_id → comunidade). Setup no _layout.tsx.

### Widget iOS
- expo-widgets: Meta Semanal (corrida) — systemSmall, systemMedium; atualizado pela stravaStore.

---

## 8. Assets

- **Lottie:** thunder-energia, celebration, medal, running, fire-emoji, award-emoji, presentation-emoji, height, shoe, kitchen-scale (tons laranja quando aplicável).
- **Imagens:** icon.png, splash-icon.png, favicon.png, backvitta.png; Android: adaptive (foreground, background, monochrome); runner, runner-widget, liverun, etc.
- **Fontes:** Montserrat e Playfair via @expo-google-fonts, carregadas no _layout.tsx.

---

## 9. Configuração

- **package.json:** vitta-mobile 1.5.0; entry expo-router/entry; scripts start, android, ios, web. Dependências: expo ~55, react 19.2, react-native 0.83, expo-router, Supabase, zustand, reanimated, gesture-handler, svg, expo-blur, expo-linear-gradient, lottie-react-native, expo-apple-authentication, expo-notifications, expo-widgets, expo-dev-client.
- **app.json:** name VITTA UP, slug vittaup, version 1.7.0, scheme vittaup; userInterfaceStyle dark; iOS bundleId fit.vittaup.app, buildNumber 57; Android package fit.vittaup.app; plugins: font, router, splash-screen, secure-store, apple-auth, image-picker, web-browser, notifications, withSwiftConcurrencyFix, expo-widgets, sharing.
- **eas.json:** profiles development (developmentClient), preview (internal), production (autoIncrement; iOS image macos-sequoia-15.6-xcode-26.2); submit production iOS (ascAppId, appleId).

---

## 10. Convenções e lembretes

- Sempre conferir referência web antes de mudanças visuais.
- Código específico de plataforma: `Platform.OS === 'web'`.
- Copiar para `/Users/kaiojansen/vittamob` para testar no simulador iOS se necessário.
- Lottie: usar apenas tons laranja (evitar preto/azul).
- Commits: estilo conventional commits.
- Deploy: EAS Build (production), TestFlight com EXPO_APPLE_ID e EXPO_APPLE_APP_SPECIFIC_PASSWORD; ver CLAUDE.md e agent deploy-manager.

---

## 11. Opinião: lógica de negócio no mercado wellness (Brasil e Fortaleza)

Visão estratégica com base em dados de mercado, cases recentes e tendências, aplicada ao posicionamento do VITTA UP.

### Mercado Brasil (2024–2025)

- **Tamanho:** Mercado wellness no Brasil na casa de **US$ 91–96 bi**; projeção de **US$ 222 bi até 2034** (CAGR ~10,4% ao ano).
- **Mudança de paradigma:** Migração de modelo curativo para **saúde integral, preventiva e personalizada** (corpo, mente, emoções, estilo de vida). Consumidores exigem mais **evidência e personalização** (estresse, sono, nutrição).
- **Digital:** Geração Z representa **+40% das assinaturas** de apps de fitness; demanda por **bem-estar digital**, IA e monitoramento personalizado.
- **Obesidade e estilo de vida:** Cerca de **68% da população** com excesso de peso (31% obesidade, 37% sobrepeso) amplia demanda por soluções de movimento e hábitos.
- **Saúde mental:** Brasil entre os mais ansiosos do mundo (OMS); **~49% dos jovens 18–25** com ansiedade — abre espaço forte para yoga, meditação e mindfulness.

### Cases e benchmarks

- **Wellhub (ex-Gympass):** De 100 mi para **1 bi de check-ins** em poucos anos; dezenas de milhões de check-ins/mês; foco em **bem-estar corporativo** e rede de parceiros. Mostra que **engajamento recorrente** (check-in, uso frequente) escala quando o produto vira hábito.
- **Strava:** **+5 milhões de usuários no Brasil** em 2024; prova que **corrida + social + dados** (records, metas, compartilhamento) gera retenção e uso contínuo.
- **Zen App (BR):** Meditação/yoga; **~R$ 4 mi** de faturamento em 2018, projeção de crescimento forte; **assinatura** (ex.: R$ 19,90/mês) validada no segmento mente/corpo.
- **Next Fit:** Foco em **B2B fitness** (academias/estúdios); **R$ 50 mi Série A** em 2025 — sinal de que o ecossistema fitness/wellness atrai investimento e que há espaço para modelos B2B e B2C.

Conclusão dos cases: **conteúdo estruturado (módulos/aulas) + gamificação (pontos, streak, medalhas) + social (comunidade, follow) + integração com atividade real (Strava)** é um combo alinhado ao que está funcionando no mercado.

### Fortaleza em foco

- **Fitness:** Fortaleza é o **4º município do Brasil em número de academias** (559 unidades); Ceará entre os maiores em academias. Indica população ativa e mercado aquecido para oferta digital complementar.
- **Turismo wellness:** Cidade apostando em **turismo de bem-estar** até 2026; crescimento de **visitantes internacionais** (~30% em 2024); posicionamento como “capital do bem-estar” e **eventos de corrida** — alinha com produto que une corrida (Strava) + yoga/meditação.
- **Infraestrutura:** **30 estações de exercício** e academia ao ar livre na **Beira Mar** (200 m², instrutores) — reforça cultura de exercício ao ar livre e corrida na orla; app pode ser o “companheiro” pós-treino (alongamento, recuperação, mindfulness).
- **Perfil de autocuidado (Datafolha 2024):** Nota média de autocuidado em Fortaleza **7,3** (alimentação, consultas, exercícios, antistresse). Quem mais cuida da saúde: **idosos, ensino superior, renda >5 SM** (notas 7,8–8,0). Ou seja: há base de público com **disposição a pagar** por bem-estar; oportunidade de posicionar VITTA UP como produto **premium e estruturado** para esse segmento e para quem quer evoluir (jovens, corrida, yoga).

### Onde a lógica do VITTA UP se encaixa

1. **Conteúdo por módulos (yoga, meditação, etc.):** Alinhado à tendência de **personalização e jornada guiada**, não só “vídeos soltos”. Progresso por aula/módulo e “continuar assistindo” reforçam compromisso e retenção.
2. **Pontos, streak, medalhas, Strava:** **Gamificação** e **conexão com atividade real** (corrida) seguem o que Wellhub e Strava mostram: métricas claras e recompensas aumentam adesão e sensação de evolução.
3. **Comunidade (feed, energia, comentários):** Social no wellness está em alta; **pertencimento** e **reconhecimento** (top membros, reações) ajudam a reduzir abandono — especialmente relevante em mercados como Fortaleza, onde corrida e eventos são parte da cultura.
4. **Assinatura/membros:** Modelo de área de membros com conteúdo pago é o mesmo adotado por Zen App e Glo; no Brasil a **assinatura de wellness digital** já está validada para quem busca resultados e rotina.
5. **Posicionamento local (Fortaleza):** Eventos de corrida, Beira Mar, turismo wellness e perfil de autocuidado permitem campanhas e parcerias locais (corridas, academias, escritórios) e posicionamento como **app de wellness do Nordeste** com foco em corrida + mente/corpo.

### Riscos e atenção

- **Concorrência:** Wellhub, Strava, Zen App, Glo e grandes globais disputam tempo e assinatura. Diferenciação por **curadoria**, **identidade forte** (glassmorphism, marca quente) e **combo corrida + yoga + comunidade** em um só app é o ângulo.
- **Retenção:** Especialistas e dados mostram que apps de wellness sofrem com **abandono após as primeiras semanas**. Manter **streak**, notificações inteligentes, conteúdo “continuar assistindo” e **social** (comunidade, amigos) são pilares para reduzir churn.
- **Fortaleza:** Mercado grande mas não único; estratégia pode começar em Fortaleza/CE (eventos, parcerias) e depois escalar para outras capitais Nordeste e Brasil.

### Resumo

A **lógica de negócio** do VITTA UP — conteúdo estruturado por módulos, gamificação (pontos, streak, medalhas), integração Strava (corrida), comunidade e área de membros — está **alinhada** ao crescimento do mercado wellness no Brasil, aos cases recentes (Wellhub, Strava, Zen App) e ao perfil de Fortaleza (fitness, turismo wellness, corrida, autocuidado). O momento é favorável; o diferencial está em **execução**, **retenção** e **posicionamento claro** (ex.: “wellness que une corrida e mente/corpo” ou “comunidade de bem-estar com foco em Fortaleza/Nordeste”).

---

*Documento gerado a partir da análise do repositório vitta-mobile. Atualizar conforme evolução do app.*
