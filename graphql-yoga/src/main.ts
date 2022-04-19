import { execute, parse } from "graphql";
import { schema } from "./schema";
import { createServer } from "@graphql-yoga/node";
import { createContext } from "./context";

async function startServer() {
  const server = createServer({ schema, context: createContext });
  await server.start();
}

export async function helloTest() {
  const myQuery = parse(/* GraphQL */ `
    query {
      hello
    }
  `);

  const result = await execute({
    schema,
    document: myQuery,
  });

  console.log("myQuery=", myQuery);
  console.log(result);
  return result;
}

// helloTest();
startServer();
