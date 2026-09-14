# AGENTS.md

## Project Overview

Browser-based S3-compatible file manager (Next.js 16 App Router, React 19, Tailwind CSS v4). Connects to S3-compatible storage (AWS S3, NEO Object Storage, MinIO, DigitalOcean Spaces).

## Package Manager

- **pnpm** (uses `pnpm-lock.yaml`, not npm/yarn)
- Dev: `pnpm dev` | Build: `pnpm build` | Lint: `pnpm lint` | Start: `pnpm start`

## Key Architecture Facts

- **Public URL base**: `https://nos.jkt-1.neo.id/{bucket}/{encoded-key}` — defined in `components/s3-manager.tsx:getPublicUrl()`
- **All object URLs are permanent public URLs** (no presigned URL fetching in frontend). Uploads use `ACL: 'public-read'` (`app/api/s3/objects/route.ts:196`).
- **Presigned URL API routes still exist** (`app/api/s3/presigned-url/route.ts`, `PATCH /api/s3/objects`) but are not called by the frontend. Preserve them for potential private object access.
- Credentials are passed via API routes (`/api/s3/*`) — never stored in frontend code or Git. Stored in `localStorage` only (`lib/s3-storage.ts`).
- **SSH key issue**: Repo config has `sshCommand = ssh -i ~/.ssh/id_okta2510` but that key doesn't exist. Use `~/.ssh/DG` for GitHub push access (verified).

## User Requirement: Public URL Copying

The UI must always expose the permanent public URL for copy operations. Both `previewUrl` and `imgUrl` on `S3Object` must contain the permanent public URL (not a presigned URL). The asset table has "Copy URL" buttons that use `obj.imgUrl \|\| obj.previewUrl` — ensure these are always the public URL.

## Repo Conventions (from README)

- **Branch naming**: `<tipe>/<deskripsi>` (Indonesian) — e.g., `feature/add-preview-image`
- **Commit format**: `<type>(<scope>): <subject>` — types: `feat, fix, chore, docs, style, refactor, test, perf`

## TypeScript Notes

- Pre-existing TS errors in `components/ui/calendar.tsx` and `tailwind.config.ts` (not related to S3 logic). `npx tsc --noEmit` will report these.
- `S3Object` type in `lib/types.ts` has both `previewUrl` and `imgUrl` as optional fields. Both should be set to the public URL.

## File Locations of Note

| Purpose | Path |
|---------|------|
| S3 client/credentials helpers | `lib/s3-storage.ts`, `lib/types.ts`, `lib/upload-rules.ts` |
| Main component | `components/s3-manager.tsx` |
| Asset table (URL display, copy, preview) | `components/asset-table.tsx` |
| Upload with ACL | `app/api/s3/objects/route.ts` |
| Presigned URL API (kept for compatibility) | `app/api/s3/presigned-url/route.ts` |
| Object list/download/rename | `app/api/s3/objects/route.ts` |
| Public URL generator | `components/s3-manager.tsx:getPublicUrl()` |
