
# Development Guidelines - PBTracker

Este documento estabelece as convenções de versionamento, commits e a rotina
obrigatória de documentação para o projeto.

> Projeto **vanilla JS PWA**: HTML + CSS + JavaScript puro (ES modules, sem build),
> sem backend e sem banco de dados. Não há testes automatizados; a validação é
> estática (`node --check`).

## 1. Versionamento Semântico (SemVer)

O projeto segue o padrão **SemVer 2.0.0**:

- **MAJOR (vX.0.0):** Mudanças incompatíveis (breaking changes) — ex.: formato de
  dados importado incompatível ou comportamento que quebra o fluxo existente.
- **MINOR (v0.X.0):** Adição de funcionalidades retrocompatíveis (novas features).
- **PATCH (v0.0.X):** Correções de bugs e pequenas melhorias (bug fixes).

O bump é feito automaticamente pelo hook `post-commit` (`.githooks/`) com base na
mensagem do commit. O hook **só ativa após** `git init && git config core.hooksPath .githooks`.

## 2. Convenção de Commits (Conventional Commits)

Todos os commits devem seguir o padrão:

```text
<tipo>(<escopo>): <descrição sucinta>

[corpo opcional - detalhe o motivo da mudança]

[rodapé opcional - BREAKING CHANGE ou referência a issues]
```

Tipos permitidos:

| Tipo | Uso | Bump |
|---|---|---|
| `feat:` | Nova funcionalidade | MINOR |
| `fix:` | Correção de bug | PATCH |
| `docs:` | Alterações na documentação | PATCH |
| `style:` | Formatação, sem mudança lógica | PATCH |
| `refactor:` | Refatoração sem mudar comportamento | PATCH |
| `perf:` | Melhoria de performance | PATCH |
| `test:` | Adição ou correção de testes | PATCH |
| `chore:` | Dependências, configurações | PATCH |
| `feat!:` ou `BREAKING CHANGE` no corpo | Mudança incompatível | MAJOR |

Exemplo:

```text
feat(cronometro): adiciona captura de parcial por volta

- Cria fila de capturas pendentes com atribuição de baliza
- Destaca o próximo registro a capturar
```

## 3. Rotina Obrigatória de Registros (Logging Routine)

Toda sessão de desenvolvimento (com ou sem IA) DEVE gerar registros.

### 3.1. Arquivo AGENTS.md (Histórico Único)

O `AGENTS.md` é a **memória permanente do projeto** e **substitui o antigo
SESSION.md**. Ele deve ser atualizado **ao final de cada sessão**.

> **Nota opencode:** o opencode lê o `AGENTS.md` automaticamente ao iniciar uma
> sessão. Mantê-lo atualizado é o que permite a uma IA nova retomar o trabalho
> sem perder contexto.

**Estrutura de cada sessão no AGENTS.md:**
- Nova seção no formato `## Sessão: DD/MM/YYYY — Título`
- O que foi feito (ações concluídas)
- Decisões técnicas relevantes
- Arquivos alterados
- Blockers ou problemas encontrados
- Contexto crítico novo (ex: "descoberto que X causa Y")

**O que NÃO colocar no AGENTS.md:**
- Detalhes de implementação temporários
- Commits individuais

> **Regra de ouro:** se uma IA nova ler só o `AGENTS.md`, ela deve conseguir
> trabalhar no projeto sem ler `git log`.

### 3.2. Registro de ações via project-action-log.js

Além da sessão no `AGENTS.md`, registrar cada mudança realizada:

```bash
node project-action-log.js "descrição da ação"
```

O registro é gravado em `project-actions.log` (ignorado pelo `.gitignore`) com
data e hora.

### 3.3. Commits e pushes automáticos mediante aprovação

Ao final de cada etapa, milestone ou entrega de uma sub-tarefa acordada:
1. Verificar as alterações realizadas.
2. **Atualizar obrigatoriamente** `CHANGELOG.md` e `AGENTS.md` com as mudanças da sessão.
3. **Atualizar a constante `APP_VERSION`** em `app.js` para a nova versão
   (o app estático não lê a tag git; ela é exibida no rodapé das telas de
   perfil/filtro/controle). Fazer junto do CHANGELOG e antes do commit.
4. Formular uma mensagem de commit seguindo Conventional Commits.
5. Solicitar aprovação explícita do usuário.
6. Executar `git add`, `git commit` e `git push` quando aprovado, utilizando o fluxo de versionamento.

