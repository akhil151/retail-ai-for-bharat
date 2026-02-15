## Packages
recharts | For dashboard analytics charts
framer-motion | For smooth page transitions and UI animations
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes efficiently

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  sans: ["var(--font-sans)"],
}

Auth:
- Use /api/login for authentication (Replit Auth)
- Use useAuth hook for checking state

Uploads:
- POST /api/uploads expects multipart/form-data
- File input should accept .csv files
