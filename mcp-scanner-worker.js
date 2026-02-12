// MCP Security Scanner — Core Engine
// Cloudflare Worker for analyzing MCP server security

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Scan MCP server
    if (path === '/api/mcp/scan' && request.method === 'POST') {
      const body = await request.json();
      const { source } = body;
      
      if (!source || !source.startsWith('github:')) {
        return new Response(JSON.stringify({ 
          error: 'Invalid source. Use github:owner/repo format' 
        }), { status: 400, headers: corsHeaders });
      }
      
      const scanResult = await scanMCP(source, env);
      return new Response(JSON.stringify(scanResult), { headers: corsHeaders });
    }
    
    // Get scan results
    if (path.startsWith('/api/mcp/report/') && request.method === 'GET') {
      const scanId = path.split('/').pop();
      const result = await getScanResult(scanId, env);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }
    
    // Get recent MCP scans
    if (path === '/api/mcp/recent' && request.method === 'GET') {
      const recent = await getRecentScans(env);
      return new Response(JSON.stringify(recent), { headers: corsHeaders });
    }
    
    return new Response(JSON.stringify({ error: 'Not found' }), { 
      status: 404, 
      headers: corsHeaders 
    });
  }
};

async function scanMCP(source, env) {
  const scanId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Parse GitHub source
  const [, owner, repo] = source.match(/github:([^/]+)\/(.+)/) || [];
  if (!owner || !repo) {
    return { error: 'Invalid GitHub source format' };
  }
  
  // Fetch MCP manifest
  const manifest = await fetchGitHubFile(owner, repo, 'mcp.json');
  if (!manifest) {
    return { error: 'No mcp.json found in repository' };
  }
  
  // Parse manifest
  let mcpConfig;
  try {
    mcpConfig = JSON.parse(manifest);
  } catch (e) {
    return { error: 'Invalid mcp.json format' };
  }
  
  // Run security analysis
  const findings = [];
  
  // Check 1: Tool poisoning in descriptions
  const toolPoisoning = analyzeToolDescriptions(mcpConfig.tools || []);
  findings.push(...toolPoisoning);
  
  // Check 2: Permission scope analysis
  const permissionRisks = analyzePermissions(mcpConfig);
  findings.push(...permissionRisks);
  
  // Check 3: Schema validation issues
  const schemaIssues = analyzeSchemas(mcpConfig.tools || []);
  findings.push(...schemaIssues);
  
  // Check 4: Fetch and analyze source code
  const sourceRisks = await analyzeSourceCode(owner, repo);
  findings.push(...sourceRisks);
  
  // Calculate score
  const score = calculateScore(findings);
  const riskLevel = getRiskLevel(score);
  
  const result = {
    id: scanId,
    source,
    owner,
    repo,
    score,
    risk: riskLevel,
    findings: findings.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity)),
    toolsAnalyzed: (mcpConfig.tools || []).length,
    scanDuration: ((Date.now() - startTime) / 1000).toFixed(2),
    scannedAt: new Date().toISOString()
  };
  
  // Store result
  await env.MCP_SCANS.put(scanId, JSON.stringify(result));
  
  return result;
}

