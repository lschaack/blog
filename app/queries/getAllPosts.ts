import { gql } from "@apollo/client";

export const getAllPosts = gql`
  query GetAllPosts($preview: Boolean, $skip: Int, $limit: Int) {
    blogPostCollection(preview: $preview, skip: $skip, limit: $limit) {
      total
      items {
        sys {
          id
          firstPublishedAt
        }
        title
        slug
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
`
