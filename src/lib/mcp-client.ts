interface MCPMessage {
  jsonrpc: '2.0'
  id: string | number
  method?: string
  params?: any
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

interface MCPClientConfig {
  serverUrl: string
  authToken?: string
  agentId?: string
}

class MCPClient {
  private serverUrl: string
  private authToken?: string
  private agentId?: string
  private requestId: number = 0
  private sessionId?: string

  constructor(config: MCPClientConfig) {
    this.serverUrl = config.serverUrl
    this.authToken = config.authToken
    this.agentId = config.agentId
  }

  private getNextRequestId(): number {
    return ++this.requestId
  }

  private async sendRequest(message: MCPMessage): Promise<MCPMessage> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`)
    }

    const sessionIdHeader = response.headers.get('Mcp-Session-Id')
    if (sessionIdHeader) {
      this.sessionId = sessionIdHeader
    }

    return await response.json()
  }

  async initialize(): Promise<any> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'initialize',
    }

    const response = await this.sendRequest(message)

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.result
  }

  async listTools(): Promise<MCPTool[]> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/list',
    }

    const response = await this.sendRequest(message)

    if (response.error) {
      throw new Error(response.error.message)
    }

    return response.result?.tools || []
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const toolArgs = { ...args }

    if (this.agentId && !toolArgs.agent_id) {
      toolArgs.agent_id = this.agentId
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs,
      },
    }

    const response = await this.sendRequest(message)

    if (response.error) {
      throw new Error(response.error.message)
    }

    if (response.result?.content && Array.isArray(response.result.content)) {
      const textContent = response.result.content.find((c: any) => c.type === 'text')
      if (textContent?.text) {
        try {
          return JSON.parse(textContent.text)
        } catch {
          return textContent.text
        }
      }
    }

    return response.result
  }

  setAgentId(agentId: string) {
    this.agentId = agentId
  }
}

export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config)
}

export function convertMCPToolToOpenRouterFunction(mcpTool: MCPTool): any {
  // Filter out agent_id from properties and required fields
  // since it's automatically injected by the MCP client
  const properties = { ...mcpTool.inputSchema.properties }
  delete properties.agent_id

  const required = (mcpTool.inputSchema.required || []).filter(
    (field: string) => field !== 'agent_id'
  )

  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: mcpTool.inputSchema.type || 'object',
        properties,
        required,
      },
    },
  }
}

export async function getMCPToolsAsOpenRouterFunctions(
  serverUrl: string,
  authToken: string,
  agentId?: string
): Promise<any[]> {
  const client = createMCPClient({ serverUrl, authToken, agentId })

  try {
    await client.initialize()
    const mcpTools = await client.listTools()

    return mcpTools.map(convertMCPToolToOpenRouterFunction)
  } catch (error) {
    console.error('Failed to fetch MCP tools:', error)
    return []
  }
}

export type { MCPMessage, MCPTool, MCPClientConfig }
export { MCPClient }
