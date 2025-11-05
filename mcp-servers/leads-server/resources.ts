/**
 * Lead resources for MCP server
 * Provides read-only access to lead data
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import type { Lead, LeadStatistics } from '../shared/types.js';

const logger = createLogger('LeadResources');

export const resources = [
  {
    uri: 'leads://all',
    name: 'All Leads',
    description: 'Complete list of all leads in the system',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://hot',
    name: 'Hot Leads',
    description: 'Leads with interest level "Hot"',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://warm',
    name: 'Warm Leads',
    description: 'Leads with interest level "Warm"',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://cold',
    name: 'Cold Leads',
    description: 'Leads with interest level "Cold"',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://high-score',
    name: 'High Score Leads',
    description: 'Leads with score 70 or above',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://recent',
    name: 'Recent Leads',
    description: 'Leads created in the last 30 days',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://new',
    name: 'New Leads',
    description: 'Leads in "new_lead" stage',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://statistics',
    name: 'Lead Statistics',
    description: 'Aggregate statistics about leads',
    mimeType: 'application/json',
  },
  {
    uri: 'leads://lead/{id}',
    name: 'Individual Lead',
    description: 'Get details of a specific lead by ID',
    mimeType: 'application/json',
  },
];

export async function readResource(uri: string): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  logger.info('Reading resource', { uri });

  const supabase = getSupabase();

  try {
    if (uri === 'leads://all') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://hot') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('interest', 'Hot')
        .order('lead_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://warm') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('interest', 'Warm')
        .order('lead_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://cold') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('interest', 'Cold')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://high-score') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('lead_score', 70)
        .order('lead_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://recent') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://new') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('stage', 'new_lead')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ leads: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'leads://statistics') {
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('stage, interest, source, owner, lead_score, created_at, last_contact, email, phone');

      if (error) throw error;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const statistics: LeadStatistics = {
        total: allLeads?.length || 0,
        by_stage: {},
        by_interest: {
          Hot: 0,
          Warm: 0,
          Cold: 0,
        },
        by_source: {},
        by_owner: {},
        average_score: 0,
        high_score_leads: 0,
        recent_leads: 0,
        with_email: 0,
        with_phone: 0,
        contacted_recently: 0,
      };

      let totalScore = 0;

      allLeads?.forEach((lead: any) => {
        if (lead.stage) {
          statistics.by_stage[lead.stage] = (statistics.by_stage[lead.stage] || 0) + 1;
        }

        if (lead.interest) {
          statistics.by_interest[lead.interest as keyof typeof statistics.by_interest] =
            (statistics.by_interest[lead.interest as keyof typeof statistics.by_interest] || 0) + 1;
        }

        if (lead.source) {
          statistics.by_source[lead.source] = (statistics.by_source[lead.source] || 0) + 1;
        }

        if (lead.owner) {
          statistics.by_owner[lead.owner] = (statistics.by_owner[lead.owner] || 0) + 1;
        }

        if (lead.lead_score) {
          totalScore += lead.lead_score;
          if (lead.lead_score >= 70) {
            statistics.high_score_leads++;
          }
        }

        if (lead.created_at >= thirtyDaysAgo) {
          statistics.recent_leads++;
        }

        if (lead.last_contact && lead.last_contact >= sevenDaysAgo) {
          statistics.contacted_recently++;
        }

        if (lead.email) statistics.with_email++;
        if (lead.phone) statistics.with_phone++;
      });

      statistics.average_score = allLeads?.length ? Math.round(totalScore / allLeads.length) : 0;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(statistics, null, 2),
        }],
      };
    }

    if (uri.startsWith('leads://lead/')) {
      const leadId = uri.replace('leads://lead/', '');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        }],
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  } catch (error: any) {
    logger.error('Error reading resource', { uri, error: error.message });
    throw error;
  }
}
