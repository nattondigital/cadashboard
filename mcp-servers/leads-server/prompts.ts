/**
 * Lead prompts for MCP server
 * Provides context-aware templates for AI interactions
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('LeadPrompts');

export const prompts = [
  {
    name: 'lead_summary',
    description: 'Generate a comprehensive summary of leads with statistics and insights',
    arguments: [
      {
        name: 'include_stage_breakdown',
        description: 'Whether to include detailed stage breakdown',
        required: false,
      },
      {
        name: 'include_hot_leads',
        description: 'Whether to include hot leads list',
        required: false,
      },
    ],
  },
  {
    name: 'lead_qualification',
    description: 'Framework and best practices for qualifying leads',
    arguments: [],
  },
  {
    name: 'lead_conversion_tips',
    description: 'Strategies and tips for converting leads to customers',
    arguments: [
      {
        name: 'lead_stage',
        description: 'Current stage of the lead for targeted advice',
        required: false,
      },
    ],
  },
  {
    name: 'lead_scoring_guide',
    description: 'Guide for effective lead scoring and prioritization',
    arguments: [],
  },
  {
    name: 'lead_nurturing',
    description: 'Best practices for nurturing leads through the sales funnel',
    arguments: [],
  },
  {
    name: 'get_lead_by_id',
    description: 'Instructions for retrieving a specific lead by its ID',
    arguments: [
      {
        name: 'lead_id',
        description: 'The lead ID to retrieve',
        required: true,
      },
    ],
  },
];

export async function getPrompt(name: string, args: any = {}): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  logger.info('Getting prompt', { name, args });

  const supabase = getSupabase();

  try {
    if (name === 'lead_summary') {
      const { data: allLeads } = await supabase.from('leads').select('*');

      const hot = allLeads?.filter((l: any) => l.interest === 'Hot') || [];
      const warm = allLeads?.filter((l: any) => l.interest === 'Warm') || [];
      const cold = allLeads?.filter((l: any) => l.interest === 'Cold') || [];
      const highScore = allLeads?.filter((l: any) => l.lead_score >= 70) || [];

      let summary = `# Lead Management Summary\n\n`;
      summary += `## Overview\n`;
      summary += `- **Total Leads**: ${allLeads?.length || 0}\n`;
      summary += `- **Hot Leads**: ${hot.length}\n`;
      summary += `- **Warm Leads**: ${warm.length}\n`;
      summary += `- **Cold Leads**: ${cold.length}\n\n`;

      const totalScore = allLeads?.reduce((sum: number, l: any) => sum + (l.lead_score || 0), 0) || 0;
      const avgScore = allLeads?.length ? Math.round(totalScore / allLeads.length) : 0;

      summary += `## Lead Quality\n`;
      summary += `- **Average Score**: ${avgScore}/100\n`;
      summary += `- **High Score Leads (70+)**: ${highScore.length}\n\n`;

      if (args.include_hot_leads !== false && hot.length > 0) {
        summary += `## 🔥 Hot Leads (${hot.length})\n\n`;
        hot.slice(0, 10).forEach((lead: any) => {
          summary += `- **${lead.name}** (Score: ${lead.lead_score}, Stage: ${lead.stage})`;
          if (lead.company) summary += ` - ${lead.company}`;
          summary += `\n`;
        });
        if (hot.length > 10) {
          summary += `\n...and ${hot.length - 10} more hot leads\n`;
        }
        summary += `\n`;
      }

      if (args.include_stage_breakdown !== false) {
        const stages = allLeads?.reduce((acc: any, lead: any) => {
          if (lead.stage) {
            acc[lead.stage] = (acc[lead.stage] || 0) + 1;
          }
          return acc;
        }, {});

        if (stages && Object.keys(stages).length > 0) {
          summary += `## Pipeline Stage Breakdown\n`;
          Object.entries(stages)
            .sort(([, a]: any, [, b]: any) => b - a)
            .forEach(([stage, count]: any) => {
              summary += `- **${stage}**: ${count} leads\n`;
            });
          summary += `\n`;
        }
      }

      const sources = allLeads?.reduce((acc: any, lead: any) => {
        if (lead.source) {
          acc[lead.source] = (acc[lead.source] || 0) + 1;
        }
        return acc;
      }, {});

      if (sources && Object.keys(sources).length > 0) {
        summary += `## Lead Sources\n`;
        Object.entries(sources)
          .sort(([, a]: any, [, b]: any) => b - a)
          .forEach(([source, count]: any) => {
            summary += `- **${source}**: ${count} leads\n`;
          });
        summary += `\n`;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentLeads = allLeads?.filter((l: any) => l.created_at >= thirtyDaysAgo).length || 0;

      summary += `## Recent Activity\n`;
      summary += `- **New Leads (Last 30 Days)**: ${recentLeads}\n`;

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

    if (name === 'lead_qualification') {
      const guide = `# Lead Qualification Framework

## Why Qualify Leads?

Qualifying leads helps you:
- Focus time on high-potential prospects
- Improve conversion rates
- Optimize resource allocation
- Reduce sales cycle time
- Increase revenue per lead

## BANT Framework

### Budget
**Questions to Ask:**
- What is your budget for this solution?
- Who controls the budget?
- What is your typical spending range?
- When do you plan to make the investment?

**Red Flags:**
- No budget allocated
- Budget significantly below solution cost
- Unknown budget authority

### Authority
**Questions to Ask:**
- Who makes the final decision?
- Who else is involved in the decision?
- What is your role in the decision process?
- Do you need approval from anyone else?

**Red Flags:**
- Speaking with someone with no decision-making power
- Multiple undefined stakeholders
- Unclear decision-making process

### Need
**Questions to Ask:**
- What problem are you trying to solve?
- Why is this important now?
- What happens if you don't solve this?
- How are you currently handling this?

**Red Flags:**
- No clear pain point
- Problem is not urgent
- Current solution is adequate

### Timeline
**Questions to Ask:**
- When do you need this implemented?
- What's driving your timeline?
- Are there any deadlines we should know about?
- When would you like to start?

**Red Flags:**
- No specific timeline
- "Just exploring options"
- Distant implementation date

## CHAMP Framework (Modern Approach)

### Challenges
What specific business challenges are they facing?
- Current pain points
- Impact on business
- Attempts to solve
- Urgency level

### Authority
Who has the power to make decisions?
- Decision maker identification
- Approval process
- Stakeholder mapping
- Internal champion

### Money
Can they afford the solution?
- Budget availability
- ROI expectations
- Value perception
- Payment terms

### Prioritization
How important is solving this problem?
- Priority level
- Competing initiatives
- Internal support
- Commitment level

## Lead Scoring Criteria

### Demographics (30 points)
- Company size: 0-10 points
- Industry fit: 0-10 points
- Location: 0-10 points

### Behavior (40 points)
- Website visits: 0-10 points
- Content downloads: 0-10 points
- Email engagement: 0-10 points
- Event attendance: 0-10 points

### Engagement (30 points)
- Response time: 0-10 points
- Meeting attendance: 0-10 points
- Referral source: 0-10 points

**Scoring Guidelines:**
- 70-100: Hot Lead (High priority)
- 40-69: Warm Lead (Medium priority)
- 0-39: Cold Lead (Low priority/nurture)

## Qualification Questions Bank

### Discovery Questions
1. What prompted you to reach out today?
2. What is your biggest challenge right now?
3. How long has this been a problem?
4. What have you tried so far?
5. What would an ideal solution look like?

### Budget Questions
1. Have you allocated budget for this?
2. What is your expected investment range?
3. When do budgets get approved?
4. How do you typically justify investments?

### Authority Questions
1. Who else should be involved in this discussion?
2. What does your decision-making process look like?
3. How have you made similar decisions in the past?
4. Who would need to approve this?

### Timeline Questions
1. When would you like to have this solved?
2. What's driving your timeline?
3. Are there any critical dates we should know about?
4. What happens if you miss your deadline?

### Competition Questions
1. Are you evaluating other solutions?
2. What alternatives are you considering?
3. What's most important in your decision?
4. How will you make your final decision?

## Disqualification Criteria

**When to Disqualify:**
- No budget and no authority to create one
- No genuine need or pain point
- Timeline is indefinite or too far out
- Poor fit with your solution
- Unrealistic expectations
- Unethical or problematic prospect

**How to Disqualify Gracefully:**
- Be honest and respectful
- Explain why it's not a good fit
- Offer alternatives if possible
- Keep door open for future
- Maintain professional relationship

## Next Steps After Qualification

### Hot Qualified Leads
1. Schedule demo immediately
2. Assign to senior sales rep
3. Create customized proposal
4. Fast-track through pipeline
5. Regular follow-up

### Warm Qualified Leads
1. Nurture with targeted content
2. Schedule follow-up call
3. Address specific concerns
4. Build relationship
5. Monitor engagement

### Cold/Unqualified Leads
1. Add to long-term nurture campaign
2. Provide valuable content
3. Check in quarterly
4. Re-qualify periodically
5. Consider disqualification

## Red Flags to Watch For

- Vague or evasive answers
- No sense of urgency
- Shopping for lowest price only
- Unrealistic expectations
- History of no-shows
- Poor communication
- Constant objections without resolution
- Requesting excessive custom work upfront
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

    if (name === 'lead_conversion_tips') {
      const stage = args.lead_stage || 'general';

      let tips = `# Lead Conversion Strategies\n\n`;

      if (stage === 'new_lead' || stage === 'general') {
        tips += `## Converting New Leads\n\n`;
        tips += `### Initial Response (First 5 Minutes)\n`;
        tips += `- Respond immediately to new inquiries\n`;
        tips += `- Personalize your outreach\n`;
        tips += `- Reference their specific interest\n`;
        tips += `- Offer immediate value\n\n`;

        tips += `### First Call Strategy\n`;
        tips += `1. **Build Rapport**: Start with a friendly conversation\n`;
        tips += `2. **Understand Needs**: Ask open-ended questions\n`;
        tips += `3. **Position Value**: Show how you solve their problem\n`;
        tips += `4. **Set Next Step**: Book follow-up or demo\n\n`;
      }

      tips += `## Universal Conversion Principles\n\n`;
      tips += `### 1. Speed to Lead\n`;
      tips += `- Contact within 5 minutes of inquiry\n`;
      tips += `- 78% higher conversion with instant response\n`;
      tips += `- Use automation for instant acknowledgment\n`;
      tips += `- Have a 24/7 response system\n\n`;

      tips += `### 2. Personalization\n`;
      tips += `- Use their name throughout\n`;
      tips += `- Reference their company/industry\n`;
      tips += `- Address their specific pain points\n`;
      tips += `- Tailor your solution presentation\n\n`;

      tips += `### 3. Value First Approach\n`;
      tips += `- Share valuable content\n`;
      tips += `- Offer free consultation\n`;
      tips += `- Provide industry insights\n`;
      tips += `- Solve small problems for free\n\n`;

      tips += `### 4. Social Proof\n`;
      tips += `- Share customer testimonials\n`;
      tips += `- Provide case studies\n`;
      tips += `- Show results and metrics\n`;
      tips += `- Leverage industry recognition\n\n`;

      tips += `### 5. Handle Objections\n`;
      tips += `- Listen completely to concerns\n`;
      tips += `- Acknowledge their perspective\n`;
      tips += `- Provide evidence-based responses\n`;
      tips += `- Offer risk reversal (guarantees)\n\n`;

      tips += `## Communication Best Practices\n\n`;
      tips += `### Email Communication\n`;
      tips += `- Keep subject lines specific and valuable\n`;
      tips += `- Write concise, scannable content\n`;
      tips += `- Always include clear call-to-action\n`;
      tips += `- Follow up 3-5 times minimum\n\n`;

      tips += `### Phone Communication\n`;
      tips += `- Prepare talking points before calling\n`;
      tips += `- Ask permission to take notes\n`;
      tips += `- Listen more than you talk (80/20 rule)\n`;
      tips += `- End with specific next step\n\n`;

      tips += `### Meeting Communication\n`;
      tips += `- Send agenda in advance\n`;
      tips += `- Start and end on time\n`;
      tips += `- Involve multiple stakeholders\n`;
      tips += `- Follow up within 24 hours\n\n`;

      tips += `## Follow-Up Cadence\n\n`;
      tips += `### Week 1\n`;
      tips += `- Day 1: Initial contact\n`;
      tips += `- Day 2: Follow-up email with resources\n`;
      tips += `- Day 3: Phone call attempt\n`;
      tips += `- Day 5: Value-add email\n`;
      tips += `- Day 7: Check-in call\n\n`;

      tips += `### Week 2-4\n`;
      tips += `- Week 2: Share case study\n`;
      tips += `- Week 3: Industry insight email\n`;
      tips += `- Week 4: Special offer or demo invite\n\n`;

      tips += `## Conversion Killers to Avoid\n\n`;
      tips += `### Don'ts\n`;
      tips += `✗ Being too pushy or aggressive\n`;
      tips += `✗ Talking only about your product\n`;
      tips += `✗ Ignoring their stated needs\n`;
      tips += `✗ Making promises you can't keep\n`;
      tips += `✗ Badmouthing competitors\n`;
      tips += `✗ Giving up after one contact\n`;
      tips += `✗ Using generic templates\n`;
      tips += `✗ Forgetting to follow up\n\n`;

      tips += `### Do's\n`;
      tips += `✓ Build genuine relationships\n`;
      tips += `✓ Focus on their success\n`;
      tips += `✓ Be consultative, not salesy\n`;
      tips += `✓ Set clear expectations\n`;
      tips += `✓ Differentiate with value\n`;
      tips += `✓ Persist professionally\n`;
      tips += `✓ Personalize every interaction\n`;
      tips += `✓ Track all activities\n\n`;

      tips += `## Conversion Metrics to Track\n\n`;
      tips += `- Lead response time\n`;
      tips += `- Contact-to-meeting ratio\n`;
      tips += `- Meeting-to-proposal ratio\n`;
      tips += `- Proposal-to-close ratio\n`;
      tips += `- Average sales cycle length\n`;
      tips += `- Lead source conversion rates\n`;
      tips += `- Stage conversion rates\n`;
      tips += `- Win/loss reasons\n`;

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

    if (name === 'lead_scoring_guide') {
      const guide = `# Lead Scoring Guide

## What is Lead Scoring?

Lead scoring assigns numerical values to leads based on their likelihood to convert, helping prioritize sales efforts.

## Scoring Model (0-100 points)

### Demographic Score (30 points max)

#### Company Size
- Enterprise (1000+ employees): 10 points
- Mid-Market (100-999 employees): 7 points
- Small Business (10-99 employees): 5 points
- Micro Business (1-9 employees): 3 points

#### Industry Fit
- Perfect fit (target industry): 10 points
- Good fit (adjacent industry): 7 points
- Moderate fit: 4 points
- Poor fit: 1 point

#### Budget Indication
- High budget (confirmed): 10 points
- Medium budget: 7 points
- Low budget: 3 points
- No budget info: 0 points

### Behavioral Score (40 points max)

#### Website Engagement
- Multiple page visits: 10 points
- Pricing page visit: 8 points
- Blog engagement: 5 points
- Single page visit: 2 points

#### Content Interaction
- Downloaded whitepaper/guide: 10 points
- Watched demo video: 8 points
- Read case study: 6 points
- Opened email: 2 points

#### Response Behavior
- Replied to email within 24 hours: 10 points
- Replied within 48 hours: 7 points
- Replied within a week: 4 points
- No response: 0 points

#### Meeting Engagement
- Attended scheduled meeting: 10 points
- Rescheduled meeting: 5 points
- No-show with apology: 2 points
- No-show without notice: -5 points

### Intent Score (30 points max)

#### Inquiry Type
- Demo request: 10 points
- Pricing inquiry: 9 points
- Product question: 7 points
- General inquiry: 4 points
- Newsletter signup: 2 points

#### Timeline
- Ready to buy now: 10 points
- Within 1 month: 8 points
- Within 3 months: 5 points
- Within 6 months: 3 points
- Just researching: 1 point

#### Referral Source
- Customer referral: 10 points
- Partner referral: 8 points
- Event/webinar: 6 points
- Organic search: 4 points
- Social media: 3 points
- Paid ads: 2 points

## Score Interpretation

### Hot Leads (70-100 points)
**Action Required:**
- Immediate personal outreach
- Assign to senior sales rep
- Fast-track through pipeline
- Daily follow-up
- Custom proposal within 48 hours

### Warm Leads (40-69 points)
**Action Required:**
- Contact within 24 hours
- Targeted nurturing campaign
- Share relevant case studies
- Weekly follow-up
- Move to qualified stage

### Cold Leads (0-39 points)
**Action Required:**
- Long-term nurture campaign
- Educational content drip
- Monthly check-ins
- Re-score after engagement
- Consider disqualification if no activity

## Negative Scoring

Deduct points for:
- Unsubscribe from emails: -10 points
- Multiple no-shows: -5 points each
- Spam/fake contact info: -50 points
- Competitor research: -20 points
- Outside target market: -15 points

## Dynamic Score Adjustments

### Increase Score When:
- Lead attends webinar
- Lead downloads multiple resources
- Lead visits pricing page multiple times
- Lead responds quickly
- Lead refers others
- Lead engages with multiple stakeholders

### Decrease Score When:
- No activity for 30+ days
- Declines meeting invitations
- Unresponsive to multiple contacts
- Negative feedback
- Budget concerns arise

## Score Maintenance

### Weekly Review
- Audit high-scoring inactive leads
- Re-score engaged cold leads
- Update scoring criteria
- Remove duplicates
- Verify contact information

### Monthly Review
- Analyze conversion rates by score
- Adjust scoring weights
- Review source effectiveness
- Update ICP criteria
- Train team on changes

## Implementation Tips

### Do's
✓ Start simple, refine over time
✓ Align sales and marketing on criteria
✓ Test and measure regularly
✓ Automate score calculations
✓ Review scores before contact
✓ Document scoring logic
✓ Train team on interpretation

### Don'ts
✗ Make scoring too complex
✗ Set and forget the model
✗ Ignore low scores completely
✗ Score without context
✗ Keep poor criteria
✗ Fail to communicate changes
✗ Rely solely on scores

## Integration with CRM

- Auto-calculate scores on profile updates
- Trigger alerts for high-scoring leads
- Create automated workflows by score
- Generate reports by score ranges
- Track score changes over time
- Segment marketing by score

## Success Metrics

Track these KPIs:
- Conversion rate by score range
- Score distribution (% in each range)
- Time to conversion by score
- Accuracy of score predictions
- Sales velocity by score
- ROI by score range
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

    if (name === 'lead_nurturing') {
      const guide = `# Lead Nurturing Best Practices

## What is Lead Nurturing?

Building relationships with prospects at every stage of the buyer's journey, providing value and staying top-of-mind until they're ready to buy.

## Why Nurture Leads?

- 80% of new leads never convert to sales
- Nurtured leads produce 20% increase in opportunities
- Nurtured leads spend 47% more than non-nurtured
- 96% of visitors aren't ready to buy on first visit

## Nurturing Framework

### Stage 1: Awareness (Days 1-14)
**Goal:** Establish credibility and educate

**Content Types:**
- Educational blog posts
- Industry insights
- How-to guides
- Webinar invitations
- Company introduction

**Frequency:** 2-3 emails per week

### Stage 2: Consideration (Days 15-30)
**Goal:** Build trust and demonstrate value

**Content Types:**
- Case studies
- Product comparisons
- ROI calculators
- Customer testimonials
- Demo videos

**Frequency:** 1-2 emails per week

### Stage 3: Decision (Days 31-60)
**Goal:** Address objections and close

**Content Types:**
- Free trials
- Custom proposals
- Pricing information
- Implementation guides
- Success stories

**Frequency:** 1 email per week + calls

### Stage 4: Re-engagement (Days 61+)
**Goal:** Revive interest

**Content Types:**
- New features/updates
- Special offers
- Industry news
- "We miss you" campaigns
- Survey for feedback

**Frequency:** 1 email every 2 weeks

## Multi-Channel Nurturing

### Email Nurturing
- Personalized subject lines
- Value-driven content
- Clear CTAs
- Mobile-optimized
- A/B test everything

### Phone Nurturing
- Schedule check-in calls
- Don't be salesy
- Ask for feedback
- Provide updates
- Build relationship

### Social Media Nurturing
- Connect on LinkedIn
- Share their content
- Comment on their posts
- Share relevant insights
- Direct message sparingly

### Content Nurturing
- Personalized landing pages
- Gated premium content
- Interactive tools
- Video content
- Podcasts/webinars

## Nurturing Campaigns by Source

### Website Leads
Day 1: Welcome email + resources
Day 3: Case study relevant to interest
Day 7: Product demo invite
Day 14: Customer success story
Day 21: Pricing and next steps

### Event/Webinar Leads
Day 1: Thank you + recording
Day 2: Related resources
Day 5: Schedule follow-up call
Day 10: Case study
Day 15: Demo offer

### Referral Leads
Day 1: Thank referrer, intro to lead
Day 1: Personalized welcome (hot lead)
Day 3: Custom proposal
Day 5: Schedule meeting
Day 7: Close or qualify further

### Cold Leads
Week 1: Educational content
Week 2: Industry insights
Month 2: Success story
Month 3: Special offer
Month 6: Re-qualification attempt

## Personalization Tactics

### Basic Personalization
- Use first name
- Reference company name
- Mention industry
- Location-based content
- Job title relevance

### Advanced Personalization
- Previous page visits
- Download history
- Email engagement patterns
- Social media activity
- Custom pain points
- Buying stage indicators

## Automation Best Practices

### What to Automate
✓ Welcome emails
✓ Content drip campaigns
✓ Score-based triggers
✓ Re-engagement campaigns
✓ Task reminders
✓ Lead assignment

### What to Keep Manual
✓ High-value lead outreach
✓ Custom proposals
✓ Complex objection handling
✓ Relationship building calls
✓ Negotiation discussions
✓ Close conversations

## Content Calendar Template

### Week 1: Introduction
- Email 1: Welcome & set expectations
- Email 2: Your biggest challenge guide
- Email 3: Quick win tip

### Week 2: Education
- Email 1: Industry trend analysis
- Email 2: Common mistakes guide
- Email 3: Tool/resource recommendation

### Week 3: Engagement
- Email 1: Interactive content (quiz/calculator)
- Email 2: Webinar invitation
- Email 3: Case study spotlight

### Week 4: Value Demonstration
- Email 1: Customer success story
- Email 2: Product/service overview
- Email 3: Demo invitation

### Week 5-8: Decision Support
- Bi-weekly emails with:
  - Comparison guides
  - ROI content
  - Testimonials
  - Pricing information
  - Implementation support

## Nurturing Metrics

### Engagement Metrics
- Email open rates
- Click-through rates
- Content downloads
- Website revisits
- Video watch time

### Conversion Metrics
- Lead scoring increases
- Stage progression rate
- Meeting booking rate
- Proposal request rate
- Close rate

### Efficiency Metrics
- Time in nurture
- Cost per nurtured lead
- Nurture-to-SQL ratio
- Campaign ROI
- Unsubscribe rate

## Common Nurturing Mistakes

### Mistakes to Avoid
✗ Too frequent communication
✗ Irrelevant content
✗ Always pitching
✗ No personalization
✗ Ignoring engagement signals
✗ Same cadence for all
✗ No clear CTA
✗ Not testing/optimizing

### Best Practices
✓ Balance frequency
✓ Segment audiences
✓ Provide value first
✓ Personalize at scale
✓ Monitor engagement
✓ Customize by stage
✓ Clear next steps
✓ Continuous improvement

## When to Stop Nurturing

### Good Reasons
- Lead explicitly opts out
- Lead becomes customer
- Lead is definitively unqualified
- Lead is acquired by competitor
- Lead becomes non-viable
- No engagement after 12 months

### Bad Reasons
- Lead hasn't responded yet
- Lead needs more time
- Wrong timing for lead
- Haven't tried all channels
- Haven't provided enough value
- Your assumption about readiness

## Success Checklist

✓ Clear segmentation strategy
✓ Content mapped to buyer journey
✓ Automation workflows set up
✓ Lead scoring in place
✓ Multi-channel approach
✓ Regular content updates
✓ Performance tracking
✓ A/B testing program
✓ Sales-marketing alignment
✓ Feedback loops established
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

    if (name === 'get_lead_by_id') {
      const leadId = args.lead_id;
      if (!leadId) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: '# How to Retrieve a Lead by ID\n\nTo get details of a specific lead, use the `get_leads` tool with the `id` parameter:\n\n```json\n{\n  "id": "uuid-here"\n}\n```\n\nOr use the lead_id parameter:\n\n```json\n{\n  "lead_id": "LEAD-1001"\n}\n```\n\nThis will return the complete lead details including contact information, scoring, stage, and history.',
              },
            },
          ],
        };
      }

      const { data: leads } = await supabase.from('leads').select('*').eq('id', leadId);

      if (!leads || leads.length === 0) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `# Lead Not Found\n\nLead with ID **${leadId}** was not found in the system.\n\nPlease verify the lead ID and try again.`,
              },
            },
          ],
        };
      }

      const lead = leads[0];
      let details = `# Lead Details: ${lead.lead_id}\n\n`;
      details += `## ${lead.name}\n\n`;

      details += `### Contact Information\n`;
      if (lead.email) details += `- **Email**: ${lead.email}\n`;
      if (lead.phone) details += `- **Phone**: ${lead.phone}\n`;
      if (lead.company) details += `- **Company**: ${lead.company}\n`;
      if (lead.address) details += `- **Address**: ${lead.address}\n`;
      details += `\n`;

      details += `### Lead Status\n`;
      details += `- **Interest Level**: ${lead.interest}\n`;
      details += `- **Stage**: ${lead.stage}\n`;
      details += `- **Owner**: ${lead.owner}\n`;
      details += `- **Lead Score**: ${lead.lead_score}/100\n`;
      if (lead.source) details += `- **Source**: ${lead.source}\n`;
      details += `\n`;

      if (lead.notes) {
        details += `### Notes\n${lead.notes}\n\n`;
      }

      details += `### Activity\n`;
      if (lead.last_contact) {
        details += `- **Last Contacted**: ${lead.last_contact}\n`;
      }
      details += `- **Created**: ${lead.created_at}\n`;
      details += `- **Last Updated**: ${lead.updated_at}\n`;

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

    throw new Error(`Unknown prompt: ${name}`);
  } catch (error: any) {
    logger.error('Error generating prompt', { name, error: error.message });
    throw error;
  }
}
