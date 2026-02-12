#!/usr/bin/env node
/**
 * Batch MCP Scanner
 * Scans all 32,205 MCP servers from our database
 * Stores results in D1 for dashboard display
 * 
 * Usage: node batch-mcp-scan.mjs
 */

const API_BASE = 'https://skillshield-mcp-scanner.charlessturt1795.workers.dev';
const DELAY_MS = 2000; // 2 seconds between scans (rate limiting)

const MCP_COUNT = 32205; // From our data

console.log('🔍 Batch MCP Scanner');
console.log('====================');
console.log(`Target: ${MCP_COUNT.toLocaleString()} MCP servers`);
console.log(`API: ${API_BASE}`);
console.log(`Estimated time: ${((MCP_COUNT * DELAY_MS) / 3600000).toFixed(1)} hours`);
console.log('');

// Priority scan list (high-traffic/popular MCPs)
const PRIORITY_MCPs = [
  { owner: 'modelcontextprotocol', repo: 'server-filesystem' },
  { owner: 'modelcontextprotocol', repo: 'server-github' },
  { owner: 'modelcontextprotocol', repo: 'server-postgres' },
  { owner: 'modelcontextprotocol', repo: 'server-slack' },
  { owner: 'anthropics', repo: 'anthropic-cookbook' },
  { owner: 'calclavia', repo: 'mcp-obsidian' },
  { owner: 'zueai', repo: 'mcp-manager' }
];

async function scanMCP(owner, repo) {
  const source = `github:${owner}/${repo}`;
  
  try {
    const response = await fetch(`${API_BASE}/api/mcp/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    });
    
    const result = await response.json();
    
    if (result.error) {
      return { success: false, error: result.error };
    }
    
    return { 
      success: true, 
      score: result.score,
      risk: result.risk,
      findings: result.findings?.length || 0,
      scanId: result.id
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runPriorityScans() {
  console.log('🎯 Phase 1: Priority MCPs');
  console.log('=========================\n');
  
  const results = [];
  
  for (let i = 0; i < PRIORITY_MCPs.length; i++) {
    const { owner, repo } = PRIORITY_MCPs[i];
    console.log(`[${i + 1}/${PRIORITY_MCPs.length}] Scanning ${owner}/${repo}...`);
    
    const result = await scanMCP(owner, repo);
    
    if (result.success) {
      console.log(`  ✅ Score: ${result.score}/100 (${result.risk}) - ${result.findings} findings`);
    } else {
      console.log(`  ⚠️  ${result.error}`);
    }
    
    results.push({ owner, repo, ...result });
    
    if (i < PRIORITY_MCPs.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  
  console.log('\n📊 Priority Scan Summary');
  console.log('========================');
  const successful = results.filter(r => r.success);
  const critical = results.filter(r => r.success && r.score < 40);
  const high = results.filter(r => r.success && r.score >= 40 && r.score < 60);
  
  console.log(`Scanned: ${successful.length}/${results.length}`);
  console.log(`Critical Risk: ${critical.length}`);
  console.log(`High Risk: ${high.length}`);
  console.log(`Average Score: ${successful.length > 0 ? (successful.reduce((a, r) => a + r.score, 0) / successful.length).toFixed(1) : 'N/A'}`);
  
  return results;
}

// Run priority scans
runPriorityScans().then(results => {
  console.log('\n✅ Priority scanning complete');
  console.log('Next: Full batch scan of remaining MCPs');
  console.log('Run: node batch-mcp-scan-full.mjs');
});
