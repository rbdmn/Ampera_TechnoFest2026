from app.agent.prompts import AGENT_SYSTEM_PROMPT


async def chat_with_agent(message: str) -> str:
    """Temporary chat entrypoint until LangChain tools are wired to real data."""
    return (
        "Ampera AI agent is ready in development mode. "
        f"Received: {message}"
    )


async def run_agent_loop() -> None:
    """Placeholder for the scheduled Ampera AI observe-think-act loop."""
    _ = AGENT_SYSTEM_PROMPT
    return None
