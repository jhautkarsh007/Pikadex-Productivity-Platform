# Pikadex — Productivity & Collaboration Platform

A full-stack productivity application featuring project and task management, time tracking, productivity analytics, personal notes, user authentication, and real-time chat.

**Live Demo:** https://pikadex-productivity-platform.onrender.com  
**GitHub Repository:** https://github.com/jhautkarsh007/Pikadex-Productivity-Platform

## Features

- **Authentication:** User registration, login, JWT-based authentication, and session revocation.
- **Project & Task Management:** Organize tasks by project, update task status, and track time using task timers.
- **Productivity Analytics:** Visualize project progress, task completion rates, total tracked time, and recent activity.
- **Personal Notes:** Create, view, update, and delete notes stored in MongoDB.
- **Real-Time Chat:** Exchange messages between connected users using Socket.IO.
- **Account Data Isolation:** Associate notes and task projects with the authenticated user's database identity.
- **Automated Testing:** HTTP smoke tests and checks for missing or invalid authentication.

## Tech Stack

| Category | Technologies |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, MongoDB Node.js Driver |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| Real-Time Communication | Socket.IO |
| Frontend | HTML, CSS, JavaScript, Bootstrap |
| Templates | EJS |
| Testing | Node.js built-in test runner |
| Deployment | Render |

## Getting Started

### Prerequisites

- Node.js and npm
- A MongoDB database, such as MongoDB Atlas
- Git

### 1. Clone the repository

```bash
git clone https://github.com/jhautkarsh007/Pikadex-Productivity-Platform.git
cd Pikadex-Productivity-Platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. Use `.env.example` as a template.

```dotenv
PORT=3000
APP_URL=http://localhost:3000
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
MONGODB_DB=free_social_network
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET
```

Replace the placeholder values with your own configuration. Your MongoDB connection string must point to a database that your application is authorized to access.

Keep `.env` private. Never commit database credentials or real authentication secrets to GitHub.

### 4. Start the application

Make sure your MongoDB instance is running and your network access is configured correctly.

```bash
npm start
```

Open http://localhost:3000 in your browser.

### 5. Run the tests

With the application server and required database available, open another terminal:

```bash
npm test
```

Sixteen automated tests passed during development verification. Run the tests again after making changes to verify the current result.

## API Endpoints

### Notes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/notes/list` | List the authenticated user's notes |
| POST | `/api/notes/create` | Create a note |
| POST | `/api/notes/update` | Update an owned note |
| POST | `/api/notes/delete` | Delete an owned note |

### Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tasks/load` | Load the authenticated user's projects |
| POST | `/api/tasks/save` | Save the authenticated user's projects |

These endpoints require a valid access token. The server verifies the session and associates stored data with the corresponding user.

## Project Structure

```text
Pikadex-Productivity-Platform/
├── public/       # Frontend pages, CSS, and client-side JavaScript
├── tests/        # Automated tests
├── views/        # EJS templates
├── utils/        # Supporting utilities
├── server.js     # Express server, APIs, and Socket.IO
├── package.json  # Dependencies and scripts
├── package-lock.json
├── .env.example  # Environment variable template
└── README.md
```

## Security Considerations

- Keep production credentials in environment variables.
- Enforce authentication and ownership checks on private data.
- Never commit `.env` or production secrets.
- Keep dependencies updated and review security advisories.
- Browser-side redirects alone are not a security boundary; sensitive operations must be validated by the server.

## Future Improvements

- Add broader automated integration and authorization tests.
- Improve API validation and production error handling.
- Expand productivity reports and date-based analytics.
- Improve deployment monitoring and accessibility.

## Attribution

This project builds on the original Pikadex project by [arhammasroor](https://github.com/arhammasroor/Pikadex). The original author has agreed to publication of this modified version.

The license for the upstream source and modifications should be documented in accordance with the agreement with the original author. Do not assume that package metadata alone establishes the license for every source file.
