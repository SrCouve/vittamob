# Análise geral — VITTA UP Mobile

Análise completa do app: arquitetura, código, dados, fluxos, integrações, segurança, performance e UX.

---

## 1. Arquitetura e stack

| Aspecto | Tecnologia |
|---------|------------|
| **Framework** | React Native + Expo SDK 55 |
| **React** | 19.2.0 |
| **Navegação** | expo-router (file-based) |
| **Estado** | Zustand (8 stores) |
| **Backend** | Supabase (auth, database, storage, functions) |
| **Estilo** | StyleSheet nativo, LinearGradient, BlurView |
| **Animações** | react-native-reanimated, Lottie |
| **Fontes** | Montserrat, Playfair Display (Google Fonts) |
| **Plataformas** | iOS, Android, Web (Metro) |

**Entry:** `expo-router/entry` (package.json)

---

## 2. Estrutura de código

```
app/                    # Rotas expo-router
  _layout.tsx           # Raiz: fontes, tema, auth redirect, notificações
  (auth)/               # Login, signup
  (tabs)/               # Início, Módulos, Aulas, Comunidade, Perfil (Slot + BottomNav)
  social/               # Busca, amigos, seguidores, seguindo, requests
  user/[id].tsx         # Perfil público

src/
  components/           # GlassCard, Logo, BottomNav, UserCard, FollowButton, etc.
  constants/            # theme.ts (COLORS, FONTS)
  context/              # ScrollContext (scrollY para BottomNav)
  lib/                  # supabase.ts, notifications.ts
  stores/               # authStore, userStore, contentStore, socialStore, communityStore, pointsStore, stravaStore, medalStore

assets/                 # Imagens, Lottie (.json), splash
widgets/                # MetaSemanal (iOS widget)
supabase/               # Migrations, Edge Functions (strava-auth, push)
plugins/                # withSwiftConcurrencyFix
```

---

## 3. Estado global (Zustand)

| Store | Responsabilidade |
|-------|------------------|
| **authStore** | Session, user, signIn, signUp, signOut, resetPassword |
| **userStore** | Profile (nome, avatar, bio, peso, altura, points, streak, tier) |
| **contentStore** | Modules, lessons, progress (não usado nas telas — dados mock) |
| **socialStore** | viewingProfile, followers, following, friends, search, follow/unfollow, block |
| **communityStore** | Posts, comments (LRU cache), topMembers, energia, createPost |
| **pointsStore** | Balance, transactions |
| **stravaStore** | Conexão Strava, km semanais, meta, runs, records |
| **medalStore** | Medalhas de corrida |

**Inicialização pós-login** (em `_layout.tsx`): fetchProfile, fetchBalance, checkConnection (Strava), registerPushToken, clearBadge.

---

## 4. Dados e API (Supabase)

### Tabelas principais
- **profiles** — usuário (nome, avatar, bio, points, streak, etc.)
- **modules**, **lessons** — conteúdo (não integrado nas telas)
- **user_lesson_progress** — progresso de aulas
- **points_ledger** — histórico de pontos
- **community_posts**, **post_reactions**, **post_comments** — feed
- **strava_connections**, **strava_stats_cache**, **strava_awarded_runs** — Strava
- **race_medals** — medalhas
- **notifications** — push

### RPCs usados
- `get_user_public_profile`, `follow_user`, `unfollow_user`, `block_user`, `get_followers`, `get_following`, `get_friends`, `search_users`, `count_friends`, `get_follow_requests`, `cancel_follow_request`, `accept_follow_request`, `decline_follow_request`, `remove_follower`, `mute_user`, `unmute_user`, `is_user_muted`
- `get_filtered_feed`, `get_filtered_feed_before`, `delete_post`, `toggle_energia`, `add_comment`, `increment_comment_count`, `get_weekly_top_members`, `get_weekly_top_members_filtered`
- `increment_points`

### Storage
- **community-images** — fotos de posts
- **avatars** — avatares de perfil

### Edge Functions
- **strava-auth** — troca code por tokens, refresh
- **push** — envio de notificações

---

## 5. Autenticação

- **Email/senha:** signInWithPassword, signUp, resetPasswordForEmail
- **Apple:** expo-apple-authentication (signInAsync)
- **Google:** botão na UI (OAuth depende de config no Supabase)
- **Session:** persistida em AsyncStorage; autoRefreshToken; AppState para start/stop refresh
- **Redirect:** não logado → `/(auth)/login`; logado em auth → `/(tabs)`
- **Trigger:** `handle_new_user` cria profile ao signup; bônus 100 pts via update + points_ledger

---

## 6. Fluxos de navegação

| Fluxo | Rotas |
|-------|-------|
| Auth | login ↔ signup |
| Home | index → modulos → modulos/[id] → aulas → aulas/[id] |
| Comunidade | comunidade (feed, criar post, comentários) |
| Perfil | perfil (abas Perfil/Corridas/Records) → editar-perfil |
| Corridas | corridas (standalone ou via aba no perfil) → medalhas |
| Social | search, friends, followers, following, requests |
| Perfil público | user/[id] (de qualquer card de usuário) |

