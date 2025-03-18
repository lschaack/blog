import { gql } from "@apollo/client";

export const getBlogPostWithSlug = gql`
  query GetBlogPostWithSlug($preview: Boolean, $slug: String) {
    blogPostCollection(preview: $preview, limit: 1, where: { slug: $slug }) {
      items {
        title
        slug
        body {
          json
          links {
            entries {
              block {
                sys {
                  id
                }
                ... on Demo {
                  id
                }
              }
            }
            assets {
              block {
                sys {
                  id
                }
                url
                title
              }
            }
          }
        }
        author {
          ... on Author {
            sys {
              id
            }
            name
            profilePicture {
              url
              title
            }
          }
        }
      }
    }
  }
`;
