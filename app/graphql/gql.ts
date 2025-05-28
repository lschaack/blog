/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetAllPosts($preview: Boolean, $skip: Int, $limit: Int) {\n    blogPostCollection(preview: $preview, skip: $skip, limit: $limit) {\n      total\n      items {\n        sys {\n          id\n          firstPublishedAt\n          publishedAt\n        }\n        title\n        subtitle\n        tags\n        slug\n        heroImage {\n          url\n          description\n          width\n          height\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetAllPostsDocument,
    "\n  query GetBlogPostWithSlug($preview: Boolean, $slug: String) {\n    blogPostCollection(preview: $preview, limit: 1, where: { slug: $slug }) {\n      items {\n        title\n        slug\n        body {\n          json\n          links {\n            entries {\n              block {\n                sys {\n                  id\n                }\n                ... on Demo {\n                  id\n                }\n                ... on CodeBlock {\n                  language\n                  code\n                }\n                ... on CaptionedImage {\n                  image {\n                    url\n                    width\n                    height\n                    description\n                  }\n                  caption\n                }\n              }\n            }\n            assets {\n              block {\n                sys {\n                  id\n                }\n                url\n                title\n                width\n                height\n                description\n              }\n            }\n          }\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n": typeof types.GetBlogPostWithSlugDocument,
};
const documents: Documents = {
    "\n  query GetAllPosts($preview: Boolean, $skip: Int, $limit: Int) {\n    blogPostCollection(preview: $preview, skip: $skip, limit: $limit) {\n      total\n      items {\n        sys {\n          id\n          firstPublishedAt\n          publishedAt\n        }\n        title\n        subtitle\n        tags\n        slug\n        heroImage {\n          url\n          description\n          width\n          height\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n": types.GetAllPostsDocument,
    "\n  query GetBlogPostWithSlug($preview: Boolean, $slug: String) {\n    blogPostCollection(preview: $preview, limit: 1, where: { slug: $slug }) {\n      items {\n        title\n        slug\n        body {\n          json\n          links {\n            entries {\n              block {\n                sys {\n                  id\n                }\n                ... on Demo {\n                  id\n                }\n                ... on CodeBlock {\n                  language\n                  code\n                }\n                ... on CaptionedImage {\n                  image {\n                    url\n                    width\n                    height\n                    description\n                  }\n                  caption\n                }\n              }\n            }\n            assets {\n              block {\n                sys {\n                  id\n                }\n                url\n                title\n                width\n                height\n                description\n              }\n            }\n          }\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n": types.GetBlogPostWithSlugDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetAllPosts($preview: Boolean, $skip: Int, $limit: Int) {\n    blogPostCollection(preview: $preview, skip: $skip, limit: $limit) {\n      total\n      items {\n        sys {\n          id\n          firstPublishedAt\n          publishedAt\n        }\n        title\n        subtitle\n        tags\n        slug\n        heroImage {\n          url\n          description\n          width\n          height\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').GetAllPostsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetBlogPostWithSlug($preview: Boolean, $slug: String) {\n    blogPostCollection(preview: $preview, limit: 1, where: { slug: $slug }) {\n      items {\n        title\n        slug\n        body {\n          json\n          links {\n            entries {\n              block {\n                sys {\n                  id\n                }\n                ... on Demo {\n                  id\n                }\n                ... on CodeBlock {\n                  language\n                  code\n                }\n                ... on CaptionedImage {\n                  image {\n                    url\n                    width\n                    height\n                    description\n                  }\n                  caption\n                }\n              }\n            }\n            assets {\n              block {\n                sys {\n                  id\n                }\n                url\n                title\n                width\n                height\n                description\n              }\n            }\n          }\n        }\n        author {\n          ... on Author {\n            sys {\n              id\n            }\n            name\n            profilePicture {\n              url\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').GetBlogPostWithSlugDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
