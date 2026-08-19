# PBTracker

Balizamento e controle rápido de parciais para competição de natação — PWA
mobile/tablet-first, sem backend, para operação na beira da piscina. Inclui o
**SwimBase** (Modo Treino): cadastro de atletas/turmas, cronômetro por raias,
PRs, gráficos de progressão e exportação (Tier 2).

## Status do Projeto

![Version](https://img.shields.io/badge/version-v0.14.0-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Platform](https://img.shields.io/badge/platform-PWA-brightgreen)

## Mapa de Documentação

| Documento | Conteúdo |
|---|---|
| [`PDR.md`](PDR.md) | Definição do produto e requisitos (Tier 1 — balizamento) |
| [`PDR-SwimBase.md`](PDR-SwimBase.md) | Requisitos do SwimBase (Tier 2) — MVP = Fase 1 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Arquitetura técnica (stack, estado, parsing, cronômetro, PWA, SwimBase) |
| [`AGENTS.md`](AGENTS.md) | Histórico do projeto (sessões, regras de ouro, contexto crítico) |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Convenções de commits, versionamento e rotina de registros |
| [`project-summary.md`](project-summary.md) | Resumo do desenvolvimento inicial |
| [`project-action-log.js`](project-action-log.js) | Script para registrar ações em `project-actions.log` |
| [`plano de implementacao.md`](plano%20de%20implementacao.md) | Plano de negócio e evolução do produto em 3 camadas (Tier 1/2/3) |

## Pré-requisitos

- Navegador moderno (Chrome/Edge/Safari) com suporte a ES modules, `dialog`, `Map`/`Set`, `localStorage`, service worker e fetch.
- **Internet apenas no primeiro carregamento**: o PDF.js é carregado via CDN. Depois o app funciona offline.
- Node.js ou Python apenas para servir os arquivos (não há build).

> **Importante:** abrir `index.html` diretamente pelo `file://` **NÃO funciona**.
> O app usa módulos ES e service worker, que exigem servir via HTTP.

## Como Rodar Localmente

Escolha uma das opções a partir da **raiz do projeto**:

### Opção 1 — Node.js (`npx serve`)

```bash
npx serve .
```

### Opção 2 — Python

```bash
python -m http.server 8080
```

### Opção 3 — VS Code (Live Server)

1. Instale a extensão **Live Server**.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.

Depois abra `http://localhost:8080` (ou a porta exibida) no navegador.

## Como Testar

> O layout é mobile/tablet-first: em janelas com largura **> 1024px** o app exibe
> um aviso e bloqueia o uso. No computador, use o **device emulation** do DevTools
> (Chrome: `Ctrl+Shift+I` → botão de dispositivo) ou diminua a janela.

### Fluxo completo (teste funcional)

1. **Importação**: informe o nome da equipe, a data e selecione um arquivo de
   balizamento (**PDF, JSON ou CSV**) → *Processar Arquivo*.
   - Se o parser falhar, um diagnóstico é exibido em tela com as linhas rejeitadas.
   - Requer um arquivo de balizamento com atletas da equipe informada (não há
     exemplo incluído no repositório).
2. **Filtro**: expanda as provas para conferir séries/balizas/tempos balizados e
   marque as provas desejadas → avançar.
3. **Controle**: veja os cartões compactos dos atletas (histórico × tempo de
   prova, com diferença destacada). Edite os tempos de histórico se quiser.
4. **Cronômetro**: *Abrir Cronômetro* em uma série.
   - *Iniciar/Voltas* inicia e captura parciais; *Parar/Reiniciar* para (registrando o último clique) ou reinicia.
   - Associe cada captura pendente à **baliza** e clique em *Registrar*.
5. **Log**: *Exportar log* baixa o registro de atividades em `.txt`.
6. **Exportação**: na tela de **Controle**, *Exportar Excel* gera um **XLSX**
   (abas Resultados + Log) quando online; **offline**, cai automaticamente para
   **CSV** (separador `;`, acentos corretos no Excel pt-BR).

### Testes extras

- **Offline/PWA**: carregue o app uma vez, abra o DevTools → *Application* →
  *Service Workers* e marque *Offline* (ou desconecte a rede). Recarregue: o app
  continua funcionando.
- **Exportação**: com rede, *Exportar Excel* baixa `.xlsx`; desconecte a rede e
  exporte novamente — agora gera `.csv` (fallback).
- **Atualização de versão**: altere algo em `sw.js` (ex.: nome do cache) e
  recarregue; o botão vira *Aplicar atualização*.
- **Validação estática** (sem execução):

  ```bash
  node --check app.js
  node --check exporter.js
  node --check sw.js
  node --check project-action-log.js
  ```

## Estrutura do Projeto

```
PBSwimTrack/
├── index.html              # Telas, dialog do cronômetro
├── app.js                  # Lógica da aplicação
├── exporter.js             # Exportação CSV/XLSX (SheetJS sob demanda + fallback)
├── styles.css              # Tema e layout mobile-first
├── sw.js                   # Service worker (PWA offline)
├── manifest.webmanifest    # Metadados PWA
├── icons/                  # Ícones PWA (SVG)
├── project-action-log.js   # Registro de ações de desenvolvimento
├── PDR.md                  # Requisitos e definição do produto
├── ARCHITECTURE.md         # Arquitetura técnica
├── AGENTS.md               # Histórico do projeto
├── CHANGELOG.md            # Histórico de versões
├── DEVELOPMENT.md          # Convenções de desenvolvimento
├── scripts/                # Kit: init-projeto, nova-sessao (ps1/sh)
├── templates/              # Kit: templates dos docs + hook SemVer
└── .githooks/post-commit   # Tag SemVer automática (ativa após git init)
```

## Kit de Documentação Replicável

As pastas `scripts/` e `templates/` formam um kit para iniciar **novos projetos**
com o mesmo padrão de documentação (origem: [Fiz! App](https://github.com/Jeffrog22/fiz-app),
adaptado para o opencode):

- `templates/AGENTS.md`, `CHANGELOG.md`, `DEVELOPMENT.md`, `README.md` — modelos com placeholders.
- `templates/.githooks/post-commit` — cria a tag SemVer automaticamente a cada commit.
- `scripts/init-projeto.(ps1|sh)` — inicializa um projeto (do zero ou aperfeiçoando um existente, sem sobrescrever nada).
- `scripts/nova-sessao.(ps1|sh)` — anexa uma sessão formatada ao `AGENTS.md`.

Para usar em um novo projeto, siga as instruções nos próprios scripts
(`.\scripts\init-projeto.ps1 -Nome MeuApp`). Neste repositório o kit já foi
**aplicado e adaptado** à stack do PBTracker (vanilla JS PWA, sem backend/banco).

> Nota: o padrão de arquitetura exige um repositório git para o hook SemVer.
> Neste projeto, inicialize quando quiser:
> `git init && git config core.hooksPath .githooks`

## Licença

MIT
