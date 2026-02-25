# Shipping Platform Scaffold (Codex Prompts)

This zip contains only the Codex instruction files and env examples.

## Next steps
1) Create an empty repo with this layout:
   - /backend
   - /frontend
2) Ensure Azure Blob containers exist and are configured for PUBLIC access:
   - media
   - exports
3) Configure env:
   - backend: copy backend/.env.example to backend/.env and update values
   - frontend: copy frontend/.env.example to frontend/.env.local and update values
4) Run Codex IDE extension with prompt:
   """ 
   Read AGENTS.md in repo root, backend/AGENTS.md, and frontend/AGENTS.md.
   Generate the complete /backend and /frontend projects accordingly.
   Make sure everything compiles, migrations are included, and both apps can run locally with env config.
   """
