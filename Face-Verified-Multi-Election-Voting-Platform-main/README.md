# Face Based Voting System

This project is a full-stack face based voting system.

Features:
- Register voter face embeddings
- Verify voter identity by face before vote casting
- Admin-managed candidate nomination and election controls (start, pause, end)
- Cast exactly one vote per verified voter
- View voting logs and final voting results

## Project Structure

- `backend/` Node.js + Express + MongoDB API
- `frontend/` React app for voter registration, verification, vote casting, and results

## Backend Setup

1. Open terminal in `backend`
2. Install dependencies:

```bash
npm install
```

3. Configure `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/face_voting
JWT_SECRET=supersecretkey
ADMIN_EMAIL=admin@campus.local
ADMIN_PASSWORD=Admin@123
```

4. Start backend:

```bash
npm start
```

## Frontend Setup

1. Open terminal in `frontend`
2. Install dependencies:

```bash
npm install
```

3. Configure `frontend/.env`:

```env
REACT_APP_API_BASE_URL=http://localhost:5000
```

4. Start frontend:

```bash
npm start
```

## API Endpoints

Public/Voter:
- `POST /api/voting/register-face`
- `POST /api/voting/verify-face`
- `GET /api/voting/candidates`
- `POST /api/voting/cast-vote`
- `GET /api/voting/records`
- `GET /api/voting/results`
- `GET /api/election/status`

Admin (Bearer token required):
- `POST /api/admin/login`
- `GET /api/admin/overview`
- `PUT /api/admin/election/status`
- `GET /api/admin/candidates`
- `POST /api/admin/candidates`
- `DELETE /api/admin/candidates/:id`
