const BASE_URL = "https://laws.e-gov.go.jp/api/2";

async function callEgov(path, params) {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("response_format", "json");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  return await res.text();
}

const TOOLS = {
  search_laws: {
    description: "法令名や法令番号から法令を検索します。法令の一覧を取得できます。",
    inputSchema: {
      type: "object",
      properties: {
        law_name: { type: "string", description: "法令名（部分一致）" },
        law_num: { type: "string", description: "法令番号" },
      },
    },
    handler: async ({ law_name, law_num }) =>
      callEgov("/laws", { law_name, law_num }),
  },
  get_law_data: {
    description: "法令IDまたは法令番号を指定して、法令の本文を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        law_id: { type: "string", description: "法令IDまたは法令番号" },
        date: { type: "string", description: "時点指定（YYYY-MM-DD形式）" },
      },
      required: ["law_id"],
    },
    handler: async ({ law_id, date }) =>
      callEgov("/law_data/" + encodeURIComponent(law_id), { date }),
  },
  keyword_search: {
    description: "キーワードで法令の条文を全文検索します。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "検索キーワード" },
        date: { type: "string", description: "時点指定（YYYY-MM-DD形式）" },
      },
      required: ["keyword"],
    },
    handler: async ({ keyword, date }) =>
      callEgov("/keyword", { keyword, date }),
  },
};

async function handleJsonRpc(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "e-gov-law-search", version: "1.0.0" },
      },
    };
  }

  if (method && method.startsWith("notifications/")) {
    return null;
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    };
  }

  if (method === "tools/call") {
    const tool = TOOLS[params?.name];
    if (!tool) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${params?.name}` },
      };
    }
    try {
      const text = await tool.handler(params.arguments || {});
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text }],
        },
      };
    } catch (e) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: e?.message || String(e) },
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

async function handler(req) {
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "DELETE") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const response = await handleJsonRpc(body);

  if (response === null) {
    return new Response(null, { status: 202 });
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export { handler as GET, handler as POST, handler as DELETE };
