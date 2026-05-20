import sys
from pathlib import Path


sys.dont_write_bytecode = True

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agent.agent import run_ampera_agent


def main() -> None:
    # Make sure GROQ_API_KEY is set in .env or environment.
    result = run_ampera_agent()

    print(result)


if __name__ == "__main__":
    main()
