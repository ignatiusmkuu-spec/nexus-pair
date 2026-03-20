# Nexus Pair

## Project Overview
A React + Vite web application scaffolded from a blank GitHub import.

## Architecture
- **Frontend**: React 18 with Vite build tool
- **Language**: JavaScript (JSX)
- **Styling**: Plain CSS

## Project Structure
```
nexus-pair/
├── src/
│   ├── main.jsx       # App entry point
│   ├── App.jsx        # Root component
│   ├── App.css        # Component styles
│   └── index.css      # Global styles
├── index.html         # HTML template
├── vite.config.js     # Vite configuration (host 0.0.0.0, port 5000)
└── package.json       # Dependencies and scripts
```

## Development
- Run `npm run dev` to start the dev server on port 5000
- The workflow "Start application" handles this automatically

## Deployment
- Configured as a static site deployment
- Build command: `npm run build`
- Public directory: `dist`
