import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { resolvers } from './graphql/resolvers';
import { getUserIdFromAuthHeader } from './utils/auth'; // For context
import { ExpressContext } from 'apollo-server-express'; // For typing req

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

async function startServer() {
  const typeDefs = fs.readFileSync(path.join(__dirname, './graphql/schema.graphql'), 'utf-8');

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }: ExpressContext) => { // Example of setting context for authentication
      const token = req.headers.authorization || '';
      const userId = getUserIdFromAuthHeader(token);
      // console.log("Context created with userId:", userId); // For debugging
      return { userId }; // Add userId to the context
    },
  });

  await server.start();
  server.applyMiddleware({ app });

  app.get('/', (req, res) => {
    res.send('PawsRoam Backend is Running!');
  });

  app.listen(PORT, () => {
    console.log(`🐾 Backend server running at http://localhost:${PORT}`);
    console.log(`🌲 GraphQL endpoint at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  console.error("Failed to start the server:", error);
});
