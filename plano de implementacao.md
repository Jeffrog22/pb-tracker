# Plano de Implementação — PBTracker

> Plano de negócio e evolução do produto em camadas (Tier 1/2 ativos; Tier 3 futuro).
> Documento de planejamento — define produto, monetização, arquitetura e roadmap.
> Data: 01/08/2026 · Revisado: 01/08/2026 (monetização, PB por treino, Tier 3 adiado)
>
> **Status**: Tier 1 e Tier 2 no roadmap ativo; **Tier 3 adiado** (possível
> implementação futura, sem foco agora).

---

## 1. Visão de Produto

O PBTracker evolui de um rastreador de balizamento para uma plataforma de
acompanhamento de atletas de natação, em **camadas de produto** dentro de um
**único PWA**:

| Camada | Público | Funcionalidades | Modelo de receita |
|---|---|---|---|
| **Tier 1 — Balizamento** | Cronometristas em prova | Versão atual melhorada: balizamento PDF/JSON/CSV, filtro, controle, cronômetro + **exportação CSV/XLSX** | Trial **3 meses** → licença de baixo valor (**versionamentos gratuitos**); alternativa free **com anúncios**, pagamento remove anúncios |
| **Tier 2 — Atletas (Upgrade)** | Técnicos em treino e prova | Banco de atletas, **modo treino × modo prova**, gráficos de desempenho, PB/histórico, export de tabelas | Licença **anual ou vitalícia** (valor maior) |
| **Tier 3 — Premium (futuro)** | — | **Possível**: integração **Strava/Garmin**, sincronização em nuvem | **Sem foco agora** (implementação futura) |
| **Micro-transações** | Todos | **Calculadora de ritmo** (compra única, feature separado com integração) + cosméticos/lojinhas futuros | R$ 4,99 / 9,99 / 19,90 |

### Princípios que não mudam
- **Offline-first**: o app continua funcionando sem internet durante treinos e provas.
- **Vanilla JS sem build**: HTML + CSS + JS puro (ES modules), PWA estático.
- **Operação mobile/tablet-first** na beira da piscina.
- A **importação de balizamento continua sendo a porta de entrada** em qualquer camada.

---

## 2. Decisão de Integração — 1 app + upgrades por patch

**Decisão: um único PWA** (1 repositório, 1 deploy, 1 código-fonte). Os upgrades
chegam como **releases/patchs** (tags SemVer geradas pelo hook `post-commit`).

### Por que não 2 apps separados
- O núcleo de balizamento seria **duplicado** (manutenção em dobro).
- Duplicaria deploy, PWA/service worker, testes e evolução do parser.
- Dados de atletas seriam **incompatíveis** entre os dois apps.

### Controle por feature flags
- `state.tier` persistido em `settings` (IndexedDB).
- Telas e módulos liberados conforme a camada (ex.: menu "Atletas" só com Tier 2).
- Ao desbloquear, os dados locais já gravados continuam válidos (modelo aditivo).

---

## 3. Monetização e Preços

### Modelo de receita
| Camada | Cobrança | Mecanismo |
|---|---|---|
| **Tier 1** | **Baixo valor** | **Trial gratuito de 3 meses** → depois licença de baixo valor; **versionamentos (atualizações) gratuitos** para licenciados |
| **Tier 1 — alternativa free** | Gratuito **com anúncios** | Anúncios esportivos (equipamentos, acessórios de natação, saúde/suplementos); pagamento **remove anúncios** |
| **Tier 2** | **Valor maior (upgrade)** | Licença **anual ou vitalícia**; upgrade a partir do Tier 1 |
| **Micro-transações** | R$ 4,99 / 9,99 / 19,90 | **Calculadora de ritmo** (compra única, feature separado com integração) + cosméticos/lojinhas futuros |
| **Tier 3** | — | **Adiado** — possível implementação futura, sem foco agora |

### Regras de negócio da monetização
- **Trial (3 meses)**: período gratuito sem anúncios. Ao terminar, o usuário escolhe:
  1. **Free com anúncios** (esportivos, contexto online); ou
  2. **Licença Tier 1** (baixo valor) — remove anúncios e mantém o uso offline limpo.
