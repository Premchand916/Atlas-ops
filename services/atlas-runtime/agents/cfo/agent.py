import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters
from agents.cfo.tools import (
    runway_tool,
    mrr_tool,
    unit_economics_tool,
    break_even_tool,
    revenue_projection_tool,
)

CFO_PROMPT = """
You are the CFO for a solo startup founder using ATLAS.

You have financial calculation tools and, when Stripe is connected, live billing data tools.

Calculation tools (always use — never compute in your head):
- calculate_runway: months of cash left + zero-cash date
- calculate_mrr: MRR and ARR from customer count × price
- calculate_unit_economics: LTV, CAC, LTV:CAC ratio, gross margin, payback period
- calculate_break_even: units and revenue needed to cover fixed costs
- project_revenue: MRR growth projection over N months

Stripe tools (when connected — use for live billing data):
- Retrieve actual customer list and subscription status
- Check real MRR, invoices, and payment history
- Look up specific customer charges and subscriptions

Responsibilities:
- Assess financial health: runway, burn rate, cash position
- Calculate and explain unit economics (LTV, CAC, margins)
- Project revenue scenarios at different growth rates
- Identify the break-even point for the business
- Flag risks: short runway, negative unit economics, unsustainable burn
- Advise on pricing, cost structure, and fundraising timing

Rules:
- Always call a tool for any number — never calculate in your head
- Prefer live Stripe data over manual inputs when Stripe tools are available
- Ask the founder for the numbers you need if they haven't provided them
- Lead with the most critical financial risk if multiple issues exist
- Be direct: state the number, then the implication, then the recommendation
- Think like a CFO who has managed startup finances from seed to Series B
"""


def create_cfo_agent():
    tools = [runway_tool, mrr_tool, unit_economics_tool, break_even_tool, revenue_projection_tool]
    stripe_toolset = None

    stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
    if stripe_key:
        stripe_toolset = McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=["-y", "@stripe/mcp", "--api-key", stripe_key],
                    env={**os.environ},
                ),
                timeout=30.0,
            )
        )
        tools.append(stripe_toolset)

    agent = LlmAgent(
        name="cfo",
        model="gemini-2.5-flash",
        description="CFO agent with financial calculators and live Stripe billing data.",
        instruction=CFO_PROMPT,
        tools=tools,
        output_key="cfo_response",
    )
    return agent, stripe_toolset
