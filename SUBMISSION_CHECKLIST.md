# Submission Checklist: Gokul Infocare, Task 1

Deliverables: **A.** video presentation (2 minutes or longer), **B.** prompt documentation, **C.** accessible project link.

Status as of 2026-10-25. Items marked ✅ were verified in the Claude Code sessions. Everything else needs your action.

## Build and verification

- [x] Project runs locally. ✅ Landing page, `/admin` and all API routes checked on a production build, including a real-browser check at mobile and desktop sizes.
- [x] Gemini integration tested successfully with a real API key. ✅ Chat → troubleshooting → escalate → email worked live with `gemini-3.5-flash-lite` (PROMPT_DOCUMENTATION.md, section 6.1).
- [ ] Five `/admin` dashboard example tickets and the injection tests run live and recorded (PROMPT_DOCUMENTATION.md, section 5 table).
- [x] Input validation verified. ✅ Automated tests and live requests.
- [x] Error handling verified. ✅ Automated tests, plus live: missing key → 503, model timeouts → 504.
- [x] Automated checks executed and results recorded. ✅ `npm test`: 144/144 passed. `npx tsc --noEmit`: no errors. `npm run lint`: no problems. `npm run build`: success.
- [ ] Prompt documentation reviewed. Fill in section 3.1 and attach the full master prompt.
- [ ] README reviewed.
- [ ] Set `ADMIN_ACCESS_CODE` and `ADMIN_SESSION_SECRET` in `.env.local` (needed for the dashboard).
- [ ] Resolution email verified with real SMTP settings (fill in `SMTP_USER` and `SMTP_PASS`, resolve a ticket with your own email address).
- [x] Admin lock verified in a browser (direct /admin, forged cookie, sign out → redirect; wrong code rejected).
- [x] Ticket flow verified live. ✅ Chat → ticket → admin resolves → customer sees resolution (PROMPT_DOCUMENTATION.md, section 6.1).
- [x] API key excluded from Git. ✅ `.gitignore` ignores `.env*` except `.env.example`. Before pushing, confirm `git status` does not list `.env.local`.

## Publishing

- [ ] Code committed.
- [ ] GitHub repository created and accessible (public, or shared with the reviewers).
- [ ] Deployment tested, if deployed (Vercel: add `GEMINI_API_KEY`, `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`. Tickets need a hosted database there; see the README).
- [ ] Two-minute or longer presentation recorded (script: `VIDEO_PRESENTATION_SCRIPT.md`).
- [ ] Final submission links checked in a private/incognito browser window.

## Links to submit

| Deliverable | Link |
| --- | --- |
| A. Video | *pending* |
| B. Prompt documentation | `PROMPT_DOCUMENTATION.md` in the repository |
| C. Project | GitHub: *pending* · Live site: *pending (optional)* |
