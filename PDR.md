# PDR — PBTracker

> Documento de Definição do Produto e Requisitos
> Última atualização: 2026-07-31

---

## 1. Identificação do Produto

| Campo | Valor |
|---|---|
| Nome | PBTracker |
| Repositório/pasta | `PBSwimTrack` |
| Tipo | Aplicação web (PWA) para mobile/tablet |
| Idioma da interface | Português (pt-BR) |
| Versão atual (cache SW) | `pbtracker-v6` |

## 2. Visão Geral e Problema

O PBTracker é uma aplicação web para **balizamento e controle de parciais** em
competições de natação. Ele resolve a operação de campo da equipe técnica:

- Recebe o **arquivo de balizamento** (PDF, JSON ou CSV) da competição.
- Filtra os atletas **da equipe** e organiza provas, séries e balizas.
- Permite **cronometrar cada série** e capturar os parciais (splits) por volta.
- Compara o tempo de prova com o **histórico balizado** do atleta em tempo real.

O objetivo é permitir operação rápida e confiável em **celular ou tablet** via
navegador, inclusive **offline**, sem necessidade de backend ou instalação nativa.

## 3. Público-alvo e Stakeholders

| Papel | Descrição |
|---|---|
| Cronometrista / técnico | Usuário principal: opera o cronômetro e registra parciais na beira da piscina |
| Equipe de competição | Usuário secundário: consulta cartões de atletas e tempos na tela de controle |
| Desenvolvimento | Mantém e evolui o código (app.js, styles.css, sw.js) |

## 4. Contexto de Uso e Restrições

- Uso em **mobile/tablet primeiro**. Em janelas com largura **> 1024px** o sistema
  exibe um aviso e bloqueia o uso (`applyDeviceGuard`).
- Operação em **tempo real**: o cronômetro atualiza a cada ~30 ms.
- Necessidade de **trabalho offline** durante a competição (PWA com service worker).
- Codificação **UTF-8** garantida em toda a aplicação para evitar problemas de acentuação.

## 5. Fluxos de Uso Principais

### 5.1 Importação do balizamento
1. Usuário acessa a tela de **perfil**: seleciona um perfil cadastrado (professor
   + equipe) ou cadastra um novo.
2. Na importação, o **Nome da Equipe já vem preenchido** pelo perfil ativo.
3. Seleciona um arquivo de balizamento (PDF, JSON ou CSV).
4. O sistema processa e extrai os atletas **da equipe informada**.
5. Se o parser falhar, é exibido um **diagnóstico em tela** com as linhas rejeitadas.
6. Em caso de sucesso, avança para o **Filtro das Provas**.

### 5.2 Filtro das Provas
1. As provas são agrupadas por prova + sexo e listadas com a quantidade de séries.
2. O usuário pode expandir cada prova para ver séries, balizas e tempos balizados.
3. Seleciona as provas desejadas e avança para o **Controle**.

### 5.3 Controle Operacional
1. Cada prova selecionada é exibida com suas séries.
2. Cada atleta recebe um **cartão compacto** com histórico (tempo balizado editável)
   e tempo de prova, com comparação de diferença (melhor/pior).
3. O usuário pode abrir o **Cronômetro** para uma série.

### 5.4 Cronômetro e Registro de Parciais
1. Abre o cronômetro de uma série com o plano de parciais conforme a distância.
2. **Iniciar/Voltas**: inicia o cronômetro; cada clique registra uma captura de parcial.
3. **Parar/Reiniciar**: registra o último clique e para, ou reinicia quando parado.
4. Cada captura pendente é associada a uma **baliza** (lane) pelo usuário.
5. Ao **Registrar**, os tempos são gravados nos cartões dos atletas.

### 5.5 Log de Atividades
1. Todas as ações relevantes são registradas com data/hora em `localStorage`.
2. O usuário pode **exportar o log** em arquivo `.txt`.

### 5.6 Exportação de Resultados
1. Na tela de **Controle**, o usuário clica em **Exportar Excel**.
2. Com rede disponível, o app carrega o **SheetJS** (CDN, sob demanda) e gera um
   arquivo **XLSX** com as abas **Resultados** e **Log de Atividades**.
3. Sem internet (ou falha de carga), o app faz **fallback automático para CSV**
   com BOM UTF-8 e separador `;` (abre corretamente no Excel pt-BR).
4. A exportação inclui as **provas selecionadas** e os **parciais de histórico e prova**.

## 6. Requisitos Funcionais (RF)

### Importação
- **RF-01** — Aceitar arquivos de balizamento nos formatos **PDF, JSON e CSV**.
- **RF-02** — Extrair do PDF (via PDF.js) as linhas do layout e reconhecer provas,
  séries, balizas, código, nome completo, equipe, categoria e tempo.
