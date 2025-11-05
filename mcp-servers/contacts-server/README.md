# Contacts MCP Server

A fully-featured MCP (Model Context Protocol) server for managing contacts in the CRM system.

## Features

### Tools (4)
1. **get_contacts** - Retrieve contacts with advanced filtering
   - Filter by: type, status, city, state, tags, date range
   - Search across: name, email, phone, business name
   - Pagination support

2. **create_contact** - Create new contacts
   - Required: full_name
   - Optional: All other contact fields
   - Auto-generates contact_id

3. **update_contact** - Update existing contacts
   - Update any field including last_contacted
   - Tracks updated_at automatically

4. **delete_contact** - Remove contacts
   - Soft delete recommended in production

### Resources (8)
1. **contacts://all** - All contacts
2. **contacts://active** - Active contacts only
3. **contacts://recent** - Contacts from last 30 days
4. **contacts://customers** - Customer type contacts
5. **contacts://leads** - Lead type contacts
6. **contacts://vendors** - Vendor type contacts
7. **contacts://statistics** - Aggregate statistics
8. **contacts://contact/{id}** - Individual contact by ID

### Prompts (6)
1. **contact_summary** - Comprehensive contact overview with stats
2. **contact_best_practices** - Guidelines for contact management
3. **contact_segmentation** - Segmentation strategies (demographic, geographic, behavioral)
4. **contact_enrichment_tips** - Data enrichment guide
5. **get_contact_by_id** - Instructions for retrieving specific contacts
6. **duplicate_detection** - Duplicate detection and management guide

## Usage

### Running the Server
```bash
cd mcp-servers
npm run dev:contacts
```

### Configuration
The server uses environment variables from `.env`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `MCP_SERVER_NAME` - Optional server name (default: crm-contacts-server)
- `MCP_SERVER_VERSION` - Optional version (default: 1.0.0)

## Database Schema

### contacts_master Table
- **id** (uuid) - Primary key
- **contact_id** (text) - Human-readable ID
- **full_name** (text) - Required
- **email** (text)
- **phone** (text)
- **date_of_birth** (date)
- **gender** (text)
- **education_level** (text)
- **profession** (text)
- **experience** (text)
- **business_name** (text)
- **address** (text)
- **city** (text)
- **state** (text)
- **pincode** (text)
- **gst_number** (text)
- **contact_type** (text) - Customer, Lead, Vendor, individual
- **status** (text) - Active, Inactive
- **notes** (text)
- **last_contacted** (timestamptz)
- **tags** (jsonb) - Array of tags
- **created_at** (timestamptz)
- **updated_at** (timestamptz)

## Permissions

The server integrates with the AI Agent permission system:
- **View** - Required for get_contacts
- **Create** - Required for create_contact
- **Edit** - Required for update_contact
- **Delete** - Required for delete_contact

## Logging

All operations are logged to `ai_agent_logs` table with:
- Agent ID and name
- Module: "Contacts"
- Action performed
- Result (Success/Error)
- Details and error messages

## Security

- Permission validation on every operation
- Agent authentication required
- RLS policies enforced at database level
- Comprehensive audit trail

## Examples

### Get All Active Customers
```json
{
  "name": "get_contacts",
  "arguments": {
    "contact_type": "Customer",
    "status": "Active"
  }
}
```

### Search Contacts
```json
{
  "name": "get_contacts",
  "arguments": {
    "search": "john",
    "limit": 10
  }
}
```

### Create New Contact
```json
{
  "name": "create_contact",
  "arguments": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "contact_type": "Customer",
    "city": "Mumbai",
    "state": "Maharashtra",
    "tags": ["VIP", "Premium"]
  }
}
```

### Update Contact
```json
{
  "name": "update_contact",
  "arguments": {
    "id": "uuid-here",
    "status": "Active",
    "last_contacted": "2025-11-05T12:00:00Z",
    "notes": "Follow up scheduled for next week"
  }
}
```

## Architecture

The server follows the modular MCP pattern:
- **index.ts** - Server setup and request routing
- **tools.ts** - CRUD operations implementation
- **resources.ts** - Read-only data access
- **prompts.ts** - Context-aware AI guidance
- **shared/** - Reusable utilities (logger, permissions, types)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol
- `@supabase/supabase-js` - Database client
- `dotenv` - Environment configuration

## Next Steps

This Contacts MCP Server serves as the template for creating additional module servers:
- Leads Server
- Appointments Server
- Support Tickets Server
- Expenses Server
- Billing Server
- And more...

Each module follows the same structure for consistency and maintainability.