- **Versionamentos gratuitos**: quem tem licença (Tier 1 ou 2) recebe as
  atualizações sem custo adicional.
- **Tier 2 (upgrade)**: licença anual ou vitalícia sobre a Tier 1; desbloqueia
  atletas, modo treino/prova, gráficos e export avançado.
- **Calculadora de ritmo**: compra única, feature **separado** porém **integrado**
  ao app; oferecida como **bônus para quem adquire a licença vitalícia do Tier 2**.

### Anúncios × offline-first (estratégia definida)
- O PWA é **offline-first**: o app deve funcionar limpo e sem anúncios em treinos
  e provas, inclusive sem rede.
- Portanto, **anúncios são exibidos apenas em contexto online** (rede disponível
  e SDK carregado). Em modo offline, nada é exibido — sem degradação da operação.
- A **licença remove anúncios** e garante experiência limpa em qualquer situação.

### Considerações sobre licenciamento em PWA estático
- **Licenças offline (Tier 1/2)** são crackeáveis por natureza — aceitável para um
  mercado pequeno e nichado; a chave usa hash do dispositivo para limitar
  compartilhamento.
- **Trial**: reinício do trial exige marcar `deviceHash` + data de início no
  IndexedDB; reativação em outro dispositivo é possível, com limite.
- **Canais de pagamento a definir** (Pix, Mercado Pago, Stripe) — fora do escopo
  técnico deste documento; o app consome o status de licença, não o pagamento em si.

---

## 4. Arquitetura Técnica da Evolução

### Novos módulos
| Módulo | Função | Tier |
|---|---|---|
| `db.js` | Wrapper IndexedDB (stores, índices, CRUD) | 2+ |
| `exporter.js` | Exportação CSV (BOM UTF-8) e XLSX (SheetJS) | 1+ |
| `charts.js` | Gráficos Canvas nativos (evolução, splits) | 2+ |
| `licenses.js` | Trial, licenças Tier 1/2 (anual/vitalícia) e micro-transações | 1+ |
| `ads.js` | Injeção de anúncios esportivos (somente contexto online) | 1+ |
| `pace.js` | Calculadora de ritmo (ritmo, previsão, splits) — compra única | Micro-transação |
| `wearables/` | Adapters Strava e Garmin (OAuth, importação de treinos) | Futuro (Tier 3) |
| `sync.js` | Sincronização em nuvem (multi-dispositivo) | Futuro (Tier 3) |

### Exportação Excel (`exporter.js`)
- **CSV** com BOM UTF-8 → acentos corretos ao abrir no Excel; funciona offline.
- **XLSX via SheetJS** (CDN, como o PDF.js já usa) → múltiplas abas formatadas:
  Atletas, Resultados, Prova, Treino, Estatísticas.
- **Fallback automático para CSV** quando offline (SheetJS indisponível).

### Service Worker
- Cache bump para `pbtracker-v3` + novos arquivos no `APP_SHELL` a cada release.
- SheetJS é cacheado em runtime (network-first com fallback) após o 1º uso.

### Anúncios (PWA offline-first)
- Anúncios esportivos via `ads.js` **somente em contexto online** (rede disponível
  e SDK carregado); em modo offline nada é exibido.
- A licença (Tier 1/2) **remove anúncios** e mantém a operação limpa em qualquer
  situação.

---

## 5. Modelo de Dados (IndexedDB)

### Stores

**`athletes`** — keyPath `id`; índices em `nomeNormalized`, `equipe`, `sexo`
```
{ id, codigo, nome, nomeNormalized, sexo, equipe, categoria?, createdAt, updatedAt }
```

**`results`** — keyPath `id`; índices em `athleteId`, `prova`, `competitionDate`
```
{ id, athleteId, athleteNome, prova, sexo, tempo: "MM:SS:CC",
  splits: { "50": "MM:SS:CC", ... }, mode: "prova"|"treino",
  competitionDate, contexto, fonte: "cronometro"|"import"|"manual", createdAt }
```
- **`mode`** define a origem do dado:
  - `prova` → resultado de competição (balizamento + cronômetro).
  - `treino` → desempenho de sessão de treino.
  - **Ambos alimentam o PB** — um treino pode atualizar o PB quando for o melhor
    tempo obtido.

