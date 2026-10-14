# Pikadex — Productivity & Collaboration Platform

Pikadex is a web application that combines task management, productivity analytics, personal notes, and real-time collaboration features. The project uses Node.js and Express for the backend, MongoDB for persistent data storage, and Socket.IO for real-time communication.

## Features

- **User Authentication:** Account registration, login, and token-based session handling.
- **Task Management:** Organize tasks into projects, update task status, and track time spent on tasks.
- **Productivity Analytics:** View project progress, task completion rates, tracked time, and recent activity.
- **Personal Notes:** Create, view, edit, and delete notes stored in MongoDB.
- **Real-Time Chat:** Exchange messages using Socket.IO.
- **User Profiles:** Profile-related features and supporting pages.
- **Automated Tests:** Verify application routes and rejection of unauthenticated API requests.

## Tech Stack

**Backend:** Node.js, Express.js  
**Database:** MongoDB  
**Authentication:** JSON Web Tokens (JWT), bcrypt  
**Real-Time Communication:** Socket.IO  
**Frontend:** HTML, CSS, JavaScript, Bootstrap  
**Testing:** Node.js built-in test runner

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB running locally or an accessible MongoDB instance
- Git (optional, for cloning and version control)

### 1. Install dependencies

Clone or navigate to your authorized project copy, then run:

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=replace_with_a_long_random_secret
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=free_social_network
```

Replace the example JWT secret with a strong, randomly generated value.

**Important:** Make sure the application loads environment variables before reading them. If you use the `dotenv` package, add the following at the beginning of `server.js`:

```javascript
require("dotenv").config();
```

Keep `.env` out of Git. Never publish database credentials or authentication secrets.

### 3. Start MongoDB

Start your local MongoDB service, or configure `MONGODB_URI` to connect to your database.

### 4. Start the application

```bash
npm start
```

Open `http://localhost:3000` in your browser.

### 5. Run the tests

With the application server and database running, open a second terminal and execute:

```bash
npm test
```

The project currently has 16 passing automated tests in the development environment. Test results may vary after further code changes or in a different environment.

## Task and Notes API

The API uses authenticated requests and associates task projects and notes with the logged-in user's database identity.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/notes/list` | List the user's notes |
| POST | `/api/notes/create` | Create a note |
| POST | `/api/notes/update` | Update an owned note |
| POST | `/api/notes/delete` | Delete an owned note |
| POST | `/api/tasks/load` | Load the user's projects and tasks |
| POST | `/api/tasks/save` | Save the user's projects and tasks |

Requests to these endpoints use an `accessToken`. The server verifies the token and checks the stored session before accessing account-specific data.

## Project Structure

```text
Pikadex/
├── public/       # Frontend pages, styles, and client-side scripts
├── tests/        # Automated tests
├── views/        # EJS templates
├── server.js     # Express server and API routes
├── package.json  # Dependencies and npm scripts
└── README.md     # Project documentation
```

The exact contents may differ as the project evolves.

## Security Notes

- Store secrets in environment variables and exclude `.env` from version control.
- Keep dependencies updated and run `npm audit` when reviewing dependency security.
- Validate input on the server and enforce ownership checks on account-specific records.
- Browser-side login redirects are not a substitute for server-side authentication.
- Task data stored in browser local storage may require a safe migration or backup when moving to account-based storage.

## Future Improvements

- Add stronger integration and authorization tests, including account-isolation tests.
- Improve task data validation and error handling.
- Add filters and more detailed productivity reports.
- Improve deployment configuration and production logging.
- Improve accessibility and responsive design.

## Attribution and Licensing

This project is based on the Pikadex repository by [arhammasroor](https://github.com/arhammasroor/Pikadex), with modifications made during development.

Before publicly redistributing or deploying the modified source, verify the original repository's applicable license and attribution requirements. The `license` field in this project's `package.json` should not be treated as proof that every upstream file is available for redistribution.
