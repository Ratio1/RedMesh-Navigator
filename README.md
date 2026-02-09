# RedMesh Navigator

RedMesh Navigator is the web console for running and observing RedMesh workloads on a Ratio1 Edge Node. It mirrors the operator workflow from [`edge_node` `develop`](https://github.com/Ratio1/edge_node/tree/develop/extensions/business/cybersec/red_mesh) and reuses interaction patterns from [`ratio1-drive`](https://github.com/Ratio1/r1fs-demo).

## User Experience (Operator Journey)
The product is designed as a guided flow from authentication to investigation:

1. **Sign in (`/`)**
   - Operator logs in using the RedMesh/CStore auth path.
   - The login screen immediately shows runtime readiness pills for RedMesh API, CStore API, and optional R1FS API so operators can spot misconfiguration before starting work.

2. **Operations dashboard (`/dashboard`)**
   - Landing page after login.
   - Shows counts for ongoing/completed/stopped tasks, host identity, environment mode (live vs mock), refresh controls, and error indicators.
   - Main list can be filtered to quickly focus on current operations.

3. **Create task (`/dashboard/jobs/new`)**
   - Guided form for target, port range, worker count, feature set, payload URI, and advanced behavior knobs.
   - Payload maps to the RedMesh FastAPI contract, so jobs created here can be replayed against edge runtime services.

4. **Task deep dive (`/dashboard/jobs/:jobId`, alias `/dashboard/tasks/:jobId`)**
   - Single-task forensic view with aggregate findings, discovered ports, worker activity, timeline, per-worker details, and report history.
   - Supports operational actions (refresh, stop job, stop monitoring) and report download for offline review.

5. **Mesh view (`/mesh`)**
   - Geographic map of mesh nodes and peer distribution by country.
   - Helps operators confirm node footprint and data source state (live or mock).

6. **Advanced diagnostics (`/advanced`)**
   - Deployment-focused page for Swagger access, endpoint readiness, chainstore peers, and CStore/R1FS status diagnostics.
   - Primary troubleshooting destination when runtime wiring is incomplete.

## Modes, Auth, and Credentials
- **Mock mode** is enabled automatically when critical live values are missing (RedMesh URL, CStore URL, host ID).
- **Forced mock toggles** default to `true` in current config resolution:
  - `EE_FORCE_MOCK_AUTH` / `FORCE_MOCK_AUTH`
  - `EE_FORCE_MOCK_TASKS` / `FORCE_MOCK_TASKS`
- **Mock credentials** (offline/testing):
  - `admin/admin123`
  - `operator/operator123`
- **Configurable admin credentials in mock auth path**:
  - `ADMIN_USERNAME` (default `admin`)
  - `ADMIN_PASSWORD` (default `admin123`)
- **Local RedMesh admin password path**:
  - If `REDMESH_PASSWORD` is set and auth is not forced to mock, `admin/{REDMESH_PASSWORD}` is accepted.

## Getting Started
1. Install dependencies:
   - `npm install`
2. Create `.env.local`.
3. Choose one mode:
   - **Fast local/mock**: keep env vars empty and run with seeded data.
   - **Live integration**: set at least:
     - `R1EN_HOST_IP`
     - `API_PORT`
     - `EE_CHAINSTORE_API_URL`
     - `EE_HOST_ID`
     - `EE_FORCE_MOCK_AUTH=false`
     - `EE_FORCE_MOCK_TASKS=false`
4. Optional env vars:
   - `EE_R1FS_API_URL`
   - `R1EN_CHAINSTORE_PEERS` (also supports `EE_CHAINSTORE_PEERS` or `CHAINSTORE_PEERS`)
   - `REDMESH_PASSWORD`
5. Run:
   - `npm run dev`
6. Open:
   - `http://localhost:3000`

## Scripts
- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - serve production build
- `npm run lint` - lint checks
- `npm run typecheck` - TypeScript checks
- `npm test` - Jest suite
- `npm run test:watch` - Jest in watch mode

## Testing
Tests live in `__tests__/` and run against mock-backed APIs by default. For each feature, add both happy-path and failure-path coverage. Extend `lib/api/mockData.ts` when introducing new runtime scenarios so offline behavior stays close to RedMesh FastAPI responses.

## Project Layout
- `app/` - routes, layouts, providers, and API handlers
- `components/` - UI primitives, dashboard modules, auth and layout building blocks
- `lib/api/` - service clients, API typing, mock data, and adapters
- `lib/domain/` - shared domain metadata (feature catalog, schemas)
- `lib/config/` - runtime env/config resolution
- `lib/hooks/` - client data hooks
- `__tests__/` - API and UI test coverage

## Deployment Notes
- Worker App Runner deployments must provide live env vars and disable forced mock toggles.
- Never ship with `mockMode` active unintentionally.
- Keep secrets in `lib/config/env.ts` access paths; avoid reading `process.env` in UI components.
- Keep the `/advanced` Swagger experience aligned with the live RedMesh FastAPI service from Edge Node runtime.

## Related Projects
- RedMesh API framework: https://github.com/Ratio1/edge_node/tree/develop/extensions/business/cybersec/red_mesh
- Ratio1 Drive UI reference: https://github.com/Ratio1/r1fs-demo
- Ratio1 Edge SDK: https://github.com/Ratio1/edge-sdk-ts
