#!/usr/bin/env node

/**
 * Social Features E2E Test Validation Script
 * 
 * Performs static analysis and validation of the social features test suite:
 * - Counts test cases
 * - Validates test structure
 * - Checks for required test scenarios
 * - Reports test coverage
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const testFilePath = resolve(process.cwd(), 'frontend/e2e/tests/social-features.spec.ts');

console.log('🔍 Validating Social Features E2E Tests\n');

try {
  const content = readFileSync(testFilePath, 'utf-8');
  
  // Count test cases
  const testMatches = content.match(/test\(/g) || [];
  const testDescribeMatches = content.match(/test\.describe\(/g) || [];
  
  console.log('📊 Test Statistics:');
  console.log(`  - Test suites: ${testDescribeMatches.length}`);
  console.log(`  - Individual tests: ${testMatches.length}`);
  console.log(`  - Total test cases: ${testMatches.length}\n`);
  
  // Check for required test scenarios
  const requiredScenarios = [
    { name: 'Comments CRUD', pattern: /Comments - CRUD Operations/ },
    { name: 'Comment Moderation', pattern: /Comments - Moderation/ },
    { name: 'Comment Voting', pattern: /Voting - Comments/ },
    { name: 'Clip Voting', pattern: /Voting - Clips/ },
    { name: 'Following Users', pattern: /Following - User Relationships/ },
    { name: 'Playlist CRUD', pattern: /Playlists - CRUD/ },
    { name: 'Playlist Sharing', pattern: /Playlists - Sharing/ },
    { name: 'User Blocking', pattern: /Blocking - User Blocking/ },
    { name: 'Rate Limiting', pattern: /Rate Limiting - Behavior/ },
    { name: 'Cross-User Scenarios', pattern: /Social Features - Cross-User/ },
    { name: 'Performance Tests', pattern: /Social Features - Performance/ },
  ];
  
  console.log('✅ Required Test Scenarios:');
  
  const scenarioResults = requiredScenarios.map((scenario) => {
    const found = scenario.pattern.test(content);
    const status = found ? '✓' : '✗';
    console.log(`  ${status} ${scenario.name}`);
    return found;
  });
  const allScenariosCovered = scenarioResults.every(Boolean);
  
  console.log();
  
  // Check for specific test cases
  const criticalTests = [
    'create a comment',
    'edit a comment',
    'delete a comment',
    'upvote a clip',
    'downvote a clip',
    'follow a user',
    'unfollow a user',
    'create a playlist',
    'add clips to a playlist',
    'block a user',
    'trigger rate limit',
    'prevent duplicate voting',
    'hide blocked user content',
  ];
  
  console.log('🔍 Critical Test Cases:');
  let criticalTestsCovered = 0;
  
  for (const testName of criticalTests) {
    const found = content.toLowerCase().includes(testName.toLowerCase());
    const status = found ? '✓' : '✗';
    console.log(`  ${status} ${testName}`);
    if (found) criticalTestsCovered++;
  }
  
  console.log();
  
  // Check for utility imports
  const requiredUtilities = [
    'createComment',
    'voteOnComment',
    'voteOnClip',
    'followUser',
    'createPlaylist',
    'blockUser',
    'triggerRateLimit',
  ];
  
  console.log('📦 Utility Function Usage:');
  
  const utilityResults = requiredUtilities.map((utility) => {
    const found = content.includes(utility);
    const status = found ? '✓' : '✗';
    console.log(`  ${status} ${utility}`);
    return found;
  });
  const allUtilitiesImported = utilityResults.every(Boolean);
  
  console.log();
  
  // Calculate coverage scores
  const scenarioCoverage = (requiredScenarios.filter(s => s.pattern.test(content)).length / requiredScenarios.length) * 100;
  const criticalTestCoverage = (criticalTestsCovered / criticalTests.length) * 100;
  const utilityCoverage = (requiredUtilities.filter(u => content.includes(u)).length / requiredUtilities.length) * 100;
  
  console.log('📈 Coverage Summary:');
  console.log(`  - Scenario Coverage: ${scenarioCoverage.toFixed(1)}%`);
  console.log(`  - Critical Tests: ${criticalTestCoverage.toFixed(1)}%`);
  console.log(`  - Utility Usage: ${utilityCoverage.toFixed(1)}%`);
  console.log();
  
  // Final assessment
  const overallScore = (scenarioCoverage + criticalTestCoverage + utilityCoverage) / 3;
  
  console.log('🎯 Overall Test Quality Score:', overallScore.toFixed(1) + '%');
  
  if (overallScore >= 95) {
    console.log('✅ EXCELLENT: Test suite meets all requirements!\n');
    process.exit(0);
  } else if (overallScore >= 80) {
    console.log('⚠️  GOOD: Test suite is comprehensive but could be improved.\n');
    process.exit(0);
  } else {
    console.log('❌ NEEDS IMPROVEMENT: Test suite is missing critical scenarios.\n');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error reading test file:', error.message);
  process.exit(1);
}