## 4. Fluxo de Versionamento e Tags no Git

A branch principal contém o código em produção.

Crie tags no Git para cada versão lançada:

```bash
git tag -a v0.1.0 -m "feat: primeira versão"
git push origin v0.1.0
```

> **O hook `post-commit` cria a tag automaticamente** a cada commit. Confira o
> `CHANGELOG.md` para manter a versão registrada alinhada à tag real.
>
> A pasta **ainda não é repositório git**. Para habilitar o hook:
> ```bash
> git init && git config core.hooksPath .githooks
> ```

## 5. Boas Práticas
- **Commits Atômicos:** cada commit deve conter uma mudança lógica única.
- **Documente tudo:** se a IA gerou código, peça para ela atualizar `AGENTS.md`,
  `CHANGELOG.md` e rodar o `project-action-log.js`.
- **Hooks Git:** habilite com `git config core.hooksPath .githooks`.
- **Servir via HTTP ao testar:** `file://` não funciona (ES modules + service worker).

## 6. Obrigatoriedade de Seguir a Arquitetura do Projeto

### 6.1. Princípio Fundamental

**Toda e qualquer implementação (código, estrutura de pastas, padrões de design)
DEVE seguir estritamente o que está definido nos seguintes documentos:**

- **`ARCHITECTURE.md`** → Estrutura de arquivos, fluxo de dados, modelo de estado,
  estratégia de cache e tecnologias.
- **`PDR.md`** → Regras de negócio, fluxos de UI, requisitos funcionais e critérios de aceite.
- **`DEVELOPMENT.md`** → Convenções de commit, versionamento e este próprio documento.

### 6.2. O assistente (opencode) DEVE:

1. **Consultar os documentos oficiais** antes de gerar ou modificar qualquer código.
2. **Manter a estrutura de arquivos** inalterada (não criar arquivos/pastas fora do padrão do `ARCHITECTURE.md`).
3. **Usar os utilitários existentes** antes de criar novos (ex.: reutilizar
   `normalizeTime`, `msToDisplay`, `escapeHtml`, `isSameTeam`).
4. **Seguir as convenções de nomenclatura** (ex.: `camelCase` para funções/variáveis,
   prefixo `render*` para funções de UI).
5. **Não propor mudanças arquiteturais** sem antes registrar no `AGENTS.md` e obter aprovação explícita no modo "Plan".

### 6.3. Verificação Obrigatória (Checklist)

Antes de finalizar qualquer tarefa, o assistente deve verificar:

- [ ] O código gerado está em conformidade com o `ARCHITECTURE.md`?
- [ ] As regras de negócio seguem o `PDR.md`?
- [ ] Os commits seguem o padrão do `DEVELOPMENT.md`?
- [ ] O `AGENTS.md` foi atualizado com a nova sessão?
- [ ] O `CHANGELOG.md` registra a nova versão?
- [ ] A constante `APP_VERSION` em `app.js` foi atualizada para a nova versão?
- [ ] A ação foi registrada com `node project-action-log.js "..."`?
- [ ] A validação estática passou? (`node --check app.js sw.js project-action-log.js`)

### 6.4. Penalidade por Desvio

**Qualquer desvio da arquitetura documentada será considerado um erro crítico**
e deverá ser corrigido imediatamente.

- Mudanças estruturais sem aprovação → reverter e registrar no `AGENTS.md` como "desvio arquitetural".
- Código que não siga os padrões → refatorar antes de continuar.

### 6.5. Como o Assistente Deve Proceder

Ao receber uma solicitação, o assistente deve:

1. **Identificar a qual parte da aplicação a tarefa pertence** (importação,
   agrupamento, controle, cronômetro, PWA, UI).
2. **Localizar a seção correspondente nos documentos** (ex.: `PDR.md` → "Fluxos de Uso").
3. **Consultar o `ARCHITECTURE.md`** para saber onde colocar o código (ex.: helpers em `app.js`).
4. **Implementar** seguindo as regras e padrões.
5. **Registrar** no `AGENTS.md` (o que foi feito, arquivos alterados, decisões) e no `project-action-log.js`.

### 6.6. Exemplo de Prompt

Ao solicitar uma nova feature, sempre inclua no prompt:

> *"Consulte o `ARCHITECTURE.md` e o `PDR.md` antes de implementar. Siga
> estritamente a estrutura de arquivos e as regras de negócio definidas.
> Registre as mudanças no `AGENTS.md`."*