**Deep links (notificações):** follow, follow_request, follow_accepted, friend, mention → roteiam para user/[id], requests ou comunidade.

---

## 7. Integrações

### Strava
- Edge Function `strava-auth` troca code por tokens
- stravaStore: connect, disconnect, syncAllStats, syncWeeklyStats, syncLifetimeStats, fetchRuns, syncAndAwardRuns
- Atividades: Run, TrailRun, VirtualRun, Walk, Hike
- Sparks por km; records 5K, 10K, meia, maratona

### Notificações push
- Expo Push; token em profiles.expo_push_token
- Handler global; tap → deep link (follow, follow_request, mention, etc.)
- Clear badge ao abrir app

### Widget iOS
- expo-widgets: MetaSemanal (systemSmall, systemMedium)
- Atualizado pela stravaStore (km semanais, meta)

### Mapbox
- Placeholder em app.json (`MAPBOX_TOKEN_PLACEHOLDER`); usado em RoutePreview para polylines de corrida

---

## 8. Segurança

- **Supabase:** RLS em todas as tabelas; anon key exposta (padrão Supabase)
- **Auth:** session em AsyncStorage; refresh automático
- **Credenciais Strava:** Edge Function com secrets (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET)
- **Imagens:** upload via Supabase Storage com RLS; URLs públicas para community-images e avatars
- **Sem testes automatizados** — validação manual

---

## 9. Performance

- **Reanimated:** animações em UI thread
- **Lottie:** ícones animados leves
- **Scroll:** useAnimatedScrollHandler para scrollY (BottomNav)
- **Cache:** communityStore usa LRU para comentários (últimos 5 posts)
- **Strava:** SYNC_COOLDOWN_MS 5 min entre syncs
- **Sem lazy loading de telas** — expo-router carrega sob demanda
- **Dimensions.get('window')** — valores estáticos; não reage a rotação

---

## 10. UX e design (resumo)

- **Tema:** escuro (#0D0D0D), laranja (#FF6C24), glassmorphism
- **Componentes:** GlassCard (light/medium/heavy/orange), BottomNav, Logo
- **Fontes:** Montserrat (UI), Playfair (títulos)
- **Inconsistências:** espaçamentos variados (paddingBottom 40/100/120), ícones duplicados, webGlass em vários arquivos, algumas telas sem GlassCard

---

## 11. Bugs conhecidos

Ver `REVISAO-BUGS.md` para detalhes. Resumo:

| Status | Gravidade | Descrição |
|--------|-----------|-----------|
| ✅ Corrigido | Crítico | authStore signUp (trigger duplicado, loading travado) |
| ✅ Corrigido | Crítico | contentStore getRecentLesson (ordenação) |
| ✅ Corrigido | Crítico | communityStore addComment fallback (ID) |
| ✅ Corrigido | Crítico | pointsStore awardPoints (erro RPC) |
| Pendente | Médio | userStore fetchProfile (erro não limpa profile) |
| Pendente | Médio | aulas/[id] usa dados mock em vez de contentStore |

---

## 12. Dados mock (não integrados)

- **index:** continueWatching, modules, recentLessons, popularItems
- **modulos/index:** lista de módulos
- **modulos/[id]:** moduleData
- **aulas/index:** allLessons, categories
- **aulas/[id]:** lessonData, comments

O **contentStore** existe e está pronto (fetchModules, fetchLessons, fetchProgress); as telas ainda não o utilizam.

---

## 13. Dependências principais

- expo ~55, react 19.2, react-native 0.83
- expo-router, react-native-reanimated, react-native-gesture-handler
- @supabase/supabase-js, zustand
- lottie-react-native, expo-blur, expo-linear-gradient
- expo-apple-authentication, expo-notifications, expo-widgets
- react-native-svg, react-native-share

---

## 14. Configuração

- **app.json:** name VITTA UP, version 1.9.0, bundleId fit.vittaup.app, scheme vittaup
- **EAS:** projectId, updates URL, runtimeVersion appVersion
- **Plugins:** font, router, splash, secure-store, apple-auth, image-picker, web-browser, notifications, withSwiftConcurrencyFix, expo-widgets, sharing, sqlite

---

## 15. Testes e qualidade

- **Testes:** nenhum arquivo .test ou .spec
- **Lint:** presente no projeto
- **TypeScript:** sim
- **Tratamento de erros:** try/catch em stores; muitos `console.error`; pouca UX de erro (toast, retry)

---

## 16. Deploy

- **EAS Build:** production, preview, development
- **TestFlight:** via eas submit
- **Updates:** Expo Updates (OTA)
- Ver CLAUDE.md e agent deploy-manager para comandos

---

## 17. Prioridades para edição

1. Integrar contentStore em index, modulos, aulas (remover mock)
2. Corrigir bugs pendentes (userStore fetchProfile, aulas/[id])
3. Unificar espaçamentos e extrair ícones/webGlass
4. Adicionar testes (pelo menos stores e fluxos críticos)
5. Melhorar UX de erro (feedback visual, retry)
6. Validar Mapbox token para RoutePreview

---

*Documento de análise geral — atualizar conforme evolução do app.*
