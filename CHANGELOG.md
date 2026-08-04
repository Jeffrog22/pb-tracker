# Changelog - PBTracker

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]
### Added
- (novas funcionalidades)

### Changed
- (mudanças em funcionalidades existentes)

### Fixed
- (correções de bugs)

### Removed
- (funcionalidades removidas)

## [v0.3.4] - 2026-08-03
### Fixed
- **Dialog do cronômetro aparecia travado na tela inicial**: o `display: flex`
  do v0.3.3 foi aplicado a `.chrono-dialog` sem escopar ao estado aberto; como
  regra de autor vence a regra do navegador (`dialog:not([open]) { display:none }`),
  o dialog ficava sempre visível cobrindo o app (cronômetro visível sem abrir,
  sem fechar, e com a barra de navegação bloqueada). Agora o flex é escopado a
  `.chrono-dialog[open]`; fechado, o dialog volta a ficar oculto.
- **Fechamento por clique fora do dialog**: clique no `::backdrop` (fora do
  retângulo) agora chama `closeChrono()` — rede de segurança para o botão Fechar.

### Changed
- Cache do service worker de `pbtracker-v4` para `pbtracker-v5` (força shell
  novo e limpa caches antigos em dispositivos com a versão travada).

## [v0.3.3] - 2026-08-03
### Changed
- **Dialog do cronômetro com cabeçalho fixo e lista rolável**: `chrono-dialog`
  vira flex column com `max-height: min(100dvh, 100vh)`; o bloco do cronômetro
  (`.timer-container`) e os botões "Registrar/Fechar" (`.action-footer`) ficam
  fixos, e pendências + atletas (`#pendingList` / `#chronoAthletes`) ficam num
  novo contêiner `.chrono-scroll` (`flex:1; min-height:0; overflow-y:auto`).
  Antes o dialog tinha `overflow: hidden` sem `max-height`, cortando a lista e
  os botões em séries grandes, sem possibilidade de rolagem.

## [v0.3.2] - 2026-08-03
### Fixed
- **Máscara de PR parcial engolia dígitos digitados**: antes cada tecla era lida
  do valor já formatado (`00:00:00`) e os zeros pré-preenchidos ocupavam as 6
  posições, então "001923" ficava sempre `00:00:00`. A máscara agora mantém um
  buffer de dígitos crus (`data-digits`), acumula apenas os dígitos digitados
  (colagem e backspace também tratados via `beforeinput`) e re-emite `input`
  para persistência/atualização do diff. Digitar `001923` agora exibe
  `00:19:23`.

## [v0.3.1] - 2026-08-03
### Fixed
- **Inputs de PR parcial não recebiam valores**: inputs de histórico no dialog
  do cronômetro não tinham nenhum listener (máscara/persistência); na tela de
  controle, cada tecla disparava um re-render total (`renderControl()`) perdendo
  o foco. Agora a máscara de tempo seleciona o conteúdo no foco, os listeners
  persistem em `athlete.history` e só o rótulo de diferença do split é atualizado
  em tempo real (sem re-render da tela).

### Changed
- **Label "Histórico" renomeada para "PR Parcial"** nos cartões de atleta e no
  dialog do cronômetro, mantendo a mesma divisão de parciais do "Prova Xm"
  (`getSplitsForEvent`). Cabeçalho da coluna no exportador (Excel/CSV) também
  renomeado de `Hist Xm` para `PR Parcial Xm`.

## [v0.3.0] - 2026-08-03
### Changed
- **Redesign completo do front do cronômetro**: nova paleta de cores, header
  escuro no dialog com dígitos ciano, botões `pill` (Iniciar/Voltas verde,
  Parar/Reiniciar magenta, Registrar laranja, Fechar transparente).
- **Bottom navigation fixa** com 3 abas (Início, Provas, Controle) substituindo
  a navegação por botões isolados; `showScreen()` sincroniza a aba ativa.
- **Cartões de atleta** reestruturados para `.athlete-row` dentro de
  `.athletes-card`, com badges de baliza/balizado/categoria e grid de parciais
  (`partials-grid`/`partial-input`) no lugar dos blocos compactos antigos.
- Guarda na tela de Controle: mensagem "Selecione provas" quando acessada sem
  seleção, com botão de atalho para o filtro.
- Cache do service worker de `pbtracker-v3` para `pbtracker-v4`.

## [v0.2.0] - 2026-08-02
### Added
- Exportação de resultados em **XLSX** (SheetJS via CDN, carregado sob demanda)
  com abas Resultados e Log de Atividades.
- **Fallback automático para CSV** (BOM UTF-8, separador `;`) quando offline.
- Botão **Exportar Excel** na tela de controle.
- Novo módulo `exporter.js` (`buildResultsRows`, `buildActivityLogRows`,
  `exportResults`).
- Inicialização do repositório git e ativação do hook SemVer.

### Changed
- Cache do service worker de `pbtracker-v2` para `pbtracker-v3` (+ `exporter.js`).

## [v0.1.0] - 2026-07-31
### Added
- Aplicação PWA mobile/tablet-first (manifest, service worker, ícones SVG).
- Importação de balizamento em PDF (via PDF.js), JSON e CSV.
- Filtro de atletas por equipe com correspondência fuzzy (acentos e stop-words).
- Agrupamento por prova + sexo e por séries/balizas.
- Tela de controle com cartões compactos de atleta (histórico × tempo de prova).
- Cronômetro com captura de parciais por volta, atribuição de baliza e registro.
- Comparação de diferença entre prova e histórico (melhor/pior).
- Diagnóstico visual de falhas do parser em tela.
- Log de atividades persistente em `localStorage` e exportação em `.txt`.
- Bloqueio de uso em larguras > 1024px com aviso de desktop.
- Documentação do projeto (PDR.md, ARCHITECTURE.md) e kit de documentação
  (AGENTS.md, CHANGELOG.md, DEVELOPMENT.md, README.md, scripts/, templates/).
