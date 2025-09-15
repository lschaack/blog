# A blog about something

Just a quick warning - this is a personal project I created to explore things that I'm in the process of learning. That to say that the gap between the most-polished and the least-polished code in this repository at any given time will be pretty tremendous. Read and absorb these potentially terrible ideas at your own discretion.

## Stack

Built with Typescript and Next.js
Styled with Tailwind
Queried with Apollo
Queries typed by graphql-codegen
Content delivered from the Contentful GraphQL API

## Setup

```bash
# I haven't actually set this up on a new machine so who knows what I'm missing
npm install
vercel env pull
npx prisma generate
```

### Dev

```bash
npm run dev
redis-stack-server --daemonize yes && redis-cli monitor
npx prisma dev
```
