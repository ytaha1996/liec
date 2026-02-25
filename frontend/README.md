# Frontend (React + TypeScript + MUI)

## Run
1. Configure `VITE_API_URL` in `.env` (optional, defaults to `http://localhost:5000`).
2. Install deps: `npm install`
3. Start: `npm run dev`
4. Build: `npm run build`

## Notes
- Uses reusable form fields, modal/dialog components, info/status components, and shared form-controller hook.
- Gate error UX handles `PHOTO_GATE_FAILED` 409 responses and shows missing package rows with quick links.
- Media images render directly from backend `publicUrl`.
