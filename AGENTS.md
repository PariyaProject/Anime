# Repository Notes

This project no longer uses OpenSpec.

Before making changes, read [docs/project-overview.md](/Users/wuzhao/Program/Github/Anime/docs/project-overview.md).

Key guidance for future assistants:

- Treat this repository as a root workspace with `backend/` and `frontend/` as the active app directories.
- Prefer the current code structure over legacy docs that still mention `cycani-proxy/`.
- Use Node `24.14.0` from [`.nvmrc`](/Users/wuzhao/Program/Github/Anime/.nvmrc).
- Watch history and anime index are persisted in `config/`, not in a database.
- The project is still in a migration state, so verify old fallback paths like `public/` and legacy placeholder assets before relying on them.
