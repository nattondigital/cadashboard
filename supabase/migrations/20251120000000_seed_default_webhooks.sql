/*
  # Seed Default Webhooks

  1. Purpose
    - Inserts default webhook configurations for all edge functions
    - These webhooks appear in the Webhook Management table in Settings
    - Required when duplicating the project to new environments

  2. Webhooks Included
    - Members Module: Add Enrolled Member
    - Leads Module: Upsert Lead
    - Contacts Module: Upsert Contact, Get Contact
    - Appointments Module: Add Appointment, Update Appointment, Get Appointments
    - Tasks Module: Add Task, Update Task, Get Tasks
    - Recurring Tasks Module: Add, Update, Get Recurring Tasks
    - Support Module: Add Support Ticket, Update Support Ticket, Get Support Tickets
    - Team Module: Upsert Team Member, Get Team Member
    - Expenses Module: Add Expense, Update Expense, Get Expenses
    - AI Agents Module: AI Chat

  3. Notes
    - All webhook URLs use placeholder: https://YOUR_PROJECT_REF.supabase.co/functions/v1/
    - Update the URLs with your actual Supabase project reference after migration
    - This migration is idempotent - can be run multiple times safely
*/

-- Insert Members Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '28417133-c192-4b32-9533-26d56ef5503d',
    'Add Enrolled Member',
    'Members',
    'Create Enrolled Member',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-enrolled-member',
    '{"city": "string", "email": "string", "phone": "string", "state": "string", "gender": "string", "address": "string", "pincode": "string", "full_name": "string", "experience": "string", "gst_number": "string", "profession": "string", "business_name": "string", "date_of_birth": "string", "education_level": "string"}'::jsonb,
    'POST',
    '2025-10-02 17:41:53.803963+00',
    '2025-10-02 17:41:53.803963+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Leads Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '1ba335bd-fd44-4e20-b377-7747ef550083',
    'Upsert Lead',
    'Leads',
    'POST',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-lead',
    '{"name": {"type": "string", "required": true, "description": "Full name of the lead"}, "email": {"type": "string", "required": false, "description": "Email address (optional)"}, "notes": {"type": "string", "required": false, "description": "Additional notes (optional)"}, "owner": {"type": "string", "required": false, "description": "Lead owner name (optional) - defaults to Sales Team"}, "phone": {"type": "string", "required": true, "description": "Phone number with country code (used as unique identifier for upsert)"}, "stage": {"type": "string", "required": false, "description": "Lead stage (optional) - defaults to New"}, "source": {"type": "string", "required": false, "description": "Lead source (optional) - defaults to Website"}, "address": {"type": "string", "required": false, "description": "Full address (optional)"}, "company": {"type": "string", "required": false, "description": "Company name (optional)"}, "interest": {"type": "string", "required": false, "description": "Interest level: Hot/Warm/Cold (optional) - defaults to Warm"}, "contact_id": {"type": "string", "required": false, "description": "Contact ID to link with existing contact (optional)"}, "lead_score": {"type": "integer", "required": false, "description": "Lead score 0-100 (optional) - defaults to 50"}, "assigned_to": {"type": "string", "required": false, "description": "Phone number of team member to assign (optional)"}, "pipeline_id": {"type": "string", "required": true, "description": "Pipeline ID (e.g., LEAD-001) - MANDATORY field"}, "affiliate_id": {"type": "string", "required": false, "description": "Affiliate ID (optional)"}, "custom_fields": {"type": "object", "required": false, "description": "Custom field values as key-value pairs. Use field_key as key. Example: {\"company_size\": \"50-100\", \"budget\": \"50000\", \"project_deadline\": \"2025-12-31\", \"website_url\": \"https://example.com\", \"interested_services\": [\"Web Dev\", \"Mobile App\"], \"additional_notes\": \"Custom CRM needed\", \"contact_email\": \"contact@example.com\", \"document_links\": [\"https://example.com/file.pdf\"], \"is_urgent\": true, \"priority_level\": \"7\"}"}}'::jsonb,
    'POST',
    '2025-10-03 15:18:30.284121+00',
    '2025-11-11 13:09:17.998253+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Contacts Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '96cb5fc5-ade7-4182-a84e-2152d0881125',
    'Upsert Contact',
    'Contacts',
    'POST',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-contact',
    '{"city": {"type": "string", "required": false, "description": "City"}, "email": {"type": "string", "required": false, "description": "Email address of the contact"}, "notes": {"type": "string", "required": false, "description": "Additional notes about the contact"}, "phone": {"type": "string", "required": true, "description": "Phone number of the contact (used as unique identifier for upsert)"}, "state": {"type": "string", "required": false, "description": "State or province"}, "gender": {"type": "string", "required": false, "description": "Gender of the contact"}, "status": {"type": "string", "required": false, "description": "Contact status (Active, Inactive, etc.)"}, "address": {"type": "string", "required": false, "description": "Full address"}, "pincode": {"type": "string", "required": false, "description": "Postal/PIN code"}, "full_name": {"type": "string", "required": true, "description": "Full name of the contact"}, "experience": {"type": "string", "required": false, "description": "Years of experience"}, "gst_number": {"type": "string", "required": false, "description": "GST number for business contacts"}, "profession": {"type": "string", "required": false, "description": "Profession or occupation"}, "contact_type": {"type": "string", "required": false, "description": "Type of contact (Customer, Lead, Vendor, Partner, etc.)"}, "business_name": {"type": "string", "required": false, "description": "Business or company name"}, "date_of_birth": {"type": "string", "required": false, "description": "Date of birth (YYYY-MM-DD format)"}, "education_level": {"type": "string", "required": false, "description": "Education level"}}'::jsonb,
    'POST',
    '2025-10-26 10:11:40.990984+00',
    '2025-10-26 10:11:40.990984+00'
  ),
  (
    '62ae2b8e-3b93-4624-9868-a8dfa1cb14d4',
    'Get Contact',
    'Contacts',
    'Get Contact Details',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-contact',
    '{"phone": "string (required) - Pass as query parameter in URL: ?phone=YOUR_PHONE_NUMBER"}'::jsonb,
    'GET',
    '2025-10-26 14:26:28.670653+00',
    '2025-10-26 14:26:28.670653+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Appointments Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    'fe124de1-46f6-4bf5-9a3b-732078ed136c',
    'Add Appointment',
    'Appointments',
    'Create',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-appointment',
    '{"notes": "string (optional) - Additional notes about the appointment", "title": "string (required) - Title of the appointment", "status": "string (optional) - Appointment status: Scheduled, Confirmed, Completed, Cancelled, No-Show. Default: Scheduled", "purpose": "string (required) - Purpose: Sales Meeting, Product Demo, Follow-up, Consultation, Other", "location": "string (optional) - Location of the appointment", "contact_id": "string (optional) - Contact ID (e.g., CONT0001) to link appointment with existing contact", "created_by": "string (optional) - User ID of the creator", "assigned_to": "string (optional) - User ID of the assigned team member", "calendar_id": "string (optional) - Calendar ID to associate the appointment with", "contact_name": "string (required) - Name of the contact person", "meeting_type": "string (required) - Type of meeting: In-Person, Video Call, Phone Call", "contact_email": "string (optional) - Email address of the contact person", "contact_phone": "string (required) - Phone number of the contact person", "reminder_sent": "boolean (optional) - Whether reminder has been sent. Default: false", "appointment_date": "string (required) - Date of the appointment (YYYY-MM-DD format)", "appointment_time": "string (required) - Time of the appointment (HH:MM:SS format, e.g., 14:30:00)", "duration_minutes": "number (optional) - Duration in minutes. Default: 30"}'::jsonb,
    'POST',
    '2025-10-26 12:42:55.737106+00',
    '2025-10-26 17:55:16.023+00'
  ),
  (
    'f0736ccc-97aa-49e1-aeda-7fdff6628d3f',
    'Update Appointment',
    'Appointments',
    'Update',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-appointment',
    '{"notes": "string (optional) - Additional notes about the appointment", "title": "string (optional) - Title of the appointment", "status": "string (optional) - Appointment status: Scheduled, Confirmed, Completed, Cancelled, No-Show", "purpose": "string (optional) - Purpose: Sales Meeting, Product Demo, Follow-up, Consultation, Other", "location": "string (optional) - Location of the appointment", "contact_id": "string (optional) - Contact ID (e.g., CONT0001) to link appointment with existing contact", "created_by": "string (optional) - User ID of the creator", "assigned_to": "string (optional) - User ID of the assigned team member", "calendar_id": "string (optional) - Calendar ID to associate the appointment with", "contact_name": "string (optional) - Name of the contact person", "meeting_type": "string (optional) - Type of meeting: In-Person, Video Call, Phone Call", "contact_email": "string (optional) - Email address of the contact person", "contact_phone": "string (optional) - Phone number of the contact person", "reminder_sent": "boolean (optional) - Whether reminder has been sent", "appointment_id": "string (required) - Appointment ID to update. Format: APT-000001", "appointment_date": "string (optional) - Date of the appointment (YYYY-MM-DD format)", "appointment_time": "string (optional) - Time of the appointment (HH:MM:SS format, e.g., 14:30:00)", "duration_minutes": "number (optional) - Duration in minutes"}'::jsonb,
    'POST',
    '2025-10-26 17:39:38.37178+00',
    '2025-10-26 17:53:14.386+00'
  ),
  (
    'ee9b2d8a-d074-457b-9fe3-528ec5fe4f48',
    'Get Appointments',
    'Appointments',
    'Retrieve',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-appointments',
    '{"status": "string (optional) - Filter by status: Scheduled, Confirmed, Completed, Cancelled, No-Show", "purpose": "string (optional) - Filter by purpose: Sales Meeting, Product Demo, Follow-up, Consultation, Other", "contact_id": "string (optional) - Filter by UUID of related contact", "created_by": "string (optional) - Filter by UUID of user who created the appointment", "assigned_to": "string (optional) - Filter by UUID of assigned admin user", "calendar_id": "string (optional) - Filter by UUID of associated calendar", "meeting_type": "string (optional) - Filter by meeting type: In-Person, Video Call, Phone Call", "appointment_id": "string (optional) - Appointment ID to filter by. Format: APT-000001", "appointment_date": "string (optional) - Filter by appointment date (YYYY-MM-DD format)"}'::jsonb,
    'POST',
    '2025-10-26 18:15:32.713946+00',
    '2025-10-26 18:37:58.636+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Tasks Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    'e1dd23ce-10a5-44a6-b08e-349c34b6f3a2',
    'Add Task',
    'Tasks',
    'Create',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-task',
    '{"tags": "array (optional) - Array of tag strings", "notes": "string (optional) - Additional notes", "title": "string (required) - Task title", "status": "string (optional) - Status: To Do, In Progress, In Review, Completed, Cancelled. Default: To Do", "category": "string (optional) - Category: Development, Design, Marketing, Sales, Support, Operations, Other. Default: Other", "due_date": "string (optional) - Due date (ISO 8601 format)", "priority": "string (optional) - Priority: Low, Medium, High, Urgent. Default: Medium", "contact_id": "string (optional) - UUID of related contact", "start_date": "string (optional) - Start date (ISO 8601 format)", "assigned_by": "string (optional) - UUID of admin user who assigned the task", "assigned_to": "string (optional) - UUID of admin user to assign task to", "attachments": "array (optional) - Array of attachment objects", "description": "string (optional) - Task description", "actual_hours": "number (optional) - Actual hours spent", "completion_date": "string (optional) - Completion date (ISO 8601 format)", "estimated_hours": "number (optional) - Estimated hours to complete", "progress_percentage": "number (optional) - Progress percentage (0-100). Default: 0"}'::jsonb,
    'POST',
    '2025-10-26 13:01:31.375448+00',
    '2025-10-26 17:54:42.663+00'
  ),
  (
    '0fd98d2a-3578-4fb6-aa4e-ed2cb1d35580',
    'Update Task',
    'Tasks',
    'Update',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-task',
    '{"tags": "array (optional) - Array of tag strings", "notes": "string (optional) - Additional notes", "title": "string (optional) - Task title", "status": "string (optional) - Status: To Do, In Progress, In Review, Completed, Cancelled", "task_id": "string (required) - Task ID to update. Format: TASK-000001", "category": "string (optional) - Category: Development, Design, Marketing, Sales, Support, Operations, Other", "due_date": "string (optional) - Due date (ISO 8601 format)", "priority": "string (optional) - Priority: Low, Medium, High, Urgent", "contact_id": "string (optional) - UUID of related contact", "start_date": "string (optional) - Start date (ISO 8601 format)", "assigned_by": "string (optional) - UUID of admin user who assigned the task", "assigned_to": "string (optional) - UUID of admin user to assign task to", "attachments": "array (optional) - Array of attachment objects", "description": "string (optional) - Task description", "actual_hours": "number (optional) - Actual hours spent", "completion_date": "string (optional) - Completion date (ISO 8601 format)", "estimated_hours": "number (optional) - Estimated hours to complete", "progress_percentage": "number (optional) - Progress percentage (0-100)"}'::jsonb,
    'POST',
    '2025-10-26 17:32:34.305854+00',
    '2025-10-26 17:53:41.42+00'
  ),
  (
    '0fdbe5ed-7f43-4b61-9aaa-8a20febedc9c',
    'Get Tasks',
    'Tasks',
    'Retrieve',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-tasks',
    '{"status": "string (optional) - Filter by status: To Do, In Progress, In Review, Completed, Cancelled", "task_id": "string (optional) - Filter by specific task ID (e.g., TASK-10001)", "due_date": "string (optional) - Filter by due date in YYYY-MM-DD format", "contact_id": "string (optional) - Filter by UUID of contact (from contacts_master table)", "assigned_by": "string (optional) - Filter by UUID of user who assigned the task (from admin_users table)", "assigned_to": "string (optional) - Filter by UUID of user assigned to the task (from admin_users table)"}'::jsonb,
    'POST',
    '2025-10-26 15:24:57.183882+00',
    '2025-10-26 15:28:57.224+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Recurring Tasks Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '85469f02-7885-492c-8bc3-139e8958675c',
    'Add Recurring Task',
    'Recurring Tasks',
    'Create',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-recurring-task',
    '{"title": "string (required) - Recurring task title", "category": "string (optional) - Task category", "due_days": "array (optional) - For weekly: Single day [mon/tue/wed/thu/fri/sat/sun]. Must be exactly one day.", "due_time": "string (required) - Due time in HH:MM:SS format (e.g., 17:00:00)", "priority": "string (optional) - Priority: low, medium, high, urgent. Default: medium", "is_active": "boolean (optional) - Whether task is active. Default: true", "contact_id": "string (optional) - UUID of related contact from contacts_master table", "start_days": "array (optional) - For weekly: Single day [mon/tue/wed/thu/fri/sat/sun]. Must be exactly one day.", "start_time": "string (required) - Start time in HH:MM:SS format (e.g., 09:00:00)", "assigned_to": "string (optional) - UUID of admin user to assign task to", "description": "string (optional) - Task description", "recurrence_type": "string (required) - Recurrence type: daily, weekly, monthly", "supporting_docs": "array (optional) - Array of document URLs", "due_day_of_month": "number (optional) - For monthly: Day of month 1-31, or 0 for last day", "start_day_of_month": "number (optional) - For monthly: Day of month 1-31, or 0 for last day"}'::jsonb,
    'POST',
    '2025-11-10 13:04:16.753376+00',
    '2025-11-10 13:04:16.753376+00'
  ),
  (
    '875d5017-1840-47d2-982c-feac1f1029be',
    'Update Recurring Task',
    'Recurring Tasks',
    'Update',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-recurring-task',
    '{"title": "string (optional) - Recurring task title", "category": "string (optional) - Task category", "due_days": "array (optional) - For weekly: Single day [mon/tue/wed/thu/fri/sat/sun]. Must be exactly one day.", "due_time": "string (optional) - Due time in HH:MM:SS format (e.g., 17:00:00)", "priority": "string (optional) - Priority: low, medium, high, urgent", "is_active": "boolean (optional) - Whether task is active", "contact_id": "string (optional) - UUID of related contact from contacts_master table", "start_days": "array (optional) - For weekly: Single day [mon/tue/wed/thu/fri/sat/sun]. Must be exactly one day.", "start_time": "string (optional) - Start time in HH:MM:SS format (e.g., 09:00:00)", "assigned_to": "string (optional) - UUID of admin user to assign task to", "description": "string (optional) - Task description", "recurrence_type": "string (optional) - Recurrence type: daily, weekly, monthly", "supporting_docs": "array (optional) - Array of document URLs", "due_day_of_month": "number (optional) - For monthly: Day of month 1-31, or 0 for last day", "recurrence_task_id": "string (required) - Recurring task ID to update (e.g., RETASK001)", "start_day_of_month": "number (optional) - For monthly: Day of month 1-31, or 0 for last day"}'::jsonb,
    'POST',
    '2025-11-10 13:04:16.753376+00',
    '2025-11-10 13:04:16.753376+00'
  ),
  (
    'a1b04ea6-48e3-47de-abcf-d0839ca532bf',
    'Get Recurring Tasks',
    'Recurring Tasks',
    'Retrieve',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-recurring-tasks',
    '{"priority": "string (optional) - Filter by priority: low, medium, high, urgent", "is_active": "boolean (optional) - Filter by active status: true or false", "contact_id": "string (optional) - Filter by UUID of contact from contacts_master table", "assigned_to": "string (optional) - Filter by UUID of assigned user from admin_users table", "recurrence_type": "string (optional) - Filter by recurrence type: daily, weekly, monthly", "recurrence_task_id": "string (optional) - Filter by specific recurring task ID (e.g., RETASK001)"}'::jsonb,
    'POST',
    '2025-11-10 13:04:16.753376+00',
    '2025-11-10 13:04:16.753376+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Support Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '421aec25-c534-4bf1-a7c3-35632961b4b7',
    'Add Support Ticket',
    'Support',
    'Create',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-support-ticket',
    '{"tags": "array (optional) - Array of tag strings", "status": "string (optional) - Status: Open, In Progress, Resolved, Closed, Escalated. Default: Open", "subject": "string (required) - Ticket subject", "category": "string (optional) - Category: Technical, Billing, Course, Refund, Feature Request, General. Default: General", "priority": "string (optional) - Priority: Low, Medium, High, Critical. Default: Medium", "contact_id": "string (required) - UUID of contact from contacts_master table", "assigned_to": "string (optional) - UUID of admin user to assign ticket to (from admin_users table)", "description": "string (required) - Detailed description of the issue", "satisfaction": "number (optional) - Customer satisfaction rating (1-5)", "response_time": "string (optional) - Response time duration", "attachment_1_url": "string (optional) - URL of first attachment", "attachment_2_url": "string (optional) - URL of second attachment", "attachment_3_url": "string (optional) - URL of third attachment", "attachment_1_name": "string (optional) - Name of first attachment", "attachment_2_name": "string (optional) - Name of second attachment", "attachment_3_name": "string (optional) - Name of third attachment"}'::jsonb,
    'POST',
    '2025-10-26 16:14:05.804036+00',
    '2025-10-26 17:53:00.164+00'
  ),
  (
    '3512efab-fe2c-4784-a29e-72b87b75dc3a',
    'Update Support Ticket',
    'Support',
    'Update',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-support-ticket',
    '{"tags": "array (optional) - Array of tag strings", "status": "string (optional) - Status: Open, In Progress, Resolved, Closed, Escalated", "subject": "string (optional) - Ticket subject", "category": "string (optional) - Category: Technical, Billing, Course, Refund, Feature Request, General", "priority": "string (optional) - Priority: Low, Medium, High, Critical", "ticket_id": "string (required) - Ticket ID to update. Format: TKT-000001", "contact_id": "string (optional) - UUID of contact from contacts_master table", "assigned_to": "string (optional) - UUID of admin user to assign ticket to (from admin_users table)", "description": "string (optional) - Detailed description of the issue", "satisfaction": "number (optional) - Customer satisfaction rating (1-5)", "response_time": "string (optional) - Response time duration", "attachment_1_url": "string (optional) - URL of first attachment", "attachment_2_url": "string (optional) - URL of second attachment", "attachment_3_url": "string (optional) - URL of third attachment", "attachment_1_name": "string (optional) - Name of first attachment", "attachment_2_name": "string (optional) - Name of second attachment", "attachment_3_name": "string (optional) - Name of third attachment"}'::jsonb,
    'POST',
    '2025-10-26 17:18:03.516964+00',
    '2025-10-26 17:54:07.992+00'
  ),
  (
    'e0ceebe1-34c7-4477-bddd-b50d45f8e804',
    'Get Support Tickets',
    'Support',
    'Retrieve',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-support-tickets',
    '{"status": "string (optional) - Filter by status: Open, In Progress, Resolved, Closed", "category": "string (optional) - Filter by category: Technical Support, Billing, Feature Request, Bug Report, General Inquiry, Other", "priority": "string (optional) - Filter by priority: Low, Medium, High, Urgent", "ticket_id": "string (optional) - Support ticket ID to filter by. Format: TICK-000001", "contact_id": "string (optional) - Filter by UUID of related contact", "created_at": "string (optional) - Filter by creation date (ISO 8601 format)", "assigned_to": "string (optional) - Filter by UUID of assigned admin user"}'::jsonb,
    'POST',
    '2025-10-26 18:10:19.758029+00',
    '2025-10-26 18:38:18.623+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Team Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '0aa6bd07-71d3-43a7-96f3-a668f995712f',
    'Upsert Team Member',
    'Team',
    'POST',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/upsert-team-member',
    '{"role": {"type": "string", "required": true, "description": "Role of the team member (accepts any text value, e.g., Super Admin, Sales Manager, Developer, etc.)"}, "email": {"type": "string", "required": false, "description": "Email address of the team member (required when creating new member)"}, "phone": {"type": "string", "required": true, "description": "Phone number of the team member - used as unique identifier for upsert"}, "status": {"type": "string", "required": false, "description": "Status of the team member (default: Active)"}, "full_name": {"type": "string", "required": true, "description": "Full name of the team member"}, "is_active": {"type": "boolean", "required": false, "description": "Whether the team member is active (default: true for new members)"}, "department": {"type": "string", "required": false, "description": "Department the team member belongs to"}, "permissions": {"type": "object", "required": false, "description": "Permissions object for the team member"}}'::jsonb,
    'POST',
    '2025-10-26 13:19:13.536076+00',
    '2025-10-26 13:19:13.536076+00'
  ),
  (
    'cf300744-7fee-401f-b63b-5729323ae5e0',
    'Get Team Member',
    'Team',
    'Get Team Member Details',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-team-member',
    '{"phone": "string (required) - Pass as query parameter in URL: ?phone=YOUR_PHONE_NUMBER"}'::jsonb,
    'GET',
    '2025-10-26 14:05:14.027603+00',
    '2025-10-26 14:05:14.027603+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert Expenses Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '839ba3e7-91ef-4fcf-a75f-a46071b08479',
    'Add Expense',
    'Expenses',
    'Create',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-expense',
    '{"notes": "string (optional) - Additional notes", "amount": "number (required) - Amount must be greater than 0", "status": "string (optional) - Status: Pending, Approved, Rejected, Paid (default: Pending)", "category": "string (required) - Category: Travel, Office Supplies, Marketing, Software, Meals, Entertainment, Training, Other", "currency": "string (optional) - Currency code (default: USD)", "approved_by": "string (optional) - UUID of admin user who approved", "description": "string (optional) - Description of the expense", "receipt_url": "string (optional) - URL to receipt file", "expense_date": "string (optional) - Date of expense in YYYY-MM-DD format (default: today)", "admin_user_id": "string (required) - UUID of the admin user creating the expense", "payment_method": "string (optional) - Payment method: Cash, Credit Card, Debit Card, Bank Transfer, Digital Wallet, Other (default: Cash)"}'::jsonb,
    'POST',
    '2025-10-26 18:35:01.352979+00',
    '2025-10-26 18:37:21.143+00'
  ),
  (
    '90229b7f-51f2-46ab-a91c-f051f78d7827',
    'Update Expense',
    'Expenses',
    'Update',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-expense',
    '{"notes": "string (optional) - Additional notes", "amount": "number (optional) - Amount must be greater than 0", "status": "string (optional) - Status: Pending, Approved, Rejected, Paid", "category": "string (optional) - Category: Travel, Office Supplies, Marketing, Software, Meals, Entertainment, Training, Other", "currency": "string (optional) - Currency code", "expense_id": "string (required) - Expense ID to update. Format: EXP-000001", "approved_by": "string (optional) - UUID of admin user who approved", "description": "string (optional) - Description of the expense", "receipt_url": "string (optional) - URL to receipt file", "expense_date": "string (optional) - Date of expense in YYYY-MM-DD format", "admin_user_id": "string (optional) - UUID of the admin user", "payment_method": "string (optional) - Payment method: Cash, Credit Card, Debit Card, Bank Transfer, Digital Wallet, Other"}'::jsonb,
    'POST',
    '2025-10-26 18:35:01.352979+00',
    '2025-10-26 18:37:38.724+00'
  ),
  (
    '89f981e2-ccb6-4a06-b8f9-90bd21da2b70',
    'Get Expenses',
    'Expenses',
    'Retrieve',
    '/functions/v1/get-expenses',
    '{"status": "string (optional) - Filter by status: Pending, Approved, Rejected, Paid", "category": "string (optional) - Filter by category: Travel, Office Supplies, Marketing, Software, Meals, Entertainment, Training, Other", "expense_id": "string (optional) - Expense ID to filter by. Format: EXP-000001", "approved_by": "string (optional) - Filter by UUID of the admin user who approved the expense", "expense_date": "string (optional) - Filter by expense date (YYYY-MM-DD format)", "admin_user_id": "string (optional) - Filter by UUID of the admin user who created the expense", "payment_method": "string (optional) - Filter by payment method: Cash, Credit Card, Debit Card, Bank Transfer, Digital Wallet, Other"}'::jsonb,
    'POST',
    '2025-10-26 18:24:02.48192+00',
    '2025-10-26 18:24:02.48192+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert AI Agents Module Webhooks
INSERT INTO webhooks (id, name, module, trigger, url, payload_fields, method, created_at, updated_at)
VALUES
  (
    '13cbeaee-aeec-432f-904c-9d700416e10a',
    'AI Chat',
    'AI Agents',
    'Chat',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-chat',
    '{"message": "string (required) - User message to send to the AI agent", "agent_id": "string (required) - UUID of the AI agent to chat with", "phone_number": "string (required) - Phone number of the user chatting", "user_context": "string (optional) - Additional context about the user (name, email, etc.)"}'::jsonb,
    'POST',
    '2025-10-26 19:09:17.074844+00',
    '2025-10-26 19:11:29.285+00'
  )
ON CONFLICT (id) DO NOTHING;
