# Test-Webiste-for-3444
https://main.d3b9nx7tb3jlu.amplifyapp.com/main.html



## HOW TO RUN ON MAC
On one terminal, type NPM START
On another terminal, make sure you are in the "frontend/react-frontend" folder, type npm web dev

## MAC TROUBLESHOOT
MAKE SURE AIRPLAY IS TURNED OFF ON SETTINGS
When running Postgres, if you get error saying port 5432 is already running:
1. In VScode, type sudo lsof -i :5432
2. Then type sudo pkill -u postgres 
3. Attempt to run Postgres again
4. Now type the commands show under "HOW TO RUN ON MAC"

## Another fix for MAC error:
In .env, ensure that it only has the following:
1. PORT=5000
2. DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@localhost:5432/[DATABASE_NAME]
3. DATABASE_SSL=false



## How to Run the Project Locally

This project consists of a Node.js backend and a React (Vite) frontend. You will also need PostgreSQL installed locally for the database.

### Prerequisites
1. **Node.js**: Make sure you have Node.js installed.
2. **PostgreSQL**: Install [PostgreSQL](https://www.postgresql.org/download/) on your local machine.
3. **Database UI (Optional)**: It is highly recommended to install a database UI tool like [DBeaver](https://dbeaver.io/) or pgAdmin to easily browse and manage your local database.

### 1. Database Setup
1. Ensure your local PostgreSQL server is running.
2. Create a new database for the project (e.g., `eagld_db`).
3. Take note of your PostgreSQL connection string. It usually looks like this:
   `postgres://<username>:<password>@localhost:5432/<database_name>`

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory and add your database URL, as well as the port the frontend is expecting (`5000`):
   ```env
   PORT=5000
   DATABASE_URL=postgres://<username>:<password>@localhost:5432/<database_name>
   ```
4. Start the backend server:
   ```bash
   node server.js
   ```
   *(Note: The backend will automatically initialize the necessary database tables on startup).*

### 3. Frontend Setup
1. Open a new terminal window and navigate to the React frontend folder:
   ```bash
   cd frontend/react-frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
4. Open the provided `localhost` link in your browser to view the application!
