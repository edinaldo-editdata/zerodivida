# ZeroDivida Project Context

## Project Overview

**ZeroDivida** is a personal finance management application built on the Base44 platform. It helps users track and manage debts, income, and payments with real-time synchronization via Firebase Firestore.

### Tech Stack
- **Frontend**: React 18 + Vite 6
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Query (@tanstack/react-query)
- **Backend**: Firebase Firestore (via Base44 SDK mock)
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Forms**: react-hook-form + zod validation
- **Language**: Portuguese (pt-BR)

### Architecture
- **Pages**: Auto-registered via `src/pages.config.js` (Dashboard, Debts, Incomes, Reports)
- **Components**: Feature blocks in `src/components/` with reusable primitives in `src/components/ui/`
- **Hooks**: Custom hooks in `src/hooks/` (e.g., `useFirebaseRealtime`)
- **Lib**: Cross-cutting utilities in `src/lib/` (AuthContext, Firebase config, navigation tracking)
- **API**: Base44 client in `src/api/base44Client.js` with Firebase-backed mock SDK
- **Entities**: Firestore collections defined in `entities/` (Debt, Income, Payment, CreditCard)

### Visual Design
- Dark theme with `#0B0F19` background
- Emerald green highlights (`text-emerald-400`, `bg-emerald-600`)
- Glassmorphism effects with backdrop blur
- Subtle animations using Framer Motion (duration < 400ms)

## Building and Running

### Prerequisites
- Node.js 18.18+ (verify: `node -v`)
- npm (verify: `npm -v`)

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill Firebase credentials
cp .env.example .env
# Edit .env with your VITE_FIREBASE_* values from Firebase Console

# 3. Start development server
npm run dev
```

The app runs on http://localhost:5173 by default with hot module reload.

### Core Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build (outputs `dist/`) |
| `npm run preview` | Preview built bundle |
| `npm run lint` | Lint JS/JSX (quiet mode) |
| `npm run lint:fix` | Autofix lint issues |
| `npm run typecheck` | Static type check with TypeScript |

### Environment Variables
Required variables in `.env` (copy from `.env.example`):
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Without Firebase credentials, the app uses mocked data but realtime sync will log warnings.

## Development Conventions

### Code Style
- **Indentation**: 2 spaces
- **Strings**: Double quotes
- **Semicolons**: Required at end of statements
- **Trailing commas**: In objects/arrays where valid
- **Template literals**: For class concatenation
- **Naming**: 
  - Components: `PascalCase` (e.g., `DebtCard`)
  - Functions/variables: `camelCase`
  - Config constants: `SCREAMING_SNAKE_CASE` (e.g., `STATUS_CONFIG`)

### Import Order
1. External packages
2. Alias-based imports (`@/`)
3. Relative paths

Group icon imports from `lucide-react` into a single destructuring line.

### Component Structure
```jsx
function ComponentName(props) {
  // 1. State hooks at top
  // 2. React Query hooks (useQuery, useMutation)
  // 3. Effect hooks
  // 4. Event handlers
  // 5. Render
}

