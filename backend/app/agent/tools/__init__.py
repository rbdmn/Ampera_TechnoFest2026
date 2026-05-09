from __future__ import annotations

from importlib import import_module
from typing import Any


_TOOL_MODULES = {
    "analyze_pattern": "app.agent.tools.analyze_pattern",
    "calculate_bill": "app.agent.tools.calculate_bill",
    "get_mock_consumption": "app.agent.tools.get_mock_consumption",
    "query_consumption": "app.agent.tools.query_consumption",
    "send_notification": "app.agent.tools.send_notification",
}


def __getattr__(name: str) -> Any:
    if name == "all_tools":
        return [
            __getattr__("get_mock_consumption"),
            __getattr__("analyze_pattern"),
            __getattr__("calculate_bill"),
            __getattr__("send_notification"),
        ]

    module_name = _TOOL_MODULES.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    module = import_module(module_name)
    return getattr(module, name)


__all__ = [*sorted(_TOOL_MODULES), "all_tools"]
