PDR - Product Requirements Document
App Web/PWA: SwimBase - Cronômetro Auxiliar de Natação
1. Visão Geral
1.1 Objetivo
Desenvolver uma aplicação web/PWA para auxiliar professores e técnicos de natação no controle de treinos e competições, com cronometragem precisa, gestão de atletas, registro de tempos e análise de desempenho.

1.2 Público-Alvo
Professores e técnicos de natação

Escolas e academias de natação

Clubes esportivos

Atletas (acompanhamento de desempenho)

1.3 Plataforma
Web App responsivo

PWA (Progressive Web App) para funcionamento offline

Compatível com dispositivos móveis e desktop

Stack recomendada: Flutter ou React Native (app híbrido)

Gerenciamento de estado: Zustand (React Native) ou Bloc/Riverpod (Flutter)

1.4 Nome do Produto
SwimBase - Sistema de Cronometragem e Análise para Natação

2. Arquitetura de Dados
2.1 Estratégia de Armazenamento Híbrido
2.1.1 Camada Local (IndexedDB)
Função: Armazenamento primário durante o uso

Banco de dados local no dispositivo do usuário

Funcionamento 100% offline

Escrita instantânea durante treinos

Cache de dados para leitura rápida

Persistência entre sessões

Dados armazenados:

Cadastros completos (atletas, turmas, professores)

Registros de tempos da sessão atual

Histórico recente (últimos 30 dias)

PRs do atleta

Configurações do usuário

Fila de sincronização

2.1.2 Camada Nuvem (Google Sheets/Supabase)
Função: Sincronização e backup

Fonte de verdade para dados compartilhados

Backup automático

Sincronização entre dispositivos

Compartilhamento entre professores

Histórico completo

Dados armazenados:

Todos os cadastros

Histórico completo de tempos

PRs consolidados

Dados de múltiplos professores/unidades

2.1.3 Fluxo de Sincronização
text
[IndexedDB Local] ⇄ [Fila de Sync] ⇄ [Google Sheets/Nuvem]
       ↓                    ↓                    ↓
   Leitura/Escrita    Pendências         Fonte de Verdade
   Instantânea        Offline→Online     Compartilhada
Regras de Sincronização:

Durante o treino: Escrita apenas no IndexedDB

Após o treino: Sync automático quando online

Ao abrir o app: Download de atualizações da nuvem

Conflitos: Última alteração vence (timestamp)

Offline: Dados ficam na fila de sync

Reconexão: Sync automático em background

2.2 Estrutura de Dados
2.2.1 Tabela: Atletas
Campo	Tipo	Descrição
ID	UUID	Identificador único
Nome	String	Nome completo
Data Nascimento	Date	Para cálculo de categoria
Categoria	String	Auto-calculada
ID Turma	UUID	Turma atual
Observações	Text	Notas gerais
Foto	URL	Opcional
Status	Enum	Ativo/Inativo
Criado Em	Timestamp	Data de cadastro
Atualizado Em	Timestamp	Última alteração
2.2.2 Tabela: Professores
Campo	Tipo	Descrição
ID	UUID	Identificador único
Nome	String	Nome completo
Email	String	Login
Senha Hash	String	bcrypt
ID Unidade	UUID	Unidade atual
Status	Enum	Ativo/Inativo
2.2.3 Tabela: Turmas
Campo	Tipo	Descrição
ID	UUID	Identificador único
Nome	String	Nome da turma
ID Professor	UUID	Professor responsável
ID Unidade	UUID	Unidade
Horário	String	Hora da sessão no formato HH:MM (ex.: 16:00)
Dias	Array	Dias da semana ativos (seg/ter/qua/qui/sex)
Duração	Number	Minutos da sessão
2.2.4 Tabela: Unidades
Campo	Tipo	Descrição
ID	UUID	Identificador único
Nome	String	Nome da unidade
Endereço	String	Localização
Telefone	String	Contato
2.2.5 Tabela: Registros de Tempos
Campo	Tipo	Descrição
ID	UUID	Identificador único
ID Atleta	UUID	Referência atleta
ID Professor	UUID	Referência professor
Data/Hora	Timestamp	Momento do registro
Modo	Enum	Treino/Competição
Tipo Treino	Enum	1/2/3
Estilo/Prova	String	Crawl/Costas/Peito/Borboleta/Medley
Distância	Number	Metros
Tempos	Array	Lista de tempos por repetição
Séries	Number	Total de séries
Repetições	Number	Por série
Descanso	Number	Segundos
Flag PR	Boolean	É recorde pessoal
Observações	Text	Notas do treino
Sync Status	Enum	Pendente/Sincronizado
2.2.6 Tabela: PRs (Personal Records)
Campo	Tipo	Descrição
ID	UUID	Identificador único
ID Atleta	UUID	Referência atleta
Estilo/Prova	String	Estilo da prova
Distância	Number	Metros
Melhor Tempo	Time	Recorde atual
Tempo Anterior	Time	PR anterior
Melhoria	Number	Percentual de melhoria
Data	Timestamp	Quando foi batido
Local	String	Onde foi registrado
ID Registro	UUID	Referência ao treino
2.3 Cálculo Automático de Categoria do Atleta
2.3.1 Regras de Cálculo
Idade: Calculada automaticamente pela data de nascimento