**`sessions`** — keyPath `id` (treinos)
```
{ id, date, titulo, tipo, items: [{ athleteId, prova, distancia, tempo, ritmo, percepcao }] }
```

**`licenses`** — keyPath `key`
```
{ key, tier, deviceHash, activatedAt }
```

**`settings`**
```
{ teamName, tier, lastCompetition, syncPreferences }
```

### Cálculo de PB
- PB = menor `parseTimeToMs` entre **todos** os `results` do mesmo
  `athleteId + prova` (independe do `mode`), ignorando `S/T`, `NT`, `00:00:00`.
- Um **resultado de treino atualiza o PB somente se for o melhor tempo** já obtido
  naquela prova.
- Gráficos e estatísticas usam a série cronológica de `results` (prova + treino).

---

## 6. Roadmap por Fases

### Fase A — Tier 1 (exportação de dados)
Melhoria da versão atual **sem mudar o fluxo**:
1. `exporter.js` (CSV + XLSX).
2. Exportar resultados da tela de controle e log de atividades.
3. Bump do cache do service worker.

**Entregável**: app atual + "Exportar para Excel" funcionando.

### Fase B — Tier 2 (atletas + modo treino/prova)
1. `db.js` + **upsert de atletas** durante a importação (match por `codigo`;
   fallback fuzzy por `nomeNormalized + equipe + sexo`).
2. Tela **Atletas** (cadastro, busca, histórico, mesclagem de duplicatas).
3. Seletor **Modo Treino / Modo Prova**; gravação de `results` (prova) e
   `sessions` (treino).
4. Cartões usam **PB do banco** como histórico; `registerPendingTimes` salva no DB.
5. Tela **Desempenho** + `charts.js` (evolução de tempo, perfil de splits, cards).
6. Export avançado (abas por entidade).

**Entregável**: plataforma de acompanhamento de atletas, mantendo o balizamento intacto.

### Fase C — Licenciamento e monetização (Tier 1/2 + micro-transações)
1. `licenses.js` — **trial de 3 meses**, licença **Tier 1** (baixo valor) e
   **Tier 2** (anual/vitalícia) via chave + hash do dispositivo.
2. `state.tier` em `settings`; feature gating das telas.
3. **Anúncios esportivos** (`ads.js`, só em contexto online) para a opção free;
   pagamento remove anúncios.
4. **Calculadora de ritmo** (`pace.js`): compra única, feature separado com
   integração; **bônus para quem adquire a licença vitalícia do Tier 2**.
5. Fluxo de compra/ativação na tela inicial (link de pagamento + código).

**Entregável**: Tier 1 e Tier 2 comercializáveis + primeira micro-transação.

### Fase D — Tier 3 (visão futura — sem foco agora)
- **Adiado.** Possível evolução futura: integração **Strava/Garmin**, sincronização
  em nuvem e relatórios avançados. Requer backend leve (ver §7).
- **Não há desenvolvimento previsto para o Tier 3 nesta fase do projeto.**

---

## 7. Tier 3 — Backend e Vestíveis (referência futura)

> **Status: ADIADO** — possível implementação futura, **sem foco agora**.
> Esta seção fica como **referência de arquitetura** para quando o Tier 3 for
> retomado. Nenhum trabalho de backend é previsto no roadmap atual.

### Por que o Tier 3 exigiria backend
- **OAuth** precisa de redirect e armazenamento seguro de tokens (refresh).
- **Assinatura** exige validação server-side.
- **Sync multi-dispositivo** exige armazenamento remoto.
- PWA 100% estático (Tier 1/2) não sustenta esses requisitos.

### Integrações priorizadas
| Integração | Viabilidade de PWA + backend | Status |
|---|---|---|
| **Strava API** | OAuth2 + webhooks — documentada e viável | Alvo inicial |
| **Garmin Health API** | API de dados de treino/saúde com OAuth | Segunda fase |
| Apple HealthKit / Google Fit | Exigem app nativo ou barreiras de aprovação | **Fora de escopo** (documentado) |

