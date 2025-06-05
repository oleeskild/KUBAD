# KUBAD - EventStore UI Project

## API Documentation

### EventStore HTTP API v25.0
- **Base URL**: Typically https://eventstore.com
- **Authentication**: Basic HTTP authentication required for most endpoints

### Major Endpoint Categories:

1. **Streams**
   - Read/write/delete streams
   - Append events
   - Retrieve stream metadata
   - Pagination of events

2. **Subscriptions**
   - Create and manage persistent subscriptions
   - Acknowledge/negative acknowledge messages
   - Replay parked messages

3. **Projections**
   - Create different projection types (continuous, one-time, transient)
   - Query and manage projection states
   - Enable/disable projections

4. **Admin Operations**
   - Node shutdown
   - Scavenging
   - Merging indexes

5. **User Management**
   - Create/update/delete users
   - Reset and change passwords
   - Manage user groups and permissions

### Notable Features:
- Supports complex event streaming patterns
- Provides detailed system statistics
- Offers granular access control
- Supports cluster gossip and node management

### API Reference
Full documentation: https://developers.eventstore.com/server/v21.10/http-api/

### Libraries
Its using Tailwind v4
