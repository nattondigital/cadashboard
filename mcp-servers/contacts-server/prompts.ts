/**
 * Contact prompts for MCP server
 * Provides context-aware templates for AI interactions
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('ContactPrompts');

export const prompts = [
  {
    name: 'contact_summary',
    description: 'Generate a comprehensive summary of contacts with statistics and insights',
    arguments: [
      {
        name: 'include_inactive',
        description: 'Whether to include inactive contacts in the summary',
        required: false,
      },
      {
        name: 'include_distribution',
        description: 'Whether to include geographic distribution data',
        required: false,
      },
    ],
  },
  {
    name: 'contact_best_practices',
    description: 'Best practices and guidelines for managing contacts effectively',
    arguments: [],
  },
  {
    name: 'contact_segmentation',
    description: 'Recommendations for segmenting and organizing contacts',
    arguments: [
      {
        name: 'segmentation_type',
        description: 'Type of segmentation (demographic, geographic, behavioral)',
        required: false,
      },
    ],
  },
  {
    name: 'contact_enrichment_tips',
    description: 'Tips for enriching contact data with additional information',
    arguments: [],
  },
  {
    name: 'get_contact_by_id',
    description: 'Instructions for retrieving a specific contact by its ID',
    arguments: [
      {
        name: 'contact_id',
        description: 'The contact ID to retrieve',
        required: true,
      },
    ],
  },
  {
    name: 'duplicate_detection',
    description: 'Guide for detecting and managing duplicate contacts',
    arguments: [],
  },
];

export async function getPrompt(name: string, args: any = {}): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  logger.info('Getting prompt', { name, args });

  const supabase = getSupabase();

  try {
    if (name === 'contact_summary') {
      const { data: allContacts } = await supabase.from('contacts_master').select('*');

      const active = allContacts?.filter((c: any) => c.status === 'Active') || [];
      const inactive = allContacts?.filter((c: any) => c.status === 'Inactive') || [];
      const customers = allContacts?.filter((c: any) => c.contact_type === 'Customer') || [];
      const leads = allContacts?.filter((c: any) => c.contact_type === 'Lead') || [];
      const vendors = allContacts?.filter((c: any) => c.contact_type === 'Vendor') || [];

      let summary = `# Contact Management Summary\n\n`;
      summary += `## Overview\n`;
      summary += `- **Total Contacts**: ${allContacts?.length || 0}\n`;
      summary += `- **Active Contacts**: ${active.length}\n`;

      if (args.include_inactive !== false) {
        summary += `- **Inactive Contacts**: ${inactive.length}\n`;
      }

      summary += `\n## Contact Types\n`;
      summary += `- **Customers**: ${customers.length}\n`;
      summary += `- **Leads**: ${leads.length}\n`;
      summary += `- **Vendors**: ${vendors.length}\n\n`;

      const withEmail = allContacts?.filter((c: any) => c.email).length || 0;
      const withPhone = allContacts?.filter((c: any) => c.phone).length || 0;
      const withBusiness = allContacts?.filter((c: any) => c.business_name).length || 0;

      summary += `## Contact Completeness\n`;
      summary += `- **With Email**: ${withEmail} (${Math.round((withEmail / (allContacts?.length || 1)) * 100)}%)\n`;
      summary += `- **With Phone**: ${withPhone} (${Math.round((withPhone / (allContacts?.length || 1)) * 100)}%)\n`;
      summary += `- **With Business Name**: ${withBusiness} (${Math.round((withBusiness / (allContacts?.length || 1)) * 100)}%)\n\n`;

      if (args.include_distribution !== false) {
        const cities = allContacts?.reduce((acc: any, contact: any) => {
          if (contact.city) {
            acc[contact.city] = (acc[contact.city] || 0) + 1;
          }
          return acc;
        }, {});

        const topCities = Object.entries(cities || {})
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 5);

        if (topCities.length > 0) {
          summary += `## Top 5 Cities\n`;
          topCities.forEach(([city, count]: any) => {
            summary += `- **${city}**: ${count} contacts\n`;
          });
          summary += `\n`;
        }

        const states = allContacts?.reduce((acc: any, contact: any) => {
          if (contact.state) {
            acc[contact.state] = (acc[contact.state] || 0) + 1;
          }
          return acc;
        }, {});

        const topStates = Object.entries(states || {})
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 5);

        if (topStates.length > 0) {
          summary += `## Top 5 States\n`;
          topStates.forEach(([state, count]: any) => {
            summary += `- **${state}**: ${count} contacts\n`;
          });
          summary += `\n`;
        }
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentContacts = allContacts?.filter((c: any) => c.created_at >= thirtyDaysAgo).length || 0;

      summary += `## Recent Activity\n`;
      summary += `- **Contacts Added (Last 30 Days)**: ${recentContacts}\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: summary,
            },
          },
        ],
      };
    }

    if (name === 'contact_best_practices') {
      const guide = `# Contact Management Best Practices

## Essential Contact Information

### 1. Core Data Fields
Always capture these minimum required fields:
- **Full Name**: Complete name (First, Middle, Last)
- **Contact Type**: Customer, Lead, Vendor, or Individual
- **Status**: Active or Inactive

### 2. Communication Channels
At least one contact method is essential:
- **Phone Number**: With country code
- **Email Address**: Valid and verified
- **Business Name**: For B2B contacts

### 3. Geographic Information
Important for segmentation and logistics:
- **Address**: Complete street address
- **City and State**: For regional analysis
- **PIN Code**: For delivery and service areas

## Data Quality Guidelines

### Completeness
- Aim for 100% completion of core fields
- Minimum 80% completion for extended fields
- Regular data enrichment campaigns

### Accuracy
- Verify email addresses on entry
- Validate phone numbers with proper format
- Confirm addresses before first delivery

### Consistency
- Use standardized formats (phone, date, etc.)
- Maintain consistent naming conventions
- Regularly deduplicate records

### Currency
- Update contact information regularly
- Mark inactive contacts appropriately
- Record last contacted date

## Contact Organization

### Tagging Strategy
Use tags for:
- Industry or sector
- Interest areas
- Campaign responses
- Engagement level
- Custom categories

### Status Management
- **Active**: Currently engaged contacts
- **Inactive**: No activity for 6+ months
- Regular status reviews and updates

### Type Classification
- **Customer**: Existing paying customers
- **Lead**: Potential customers
- **Vendor**: Business partners and suppliers
- **Individual**: Personal contacts

## Communication Tracking

### Best Practices
1. Record all significant interactions
2. Update "last_contacted" after every touchpoint
3. Add notes for important conversations
4. Track communication preferences

### Follow-up Management
- Set reminders for follow-ups
- Maintain consistent communication cadence
- Respect communication preferences
- Document outcomes

## Privacy and Compliance

### Data Protection
- Collect only necessary information
- Secure sensitive data (GST, personal info)
- Obtain consent for marketing communications
- Provide opt-out mechanisms

### GDPR/Privacy Considerations
- Right to access data
- Right to correction
- Right to deletion
- Data portability

## Common Mistakes to Avoid

1. **Incomplete Records**: Missing critical contact information
2. **Duplicate Entries**: Same contact with multiple records
3. **Outdated Information**: Not updating contact details
4. **Poor Organization**: No tags or categories
5. **No Follow-up**: Not tracking communication history
6. **Missing Notes**: Not documenting important details
7. **Inconsistent Format**: Different naming or format styles

## Performance Metrics

Track these KPIs:
- Contact completeness rate
- Duplicate contact rate
- Contact engagement rate
- Data accuracy score
- Time to respond to inquiries
`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: guide,
            },
          },
        ],
      };
    }

    if (name === 'contact_segmentation') {
      const segmentationType = args.segmentation_type || 'general';

      let recommendations = `# Contact Segmentation Framework\n\n`;

      if (segmentationType === 'demographic' || segmentationType === 'general') {
        recommendations += `## Demographic Segmentation\n\n`;
        recommendations += `### By Contact Type\n`;
        recommendations += `- **Customers**: Paying clients, upsell opportunities\n`;
        recommendations += `- **Leads**: Potential customers, nurturing needed\n`;
        recommendations += `- **Vendors**: Business partners, collaboration\n`;
        recommendations += `- **Individuals**: Personal network\n\n`;

        recommendations += `### By Profession/Industry\n`;
        recommendations += `- Group by similar professions\n`;
        recommendations += `- Industry-specific communication\n`;
        recommendations += `- Targeted offerings\n`;
        recommendations += `- Sector-based events\n\n`;

        recommendations += `### By Education Level\n`;
        recommendations += `- Technical vs. Non-technical\n`;
        recommendations += `- Adjust communication complexity\n`;
        recommendations += `- Relevant content sharing\n\n`;
      }

      if (segmentationType === 'geographic' || segmentationType === 'general') {
        recommendations += `## Geographic Segmentation\n\n`;
        recommendations += `### By Region/State\n`;
        recommendations += `- Regional marketing campaigns\n`;
        recommendations += `- State-specific regulations\n`;
        recommendations += `- Local events and networking\n`;
        recommendations += `- Regional pricing strategies\n\n`;

        recommendations += `### By City\n`;
        recommendations += `- Urban vs. Rural approaches\n`;
        recommendations += `- Metro city strategies\n`;
        recommendations += `- Local partnerships\n`;
        recommendations += `- City-specific services\n\n`;
      }

      if (segmentationType === 'behavioral' || segmentationType === 'general') {
        recommendations += `## Behavioral Segmentation\n\n`;
        recommendations += `### By Engagement Level\n`;
        recommendations += `- **High**: Regular interaction, multiple touchpoints\n`;
        recommendations += `- **Medium**: Occasional engagement\n`;
        recommendations += `- **Low**: Minimal or no recent activity\n`;
        recommendations += `- **Inactive**: No activity for 6+ months\n\n`;

        recommendations += `### By Purchase Behavior (Customers)\n`;
        recommendations += `- Frequent buyers\n`;
        recommendations += `- One-time purchasers\n`;
        recommendations += `- High-value customers\n`;
        recommendations += `- Seasonal buyers\n\n`;

        recommendations += `### By Stage in Customer Journey\n`;
        recommendations += `- **Awareness**: Just discovered your business\n`;
        recommendations += `- **Consideration**: Evaluating options\n`;
        recommendations += `- **Decision**: Ready to purchase\n`;
        recommendations += `- **Retention**: Existing customers\n`;
        recommendations += `- **Advocacy**: Promoters and referrers\n\n`;
      }

      recommendations += `## Tag-Based Segmentation\n\n`;
      recommendations += `Use tags for flexible, multi-dimensional segmentation:\n`;
      recommendations += `- **Interest-based**: Product categories, services\n`;
      recommendations += `- **Source-based**: Referral, website, event, social media\n`;
      recommendations += `- **Campaign-based**: Marketing campaign responses\n`;
      recommendations += `- **Priority-based**: VIP, high-value, at-risk\n`;
      recommendations += `- **Custom**: Business-specific categories\n\n`;

      recommendations += `## Practical Application\n\n`;
      recommendations += `### Segmentation Best Practices\n`;
      recommendations += `1. Start with broad segments, refine over time\n`;
      recommendations += `2. Use multiple criteria for precision\n`;
      recommendations += `3. Review and update segments quarterly\n`;
      recommendations += `4. Test messaging with each segment\n`;
      recommendations += `5. Track segment performance\n`;
      recommendations += `6. Maintain segment documentation\n\n`;

      recommendations += `### Communication Strategy by Segment\n`;
      recommendations += `- **High-value customers**: Personal attention, exclusive offers\n`;
      recommendations += `- **Active leads**: Regular follow-ups, value content\n`;
      recommendations += `- **Inactive contacts**: Re-engagement campaigns\n`;
      recommendations += `- **New contacts**: Welcome series, onboarding\n`;
      recommendations += `- **Regional groups**: Localized content, events\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: recommendations,
            },
          },
        ],
      };
    }

    if (name === 'contact_enrichment_tips') {
      const tips = `# Contact Data Enrichment Guide

## Why Enrich Contact Data?

Enhanced contact data leads to:
- Better personalization
- Improved targeting
- Higher conversion rates
- Stronger relationships
- More effective communication

## Key Areas for Enrichment

### 1. Professional Information
- **Current Profession**: Job title, role
- **Experience Level**: Years in field
- **Industry**: Business sector
- **Company Details**: Business name, size
- **LinkedIn Profile**: Professional network

### 2. Business Details
- **Business Name**: Company name
- **GST Number**: Tax identification
- **Business Type**: B2B, B2C, etc.
- **Annual Revenue**: Size indicator
- **Number of Employees**: Company scale

### 3. Geographic Data
- **Complete Address**: Street, landmark
- **City and State**: Location details
- **PIN Code**: Postal code
- **Service Area**: Coverage zone
- **Time Zone**: For scheduling

### 4. Communication Preferences
- **Preferred Channel**: Email, phone, WhatsApp
- **Best Time to Contact**: Morning, afternoon, evening
- **Language Preference**: Primary language
- **Communication Frequency**: How often
- **Content Interests**: Topics of interest

### 5. Demographic Information
- **Age/Date of Birth**: Life stage
- **Gender**: For personalization
- **Education Level**: Background
- **Marital Status**: Family status
- **Languages Spoken**: Communication options

### 6. Behavioral Data
- **Last Contacted**: Recent interaction
- **Engagement Score**: Activity level
- **Purchase History**: Past transactions
- **Website Activity**: Online behavior
- **Social Media**: Online presence

## Data Enrichment Methods

### 1. Direct Collection
- **Forms**: Comprehensive data capture
- **Surveys**: Periodic information updates
- **Conversations**: Notes from interactions
- **Events**: Registration information
- **Onboarding**: Welcome process data

### 2. Third-Party Sources
- **LinkedIn**: Professional information
- **Company Websites**: Business details
- **Social Media**: Personal insights
- **Business Directories**: Contact verification
- **Industry Databases**: Sector information

### 3. Progressive Profiling
- **Initial Contact**: Basic information
- **Follow-up Interactions**: Add details gradually
- **Relationship Deepening**: Comprehensive data
- **Avoid Overwhelming**: Don't ask too much at once

### 4. Data Verification
- **Email Validation**: Verify addresses
- **Phone Verification**: Confirm numbers
- **Address Validation**: Check completeness
- **Regular Updates**: Periodic verification
- **Clean Bad Data**: Remove invalid entries

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. Identify critical missing fields
2. Prioritize data collection
3. Update contact forms
4. Train team on importance

### Phase 2: Active Collection (Week 3-4)
1. Run data collection campaigns
2. Update during interactions
3. Use progressive profiling
4. Incentivize data sharing

### Phase 3: Automation (Week 5-6)
1. Implement validation tools
2. Set up auto-enrichment
3. Create update reminders
4. Monitor data quality

### Phase 4: Optimization (Ongoing)
1. Regular data audits
2. Quality scoring
3. Duplicate detection
4. Continuous improvement

## Best Practices

### Do's
✓ Ask for information progressively
✓ Explain why you need data
✓ Offer value in exchange
✓ Keep forms simple
✓ Validate data on entry
✓ Update regularly
✓ Maintain data privacy
✓ Use automation wisely

### Don'ts
✗ Don't ask for too much at once
✗ Don't ignore privacy concerns
✗ Don't keep outdated data
✗ Don't duplicate contacts
✗ Don't share without consent
✗ Don't neglect security
✗ Don't forget to verify
✗ Don't overcomplicate forms

## Measuring Success

Track these metrics:
- **Completeness Rate**: % of filled fields
- **Accuracy Rate**: % of correct data
- **Update Frequency**: How often refreshed
- **Enrichment ROI**: Value vs. cost
- **Data Quality Score**: Overall rating
`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: tips,
            },
          },
        ],
      };
    }

    if (name === 'get_contact_by_id') {
      const contactId = args.contact_id;
      if (!contactId) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: '# How to Retrieve a Contact by ID\n\nTo get details of a specific contact, use the `get_contacts` tool with the `id` parameter:\n\n```json\n{\n  "id": "uuid-here"\n}\n```\n\nThis will return the complete contact details including all personal, business, and geographic information.',
              },
            },
          ],
        };
      }

      const { data: contacts } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('id', contactId);

      if (!contacts || contacts.length === 0) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `# Contact Not Found\n\nContact with ID **${contactId}** was not found in the system.\n\nPlease verify the contact ID and try again.`,
              },
            },
          ],
        };
      }

      const contact = contacts[0];
      let details = `# Contact Details: ${contact.contact_id || contact.id}\n\n`;
      details += `## ${contact.full_name}\n\n`;

      details += `### Contact Information\n`;
      details += `- **Type**: ${contact.contact_type}\n`;
      details += `- **Status**: ${contact.status}\n`;
      if (contact.email) details += `- **Email**: ${contact.email}\n`;
      if (contact.phone) details += `- **Phone**: ${contact.phone}\n\n`;

      if (contact.business_name || contact.profession) {
        details += `### Professional Information\n`;
        if (contact.business_name) details += `- **Business**: ${contact.business_name}\n`;
        if (contact.profession) details += `- **Profession**: ${contact.profession}\n`;
        if (contact.experience) details += `- **Experience**: ${contact.experience}\n`;
        if (contact.education_level) details += `- **Education**: ${contact.education_level}\n`;
        if (contact.gst_number) details += `- **GST Number**: ${contact.gst_number}\n`;
        details += `\n`;
      }

      if (contact.address || contact.city || contact.state) {
        details += `### Address\n`;
        if (contact.address) details += `${contact.address}\n`;
        if (contact.city && contact.state) {
          details += `${contact.city}, ${contact.state}`;
          if (contact.pincode) details += ` - ${contact.pincode}`;
          details += `\n`;
        } else {
          if (contact.city) details += `${contact.city}\n`;
          if (contact.state) details += `${contact.state}\n`;
          if (contact.pincode) details += `PIN: ${contact.pincode}\n`;
        }
        details += `\n`;
      }

      if (contact.date_of_birth || contact.gender) {
        details += `### Personal Information\n`;
        if (contact.date_of_birth) details += `- **Date of Birth**: ${contact.date_of_birth}\n`;
        if (contact.gender) details += `- **Gender**: ${contact.gender}\n`;
        details += `\n`;
      }

      if (contact.tags && contact.tags.length > 0) {
        details += `### Tags\n`;
        contact.tags.forEach((tag: string) => {
          details += `- ${tag}\n`;
        });
        details += `\n`;
      }

      if (contact.notes) {
        details += `### Notes\n${contact.notes}\n\n`;
      }

      details += `### Activity\n`;
      if (contact.last_contacted) {
        details += `- **Last Contacted**: ${contact.last_contacted}\n`;
      }
      details += `- **Created**: ${contact.created_at}\n`;
      details += `- **Last Updated**: ${contact.updated_at}\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: details,
            },
          },
        ],
      };
    }

    if (name === 'duplicate_detection') {
      const guide = `# Duplicate Contact Detection and Management

## Why Duplicates Occur

Common causes:
- Multiple data entry points
- Import from different sources
- Typos in names or emails
- Different naming conventions
- Lack of validation rules
- Multiple team members entering data

## Detection Strategies

### 1. Exact Match Detection
Look for contacts with identical:
- Email address
- Phone number
- Full name + city combination
- GST number (for businesses)

### 2. Fuzzy Match Detection
Similar but not exact:
- Names with typos (e.g., "John Smith" vs "Jon Smith")
- Phone numbers with different formats
- Emails with common typos
- Business names with variations

### 3. Multi-Field Comparison
Check combinations of:
- Name + Phone
- Name + Email
- Name + Address
- Business Name + City

## Prevention Strategies

### Data Entry Controls
1. **Email/Phone Validation**: Check for existing records
2. **Format Standardization**: Consistent data formats
3. **Required Fields**: Enforce minimum data
4. **Auto-suggestions**: Show similar contacts on entry
5. **Import Rules**: Duplicate checks on bulk import

### Process Improvements
1. **Single Source of Truth**: Designate primary contact creation point
2. **Permission Management**: Limit who can create contacts
3. **Training**: Educate team on importance
4. **Regular Audits**: Periodic duplicate checks
5. **Merge Procedures**: Standard process for handling duplicates

## Duplicate Resolution

### Step 1: Identify Duplicates
Run queries to find:
- Same email address
- Same phone number
- Similar names in same city
- Identical business names

### Step 2: Evaluate Records
For each duplicate set:
- Identify the most complete record
- Check for unique information in each
- Note which has more activity/history
- Consider creation dates

### Step 3: Merge Strategy
**Keep the record that has:**
- Most complete information
- More recent activity
- Better data quality
- More relationship history

**Transfer to kept record:**
- Missing fields from other records
- Combined tags
- All notes and history
- Related records (tasks, appointments)

### Step 4: Archive or Delete
- Archive duplicates (don't delete immediately)
- Update references in related records
- Document merge action
- Set review period before permanent deletion

## Automated Detection Query Examples

### Find by Email
\`\`\`sql
SELECT email, COUNT(*), STRING_AGG(id::text, ',')
FROM contacts_master
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
\`\`\`

### Find by Phone
\`\`\`sql
SELECT phone, COUNT(*), STRING_AGG(id::text, ',')
FROM contacts_master
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;
\`\`\`

### Find by Name + City
\`\`\`sql
SELECT full_name, city, COUNT(*), STRING_AGG(id::text, ',')
FROM contacts_master
WHERE full_name IS NOT NULL AND city IS NOT NULL
GROUP BY full_name, city
HAVING COUNT(*) > 1;
\`\`\`

## Best Practices

### Do's
✓ Run duplicate checks weekly
✓ Implement prevention controls
✓ Document merge decisions
✓ Keep audit trail
✓ Train team regularly
✓ Use automated tools
✓ Review before deleting
✓ Maintain data quality standards

### Don'ts
✗ Don't delete without review
✗ Don't lose historical data
✗ Don't ignore warning signs
✗ Don't skip validation
✗ Don't allow uncontrolled entry
✗ Don't forget to update references
✗ Don't rush the merge process

## Monitoring and Metrics

Track these KPIs:
- **Duplicate Rate**: % of duplicate records
- **Resolution Time**: Time to merge duplicates
- **Prevention Success**: New duplicates over time
- **Data Quality Score**: Overall contact quality
- **Merge Accuracy**: % of successful merges
`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: guide,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  } catch (error: any) {
    logger.error('Error generating prompt', { name, error: error.message });
    throw error;
  }
}