Categoria: Determinada pela idade atual do atleta

Atualização: Automática no aniversário do atleta

2.3.2 Tabela de Categorias
Idade Mínima	Nome da Categoria
0	Pré-Mirim
9	Mirim I
10	Mirim II
11	Petiz I
12	Petiz II
13	Infantil I
14	Infantil II
15	Juvenil I
16	Juvenil II
17	Júnior I
18	Júnior II/Sênior
20	A20+
25	B25+
30	C30+
35	D35+
40	E40+
45	F45+
50	G50+
55	H55+
60	I60+
65	J65+
70	K70+
75	L75+
80	M80+
2.3.3 Implementação
Cálculo automático no cadastro do atleta

Atualização automática no aniversário do atleta

Exibição da categoria em todas as telas de seleção

Filtro por categoria nas listas de atletas

Sincronização da categoria entre dispositivos

3. Requisitos Funcionais
3.1 Sistema de Autenticação
3.1.1 Login
Tela de login com email e senha

Opção "Manter conectado" (default)

Primeiro acesso: cadastro vinculado a professor existente

Recuperação de senha via email

Login offline (após primeiro acesso)

3.1.2 Sessão
Persistência local (IndexedDB)

Token de autenticação com validade estendida

Logout manual

Sessão válida offline

3.2 Fluxo Principal
3.2.1 Seleção de Modo
Tela inicial pós-login com dois botões principais:

Modo Treino

Modo Competição (placeholder - integração futura)

3.2.2 Modo Treino - Configuração
Passo 1: Seleção de Professor/Turma

Professor pré-selecionado do login

Dropdown para alterar professor (dados do IndexedDB)

Lista de turmas do professor selecionado

Seleção da turma

Passo 2: Seleção de Atletas

Grid com atletas da turma

Exibição de nome e categoria

Seleção individual ou múltipla

Seleção "Todos"

Busca por nome ou categoria

Dados carregados do IndexedDB (offline)

Passo 3: Seleção do Modo do Cronômetro

Cards de seleção: Modo 1 (Saída a Cada), Modo 2 (Tempo/Parcial) e
Modo 3 (Largada em Ondas)

✅ Implementado (v0.16.0)

Passo 4: Configuração do Treino

Modo 1: Saída a Cada

Configurações:

Tempo de saída (intervalo entre atletas)

Número de repetições

Número de séries

Intervalo entre séries

Visualização da ordem de saída

✅ Implementado (v0.16.0): relógio regressivo gigante com avanço automático,
contador Série/Rep, cores (verde→amarelo→vermelho) e toque na raia registra o
tempo global da repetição.

Modo 2: Tempo/Parcial

Configurações:

Número de repetições

Tempo de descanso entre repetições

Número de séries

Intervalo entre séries

Controle individual por atleta

✅ Implementado (v0.14.0): cronômetro individual por raia; toque registra o
parcial.

Modo 3: Largada em Ondas

Configurações:

Divisão de atletas em ondas

Número de ondas (1-10)

Atletas por onda

Tempo de descanso entre ondas

Número de séries

Interface drag-and-drop para organizar ondas

✅ Implementado (v0.16.0): nº ondas 2–6 (1 onda → usar Modo 2), distribuição
manual por toque (onda ativa), saídas escalonadas por descanso entre ondas e
avanço de série automático ao concluir todas as ondas. Drag-and-drop de ondas
fica como evolução futura (distribuição por toque no MVP).

