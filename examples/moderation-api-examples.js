/**
 * Clipper Moderation API - JavaScript Examples
 * 
 * Usage with Node.js:
 *   export API_TOKEN="your_jwt_token_here"
 *   node moderation-api-examples.js
 * 
 * Or in browser:
 *   const token = 'your_jwt_token_here';
 *   // Then run the examples
 */

const API_BASE = process.env.API_BASE || 'https://api.clpr.tv/api/v1/moderation';
const API_TOKEN = process.env.API_TOKEN || '';

if (!API_TOKEN) {
  console.error('Error: API_TOKEN environment variable is required');
  console.error('Usage: export API_TOKEN="your_token" && node moderation-api-examples.js');
  process.exit(1);
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`API Error (${response.status}): ${error.error || 'Request failed'}`);
  }

  // Handle CSV responses
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.text();
  }

  return response.json();
}

// Example 1: Sync Bans from Twitch
async function example1_syncBans() {
  console.log('=== Example 1: Sync Bans from Twitch ===');
  try {
    const channelId = process.env.CHANNEL_ID || '123e4567-e89b-12d3-a456-426614174000';
    const result = await apiCall('/sync-bans', {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    });
    console.log('Sync started:', result);
    console.log(`Job ID: ${result.job_id}`);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 2: List Bans for a Channel
async function example2_listBans() {
  console.log('=== Example 2: List Bans for a Channel ===');
  try {
    const channelId = process.env.CHANNEL_ID || '123e4567-e89b-12d3-a456-426614174000';
    const params = new URLSearchParams({
      channelId,
      limit: '10',
      offset: '0',
    });
    const result = await apiCall(`/bans?${params}`);
    console.log(`Total bans: ${result.total}`);
    console.log(`Retrieved: ${result.bans.length} bans`);
    result.bans.slice(0, 3).forEach((ban, i) => {
      console.log(`  ${i + 1}. User ${ban.username} banned for: ${ban.reason}`);
    });
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 3: Create a Ban
async function example3_createBan() {
  console.log('=== Example 3: Create a Ban ===');
  try {
    const channelId = process.env.CHANNEL_ID || '123e4567-e89b-12d3-a456-426614174000';
    const userId = process.env.USER_TO_BAN || 'user-uuid-to-ban';
    
    const result = await apiCall('/ban', {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        userId,
        reason: 'Violation of community guidelines',
      }),
    });
    console.log('Ban created:', result);
    console.log(`Ban ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 4: Get Ban Details
async function example4_getBanDetails(banId) {
  console.log('=== Example 4: Get Ban Details ===');
  try {
    if (!banId) {
      console.log('Skipping: No ban ID provided');
      console.log('');
      return;
    }
    const result = await apiCall(`/ban/${banId}`);
    console.log('Ban details:', result);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 5: List Moderators
async function example5_listModerators() {
  console.log('=== Example 5: List Moderators ===');
  try {
    const channelId = process.env.CHANNEL_ID || '123e4567-e89b-12d3-a456-426614174000';
    const params = new URLSearchParams({
      channelId,
      limit: '10',
    });
    const result = await apiCall(`/moderators?${params}`);
    console.log(`Total moderators: ${result.total}`);
    result.moderators.forEach((mod, i) => {
      console.log(`  ${i + 1}. ${mod.username} (${mod.role})`);
    });
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 6: Add a Moderator
async function example6_addModerator() {
  console.log('=== Example 6: Add a Moderator ===');
  try {
    const channelId = process.env.CHANNEL_ID || '123e4567-e89b-12d3-a456-426614174000';
    const userId = process.env.USER_TO_MODERATE || 'user-uuid-to-moderate';
    
    const result = await apiCall('/moderators', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        channelId,
        reason: 'Trusted community member',
      }),
    });
    console.log('Moderator added:', result.message);
    console.log(`Moderator ID: ${result.moderator.id}`);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 7: List Audit Logs
async function example7_listAuditLogs() {
  console.log('=== Example 7: List Audit Logs ===');
  try {
    const params = new URLSearchParams({
      action: 'ban_user',
      limit: '10',
    });
    const result = await apiCall(`/audit-logs?${params}`);
    console.log(`Total logs: ${result.meta.total}`);
    result.data.slice(0, 3).forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.action} by ${log.moderatorUsername} at ${log.createdAt}`);
    });
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 8: Export Audit Logs to CSV
async function example8_exportAuditLogs() {
  console.log('=== Example 8: Export Audit Logs to CSV ===');
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const csv = await apiCall(`/audit-logs/export?${params}`);
    console.log('CSV Export (first 500 chars):');
    console.log(csv.substring(0, 500));
    console.log('...');
    return csv;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 9: Revoke a Ban
async function example9_revokeBan(banId) {
  console.log('=== Example 9: Revoke a Ban ===');
  try {
    if (!banId) {
      console.log('Skipping: No ban ID provided');
      console.log('');
      return;
    }
    const result = await apiCall(`/ban/${banId}`, {
      method: 'DELETE',
    });
    console.log('Ban revoked:', result);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Example 10: Remove a Moderator
async function example10_removeModerator(moderatorId) {
  console.log('=== Example 10: Remove a Moderator ===');
  try {
    if (!moderatorId) {
      console.log('Skipping: No moderator ID provided');
      console.log('');
      return;
    }
    const result = await apiCall(`/moderators/${moderatorId}`, {
      method: 'DELETE',
    });
    console.log('Moderator removed:', result);
    return result;
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');
}

// Run all examples
async function runAllExamples() {
  console.log('Starting Moderation API Examples...\n');
  
  await example1_syncBans();
  await example2_listBans();
  
  const banResult = await example3_createBan();
  const banId = banResult?.id;
  await example4_getBanDetails(banId);
  
  await example5_listModerators();
  const modResult = await example6_addModerator();
  const moderatorId = modResult?.moderator?.id;
  
  await example7_listAuditLogs();
  await example8_exportAuditLogs();
  
  await example9_revokeBan(banId);
  await example10_removeModerator(moderatorId);
  
  console.log('=== All examples completed ===\n');
  console.log('Note: Some examples may fail if resources don\'t exist or you lack permissions.');
  console.log('Update CHANNEL_ID, USER_TO_BAN, and USER_TO_MODERATE environment variables as needed.');
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples().catch(console.error);
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiCall,
    example1_syncBans,
    example2_listBans,
    example3_createBan,
    example4_getBanDetails,
    example5_listModerators,
    example6_addModerator,
    example7_listAuditLogs,
    example8_exportAuditLogs,
    example9_revokeBan,
    example10_removeModerator,
    runAllExamples,
  };
}
