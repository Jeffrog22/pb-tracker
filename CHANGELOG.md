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

## [v0.9.1] - 2026-08-10
### Changed
- **Cabeçalhos das parciais no export XLSX** agora acompanham os labels da tela:
  `Prova Xm` → `Volta Xm` (demais parciais) e a última parcial → `Tempo Final Xm`.
  Somente no Excel — o fallback CSV mantém `Prova Xm`.
- Cache do service worker de `pbtracker-v11` para `pbtracker-v12`.

## [v0.9.0] - 2026-08-10
### Changed
- **Exportação Excel sem a coluna Sexo**: o arquivo XLSX deixa de incluir a
  coluna **Sexo** (somente no Excel). O fallback CSV mantém a coluna Sexo.
  Resultado no XLSX: `Prova | Série | Baliza | Nome | Tempo Balizado | Prova Xm...`.
- **Labels das parciais no Controle e no cronômetro**: os títulos `Prova Xm`
  passam a `Volta Xm`; na última parcial (ex.: 200m numa prova de 200), o label
  vira `Tempo Final Xm`. Mudança apenas de texto — chaves `current[split]` e
  históricos inalterados.
- Cache do service worker de `pbtracker-v10` para `pbtracker-v11`.

## [v0.8.1] - 2026-08-08
### Removed
- **Colunas do arquivo exportado (Excel/CSV)**: removidas a coluna **Equipe** e
  as colunas **PR Parcial Xm**. O export passa a conter apenas:
  `Prova | Série | Baliza | Nome | Sexo | Tempo Balizado | Prova Xm...`
  (somente os tempos das parciais de prova). As telas (controle/filtro) não são
  alteradas.

### Changed
- Cache do service worker de `pbtracker-v9` para `pbtracker-v10`.

## [v0.8.0] - 2026-08-08
### Changed
- **Exportação passa a incluir TODAS as provas importadas (filtro)**, e não apenas
  as provas selecionadas no controle. `buildResultsRows` itera `groupedEvents`
  (mesma ordem do filtro); guarda atualizada para "Nenhum resultado disponível
  para exportar".
- Botão **Exportar Excel** movido da tela de Controle para o **topbar**, entre
  "Trocar usuário" e a engrenagem de configurações.
- Cache do service worker de `pbtracker-v8` para `pbtracker-v9`.

## [v0.7.0] - 2026-08-08
### Added
- **Engrenagem de configurações no topbar**: o chip "Pronto" foi substituído por
  um botão de engrenagem que abre um **dialog modal de Configurações**.
- No dialog ficam a **linha de status** (Pronto / Nova versão), o botão
  **Atualizar app** e o botão **Exportar log** (realocados do topbar).

### Changed
- Botão "Trocar usuário" permanece no topbar.
- Cache do service worker de `pbtracker-v7` para `pbtracker-v8`.

## [v0.6.0] - 2026-08-08
### Added
- **Excluir perfil individualmente** na tela de perfil: cada perfil da lista
  ganha um botão `×` que remove o perfil (com confirmação); se for o perfil
  ativo, ele é desativado.
- **Tag de versão no rodapé** das telas de **perfil, filtro e controle**,
  preenchida pela constante `APP_VERSION` (`app.js`), ex.: `v0.6.0`.

### Changed
- Labels do cadastro de perfil simplificados: "Professor" e "Equipe" (sem
  placeholders).
- Cache do service worker de `pbtracker-v6` para `pbtracker-v7`.

## [v0.5.0] - 2026-08-07
### Added
- **Tela de perfil (login/cadastro local)**: cadastro de professor + equipe
  salvo em `localStorage` (`pbtracker_profiles` + `pbtracker_active_profile`).
  Ao abrir o app, seleciona o perfil salvo (ou uma lista de perfis); a equipe da
  importação já vem preenchida. Botão "Trocar usuário" no topo.
- Persistência dos perfis de professor/equipe no dispositivo.

### Removed
- **Campo "Data da Competição"** da tela de importação: a data agora é definida
  automaticamente para a data atual (`todayISO`) e usada apenas no nome do
  arquivo exportado.

### Changed
- `handleImport` não exige mais data; exige apenas equipe + arquivo.
- Cache do service worker de `pbtracker-v5` para `pbtracker-v6`.

## [v0.4.1] - 2026-08-06
### Changed
- **Parciais do filtro reveladas inline na coluna do olho**: o clique no ícone
  ver não abre mais um card abaixo da linha; em vez disso, o próprio ícone é
  substituído pelas parciais da prova (só `current`, juntadas por `/`, ex. 50m →
  `00:23:70/00:26:07`) na mesma coluna, entre **Tempo balizado** e **Tempo da
  prova**. Clicar novamente nas parciais restaura o ícone (toggle).
- Cabeçalho da coluna do olho passa a exibir **ver**.

## [v0.4.0] - 2026-08-06
### Added
- **Tabela "Ver séries e atletas" do filtro com 'Tempo da prova' e parciais**:
  - Nova coluna **Tempo da prova** mostra o tempo final registrado da prova
    (último parcial registrado no cronômetro, via `athlete.current`).
  - Entre **Tempo balizado** e **Tempo da prova**, um **botão ícone de olho por
    atleta** que, ao ser clicado, revela as parciais da prova na própria coluna.

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
