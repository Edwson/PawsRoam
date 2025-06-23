# PawsRoam API (Backend)

This directory contains the Node.js (Express, GraphQL, TypeScript) backend for the PawsRoam application.

## Prerequisites

- Node.js (version specified in root `README.md` or latest LTS)
- npm or yarn
- PostgreSQL server running and accessible.
- (Optional) Gemini API Key for PawsAI features.

## Getting Started

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in this `backend/` directory by copying `.env.example` (if it exists) or creating it manually. Populate it with your specific configurations:
    *   `PORT`: Port for the backend server (defaults to 4000).
    *   `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT`: Connection details for your PostgreSQL database.
    *   `JWT_SECRET`: A strong, random string for signing JWTs.
    *   `GEMINI_API_KEY`: Your API key for Google Gemini (optional, for PawsAI features).

    Example `.env` structure:
    ```env
    NODE_ENV=development
    PORT=4000

    PG_USER=your_pg_user
    PG_HOST=localhost
    PG_DATABASE=pawsroam_db
    PG_PASSWORD=your_pg_password
    PG_PORT=5432

    JWT_SECRET=a_very_strong_and_secret_key_ حداقل_32_characters

    GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Database Setup:**
    *   Ensure your PostgreSQL server is running.
    *   Connect to your PostgreSQL instance and create the database specified in `PG_DATABASE`.
    *   Execute the SQL schema provided in `backend/sql/schema.sql` to create the necessary tables (e.g., `users`). You can use a tool like `psql` or a GUI client.
        ```bash
        # Example using psql
        psql -U your_pg_user -d pawsroam_db -a -f ./sql/schema.sql
        ```

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The GraphQL playground will typically be available at `http://localhost:4000/graphql`.

## Available Scripts

-   `npm run dev` / `yarn dev`: Starts the development server with TypeScript compilation in watch mode and Nodemon.
-   `npm run build` / `yarn build`: Compiles TypeScript to JavaScript (output to `dist/`).
-   `npm run start` / `yarn start`: Starts the compiled application from the `dist/` directory (for production-like environments).
-   `npm test` / `yarn test`: Runs Jest tests.
-   `npm run test:watch` / `yarn test:watch`: Runs Jest tests in watch mode.
-   `npm run test:cov` / `yarn test:cov`: Runs Jest tests and generates a coverage report.


## Project Structure

-   `src/config/`: Database configurations, environment setup.
-   `src/graphql/`: GraphQL schema (`.graphql`), resolvers, and type definitions.
-   `src/models/`: (Currently unused, but intended for database models/entities if using an ORM or more complex data structures).
-   `src/utils/`: Utility functions (e.g., `auth.ts`, `gemini.ts`).
-   `src/index.ts`: Main application entry point, Express server, and Apollo Server setup.
-   `sql/`: Contains SQL schema files.

## Key Features Implemented (Phase 1)

- GraphQL API with Apollo Server.
- User registration and login with JWT authentication.
- PostgreSQL integration for storing user data.
- Basic Gemini API integration with a test query.
- Mock data and basic filtering for `searchVenues` query.
- Initial test setup with Jest.

---
