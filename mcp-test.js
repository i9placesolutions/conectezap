
// mcp-test.js
async function testMcpServer() {
  try {
    const response = await fetch('http://localhost:54321/mcp');
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      console.error('Response Body:', text);
      return;
    }
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to connect to MCP server:', error.message);
    if (error.cause) {
       console.error('Cause:', error.cause);
    }
  }
}

testMcpServer();