- **RF-03** — Tratar tempos no formato `S/T`, `NT` e `00:00:00` (sem tempo balizado).
- **RF-04** — Filtrar apenas atletas da **equipe informada**, com correspondência
  flexível de nome (ignorando acentos e stop-words).
- **RF-05** — Exibir **diagnóstico visual** em tela quando o parser falhar,
  indicando a linha e o motivo da rejeição.
- **RF-06** — Normalizar todas as linhas importadas para um modelo padrão de atleta.

### Perfil
- **RF-24** — Permitir **cadastro local de perfil** (professor + equipe),
  persistido no dispositivo (`localStorage`).
- **RF-25** — Ao abrir o app, **selecionar perfil salvo** ou cadastrar um novo;
  o perfil ativo **pré-preenche a equipe** na importação.
- **RF-26** — Permitir **trocar de perfil** ("Trocar usuário") a qualquer momento.
- **RF-27** — A importação **não exige data**: a data da competição é definida
  automaticamente (data atual) e usada apenas no nome do arquivo exportado.

### Organização
- **RF-07** — Agrupar atletas em **provas** (por prova + sexo) e **séries**.
- **RF-08** — Permitir **seleção de provas** para operação e navegação entre telas.
- **RF-09** — Listar, ao expandir uma prova, séries com baliza, atleta e tempo balizado.

### Controle
- **RF-10** — Renderizar **cartões compactos** de atleta (nome, equipe, série, baliza,
  tempo balizado, categoria).
- **RF-11** — Permitir **edição do tempo de histórico** por parcial com máscara `MM:SS:CC`.
- **RF-12** — Comparar **tempo de prova × histórico** e destacar diferença
  (melhor em verde, pior em vermelho).

### Cronômetro
- **RF-13** — Definir o **plano de parciais** conforme a distância (50 m a 1500 m,
  com medley em 100 e 200 m).
- **RF-14** — **Iniciar, capturar voltas, parar e reiniciar** o cronômetro.
- **RF-15** — Enfileirar capturas pendentes com parcial, ordem, tempo e baliza.
- **RF-16** — Destacar o **próximo registro a capturar** (última parcial da série).
- **RF-17** — Atribuir **baliza** a cada captura pendente, sem repetir baliza por parcial.
- **RF-18** — **Registrar** os tempos pendentes nos cartões dos atletas da série.

### Log e PWA
- **RF-19** — Registrar **log de atividades** persistente com data/hora.
- **RF-20** — **Exportar log** para arquivo `.txt`.
- **RF-21** — Funcionar como **PWA**: manifest, ícones, service worker e cache offline.
- **RF-22** — Detectar **nova versão** do app e permitir aplicar atualização.
- **RF-23** — **Exportar resultados** das provas selecionadas em **CSV e XLSX**
  (SheetJS via CDN sob demanda, com fallback automático para CSV quando offline).

## 7. Requisitos Não-Funcionais (RNF)

- **RNF-01 (Mobile-first)**: layout otimizado para celular/tablet; bloqueio em desktop.
- **RNF-02 (Desempenho)**: atualização do cronômetro a cada ~30 ms com mínimo atraso.
- **RNF-03 (Confiabilidade)**: operação offline durante a competição; falhas de
  rede não interrompem o uso.
- **RNF-04 (Encoding)**: UTF-8 em toda a cadeia para correta exibição de acentos.
- **RNF-05 (Robustez de parsing)**: importação resiliente a variações do layout,
  com fallback para tolerância a equipes desconhecidas.
- **RNF-06 (Segurança)**: sem segredos ou dados sensíveis no código; escape de HTML
  ao renderizar conteúdo importado.
- **RNF-07 (Compatibilidade)**: navegadores modernos com suporte a ES modules,
  `dialog`, `Map`/`Set`, `localStorage`, `fetch`, service worker e PDF.js.

## 8. Casos de Uso Resumidos (UC)

| Código | Ação | Ator |
|---|---|---|
| UC-01 | Importar arquivo de balizamento | Cronometrista |
| UC-02 | Filtrar e selecionar provas | Cronometrista |
| UC-03 | Visualizar cartões de atletas e diferenças de tempo | Cronometrista/Técnico |
| UC-04 | Cronometrar série e capturar parciais | Cronometrista |
| UC-05 | Atribuir balizas e registrar tempos | Cronometrista |
| UC-06 | Editar histórico balizado do atleta | Cronometrista |
| UC-07 | Exportar log de atividades | Cronometrista/Técnico |
| UC-08 | Aplicar atualização de versão | Desenvolvedor/Usuário |
| UC-09 | Exportar resultados em CSV/XLSX | Cronometrista/Técnico |
| UC-10 | Cadastrar/selecionar perfil de professor e equipe | Cronometrista/Técnico |
| UC-11 | Trocar de perfil de professor/equipe | Cronometrista/Técnico |