// Tool Poisoning Detection
function analyzeToolDescriptions(tools) {
  const findings = [];
  const suspiciousPatterns = [
    { pattern: /ignore previous|disregard.*instruction/i, type: 'prompt-injection' },
    { pattern: /send.*to.*http|exfiltrate|upload to/i, type: 'data-exfiltration' },
    { pattern: /execute.*command|run.*shell|system\(/i, type: 'code-execution' },
    { pattern: /password|token|key.*send/i, type: 'credential-theft' }
  ];
  
  for (const tool of tools) {
    const description = (tool.description || '').toLowerCase();
    
    for (const { pattern, type } of suspiciousPatterns) {
      if (pattern.test(description)) {
        findings.push({
          severity: 'CRITICAL',
          category: 'tool-poisoning',
          title: `Suspicious ${type} in tool description`,
          tool: tool.name,
          description: `Tool "${tool.name}" description contains potential ${type} vector`,
          evidence: tool.description.substring(0, 200),
          remediation: 'Review tool description for malicious instructions. Ensure descriptions only explain functionality.'
        });
      }
    }
    
    // Check for very long descriptions (hiding malicious content)
    if (description.length > 1000) {
      findings.push({
        severity: 'MEDIUM',
        category: 'tool-poisoning',
        title: 'Unusually long tool description',
        tool: tool.name,
        description: 'Tool description is unusually long, potentially hiding malicious instructions',
        evidence: `Description length: ${description.length} characters`,
        remediation: 'Keep tool descriptions concise and focused on functionality'
      });
    }
  }
  
  return findings;
}

// Permission Analysis
function analyzePermissions(config) {
  const findings = [];
  const capabilities = config.capabilities || {};
  
  // Check for dangerous capabilities
  if (capabilities.filesystem === 'full' || capabilities.filesystem === true) {
    findings.push({
      severity: 'HIGH',
      category: 'permissions',
      title: 'Unrestricted filesystem access',
      description: 'MCP server requests full filesystem read/write access',
      evidence: 'capabilities.filesystem: ' + JSON.stringify(capabilities.filesystem),
      remediation: 'Limit filesystem access to specific directories using { read: ["/allowed/path"] }'
    });
  }
  
  if (capabilities.network === true || capabilities.fetch === true) {
    findings.push({
      severity: 'MEDIUM',
      category: 'permissions',
      title: 'Outbound network access enabled',
      description: 'Server can make outbound HTTP requests',
      evidence: 'capabilities.network or capabilities.fetch enabled',
      remediation: 'Disable network access if not required, or whitelist specific domains'
    });
  }
  
  if (capabilities.execute === true || capabilities.command === true) {
    findings.push({
      severity: 'CRITICAL',
      category: 'permissions',
      title: 'Command execution enabled',
      description: 'MCP server can execute arbitrary system commands',
      evidence: 'capabilities.execute or capabilities.command enabled',
      remediation: 'Remove command execution capability. Use safer alternatives.'
    });
  }
  
  // Check for environment variable access
  if (capabilities.env === true || capabilities.environment === true) {
    findings.push({
      severity: 'HIGH',
      category: 'permissions',
      title: 'Environment variable access',
      description: 'Server can access all environment variables including secrets',
      evidence: 'Environment access capability detected',
      remediation: 'Explicitly whitelist only required environment variables'
    });
  }
  
  return findings;
}

// Schema Analysis
function analyzeSchemas(tools) {
  const findings = [];
  
  for (const tool of tools) {
    const schema = tool.inputSchema || {};
    const properties = schema.properties || {};
    
    // Check for sensitive parameter names
    const sensitiveParams = ['password', 'token', 'api_key', 'secret', 'credential'];
    for (const [paramName, paramDef] of Object.entries(properties)) {
      if (sensitiveParams.some(s => paramName.toLowerCase().includes(s))) {
        findings.push({
          severity: 'MEDIUM',
          category: 'schema',
          title: 'Sensitive parameter detected',
          tool: tool.name,
          description: `Parameter "${paramName}" may handle sensitive data`,
          evidence: `Parameter: ${paramName}`,
          remediation: 'Ensure sensitive parameters use "format": "password" and are not logged'
        });
      }
      
      // Check for weak validation
      if (!paramDef.pattern && paramDef.type === 'string' && paramName !== 'description') {
        findings.push({
          severity: 'LOW',
          category: 'schema',
          title: 'Missing input validation',
          tool: tool.name,
          description: `Parameter "${paramName}" lacks validation pattern`,
          evidence: `No pattern defined for ${paramName}`,
          remediation: 'Add regex pattern validation for string parameters'
        });
      }
    }
  }
  
  return findings;
}

// Source Code Analysis
async function analyzeSourceCode(owner, repo) {
  const findings = [];
  
  // Fetch main source files
  const files = ['index.js', 'index.ts', 'server.js', 'server.ts', 'src/index.js', 'src/index.ts'];
  
  for (const file of files) {
    const content = await fetchGitHubFile(owner, repo, file);
    if (!content) continue;
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, severity: 'CRITICAL', title: 'eval() usage detected', desc: 'eval() can execute arbitrary code' },
      { pattern: /child_process/, severity: 'HIGH', title: 'child_process import', desc: 'Spawning child processes is dangerous' },
      { pattern: /fs\.readFile\s*\(\s*[^,]+\s*\)/, severity: 'MEDIUM', title: 'Unvalidated file read', desc: 'Reading files without path validation' },
      { pattern: /fetch\s*\(|axios\.|request\(/, severity: 'MEDIUM', title: 'Outbound HTTP requests', desc: 'Making external network calls' },
      { pattern: /process\.env\.(?!NODE_ENV)/, severity: 'MEDIUM', title: 'Environment variable access', desc: 'Accessing potentially sensitive env vars' }
    ];
    
    for (const { pattern, severity, title, desc } of dangerousPatterns) {
      if (pattern.test(content)) {
        findings.push({
          severity,
          category: 'code',
          title,
          description: desc,
          file,
          evidence: content.match(pattern)?.[0]?.substring(0, 50),
          remediation: 'Review and justify this pattern. Consider safer alternatives.'
        });
      }
    }
  }
  
  return findings;
}

// Helper functions
async function fetchGitHubFile(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    // Try master branch
    const urlMaster = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
    const respMaster = await fetch(urlMaster);
    return respMaster.ok ? await respMaster.text() : null;
  }
  return await response.text();
}

function calculateScore(findings) {
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === 'CRITICAL') score -= 25;
    else if (finding.severity === 'HIGH') score -= 15;
    else if (finding.severity === 'MEDIUM') score -= 8;
    else if (finding.severity === 'LOW') score -= 3;
  }
  return Math.max(0, score);
}

function getRiskLevel(score) {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

function severityWeight(severity) {
  const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return weights[severity] || 0;
}

async function getScanResult(scanId, env) {
  const result = await env.MCP_SCANS.get(scanId);
  return result ? JSON.parse(result) : { error: 'Scan not found' };
}

async function getRecentScans(env) {
  // List recent scans from KV
  const list = await env.MCP_SCANS.list({ limit: 10 });
  const scans = [];
  for (const key of list.keys) {
    const result = await env.MCP_SCANS.get(key.name);
    if (result) scans.push(JSON.parse(result));
  }
  return scans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
}
