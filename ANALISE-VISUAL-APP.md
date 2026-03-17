# Análise visual e estrutural — VITTA UP Mobile

Documento para orientar edições. Revisão completa do app (visual, estrutura, fluxos, inconsistências).

---

## 1. Estrutura de telas (app/)

### Raiz e layouts
| Arquivo | Função |
|---------|--------|
| `app/_layout.tsx` | Fontes (Montserrat, Playfair), tema escuro, gradiente de fundo, BackgroundOrbs, SplashTransition, redirecionamento auth |
| `app/(tabs)/_layout.tsx` | `<Slot />` + BottomNav, ScrollProvider |
| `app/(auth)/_layout.tsx` | Stack auth, header oculto, fade |

### Telas de autenticação `(auth)/`
| Tela | Layout |
|------|--------|
| **Login** | Fundo `backvitta.png`, overlay gradiente, logo inline, painel glass no rodapé, email/senha, Apple/Google, "Criar conta" |
| **Signup** | Mesmo fundo, botão voltar, card glass central (nome/email/senha), bônus 100 pts |

### Telas principais `(tabs)/`
| Tela | Seções principais |
|------|-------------------|
| **Início** | Header (Logo, "Olá, {nome}", avatar) → Continue assistindo (hero glass + ring) → Quick stats (3 cards Lottie) → Módulos (carrossel) → Aulas recentes → Frase do dia → Populares → Desafio → Comunidade |
| **Módulos** | Título, lista vertical de GlassCards (ícone, título, descrição, meta, barra de progresso) |
| **Módulo [id]** | Voltar, título, descrição, card progresso (orange), CTA, lista de aulas |
| **Aulas** | Título, filtro pills, lista de aulas (thumb, play, módulo, duração) |
| **Aula [id]** | Vídeo 16:9 (blur + overlay), play, voltar; conteúdo + comentários (mock) |
| **Comunidade** | Logo, tabs (Conquistas/Desafios/Fotos), feed, modal criar post, top membros |
| **Perfil** | Abas Perfil/Corridas/Records; avatar, stats, Strava, meta semanal, ações |
| **Editar perfil** | Avatar, formulário (nome, bio, peso, altura, privado) |
| **Corridas** | Stats hero, Strava, sync, tabs Lista/Records, RunCards com share |
| **Medalhas** | Grid de medalhas, modal detalhe |

### Social (sem tab bar)
- `social/search.tsx` — Busca usuários
- `social/friends.tsx` — Amigos (mútuos)
- `social/followers.tsx`, `following.tsx` — Seguidores/Seguindo
- `social/requests.tsx` — Pedidos de follow

### Usuário
- `user/[id].tsx` — Perfil público (avatar, stats, Strava, follow/unfollow)

---

## 2. Componentes visuais

### GlassCard (`src/components/GlassCard.tsx`)
- **Variantes:** `light`, `medium`, `heavy`, `orange`
- **Props:** style, variant, intensity
- **Web:** backdropFilter, boxShadow; **Native:** BlurView
- Uso em: index, modulos, aulas, perfil, comunidade, user/[id]

### BottomNav (`src/components/BottomNav.tsx`)
- Início, Módulos, Social, Perfil
- Efeito de scroll (gap entre pills via useScrollY)
- paddingBottom: insets.bottom + 8

### Logo (`src/components/Logo.tsx`)
- Props: size (sm=20, md=30, lg=48), variant (gradient, white, dark)
- Usado em: index, comunidade, corridas — **NÃO** em login/signup (logo inline)

### BackgroundOrbs (`src/components/BackgroundOrbs.tsx`)
- 3 círculos SVG com RadialGradient (laranja/pêssego)
- Apenas no layout raiz

### Outros
- **UserCard** — avatar, nome, VerifiedBadge, FollowButton
- **FollowButton** — Lottie (thunder, fist-bump), sons
- **RoutePreview** — mapa de corrida (polyline)

