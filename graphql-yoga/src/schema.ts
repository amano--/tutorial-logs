import { makeExecutableSchema } from "@graphql-tools/schema";
import { Link } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { GraphQLContext } from "./context";
import { GraphQLYogaError } from "@graphql-yoga/node";

// type Link = {
//   id: string;
//   url: string;
//   description: string;
// };

// 2
// const links: Link[] = [
//   {
//     id: "link-0",
//     url: "https://graphql-yoga.com",
//     description: "The easiest way of setting up a GraphQL server",
//   },
//   {
//     id: "link-1",
//     url: "https://graphql-yoga1.com",
//     description: "1",
//   },
// ];
const parseIntSafe = (value: string): number | null => {
  if (/^(\d+)$/.test(value)) {
    return parseInt(value, 10);
  }
  return null;
};

const applyTakeConstraints = (params: {
  min: number;
  max: number;
  value: number;
}) => {
  if (params.value < params.min || params.value > params.max) {
    throw new GraphQLYogaError(
      `'take' argument value '${params.value}' is outside the valid range of '${params.min}' to '${params.max}'.`
    );
  }
  return params.value;
};

const typeDefinitions = /* GraphQL */ `
  type Link {
    id: ID!
    description: String!
    url: String!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    body: String!
  }

  type Query {
    info: String!
    feed(filterNeedle: String, skip: Int, take: Int): [Link!]!
    comment(id: ID!): Comment
  }

  type Mutation {
    postLink(url: String!, description: String!): Link!
    postCommentOnLink(linkId: ID!, body: String!): Comment!
  }
`;

const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    feed: async (
      parent: unknown,
      args: { filterNeedle?: string; skip?: number; take?: number },
      context: GraphQLContext
    ) => {
      const where = args.filterNeedle
        ? {
            OR: [
              { description: { contains: args.filterNeedle } },
              { url: { contains: args.filterNeedle } },
            ],
          }
        : {};

      const take = applyTakeConstraints({
        min: 1,
        max: 50,
        value: args.take ?? 30,
      });

      return context.prisma.link.findMany({
        where,
        skip: args.skip,
        take,
      });
    },
    comment: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      return context.prisma.comment.findUnique({
        where: { id: parseInt(args.id) },
      });
    },
  },
  Link: {
    id: (parent: Link) => parent.id,
    description: (parent: Link) => parent.description,
    url: (parent: Link) => parent.url,
    comments: (parent: Link, args: {}, context: GraphQLContext) => {
      return context.prisma.comment.findMany({
        where: {
          linkId: parent.id,
        },
      });
    },
  },
  Mutation: {
    postLink: async (
      parent: unknown,
      args: { description: string; url: string },
      context: GraphQLContext
    ) => {
      const newLink = await context.prisma.link.create({
        data: {
          url: args.url,
          description: args.description,
        },
      });
      return newLink;
    },
    postCommentOnLink: async (
      parent: unknown,
      args: { linkId: string; body: string },
      context: GraphQLContext
    ) => {
      const comment = await context.prisma.comment
        .create({
          data: {
            body: args.body,
            linkId: parseIntSafe(args.linkId),
          },
        })
        .catch((err: unknown) => {
          if (
            err instanceof PrismaClientKnownRequestError &&
            err.code === "P2003"
          ) {
            return Promise.reject(
              new GraphQLYogaError(
                `Cannot post common on non-existing link with id '${args.linkId}'.`
              )
            );
          }
          return Promise.reject(err);
        });

      return comment;
    },
  },
};

export const schema = makeExecutableSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
});
