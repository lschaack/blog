import { ApolloClient, InMemoryCache } from "@apollo/client";

const GRAPHQL_HOST = 'https://graphql.contentful.com';

const token = process.env.NODE_ENV === "development"
  ? process.env.CONTENTFUL_PREVIEW_TOKEN
  : process.env.CONTENTFUL_DELIVERY_TOKEN;

export const client = new ApolloClient({
  uri: `${GRAPHQL_HOST}/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${process.env.CONTENTFUL_ENVIRONMENT_ID}`,
  cache: new InMemoryCache(),
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

