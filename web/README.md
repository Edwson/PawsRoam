# PawsRoam Web Application (Frontend)

This directory contains the Next.js frontend for the PawsRoam application.

## Prerequisites

- Node.js (version specified in root `README.md` or latest LTS)
- npm or yarn

## Getting Started

1.  **Navigate to the web directory:**
    ```bash
    cd web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file in this `web/` directory if you need to override default environment variables. The main one used currently is:
    *   `NEXT_PUBLIC_GRAPHQL_ENDPOINT`: The URL of the backend GraphQL server. Defaults to `http://localhost:4000/graphql` if not set (see `src/lib/apolloClient.ts`).
    Example `.env.local`:
    ```env
    NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:3000`.

## Available Scripts

-   `npm run dev` / `yarn dev`: Starts the development server.
-   `npm run build` / `yarn build`: Builds the application for production.
-   `npm run start` / `yarn start`: Starts a production server (after building).
-   `npm run lint` / `yarn lint`: Lints the codebase.
-   `npm run test` / `yarn test`: Runs Jest tests.
-   `npm run test:watch` / `yarn test:watch`: Runs Jest tests in watch mode.

## Project Structure

-   `src/app/`: Contains page routes (App Router).
-   `src/components/`: Shared React components.
-   `src/contexts/`: React context providers (e.g., `AuthContext`).
-   `src/lib/`: Libraries and client configurations (e.g., `apolloClient.ts`).
-   `src/styles/`: Global styles and CSS modules (though most global styles are in `src/app/globals.css`).
-   `src/utils/`: Utility functions for the frontend.
-   `public/`: Static assets.

## Key Features Implemented (Phase 1)

- Basic site structure and navigation.
- User registration and login (communicating with the backend).
- Basic map display page with Leaflet and mock venue data.
- Placeholder profile page.
- Basic styling and UI.
- Initial test setup with Jest and React Testing Library.
---
