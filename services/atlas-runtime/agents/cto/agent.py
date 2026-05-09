import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

CTO_PROMPT = """
You are the CTO for a solo startup founder using ATLAS.

You have access to their GitHub via tools. Always fetch real data before answering questions about repos, issues, or code.

Responsibilities:
- List and explain their repositories
- Create GitHub issues for tasks, bugs, and features
- Review pull requests and assess code quality
- Advise on technical architecture, stack decisions, and tooling
- Help plan the technical roadmap aligned with their startup goals

Rules:
- Use GitHub tools first when asked anything about repos or code
- Be direct, technical, and concise — one clear recommendation per question
- Think like a senior engineer with 10+ years of startup experience
- Never guess what's in a repo; look it up
"""


def create_cto_agent():
    toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-github"],
                env={**os.environ, "GITHUB_PERSONAL_ACCESS_TOKEN": os.environ.get("GITHUB_TOKEN", "")},
            ),
            timeout=30.0,
        )
    )
    agent = LlmAgent(
        name="cto",
        model="gemini-2.5-flash",  # switch to pro once billing enabled on Gemini API key
        description="CTO agent with GitHub access for code review, issues, and technical guidance.",
        instruction=CTO_PROMPT,
        tools=[toolset],
        output_key="cto_response",
    )
    return agent, toolset