export default ComponentName;
```

### Key Patterns
- **React Query**: Use array query keys (`["debts"]`) and invalidate with partial matching
- **Realtime**: Use `useFirebaseRealtime(entityName, queryKey, orderByField)` for Firestore subscriptions
- **Mutations**: Close dialogs/reset UI only after `onSuccess` for predictable UX
- **Error Handling**: Wrap `base44` CRUD calls in try/catch; report via console.error + toasts
- **Forms**: Use react-hook-form with zod resolvers; surface errors inline + toasts

### Styling Guidelines
- Use Tailwind utility classes exclusively
- Extend theme tokens in `tailwind.config.js` before adding hex values
- Prefer shadcn/ui primitives (`<Button>`, `<Dialog>`, `<Badge>`) over raw HTML
- Chain utilities with gradients, opacity, and `group-hover` states for neon-dark aesthetic

### Accessibility
- Maintain keyboard support for all interactive elements
- Provide aria-labels for icon-only buttons
- Ensure text contrast meets WCAG AA on dark background
- Wrap Framer Motion animations with `prefers-reduced-motion` checks

## Project Topology

```
zerodivida/
├── entities/              # Firestore collection schemas (Debt, Income, Payment)
├── src/
│   ├── api/
│   │   └── base44Client.js    # Base44 client with Firebase mock
│   ├── components/
│   │   ├── dashboard/         # Dashboard feature components
│   │   ├── debts/             # Debt management components
│   │   ├── income/            # Income tracking components
│   │   ├── reports/           # Report visualization components
│   │   ├── ui/                # shadcn/ui primitives (lint-ignored)
│   │   └── UserNotRegisteredError.jsx
│   ├── hooks/
│   │   └── useFirebaseRealtime.js  # Realtime Firestore subscription hook
│   ├── lib/
│   │   ├── AuthContext.jsx    # Auth state provider
│   │   ├── NavigationTracker.jsx  # Analytics logging
│   │   ├── firebase.js        # Firebase initialization
│   │   ├── query-client.js    # React Query client
│   │   └── app-params.js      # App configuration
│   ├── mocks/
│   │   └── firebase-sdk.js    # Firebase-backed Base44 SDK mock
│   ├── pages/
│   │   ├── Dashboard.jsx      # Main landing page
│   │   ├── Debts.jsx          # Debt management page
│   │   ├── Incomes.jsx        # Income tracking page
│   │   └── Reports.jsx        # Reports visualization page
│   ├── utils/
│   │   └── index.ts           # URL helpers (createPageUrl)
│   ├── App.jsx                # Root component with routing
│   ├── Layout.jsx             # Shared layout chrome
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles
│   └── pages.config.js        # Auto-generated page routing
├── .env.example               # Environment template
├── package.json               # Dependencies
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind theme
├── jsconfig.json              # TypeScript/JS config
└── AGENTS.md                  # Detailed agent handbook
```

## Entity Reference

| Entity | Firestore Collection | Description |
|--------|---------------------|-------------|
| Debt | `Debt` | User debts with creditor, amount, status, installments |
| Income | `Income` | User income records |
| Payment | `Payment` | Payment records linked to debts |
| CreditCard | `CreditCard` | Credit card information |

## Common Workflows

### Adding a New Entity
1. Define collection in Firebase Console
2. Register entity in `src/mocks/firebase-sdk.js` `createClient()` function
3. Use `base44.entities.NewEntity` CRUD methods (list/create/update/delete/get)

### Creating a New Page
1. Create `src/pages/PageName.jsx` with default export
2. Page auto-registers in `pages.config.js` (regenerated by Base44)
3. Update `mainPage` in `pages.config.js` if changing landing page

### Adding UI Components
1. For feature-specific: place in `src/components/{feature}/`
2. For shared primitives: add to `src/components/ui/` using shadcn patterns
3. Use existing primitives before creating new ones

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Realtime not updating | Verify Firebase credentials; ensure entity names match Firestore collections |
| Auth stuck on spinner | Clear `localStorage` or append `?clear_access_token=true` to URL |
| Lint errors in ui/ | Files in `components/ui/` are ignored; move code out to pass lint |
| Imports unresolved | Run `npm install`; verify `@` alias in `vite.config.js` |

## Manual Testing Checklist

1. `npm run dev` → Load `/` → Dashboard renders (cards, charts, realtime)
2. Navigate to `/Debts` → Create/edit debt → Add payment → Verify status updates
3. Visit `/Incomes` and `/Reports` → Confirm routing and layout intact
4. Toggle mobile menu → Verify nav links close drawer
5. Clear `localStorage` → Reload → Verify auth fallback UI
6. `npm run build` + `npm run preview` → Production bundle starts without errors

## Related Documentation

- **AGENTS.md**: Comprehensive agent handbook with detailed rules and patterns
- **INSTRUCOES_BASE44_LOCAL.md**: Guide for running Base44 projects locally
- **README.md**: Basic project welcome information