---

## 3. Design system

### Cores (`src/constants/theme.ts`)
| Token | Hex | Uso |
|-------|-----|-----|
| orange | #FF6C24 | CTA, destaques |
| orangeLight | #FF8540 | secundário |
| peach | #FFAC7D | terciário |
| dark | #0D0D0D | fundo |
| darkCard | #1A1008 | — |
| white | #FFFFFF | texto |

### Tipografia
- **Montserrat:** 300 Light, 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold
- **Playfair Display:** 400 Regular, 600 SemiBold, 700 Bold
- Títulos: Playfair; corpo/UI: Montserrat

### Gradiente de fundo (layout raiz)
```ts
colors={['#0D0D0D', '#1A1008', '#181010', '#0D0D0D']}
locations={[0, 0.4, 0.7, 1]}
```

### Padrões glass
- BlurView + LinearGradient + borda + highlight topo
- Web: backdropFilter, boxShadow
- `webGlass` definido localmente em index, comunidade, corridas (duplicação)

---

## 4. Inconsistências e pontos de atenção

### Espaçamentos
| Tela | paddingTop | paddingBottom |
|------|------------|---------------|
| Maioria | insets.top + 16 | 120 |
| perfil | insets.top + 12 | 120 |
| editar-perfil | insets.top + 8 | 120 |
| modulos/[id] | insets.top + 16 | **40** |
| user/[id] | insets.top + 56 | insets.bottom + 40 |
| social/* | — | insets.bottom + 100 |

### Telas fora do design system
- **Login/Signup:** não usam GlassCard; componentes próprios
- **Login:** logo inline em vez do componente Logo
- **Aulas/[id]:** comentários sem GlassCard
- **Medalhas:** cards custom (BlurView + LinearGradient) em vez de GlassCard

### Dados mock (contentStore não usado)
- **index:** continueWatching, modules, recentLessons, popularItems — mock
- **modulos/index:** lista mock
- **modulos/[id]:** moduleData estático
- **aulas/index:** allLessons, categories mock
- **aulas/[id]:** lessonData, comments mock

### Código duplicado
- Ícones SVG (PlayIcon, ArrowLeftIcon, etc.) em vários arquivos
- `webGlass` em index, comunidade, corridas
- Diferentes implementações de avatar

---

## 5. Fluxos e stores

| Fluxo | Rotas | Store |
|-------|-------|-------|
| Auth | login ↔ signup | authStore |
| Home → Módulos → Aulas | index → modulos → modulos/[id] → aulas/[id] | contentStore (existe mas não usado; mock) |
| Perfil | perfil → editar-perfil | userStore |
| Comunidade | comunidade | communityStore |
| Corridas | corridas, perfil (aba) | stravaStore |
| Social | search, friends, followers, following, requests | socialStore |
| Perfil público | user/[id] | userStore, socialStore, stravaStore |

---

## 6. Assets

### Lottie
- fire-emoji, presentation-emoji, award-emoji — index (stats)
- running, height, kitchen-scale — perfil, user/[id]
- thunder-energia — SplashTransition, FollowButton
- medal, celebration, fist-bump — corridas, comunidade

### Imagens
- backvitta.png — login, signup
- icon-running-shoe.png — corridas

---

## 7. Checklist para edições

- [ ] Unificar paddingBottom (120 vs 40 vs 100)
- [ ] Padronizar Logo em auth (login/signup)
- [ ] Extrair ícones SVG para módulo compartilhado
- [ ] Integrar contentStore em index, modulos, aulas (remover mock)
- [ ] Usar insets.bottom em paddingBottom onde fizer sentido
- [ ] Centralizar `webGlass` em constantes ou hook
- [ ] Padronizar GlassCard em medalhas e aulas/[id]
- [ ] Revisar BackgroundOrbs para rotação/resize

---

*Documento gerado para guiar edições do VITTA UP Mobile.*