### Sugestão de stack (a validar)
- **Hospedagem**: Vercel ou Cloudflare Pages (o GitHub Pages atual não atende OAuth/sync).
- **Backend**: Supabase (BaaS — auth, Postgres, storage) ou Cloudflare Workers + KV.
- Manter o núcleo vanilla no frontend; o backend é só para Tier 3.

### Limitação honesta
A **calculadora de ritmo** (matemática pura, offline) **não** pertence mais ao
Tier 3: virou **micro-transação** (compra única, bônus na licença vitalícia do
Tier 2). O Tier 3, se implementado, focaria em integrações (Strava/Garmin) e nuvem.

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|---|---|---|
| Licença offline crackeável | Chave + hash do dispositivo; micro-transações e eventual assinatura (Tier 3) com validação server-side |
| Reinício do trial reinstalando o app | Marcar `deviceHash` + data de início do trial no IndexedDB; limite por dispositivo |
| **Anúncios × offline-first do PWA** | **Anúncios só em contexto online**; licença remove anúncios e mantém o uso offline limpo |
| Duplicatas de atletas entre importações | Match por `codigo` + fuzzy nome/equipe/sexo + UI de mesclagem |
| Quota/quedas do IndexedDB | Tratar `QuotaExceededError`; exportar como backup |
| SheetJS (CDN) sem internet | Fallback automático para CSV |
| Complexidade OAuth (Tier 3) | Fora do roadmap atual; se retomado, começar só com Strava |
| Mudança de hospedagem no Tier 3 | Backend desacoplado; Tier 1/2 permanecem no GitHub Pages |
| `mode` duplicando lógica de histórico | Regra única de PB: melhor tempo entre `prova` e `treino` |
| Dependência de ad network (SDK) | Anúncios opcionais (só na opção free online); produto não depende deles para funcionar |

---

## 9. Critérios de Aceite por Fase

- **Fase A**: exportar o resultado de uma prova em CSV e XLSX, abrindo corretamente
  no Excel com acentos preservados.
- **Fase B**: importar balizamento e ver atletas persistidos; cronometrar e ver o
  resultado no histórico/PB; gráfico de evolução renderiza em Canvas; **um treino
  atualiza o PB somente quando for o melhor tempo** daquela prova.
- **Fase C**: trial de 3 meses expira e o app degrada para free com anúncios
  (online) ou exige licença; com licença Tier 1/2, anúncios somem e as telas são
  liberadas; calculadora de ritmo ativa por compra única e como bônus vitalício.
- **Fase D (futuro, adiado)**: conectar conta Strava, importar treino, calcular
  ritmo e sincronizar dados entre dois dispositivos.

---

## 10. Governança, Versionamento e Documentação

### SemVer
- Mudanças **aditivas** → `feat:` (MINOR).
- Quebra de **modelo de dados/API** → `feat!: breaking` (MAJOR).
- Correções → `fix:` (PATCH).
- O hook `post-commit` gera as tags automaticamente (exige `git init`).

### Documentação a atualizar a cada fase
| Documento | Quando |
|---|---|
| `PDR.md` | Novos RFs/RNFs, fluxos e critérios de aceite de cada camada |
| `ARCHITECTURE.md` | Persistência (IndexedDB), novos módulos, feature flags, backend Tier 3 |
| `AGENTS.md` | Nova sessão ao final de cada fase |
| `CHANGELOG.md` | A cada versão/entrega |
| `README.md` | Instruções de uso/exportação e mapa de docs |
| `project-actions.log` | A cada ação, via `node project-action-log.js` |

### Ações não resolvidas (pendências de produto)
- Preços exatos (Tier 1, Tier 2 e micro-transações) e canal de pagamento.
- Ad network a usar (AdSense web / AdMob) e compatibilidade com PWA estático.
- **Lojinhas/cosméticos**: adiado por decisão do usuário (fica para depois).
- Regras de categoria/faixa etária nos gráficos (se aplicável).
- Idiomas (i18n) para expansão do mercado.
- **Tier 3 (Strava/Garmin, nuvem, assinatura)**: sem foco agora — reavaliar no futuro.

---

*Fim do plano. Fases A→C no roadmap ativo; Fase D (Tier 3) adiada. A operação
atual de balizamento é preservada em todas as etapas.*