Multi-Timer (todos os modos)

Ativação de múltiplos cronômetros simultâneos

Até 8 timers paralelos

Cada timer vinculado a um atleta ou onda

3.3 Funcionamento do Cronômetro
3.3.1 Controles Básicos
Botão START (início)

Botão STOP/LAP (registro de tempo)

Botão RESET

Botão SPLIT (tempo parcial)

Toque na tela para próximo atleta (configurável)

3.3.2 Navegação entre Atletas
Avanço automático após cada registro

Toque para avançar manualmente

Toque duplo para voltar ao anterior

Indicador visual do atleta atual

Lista lateral com tempos registrados

3.3.3 Modo 1: Saída a Cada
Contagem regressiva para próxima saída

Alerta sonoro e visual na saída

Cronômetro individual por atleta

Registro automático do tempo de saída

Display com ordem de chegada

3.3.4 Modo 2: Tempo/Parcial
Cronômetro individual por atleta

Após STOP, inicia contagem de descanso

Alerta quando descanso termina

Início automático da próxima repetição (configurável)

Registro de parciais por repetição

Gravação instantânea no IndexedDB

3.3.5 Modo 3: Largada em Ondas
Cronômetro sincronizado por onda

Display com status de cada onda

Contagem regressiva entre ondas

Alertas visuais e sonoros

Registro por atleta dentro da onda

3.3.6 Multi-Timer
Grid com múltiplos cronômetros

Controle individual ou sincronizado

Diferentes cores para identificação

Modo tela cheia para cada timer

4. Sistema de Estatísticas e Análise
4.1 Personal Records (PRs)
4.1.1 Registro Automático de PRs
Detecção automática quando um tempo é melhor que o anterior

Comparação com histórico do atleta por estilo/prova

Notificação visual e háptica no momento do PR

Badge especial no registro do tempo

Cálculo de melhoria percentual vs PR anterior

Gravação local imediata + sync posterior

4.1.2 Tipos de PR
PR por Distância: Melhor tempo em cada distância

PR por Estilo: Melhor tempo em cada estilo

PR por Prova: Combinação distância + estilo

PR de Série: Melhor média em série de treino

PR de Temporada: Melhor tempo na temporada atual

4.1.3 Visualização de PRs
Lista de todos os PRs do atleta

Ordenação por data, estilo, distância

Indicador de PR atual vs anterior

Histórico de evolução do PR

Sincronização automática entre dispositivos

4.2 Gráficos e Visualizações
4.2.1 Gráficos de Progressão
Linha do Tempo: Evolução dos tempos ao longo do tempo

Barras: Comparação entre treinos/semanas/meses

Radar: Perfil completo do atleta por estilo

Box Plot: Distribuição de tempos por série

Heatmap: Intensidade de treinos por período

4.2.2 Tipos de Gráficos Disponíveis
Progressão Temporal: Tempo vs Data

Comparativo por Estilo: Barras comparativas

Evolução de PR: Linha mostrando quebra de recordes

Volume de Treino: Barras com quantidade de séries

Intensidade: Gráfico de calor por intensidade

Frequência: Treinos por semana/mês

4.2.3 Períodos de Análise
Último treino

Última semana

Último mês

Últimos 3 meses

Últimos 6 meses

Último ano

Personalizado (data início/fim)

Comparação entre períodos

4.3 Tabelas Comparativas
4.3.1 Comparação entre Atletas
Ranking por estilo/prova

Comparação de progresso

Diferença de tempos

Percentual de melhoria

Tabela de classificação da turma

4.3.2 Comparação Individual
Atleta vs Média da Turma

Atleta vs Melhor da Turma

Atleta vs PR pessoal

Atleta vs Tempo alvo/objetivo

Comparação entre temporadas

4.3.3 Formatos de Tabela
Ranking: Ordenado por tempo

Progresso: Ordenado por melhoria

Volume: Ordenado por quantidade

Consistência: Ordenado por regularidade

Personalizado: Filtros múltiplos

4.4 Estatísticas Calculadas
4.4.1 Métricas Individuais
Tempo médio por estilo

Melhor tempo (PR)

Pior tempo

Mediana

Desvio padrão

Coeficiente de variação

Taxa de melhoria (% por mês)

Consistência (variação entre treinos)

4.4.2 Métricas de Turma
Média da turma por estilo

Distribuição de tempos

