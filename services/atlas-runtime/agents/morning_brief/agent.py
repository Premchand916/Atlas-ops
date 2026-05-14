from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import google_search
from agents.coo.tools import list_tasks_tool

TASK_BRIEF_PROMPT = """
You are generating the task section of a morning brief for a startup founder.

Call list_tasks to fetch open tasks. Only show tasks with status todo or in_progress.

Format your output exactly as:

TASK SUMMARY
- [HIGH] Task title (status)
- [MED] Task title (status)
- [LOW] Task title (status)

Max 8 tasks. If no open tasks: output "TASK SUMMARY\nNo open tasks." Nothing else.
"""

MARKET_BRIEF_PROMPT = """
You are generating the market section of a morning brief for a startup founder building an AI SaaS product.

Search for "AI productivity tools startup news 2026" and return exactly 3 findings.

Format your output exactly as:

MARKET PULSE
• [one-line finding — source name, date if known]
• [one-line finding — source name, date if known]
• [one-line finding — source name, date if known]

No extra commentary. Max 3 bullets.
"""

SYNTHESIS_PROMPT = """
You are the Chief-of-Staff writing a founder's morning brief.

You have received a TASK SUMMARY and a MARKET PULSE from earlier agents in this conversation.
Synthesize them into a brief using exactly this format:

## Morning Brief

**TODAY'S PRIORITIES**
1. [Most urgent task from the task summary]
2. [Second priority]
3. [Third priority — if fewer than 3 tasks exist, skip this line]

**MARKET PULSE**
[1–2 sentence synthesis of the market findings]

**YOUR MOVE**
[One concrete action the founder should take in the next 2 hours, based on tasks + market context]

Under 150 words total. No filler. No hedging.
"""

task_brief_agent = LlmAgent(
    name="task_brief",
    model="gemini-2.5-flash",
    description="Fetches open tasks from Firestore and formats them for the morning brief.",
    instruction=TASK_BRIEF_PROMPT,
    tools=[list_tasks_tool],
    output_key="tasks_brief",
)

market_brief_agent = LlmAgent(
    name="market_brief",
    model="gemini-2.5-flash",
    description="Searches for market news and formats a 3-bullet market pulse.",
    instruction=MARKET_BRIEF_PROMPT,
    tools=[google_search],
    output_key="market_brief",
)

brief_synthesizer_agent = LlmAgent(
    name="brief_synthesizer",
    model="gemini-2.5-flash",
    description="Synthesizes task summary and market pulse into a morning brief.",
    instruction=SYNTHESIS_PROMPT,
    output_key="morning_brief_response",
)

morning_brief_agent = SequentialAgent(
    name="morning_brief",
    description="Daily morning brief: open tasks + market pulse synthesized into founder priorities.",
    sub_agents=[task_brief_agent, market_brief_agent, brief_synthesizer_agent],
)
