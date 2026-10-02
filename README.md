# ExamPrep Pro — Deployment Ready

A mobile-first PWA + Node.js backend for course/semester/subject exam preparation. Admins can upload PDFs from Android/iPhone; students can open/download them.

## Recommended deployment: Render
1. Create a GitHub repository and upload this folder.
2. In Render, choose **New > Blueprint** and select the repository. Render reads `render.yaml`.
3. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `STUDENT_PASSWORD` in the Render dashboard.
4. Deploy. The service exposes `/api/health` and the app at the Render URL.
5. Open the URL on Android Chrome > menu > **Add to Home screen / Install app**.

### Important storage note
The app stores the JSON database and uploaded PDFs under `DATA_DIR`. The included Render blueprint mounts a persistent disk at `/var/data`, so uploaded PDFs survive normal redeploys/restarts. Do not remove the disk if you need uploaded content preserved.

## Local Docker
```bash
docker build -t examprep-pro .
docker run -p 3000:3000 \
  -e JWT_SECRET='use-a-long-random-secret-here' \
  -e ADMIN_USERNAME='admin' \
  -e ADMIN_PASSWORD='change-this-password' \
  -e STUDENT_PASSWORD='student123' \
  -e DATA_DIR='/var/data' \
  -v examprep_data:/var/data \
  examprep-pro
```
Open `http://localhost:3000`.

## API
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/courses`
- `GET /api/semesters?courseId=c1`
- `GET /api/subjects?courseId=c1&semesterId=c1-s1`
- `GET /api/materials?subjectId=sub1&type=notes`
- `POST /api/admin/materials` multipart/form-data (`file`, `title`, `description`, `courseId`, `semesterId`, `subjectId`, `type`)
- `DELETE /api/admin/materials/:id`
- `POST /api/admin/subjects`
- `GET /api/admin/stats`

## Default/demo accounts
The admin password is intentionally **not hard-coded** in production. Set `ADMIN_PASSWORD` before first startup. If the data file already exists, changing the environment variable does not automatically change the existing admin password.

## Production checklist
- Use a strong unique `ADMIN_PASSWORD`.
- Keep the generated `JWT_SECRET` private.
- Keep the persistent disk enabled.
- Back up `/var/data` regularly.
- For large-scale use, migrate the JSON database to PostgreSQL and PDFs to object storage (S3/R2/Supabase Storage).