Percentis (25%, 50%, 75%)

Atletas acima/abaixo da média

Progresso coletivo

4.4.3 Métricas de Treino
Volume total (metros)

Intensidade média

Densidade (volume/tempo)

Frequência semanal

Duração média das sessões

Intervalos de descanso médios

4.5 Dashboards
4.5.1 Dashboard do Atleta
Foto (se disponível)

Informações básicas

PRs atuais

Gráfico de progressão

Últimos treinos

Próximos objetivos

Comparativo com turma

4.5.2 Dashboard do Professor
Visão geral da turma

Atletas em destaque

Alertas de melhoria/queda

Planejamento de treinos

Relatórios rápidos

Exportação de dados

Status de sincronização

4.5.3 Dashboard da Unidade
Comparativo entre turmas

Ranking geral

Professores em destaque

Volume total de treinos

Análise de utilização

5. Arquitetura das Telas (Wireframe)
5.1 Fluxo de Telas
text
[ Tela 1: Configuração ] ──> [ Tela 2: Execução ] ──> [ Tela 3: Histórico/Revisão ]
                                                              │
                                                              ├──> [ Dashboard ]
                                                              ├──> [ Gráficos ]
                                                              ├──> [ Comparativos ]
                                                              └──> [ Sync Status ]
5.2 Tela de Execução (Principal)
5.2.1 Modo: Saída a Cada (Pace/Interval)
Topo: Cronômetro regressivo gigante (ex: 01:45)

Mudança de cor: Verde (primeiros 80%), Amarelo (10s finais), Vermelho (5s finais)

Meio: Contador de repetições gigante (ex: Série 04 / 10)

Base: Próximo tempo de saída visível em tamanho menor

Interação: Botão gigante de Pausa/Emergência no rodapé

Avanço: Automático pelo tempo

5.2.2 Modo: Parciais (Split)
Layout: Grid vertical dividido por Raias (ex: 4 linhas para 4 raias)

Cada Raia:

Número da raia gigante à esquerda

Tempo atual correndo no centro

Último tempo parcial menor abaixo

Indicador de PR quando aplicável

Área de Toque: Linha inteira da raia como botão

Toque na linha da Raia 1 registra o Split da Raia 1

Sem necessidade de "mirar" em botão pequeno

5.2.3 Modo: Largada em Ondas (Heats)
Layout: Cards empilhados representando cada Onda

Mecânica Visual:

START: Onda 1 começa imediatamente

Onda 2 e 3: Contagem regressiva negativa (-00:10, -00:20)

Mudança para verde e contagem progressiva quando atingem o tempo

Início automático

6. Componentes de UI/UX Críticos
6.1 Princípios de Design
Fitts's Law: Botões gigantes para ações rápidas

Feedback Visual/Tátil: Resposta imediata a cada interação

Alto Contraste: Cores puras para visibilidade sob luz solar

6.2 Touch Targets
Mínimo de 80px x 80px para botões normais

Linhas inteiras clicáveis para tempos de raia

Áreas de toque generosas em toda a interface

6.3 Feedback Háptico
Vibração curta e firme a cada clique de Split/Volta

Vibração diferenciada para PR (mais longa/intensa)

Vibração para confirmação de sync

Uso da Vibration API

Confirmação tátil sem necessidade de olhar para a tela

6.4 Prevenção de Erros
Debounce: Bloqueio de cliques repetidos na mesma raia

Intervalo mínimo: 10-15 segundos

Previne registros duplos por erro

Wake Lock API: Tela nunca apaga durante cronometragem

Confirmação de Reset: Diálogo antes de apagar dados

6.5 Modo de Alto Contraste
Fundo preto com números brancos/amarelos fluorescentes

Cores puras e vibrantes

Evitar tons pastéis e designs minimalistas

Visibilidade garantida em ambiente de piscina

6.6 Indicadores de PR
Badge dourado/cintilante quando PR é batido

Animação suave de celebração

Notificação háptica diferenciada

Registro automático no IndexedDB + fila de sync

6.7 Indicadores de Sincronização
Status offline/online no topo

Indicador de sync pendente

Progresso de sincronização

Confirmação de backup realizado

7. Requisitos Não-Funcionais
7.1 Performance
Precisão de cronometragem: ±0.01 segundos

Latência máxima de toque: <100ms

Carregamento inicial: <3 segundos

