# A blog about something

Just a quick warning - this is a personal project I created to explore things that I'm in the process of learning. That to say that the gap between the most-polished and the least-polished code in this repository at any given time will be pretty tremendous. Read and absorb these potentially terrible ideas at your own discretion.

```bash
npm install
npm run dev
```

## Stack

Built with Typescript and Next.js
Styled with Tailwind
Queried with Apollo
Queries typed by graphql-codegen
Content delivered from the Contentful GraphQL API

## Environment notes

A public content delivery API key is provided to deliver the same content available on the production deployment. No preview or management keys are provided.
No Gemini API key is provided, so any service using `GEMINI_API_KEY` will be broken unless one is provided in `.env.local`.
