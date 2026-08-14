# Web Context

Global React context providers for the dashboard.

- `AuthContext.jsx`: stores token/user, validates `/auth/me`, login, register, logout
- `ThemeContext.jsx`: light/dark theme state

The auth context is the bridge between browser session state and backend JWT validation.

