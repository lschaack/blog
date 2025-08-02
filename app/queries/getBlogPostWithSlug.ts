import { gql } from "@apollo/client";

export const getBlogPostWithSlug = gql`
  query GetBlogPostWithSlug($preview: Boolean, $slug: String) {
    blogPostCollection(preview: $preview, limit: 1, where: { slug: $slug }) {
      items {
        sys {
          publishedAt
        }
        title
        subtitle
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
                  sys {
                    id
                  }
                  key
                  args
                }
                ... on CodeBlock {
                  language
                  code
                }
                ... on CaptionedImage {
                  image {
                    url
                    width
                    height
                    description
                  }
                  caption
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
                width
                height
                description
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
