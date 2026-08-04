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