Funcionamento offline completo

Renderização de alta performance para múltiplos cronômetros

Sem atrasos de milissegundos com múltiplos timers ativos

Carregamento de gráficos: <2 segundos

Processamento de estatísticas: <5 segundos para 1000+ registros

Escrita no IndexedDB: <10ms

Sync com nuvem: <30 segundos para 100 registros

7.2 Usabilidade
Interface touch-first para mobile

Botões grandes (mínimo 44x44px, ideal 80x80px)

Feedback tátil (vibração) quando disponível

Alto contraste para uso em ambiente aquático

Modo paisagem e retrato

Design baseado em Fitts's Law

Gráficos responsivos e touch-friendly

Tabelas com rolagem suave

Funcionamento transparente offline

7.3 Compatibilidade
Chrome, Safari, Firefox (últimas 2 versões)

iOS 13+, Android 8+

Screen sizes: 320px a 1920px

Suporte a Vibration API e Wake Lock API

Suporte a IndexedDB

Bibliotecas de gráficos compatíveis com mobile

Suporte a PWA (Service Workers)

7.4 Segurança
Criptografia de senhas (bcrypt)

HTTPS obrigatório

Proteção contra CSRF

Rate limiting na API

Proteção de dados dos atletas (LGPD)

Criptografia de dados sensíveis no IndexedDB

Controle de acesso por usuário

7.5 Confiabilidade
Backup automático quando online

Fila de sincronização persistente

Recuperação de falhas de sync

Validação de dados antes do sync

Log de sincronização

Exportação manual de emergência

8. Fluxos de Usuário
8.1 Fluxo Principal
text
Login → Seleção de Modo → Configuração do Treino → 
Execução do Treino → Registro no IndexedDB → 
Finalização → Sync com Nuvem → Análise/Estatísticas → Exportação
8.2 Fluxo de Análise
text
Dashboard → Seleção de Atleta → Período de Análise →
Seleção de Estilo/Prova → Visualização de Gráficos →
Comparação → Exportação/Compartilhamento
8.3 Fluxo de Sincronização
text
App Aberto → Verifica Conexão → Se Online:
  ├── Download de atualizações da nuvem
  ├── Upload de dados pendentes
  ├── Merge de conflitos
  └── Confirmação de sync
Se Offline:
  ├── Continua funcionando com IndexedDB
  ├── Marca dados como pendentes
  └── Sync automático quando reconectar
8.4 Fluxo de Emergência
Pausa geral (emergência)

Reset de série individual

Correção de tempo pós-registro

Notas rápidas durante treino

Exportação manual de dados locais

9. Interface do Usuário
9.1 Telas Principais
Tela de Login
Logo SwimBase

Campos: Email, Senha

Botão: Entrar

Link: Esqueci minha senha

Checkbox: Manter conectado

Indicador de modo offline

Dashboard Principal
Modo Treino (destaque)

Modo Competição (em breve)

Últimos treinos

Atalhos rápidos

Acesso a estatísticas

PRs recentes da turma

Status de sincronização

Configuração do Treino
Wizard de 4 passos (Turma → Atletas → Modo → Config)

Indicador de progresso

Resumo da configuração

Tela do Cronômetro
Timer principal (grande)

Lista de atletas/raias/ondas

Controles (inferior)

Status da série (superior)

Alertas visuais

Indicadores de PR

Indicador offline

Tela de Estatísticas
Seletor de atleta

Seletor de período

Abas: Gráficos, Tabelas, PRs

Filtros por estilo/prova

Botões de exportação

Tela de Comparação
Seletor de atletas (múltiplos)

Tabela comparativa

Gráficos sobrepostos

Indicadores de diferença

Ranking da turma

Tela de Sincronização
Status atual (online/offline)

Dados pendentes

Último sync realizado

Botão "Sincronizar Agora"

Log de sincronização

Exportação de emergência

Resumo do Treino
Tabela de resultados

PRs batidos (destaque)

Estatísticas rápidas

Opções de exportação

Botão "Novo Treino"

Link para análise detalhada

Status de sync dos dados

