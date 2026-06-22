# Project Time Tracker

Project Time Tracker is a simple web application to manage and track project times, developed by **Thomas Vannier**.  
It allows you to:
- Add, edit, and delete projects
- Track active and finished projects
- Assign researchers and engineers
- Record time automatically with a timer or manually
- Visualize project distribution with charts
- Save and persist your work on the server

The app runs inside a **Docker container** with a **Node.js/Express backend** that stores data in a `projects.json` file.  
It is served behind a **Caddy reverse proxy**.

---

## Features

- **Dynamic front-end** (HTML + JavaScript + Chart.js)
- **Backend API** to persist data (`/api/projects`)
- **Projects stored in JSON** for simplicity
- **Dockerized deployment** (easy to run anywhere)
- **Reverse proxy compatible** (tested with Caddy)

---

## Getting Started

### Requirements
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Password Configuration

The app requires a password to be set before running. A template file named `password.setup.env` is provided in the repository.

**Steps:**

1. Rename `password.setup.env` to `password.env`:

```bash
mv password.setup.env password.env
```

2. Open `password.env` and set your password and session secret:

```env
PASSWORD=your_password
SESSION_SECRET=put_a_long_random_string_here_min_32_chars
```

> **Warning:** The `password.env` file is not tracked by Git (it is listed in `.gitignore`). Never commit it to the repository.

### Build and Run
Clone the repository and run:

```bash
docker-compose build
docker-compose up -d
```

The app will be available at:

```arduino
http://localhost:4020
```

(or your reverse proxy domain if configured with Caddy).

## API Endpoints

```bash
GET /api/projects
```

Returns all stored projects as JSON.

```bash
POST /api/projects
```

Saves the given projects array to projects.json.

Request body example:

```json
[
  {
    "id": 1,
    "title": "Example Project",
    "researchers": ["Alice"],
    "engineers": ["Thomas Vannier"],
    "institute": "IBDM",
    "submissionDate": "2025-09-22",
    "startDate": "2025-09-22",
    "endDate": "",
    "totalHours": "02:30:00",
    "lastUpdate": "2025-09-22",
    "category": "Bioinformatics",
    "status": "active"
  }
]
```

## Project Structure

```pgsql
.
├── Dockerfile         # Node.js + Express server
├── docker-compose.yml # Deployment configuration
├── server.js          # Backend server logic
├── index.html         # Front-end (HTML + JS)
├── projects.json      # Data persistence file
└── README.md          # Project documentation
```

## Author

Developed by Thomas Vannier.