## 9. Critérios de Aceite

- **CA-01**: Um PDF real de balizamento, com atletas da equipe informada, produz
  importação sem falhas e sem linhas no diagnóstico.
- **CA-02**: Atletas de outras equipes nunca aparecem nos resultados importados.
- **CA-03**: Tempos `S/T`, `NT` e `00:00:00` não quebram o fluxo de importação nem o cronômetro.
- **CA-04**: Uma série completa cronometrada (uma captura por baliza por parcial) é
  registrada corretamente nos cartões.
- **CA-05**: O log de atividades persiste após recarregar a página e é exportável.
- **CA-06**: O app funciona offline após o primeiro carregamento (PWA).
- **CA-07**: A exportação de uma prova gera um arquivo que abre no Excel com
  acentos corretos — XLSX (online) e CSV (offline), contendo histórico e prova.

## 10. Limitações Atuais e Pendências

- O parser de PDF está **atrelado ao layout específico** dos arquivos recebidos;
  variações de layout podem exigir ajustes em `parseRowsFromPdfLines`.
- A importação **não persiste** entre sessões: os dados residem apenas em memória
  (`state`); somente o log de atividades fica em `localStorage`.
- O **XLSX** depende do CDN do SheetJS (carregado sob demanda); sem rede o app
  exporta em **CSV** (fallback automático).
- Não há **backend** nem sincronização entre dispositivos.
- O bloqueio de desktop é proposital e pode ser revisado para operação em telas grandes.

## 11. Glossário

| Termo | Definição |
|---|---|
| Balizamento | Distribuição dos atletas em raias/balizas por prova e série |
| Baliza / Lane | Número da raia do atleta na série |
| Parcial (split) | Tempo intermediário capturado em uma marca de distância |
| Tempo balizado | Tempo de inscrição/seed do atleta (histórico) |
| Série | Grupo de atletas de uma mesma prova que nadam juntos |
| Prova | Evento (ex.: "50 m Livre Masculino") |

## 12. Documentação do Projeto

### 12.1 Mapa de Documentação

| Documento | Conteúdo | Quando atualizar |
|---|---|---|
| `PDR.md` | Definição do produto, requisitos, fluxos, casos de uso, critérios de aceite | Ao mudar requisito, escopo, fluxo ou critério de aceite |
| `ARCHITECTURE.md` | Arquitetura técnica: stack, estado, parsing, cronômetro, PWA, limitações | Ao mudar estrutura, fluxo de dados, estado ou estratégia de cache |
| `README.md` | Porta de entrada: mapa de docs, como rodar e testar | Ao mudar instruções de execução/teste ou estrutura |
| `AGENTS.md` | Histórico do projeto: sessões, regras, contexto crítico | Ao **final de cada sessão** (obrigatório) |
| `CHANGELOG.md` | Histórico de versões | A cada versão/entrega |
| `DEVELOPMENT.md` | Convenções: commits, SemVer, rotina de registros, regras de arquitetura | Ao mudar convenções ou rotinas |
| `project-summary.md` | Resumo do desenvolvimento inicial (legado) | Raramente (mantido como referência) |
| `project-actions.log` | Registro de ações com data/hora | A cada ação, via `node project-action-log.js "..."` |

### 12.2 Regras de Atualização

1. **Toda sessão de trabalho** (com ou sem IA) deve terminar com uma nova seção
   `## Sessão: DD/MM/YYYY — Título` no `AGENTS.md`.
2. **Toda mudança** deve ser registrada em `project-actions.log`:
   `node project-action-log.js "descrição da ação"`.
3. **Mudança de funcionalidade/requisito** → atualizar este `PDR.md`
   (RF/RNF, fluxos, critérios de aceite).
4. **Mudança de arquitetura/estado/estrutura** → atualizar `ARCHITECTURE.md`
   e registrar a decisão no `AGENTS.md`.
5. **Instruções de execução/teste** → atualizar `README.md`.
6. **Nova versão** → registrar em `CHANGELOG.md` alinhado à tag SemVer
   (gerada pelo hook `post-commit`; requer `git init`).
7. **Regra de ouro**: se uma IA nova ler só o `AGENTS.md`, deve conseguir
   trabalhar no projeto sem ler `git log`.

> Detalhes das convenções de commit, versionamento e verificação obrigatória:
> ver `DEVELOPMENT.md`.
