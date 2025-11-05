/**
 * Contact resources for MCP server
 * Provides read-only access to contact data
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';
import type { Contact, ContactStatistics } from '../shared/types.js';

const logger = createLogger('ContactResources');

export const resources = [
  {
    uri: 'contacts://all',
    name: 'All Contacts',
    description: 'Complete list of all contacts in the system',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://active',
    name: 'Active Contacts',
    description: 'Contacts with status "Active"',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://recent',
    name: 'Recent Contacts',
    description: 'Contacts created in the last 30 days',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://customers',
    name: 'Customer Contacts',
    description: 'Contacts with type "Customer"',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://leads',
    name: 'Lead Contacts',
    description: 'Contacts with type "Lead"',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://vendors',
    name: 'Vendor Contacts',
    description: 'Contacts with type "Vendor"',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://statistics',
    name: 'Contact Statistics',
    description: 'Aggregate statistics about contacts',
    mimeType: 'application/json',
  },
  {
    uri: 'contacts://contact/{id}',
    name: 'Individual Contact',
    description: 'Get details of a specific contact by ID',
    mimeType: 'application/json',
  },
];

export async function readResource(uri: string): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  logger.info('Reading resource', { uri });

  const supabase = getSupabase();

  try {
    if (uri === 'contacts://all') {
      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://active') {
      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://recent') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://customers') {
      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('contact_type', 'Customer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://leads') {
      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('contact_type', 'Lead')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://vendors') {
      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('contact_type', 'Vendor')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ contacts: data || [], count: data?.length || 0 }, null, 2),
        }],
      };
    }

    if (uri === 'contacts://statistics') {
      const { data: allContacts, error } = await supabase
        .from('contacts_master')
        .select('contact_type, status, city, state, email, phone, created_at');

      if (error) throw error;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const statistics: ContactStatistics = {
        total: allContacts?.length || 0,
        by_type: {
          Customer: 0,
          Lead: 0,
          Vendor: 0,
          individual: 0,
        },
        by_status: {
          Active: 0,
          Inactive: 0,
        },
        by_city: {},
        by_state: {},
        recent_contacts: 0,
        with_email: 0,
        with_phone: 0,
      };

      allContacts?.forEach((contact: any) => {
        if (contact.contact_type) {
          statistics.by_type[contact.contact_type as keyof typeof statistics.by_type] =
            (statistics.by_type[contact.contact_type as keyof typeof statistics.by_type] || 0) + 1;
        }

        if (contact.status) {
          statistics.by_status[contact.status as keyof typeof statistics.by_status] =
            (statistics.by_status[contact.status as keyof typeof statistics.by_status] || 0) + 1;
        }

        if (contact.city) {
          statistics.by_city[contact.city] = (statistics.by_city[contact.city] || 0) + 1;
        }

        if (contact.state) {
          statistics.by_state[contact.state] = (statistics.by_state[contact.state] || 0) + 1;
        }

        if (contact.created_at >= thirtyDaysAgo) {
          statistics.recent_contacts++;
        }

        if (contact.email) statistics.with_email++;
        if (contact.phone) statistics.with_phone++;
      });

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(statistics, null, 2),
        }],
      };
    }

    if (uri.startsWith('contacts://contact/')) {
      const contactId = uri.replace('contacts://contact/', '');

      const { data, error } = await supabase
        .from('contacts_master')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(`Contact not found: ${contactId}`);
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
