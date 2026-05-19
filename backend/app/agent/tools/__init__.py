from __future__ import annotations

from importlib import import_module
from typing import Any


_TOOL_MODULES = {
    "analyze_pattern": "app.agent.tools.analyze_pattern",
    "compare_rooms": "app.agent.tools.compare_rooms",
    "calculate_bill": "app.agent.tools.calculate_bill",
    "get_end_of_day_report": "app.agent.tools.end_of_day_report",
    "get_all_tools": "app.agent.tools.get_tool_list",
    "get_billing_summary": "app.agent.tools.billing_summary",
    "get_mock_consumption": "app.agent.tools.get_mock_consumption",
    "list_anomalies": "app.agent.tools.anomalies",
    "query_consumption": "app.agent.tools.query_consumption",
    "query_room_details": "app.agent.tools.room_details",
    "send_notification": "app.agent.tools.send_notification",
}


def __getattr__(name: str) -> Any:
    if name == "all_tools":
        return [
            __getattr__("query_consumption"),
            __getattr__("analyze_pattern"),
            __getattr__("calculate_bill"),
            __getattr__("send_notification"),
            __getattr__("query_room_details"),
            __getattr__("get_end_of_day_report"),
            __getattr__("get_billing_summary"),
            __getattr__("list_anomalies"),
            __getattr__("compare_rooms"),
        ]

    module_name = _TOOL_MODULES.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    module = import_module(module_name)
    return getattr(module, name)


query_room_details = __getattr__("query_room_details")
get_billing_summary = __getattr__("get_billing_summary")
get_end_of_day_report = __getattr__("get_end_of_day_report")
list_anomalies = __getattr__("list_anomalies")
compare_rooms = __getattr__("compare_rooms")

__all__ = [*sorted(_TOOL_MODULES), "all_tools"]
