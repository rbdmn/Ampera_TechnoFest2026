from app.agent.prompts import AGENT_SYSTEM_PROMPT
from app.agent.tools import (
    analyze_pattern,
    calculate_bill,
    get_mock_consumption,
    send_notification,
)
from langchain_groq import ChatGroq


DEFAULT_TARIFF_IDR = 1444.7
HIGH_USAGE_KWH = 25


def build_llm():
    """Create the LangChain chat model used by the agent foundation."""
    return ChatGroq(model="llama3-8b-8192", temperature=0)


def run_ampera_agent(tariff: float = DEFAULT_TARIFF_IDR) -> dict[str, object]:
    """Run a minimal Observe -> Think -> Plan -> Act -> Evaluate agent loop."""
    llm = build_llm()

    # The LLM is configured for the agent foundation. This first version keeps
    # actions deterministic so it can be tested without database or scheduler code.
    _ = llm
    _ = AGENT_SYSTEM_PROMPT

    notification_logs: list[dict[str, str]] = []

    data = get_mock_consumption()
    total_kwh = sum(item["kwh"] for item in data)
    analysis = analyze_pattern(data)
    estimated_bill = calculate_bill(total_kwh=total_kwh, tariff=tariff)

    should_notify = bool(analysis["has_anomaly"]) or total_kwh >= HIGH_USAGE_KWH
    if should_notify:
        message = (
            "Ampera AI detected unusual or high electricity usage. "
            f"Total usage: {total_kwh} kWh. "
            f"Estimated bill: Rp {estimated_bill:,.0f}."
        )
        notification_logs.append(send_notification(message))

    return {
        "flow": ["Observe", "Think", "Plan", "Act", "Evaluate"],
        "usage_data": data,
        "anomaly_result": analysis,
        "total_kwh": total_kwh,
        "estimated_bill": round(estimated_bill, 2),
        "notification_logs": notification_logs,
    }


async def chat_with_agent(message: str) -> str:
    """Small compatibility entrypoint for the existing API router."""
    result = run_ampera_agent()
    return (
        "Ampera AI agent finished one mock monitoring loop. "
        f"Message received: {message}. "
        f"Estimated bill: Rp {result['estimated_bill']:,.0f}."
    )


async def run_agent_loop() -> dict[str, object]:
    """Compatibility wrapper for the existing scheduler/API import."""
    return run_ampera_agent()
