# Bancada de Autômatos — full-stack

Ambiente de treino de autômatos finitos, com **dois espaços** alternáveis e
conversão entre eles:

- **AFD** — autômato finito determinístico (um caminho por símbolo).
- **AFN** — não determinístico, com transições-ε e **determinização** (AFN → AFD
  por construção de subconjuntos).

Arquitetura de aplicação real:

- **Front-end:** Angular 18 (standalone components, services, rotas).
- **Back-end:** NestJS (TypeScript) — módulo com service, controller (rotas) e DI.
- **Banco:** PostgreSQL (porta **54327**) via TypeORM, com **migrations**.

O motor de autômato (regras puras: fecho-ε, `moveSet`, determinização) fica
isolado das telas e do banco, em `domain/`, e é o **mesmo** código no front e no
back — o backend é a fonte de verdade e o front valida/determiniza localmente
quando a API está fora do ar.

```
bancada-afd/
├─ docker-compose.yml        # sobe o Postgres na porta 54327
├─ backend/                  # API NestJS
│  └─ src/
│     ├─ domain/             # motor puro: AFD, AFN (ε), determinização
│     ├─ automata/           # biblioteca (entity, service, controller, dto) + /determinize
│     ├─ migrations/         # migrations TypeORM
│     └─ config/             # data-source do TypeORM
└─ frontend/                 # app Angular
   └─ src/app/
      ├─ domain/             # cópia do motor puro (automaton, render)
      ├─ core/services/      # automata (API), editor-state, theme
      ├─ core/models/        # tipos da API
      └─ features/           # portal (dois espaços) e bancada (canvas)
```

## Como rodar

Pré-requisitos: **Node 18+**, **npm** e **Docker** (para o Postgres).

### 1) Banco

```bash
docker compose up -d           # Postgres em localhost:54327
```

### 2) Backend

```bash
cd backend
cp .env.example .env           # já aponta para a porta 54327
npm install
npm run migration:run          # cria a tabela `automata`
npm run start:dev              # API em http://localhost:3000/api
```

### 3) Frontend

```bash
cd frontend
npm install
npm start                      # app em http://localhost:4200
```

O front funciona mesmo sem o backend: monta, simula e determiniza localmente,
e persiste no navegador (localStorage). A **Biblioteca** (salvar/abrir na nuvem)
e a determinização no servidor exigem a API + Postgres no ar.

## API (rotas principais)

| Método | Rota                          | Descrição                                   |
|-------:|-------------------------------|---------------------------------------------|
| GET    | `/api/automata`               | lista a biblioteca (opcional `?kind=afd\|afn`) |
| POST   | `/api/automata`               | salva um autômato (afd/afn)                 |
| POST   | `/api/automata/determinize`   | converte um AFN em AFD (não persiste)       |
| GET    | `/api/automata/:id`           | um autômato salvo                           |
| PATCH  | `/api/automata/:id`           | renomeia / atualiza                          |
| DELETE | `/api/automata/:id`           | exclui                                       |

## Migrations

```bash
npm run migration:run          # aplica
npm run migration:revert       # desfaz a última
npm run migration:generate -- src/migrations/NomeDaMigration   # gera a partir das entities
```

## O que mudou nesta versão

- **Dois espaços** (AFD e AFN) alternáveis, espelhando o artefato.
- **Determinização** AFN → AFD (fecho-ε + construção de subconjuntos), com
  tabela e AFD resultante, também exposta como rota no backend.
- **Identidade visual neutra** (grafite, IBM Plex, acentos sóbrios azul-aço/bronze).
- Removidos os módulos de **desafios** e **progresso** (o app começou limpo).
- A entidade guarda o **tipo** (`kind`) do autômato; a biblioteca lista AFDs e AFNs.
