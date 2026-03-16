# Revisão de bugs — VITTA UP Mobile

Revisão do código em busca de bugs. Itens **críticos** podem causar falhas em produção; **médios** afetam comportamento ou consistência; **menores** são melhorias.

---

## Críticos

### 1. Cadastro (signup) — conflito com trigger e loading travado
**Onde:** `src/stores/authStore.ts` — `signUpWithEmail`

**Problema:** O Supabase tem o trigger `on_auth_user_created` que já insere uma linha em `profiles` ao criar o usuário. O código faz um segundo `insert` em `profiles`, gerando erro de chave duplicada (23505). O erro não é tratado: a Promise rejeita, `isLoading` não volta a `false` e o usuário fica com o botão em loading. Além disso, o bônus de 100 pontos pode não ser aplicado.

**Correção:** Não inserir perfil manualmente; confiar no trigger. Depois do `signUp`, apenas atualizar o saldo e inserir em `points_ledger`. Envolver essa lógica em try/catch e usar `finally` para garantir `isLoading: false` e retornar erro ao usuário em caso de falha.

---

### 2. “Continuar assistindo” — aula recente errada
**Onde:** `src/stores/contentStore.ts` — `getRecentLesson`

**Problema:** Para “continuar assistindo” são filtradas aulas não concluídas com `watch_seconds > 0` e a lista é ordenada por `completed_at`. Para aulas não concluídas, `completed_at` é sempre `null`, então a ordenação é indefinida e a “aula mais recente” pode ser qualquer uma.

**Correção:** Incluir `updated_at` no `fetchProgress` e no tipo `LessonProgress` e ordenar por `updated_at` descendente (última vez que o progresso foi atualizado).

---

### 3. Comentário no feed — ID errado no fallback e delete quebra
**Onde:** `src/stores/communityStore.ts` — `addComment` (fallback quando o RPC `add_comment` não existe)

**Problema:** No fallback é feito `insert` em `post_comments` e o ID do novo comentário não é lido. O código usa `crypto.randomUUID()` para o estado local. O ID real no banco é outro. Ao chamar `deleteComment(commentId, ...)` mais tarde, o `commentId` é o UUID gerado no cliente; o banco tem outro ID, então o delete não encontra a linha ou apaga a errada.

**Correção:** No fallback, usar `.insert(...).select('id').single()` e usar o `id` retornado em `newComment.id`.

---

### 4. Pontos — saldo local atualizado mesmo quando o RPC falha
**Onde:** `src/stores/pointsStore.ts` — `awardPoints`

**Problema:** Após `increment_points`, o código não verifica `error`. Se o RPC falhar, o saldo no servidor não muda, mas o estado local é atualizado com `balance + amount`, deixando a UI inconsistente com o backend.

**Correção:** Verificar o resultado do RPC; só atualizar o estado local e considerar sucesso se não houver erro. Opcionalmente chamar `fetchBalance` após sucesso para manter consistência.

---

## Médios

### 5. Perfil do usuário — erro de fetch não limpa perfil antigo
**Onde:** `src/stores/userStore.ts` — `fetchProfile`

**Problema:** Em caso de erro (ex.: perfil removido, rede), apenas `isLoading: false` é setado. O `profile` anterior permanece, podendo exibir dados de outro usuário ou obsoletos.

**Sugestão:** Em caso de erro, fazer `set({ profile: null, isLoading: false })` (e, se aplicável, deslogar ou redirecionar).

---

### 6. Tela de aula — dados fixos em vez do `id` da rota
**Onde:** `app/(tabs)/aulas/[id].tsx`

**Problema:** A tela usa `lessonData` e `comments` estáticos. O parâmetro `id` da URL é obtido com `useLocalSearchParams()` mas não é usado para buscar a aula e os comentários reais no `contentStore` / `communityStore`. A tela sempre mostra a mesma aula (ex.: “Saudação ao Sol”) e comentários mock.

**Sugestão:** Se a intenção é exibir a aula real, buscar aula por `id` (contentStore) e comentários por `post_id` (se houver post por aula) ou equivalente no backend.

---

## Menores

### 7. fetchPosts / loadMorePosts — possível duplo set ao usar legacy
**Onde:** `src/stores/communityStore.ts`

**Observação:** Ao cair no fallback `fetchPostsLegacy` / `loadMorePostsLegacy`, essas funções fazem `set({ isLoading: false })` etc. O fluxo está correto; apenas garantir que em todos os caminhos (incluindo throw) o loading seja desligado para evitar loading eterno.

---

### 8. TopMembers — tipo com `avatar_url` vs uso em alguns lugares
**Onde:** `src/stores/communityStore.ts` — `fetchTopMembers`

**Observação:** O tipo `TopMember` usa `avatar_url`; o mapeamento do RPC usa o mesmo campo. Verificar se em todos os lugares que exibem “top members” usam `avatar_url` e não `user_avatar` (que é do post), para evitar referência undefined.

---

## Resumo

| # | Gravidade | Onde | Resumo |
|---|-----------|------|--------|
| 1 | Crítico | authStore signUpWithEmail | Conflito com trigger + loading travado + bônus pode não aplicar |
| 2 | Crítico | contentStore getRecentLesson | Ordenação por completed_at (null) → “continuar assistindo” incorreto |
| 3 | Crítico | communityStore addComment fallback | ID do comentário errado → deleteComment quebra |
| 4 | Crítico | pointsStore awardPoints | Saldo local sobe mesmo quando RPC falha |
| 5 | Médio | userStore fetchProfile | Erro não limpa profile antigo |
| 6 | Médio | aulas/[id].tsx | Tela usa dados mock em vez do id da rota |
| 7–8 | Menor | communityStore | Loading e tipagem de TopMembers |

Recomendação: corrigir os 4 críticos primeiro; em seguida o 5 e o 6 conforme a regra de negócio desejada.
