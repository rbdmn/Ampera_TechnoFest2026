from app.agent.tools.analyze_pattern import analyze_pattern
from app.agent.tools.calculate_bill import calculate_bill
from app.agent.tools.query_consumption import query_consumption
from app.agent.tools.send_notification import send_notification

all_tools = [
    query_consumption,
    analyze_pattern,
    calculate_bill,
    send_notification,
]