10. Priorização (MVP)
Fase 1 - MVP (v1.0)
☑ Login básico
☑ Modo Treino - Modo 2 (Tempo/Parcial)
☑ Cronômetro individual com raias clicáveis
☑ Armazenamento local no IndexedDB
☑ Sync básico com Google Sheets
☑ Exportação CSV
☑ PWA básico (offline)
☑ Cálculo automático de categoria
☑ Feedback háptico básico
☑ Alto contraste
☑ Registro automático de PRs
☑ Gráficos básicos de progressão
☑ Tabela de PRs
☑ Indicador de sync status
Fase 2 (v1.5)
□ Modo 1 (Saída a Cada)
□ Modo 3 (Largada em Ondas)
□ Multi-timer
□ Melhorias de UI/UX
□ Relatórios avançados
□ Debounce avançado
□ Gráficos comparativos
□ Dashboard do atleta
□ Ranking da turma
□ Exportação de gráficos
□ Sync com Supabase
□ Compartilhamento entre professores
Fase 3 (v2.0)
□ Modo Competição
□ Análise preditiva
□ Gráficos avançados (radar, box plot)
□ Compartilhamento social
□ Integração com wearables
□ API pública
□ App nativo (iOS/Android)
□ Relatórios personalizados
□ Multi-unidade
□ Backup automático configurável
11. Métricas de Sucesso
11.1 KPIs
Tempo de setup do treino: <2 minutos

Precisão da cronometragem: 99.9%

Taxa de retenção de usuários: >70%

Uso offline: >50% das sessões

Exportações realizadas: >1 por treino

Taxa de erro de registro: <0.1%

PRs registrados por atleta: >5 por trimestre

Utilização de gráficos: >30% das sessões

Tempo de análise pós-treino: <3 minutos

Taxa de sync bem-sucedido: >99%

Perda de dados: <0.01%

Tempo médio de sync: <30 segundos

11.2 Feedback
Satisfação do usuário: >4.5/5

NPS: >60

Tempo de resposta do suporte: <24h

Avaliação da precisão dos PRs: >95%

Satisfação com funcionamento offline: >90%

12. Riscos e Mitigações
12.1 Riscos Técnicos
Sincronização offline: Cache robusto + fila de sincronização + retry automático

Precisão do timer: Uso de performance.now() + calibração + testes em dispositivos reais

Conflitos de dados: Versionamento + timestamp + merge strategy definida

Performance com múltiplos timers: Otimização de renderização + Web Workers

Compatibilidade Vibration API: Fallback visual quando não disponível

Wake Lock API: Fallback com brilho máximo + keep-alive

Processamento de estatísticas: Otimização com Web Workers + paginação

Armazenamento IndexedDB: Limpeza automática + compressão + quotas

Falha de sync: Fila persistente + retry exponencial + log detalhado

Perda de dados locais: Exportação automática + backup na nuvem + recuperação

12.2 Riscos de Negócio
Adoção: Onboarding simplificado + tutoriais + suporte inicial

Concorrência: Diferenciação por simplicidade, mobilidade e offline-first

Manutenção: Arquitetura modular + testes automatizados + documentação

Privacidade de dados: Conformidade com LGPD + criptografia + consentimento

Dependência do Google: Alternativa com Supabase + exportação contínua

13. Anexos
13.1 Glossário
Split: Tempo parcial registrado

Série: Conjunto de repetições

Onda: Grupo de atletas largando simultaneamente

Timer: Cronômetro individual

Raia: Linha individual na piscina

Debounce: Prevenção de cliques acidentais

Fitts's Law: Princípio de design para alvos maiores

PR (Personal Record): Melhor tempo pessoal

Dashboard: Painel de visualização de dados

LGPD: Lei Geral de Proteção de Dados

IndexedDB: Banco de dados local do navegador

Sync: Sincronização de dados

Offline-first: Abordagem que prioriza funcionamento offline

PWA: Progressive Web App

Service Worker: Script que permite funcionamento offline

13.2 Referências
Regras oficiais de natação (FINA)

Melhores práticas de treinamento

Feedback de professores de natação

Fitts's Law para design de interfaces

Vibration API e Wake Lock API specifications

Bibliotecas de gráficos (Chart.js, D3.js, Recharts)

Documentação IndexedDB (MDN)

Documentação Google Sheets API

Documentação Supabase

Guia de PWA (web.dev)

Versão do Documento: 1.3
Data: 18 de Agosto de 2026
Status: Aprovado para desenvolvimento
Próxima Revisão: Após feedback do MVP
Nome do Produto: SwimBase
Arquitetura: Offline-first com sincronização híbrida (IndexedDB + Nuvem)