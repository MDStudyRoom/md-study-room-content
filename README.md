# MD Study Room — Central Content Repository (`md-study-room-content`)

This repository serves as the central content distribution repository for **MD Study Room**. It provides cryptographically verified, schema-validated study materials (chapters, MCQ master banks, past papers, syllabus revisions, and errata) to MD Study Room client applications.

- **GitHub Repository**: `https://github.com/MDStudyRoom/md-study-room-content` *(Repository created; files pending first upload)*
- **Planned Raw Manifest URL**: `https://raw.githubusercontent.com/MDStudyRoom/md-study-room-content/main/manifest.json` *(Pending publication — becomes active once pushed to `main` branch)*

---

## 1. Directory Structure

```text
md-study-room-content/
├── manifest.json                               # Primary update manifest consumed by client applications
├── README.md                                   # Repository architecture and publication guide
├── schemas/
│   ├── manifest.schema.json                    # JSON Schema specification for manifest.json
│   └── content-package.schema.json             # JSON Schema specification for content packages
├── content/
│   ├── past-papers/                            # Authentic past examination question packages
│   │   └── biopharm-pastpaper-ch1-definitions.json # Real sample: Punjab University Biopharmaceutics Ch 1 (2015–2025)
│   ├── chapters/                               # Syllabus notes and course chapters
│   └── mcqs/                                   # Verified MCQ master question banks
└── scripts/
    └── verify-manifest.cjs                     # Pre-publication cryptographic & schema integrity verifier
```

---

## 2. Manifest Schema & Protocol

The client application inspects `manifest.json` via `src/utils/updateManager.ts`. Any published manifest must strictly satisfy the following criteria:

| Field | Type | Description | Example / Required Value |
|---|---|---|---|
| `manifestSchemaVersion` | `integer` | Schema specification version | `1` |
| `appId` | `string` | Applet identifier | `"md-study-room"` |
| `publishedAt` | `string (ISO 8601)` | Timestamp of manifest release | `"2026-10-20T10:00:00.000Z"` |
| `minAppVersion` | `string (semver)` | Minimum compatible app version | `"1.9.0"` |
| `latestAppVersion` | `string (semver)` | Current latest app version | `"1.9.0"` |
| `releaseNotes` | `string` | Summary of content updates | `"Authentic Biopharmaceutics past-paper question package."` |
| `appDownloadUrl` | `string (URI)` | Optional link to app updates | *(Optional; omitted until a verified standalone release tag exists)* |
| `items` | `Array<ContentUpdateItem>` | Non-empty list of update items | Array of packages |

### Content Update Item Specification

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Unique, permanent kebab-case ID (e.g. `biopharm-pastpaper-ch1-definitions`). |
| `type` | `string` | Allowed: `chapter`, `mcq-bank`, `past-paper`, `syllabus-revision`, `errata`. |
| `subjectId` | `string` | Canonical course ID: `biopharm`, `clinical`, `industrial`, `quality`, `hospital`. |
| `contentVersion` | `integer` | Monotonically increasing version integer (`1`, `2`, `3`...). |
| `title` | `string` | Human-readable title displayed in the app UI. |
| `changeLog` | `string` | Clear description of newly added or corrected content. |
| `fileUrl` | `string (HTTP/HTTPS)` | Accessible direct download link: `https://raw.githubusercontent.com/MDStudyRoom/md-study-room-content/main/content/...` *(Pending publication)*. |
| `fileSizeBytes` | `integer (> 0)` | **Exact** binary byte length of the file on disk. |
| `sha256` | `string (64 hex)` | **Authentic lower-case SHA-256 hash** calculated from the exact file bytes. |
| `isMandatory` | `boolean` | `true` if mandatory for syllabus alignment, otherwise `false`. |

---

## 3. Stable ID & Educational Integrity Strategy

To safeguard student study histories and quiz analytics:

1. **Permanent Item & Question IDs**:
   - Every package has a permanent ID: `{subjectId}-{contentType}-{descriptor}`.
   - Every question inside a package has a stable author-defined ID: `{subjectId}-ch{chapterIndex}-q{questionNum}` (e.g. `biopharm-ch1-q1`).
2. **Preserving MCQ Quiz Histories**:
   - The client application tracks student attempts and correct/incorrect status by question ID.
   - **Typographical corrections**: If a typo is corrected in a question stem, the ID (`biopharm-ch1-q1`) is **retained**, preserving the student's historical response.
   - **Substantive changes / complete question replacement**: If a question is fundamentally replaced or the correct key changes due to revised syllabus consensus, the revised question is issued under a versioned identifier (e.g. `biopharm-ch1-q1-v2`) with an accompanying errata log entry. This ensures existing student quiz scorecards are never silently altered or misrepresented.
3. **No Fabricated Content Policy**:
   - Examination questions, session badges (`A/2015`, `2nd A/2024`), and marks must originate from authentic verified university examinations (e.g. University of the Punjab / Pharmacy Council curriculum).
   - Speculative answers or unverified claims must never be labeled as official exam solutions.

---

## 4. Pre-Publication Verification Workflow

Before committing any update to this content repository:

1. Place the content JSON file in the appropriate directory (`content/past-papers/`, `content/chapters/`, or `content/mcqs/`).
2. Run the repository verifier to calculate the exact byte size and SHA-256 hash:
   ```bash
   node scripts/verify-manifest.cjs
   ```
3. Update `manifest.json` with the exact computed values.
4. Re-run `node scripts/verify-manifest.cjs` until all tests report `[PASS]` with `0` errors.

---

## 5. Sample Content Package: `biopharm-pastpaper-ch1-definitions.json`

The sample package included in `content/past-papers/biopharm-pastpaper-ch1-definitions.json` represents:
- **Subject**: Pharmaceutics IV (Biopharmaceutics & Pharmacokinetics)
- **Topic**: Chapter 1 — Definitions & Terminologies
- **Curriculum Source**: University of the Punjab Pharm-D Examinations (2015–2025)
- **Question Count**: 13 authentic past questions
- **Byte Size**: `7037` bytes
- **SHA-256 Checksum**: `e0b4dd9c7315ccc0bd8001957b2655cc39b046bd81a1e724828cfab7b5fa4201`
- **Canonical Raw URL**: `https://raw.githubusercontent.com/MDStudyRoom/md-study-room-content/main/content/past-papers/biopharm-pastpaper-ch1-definitions.json` *(Pending publication — becomes active once pushed to GitHub `main` branch)*

---

## 6. Central Content Integration Plan for MD Study Room Client

When MD Study Room client implements Phase 2B / Phase 3 ingestion:

1. **Non-Destructive Storage**:
   - The bundled base content (`public/conversations.json`) is never modified or overwritten.
   - Downloaded and verified packages are staged in volatile memory, validated for schema compliance, and then persisted in IndexedDB under a dedicated object store (`downloaded_content_packages`).
2. **Virtual Merge Layer**:
   - The app's `chapterRegistry.ts` and `parser.ts` combine bundled chapters with active downloaded packages dynamically in memory.
   - If an update fails or is corrupted, the client rolls back to the bundled baseline without data loss.
3. **Progress & Profile Safety**:
   - User bookmarks, highlights, notes, and profile backup JSON remain completely decoupled from content updates.
