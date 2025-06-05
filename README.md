# KUBAD

**Kurrent UI But Actually Decent**

A modern web interface for EventStore (Kurrent) with a clean, responsive design built with React, TypeScript, and Tailwind CSS. It's actually decent compared to the official UI.

## Features

- **Multi-Server Management**: Configure and switch between multiple EventStore instances
- **Authentication**: Secure login system using EventStore credentials
- **Aggregates Browser**: Navigate by aggregate type with GUID search and keyboard shortcuts
- **Streams Management**: Browse, search, and view event streams with real-time updates
- **Event Viewer**: Detailed view of events with expandable JSON data and JSONPath filtering
- **Persistent Subscriptions**: Monitor and manage persistent subscriptions
- **Projections**: View, control, and edit projections
- **Statistics Dashboard**: Real-time monitoring of system performance
- **Command Palette**: Quick navigation with Ctrl+K
- **Modern UI**: Clean interface with dark mode support and glassmorphism design
- **Keyboard Navigation**: Full keyboard support throughout the interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- EventStore instance(s) running

### Installation

1. Clone the repository:
```bash
cd eventstore-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Server Setup**: Add your EventStore servers in the Server Management page
2. **Login**: Use your EventStore credentials to authenticate to a server
3. **Aggregates**: Browse aggregates by type, search by GUID, pin frequently used instances
4. **Streams**: Browse and search event streams, click to view events
5. **Subscriptions**: Monitor persistent subscription health
6. **Projections**: Manage and monitor projections
7. **Statistics**: View detailed performance metrics
8. **Navigation**: Use Ctrl+K for the command palette or keyboard shortcuts throughout

## Technology Stack

- React 18 with TypeScript
- Vite for fast development
- TanStack Router for routing
- TanStack Query for data fetching
- Tailwind CSS for styling
- Radix UI for accessible components
- Axios for HTTP requests
- Lucide React for icons

## API Integration

The app integrates with EventStore's REST API:
- Authentication via Basic Auth
- Streams API for event browsing
- Subscriptions API for monitoring
- Projections API for management
- Stats API for system metrics
