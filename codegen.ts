import type { CodegenConfig } from '@graphql-codegen/cli'
import { loadEnvConfig } from '@next/env'

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const hasPreviewToken = process.env.CONTENTFUL_PREVIEW_TOKEN !== undefined;
const token = process.env.NODE_ENV === "development" && hasPreviewToken
  ? process.env.CONTENTFUL_PREVIEW_TOKEN
  : process.env.CONTENTFUL_DELIVERY_TOKEN;

const config: CodegenConfig = {
  schema: [
    {
      [`https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}`]: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  ],
  documents: ['app/**/*.tsx', 'app/**/*.ts'],
  ignoreNoDocuments: true,
  generates: {
    './app/graphql/': {
      preset: 'client',
      config: {
        documentMode: 'string'
      }
    },
    './app/schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true
      }
    }
  }
}

export default config
