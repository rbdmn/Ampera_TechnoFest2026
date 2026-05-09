def get_mock_consumption() -> list[dict[str, float]]:
    """Return sample daily electricity usage data in kWh."""
    return [
        {"day": 1, "kwh": 5},
        {"day": 2, "kwh": 7},
        {"day": 3, "kwh": 20},
    ]
