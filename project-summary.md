# PBTracker - Registro de Desenvolvimento

## Objetivo do Projeto
PBTracker é um aplicativo web para balizamento e controle de parciais de competições de natação. O foco é funcionar como PWA no navegador móvel/tablet, suportar importação de balizamento em PDF/JSON/CSV e oferecer controles de cronometragem e registro de atletas.

## O que foi implementado

- Layout mobile/tablet-first com bloqueio visual em desktop.
- Suporte PWA:
  - `manifest.webmanifest`
  - `sw.js`
  - icons e favicon
- Conversão e garantia de UTF-8 para evitar problemas de acentuação.
- Importação robusta de PDF com: 
  - leitura do PDF via PDF.js
  - reconhecimento de provas, séries e atletas
  - suporte a tempos S/T, NT e 00:00:00
  - separação de nome completo, equipe, categoria e tempo
- Diagnóstico de importação exibido em tela para falhas no parser.
- UI de navegação com botões de controle superiores e inferiores.
- Cartões de atleta com layout horizontal e compacto.
- Cronômetro com registro de cliques por volta e `Parar`.
- Registro de logs de atividade armazenados em `localStorage`.
- Exportação de log de atividades para arquivo texto.

## Alterações recentes relevantes

- Ajuste de parser para layout real do PDF, incluindo identificação de código, nome completo, equipe, categoria e tempo.
- Redução de fontes, bordas e espaçamentos para tornar os cartões mais compactos.
- Alteração do aviso no `Próximo registro` para destacar apenas a última parcial a ser capturada.
- Criação de mecanismo de log persistente e exportável.

## Arquivos adicionados

- `project-summary.md` - resumo de todo o desenvolvimento do projeto.
- `project-action-log.js` - script para registrar ações futuras com data e hora.
- `.gitignore` - ignora arquivos de log gerados automaticamente.

## Como usar o script de registro automático

1. Instale o Node.js se ainda não estiver instalado.
2. Execute no terminal:

```bash
node project-action-log.js "Descrição da ação realizada"
```

3. O registro será acrescentado em `project-actions.log` com data e hora.

## Observações

- O `.gitignore` criado ignora arquivos de log e exportações automáticas.
- O script é simples e pode ser integrado a fluxos de desenvolvimento ou a tarefas automatizadas futuras.
