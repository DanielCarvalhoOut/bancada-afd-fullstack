# Arquitetura

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Angular (browser)                                           │
│  features/portal   features/bancada                          │
│        │  usa                                                │
│  core/services (HttpClient) ── REST ──►  NestJS API          │
│        │                                     │               │
│  domain/ (motor puro, TS)              domain/ (mesmo motor)  │
│                                              │               │
│                                        TypeORM ──► PostgreSQL │
│                                                    (54327)    │
└─────────────────────────────────────────────────────────────┘
```

## Princípio central: o domínio é puro

O "motor de autômato" (`domain/automaton.ts`) não conhece Angular, NestJS nem
banco. São só funções e dados, cobrindo AFD e AFN:

- **AFD** — `accepts`, `trace` (traço estado a estado), `determinismIssues`.
- **AFN** — `epsClosure` (fecho-ε por BFS), `moveSet`, `simulateNfa` (acompanha
  o *conjunto* de estados por símbolo).
- **Determinização** — `determinize`: construção de subconjuntos. Parte do
  fecho-ε do inicial, para cada símbolo calcula `epsClosure(moveSet(...))`,
  cria um estado do AFD por subconjunto distinto e marca como aceitação os
  subconjuntos que contêm algum estado de aceitação do AFN. Retorna a tabela
  (subconjuntos × símbolos) e o AFD já posicionado em grade.

Isso permite determinizar/validar no **backend** (fonte de verdade, grava a
biblioteca) e também no **frontend** (resposta instantânea / offline), com
exatamente o mesmo algoritmo.

## Backend (NestJS)

Um módulo, responsabilidade única:

- **automata** — CRUD da biblioteca + `POST /automata/determinize`. A entidade
  guarda o grafo como `jsonb` e metadados (`name`, `kind`, `stateCount`) em
  colunas. `kind` distingue AFD de AFN e permite filtrar a listagem.

Padrões: injeção de dependência nativa, DTOs validados com `class-validator`
(inclui `kind ∈ {afd, afn}`), prefixo global `/api`, CORS liberado para o front.

A determinização é um **cálculo puro**: o controller recebe o AFN, o service
chama `domain/determinize` e devolve o resultado — nada é persistido.

## Persistência (TypeORM + PostgreSQL)

- Conexão centralizada em `config/data-source.ts` (reutilizada pelo runtime e
  pelo CLI de migrations).
- `synchronize: false` — o schema é versionado **só por migrations**
  (`migrations/1700000000000-InitSchema.ts` cria a tabela `automata` com `kind`).
- Porta **54327** conforme o projeto (mapeada no `docker-compose.yml`).

## Frontend (Angular)

- **Standalone components** + roteamento (`/` = portal, `/bancada` = canvas).
- **features/portal** — escolhe o espaço (AFD determinístico / AFN não
  determinístico) e navega para a bancada.
- **features/bancada** — um canvas SVG que atende aos dois espaços: alterna
  AFD/AFN, oferece ε no seletor de símbolos (só no AFN), simula (traço no AFD,
  conjuntos no AFN), determiniza (tabela + AFD resultante) e salva/abre pela API.
- **core/services** — `AutomataService` (CRUD + `/determinize`),
  `EditorStateService` (espaço ativo e autômato pendente), `ThemeService`
  (claro/escuro persistido).
- **domain/render.ts** calcula a geometria do diagrama (estados, arestas,
  auto-laços, curvas, aresta-ε tracejada) — reutilizada pela bancada e pelo
  preview da determinização.

## Decisões

- **jsonb para o grafo:** o autômato é um documento pequeno e coeso; normalizar
  em tabelas de estados/transições traria joins sem ganho real aqui.
- **domínio duplicado (copiado) entre front e back:** simplicidade de entrega;
  o passo natural é extrair para um pacote `@bancada/domain` compartilhado.
- **determinização no backend + fallback no front:** o backend é a fonte de
  verdade; o front determiniza localmente quando a API não está no ar.
- **começar limpo:** sem módulos de desafios/progresso — o foco é montar,
  simular e determinizar, espelhando o artefato.
