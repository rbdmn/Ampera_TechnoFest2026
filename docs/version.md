# Version Notes

## Recent Commits

- `50556a8` - Initial backend codebase added.
- `7959f72` - Documentation update.
- `43aad5c` - Initial commit.

## Current Work

- LangChain agent now uses Ollama instead of OpenAI.
- Current model: `gpt-oss:120b-cloud`.
- No OpenAI API key is required.
- Added a simple agent runner at `backend/app/agent/test_run.py`.
- Added `langchain-ollama` dependency in `backend/requirements.txt`.

## Crucial Notes

- Start Ollama before running the agent:
  ```bash
  ollama serve
  ```
- Install the required model:
  ```bash
  ollama pull gpt-oss:120b-cloud
  ```
- Test the agent:
  ```bash
  python backend/app/agent/test_run.py
  ```
