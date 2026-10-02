# ExamPrep Pro — Deployment Ready

A mobile-first PWA + Node.js backend for college exam preparation. Students can log in and access course/semester/subject materials. Admins can upload PDFs directly from Android/iPhone and manage materials.

## Included
- Mobile PWA (Add to Home Screen / Install app)
- Student login
- Admin login
- Course → Semester → Subject
- Previous Questions / Sure-Shot Notes / Exam Videos tabs
- PDF upload from phone
- PDF view/download
- Add subjects
- Delete materials
- Persistent data and uploads when deployed with a persistent disk/volume
- Docker and Render deployment configuration
- Health endpoint: `/api/health`

## Deploy on Render
1. Create a GitHub repository and upload the contents of this `app` folder.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Render will read `render.yaml` and build the Docker service.
4. Set `ADMIN_PASSWORD` to a strong password (8+ chars) and optionally set `STUDENT_PASSWORD`.
5. Deploy. Open the HTTPS URL on Android Chrome.
6. Chrome → menu → **Install app** / **Add to Home screen**.

A persistent disk is configured because uploaded PDFs must survive redeploys. The Render service in `render.yaml` uses a paid persistent disk plan; change hosting/plan if you prefer another provider.

## Deploy on any VPS with Docker
1. Copy this folder to the server.
2. Create `.env` from `.env.example` and set strong secrets.
3. Run `docker compose up -d --build`.
4. Put HTTPS in front using Caddy/Nginx or your cloud provider's TLS.
5. Open the HTTPS URL on the phone and install the PWA.

## Security before production
- Change the admin password immediately.
- Keep `JWT_SECRET` private and random.
- Use HTTPS.
- Back up `/data` regularly.
- Do not commit `.env` or uploaded PDFs to GitHub.
- For a large college deployment, migrate content storage to object storage and user/content data to PostgreSQL.

## Demo/student account
The default student account is `student`; its password is controlled by `STUDENT_PASSWORD` and defaults to `student123` if not overridden. Change it for real use.
