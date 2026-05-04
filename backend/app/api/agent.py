from pydantic import BaseModel

from fastapi import APIRouter

from app.agent.agent import chat_with_agent, run_agent_loop

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    reply = await chat_with_agent(payload.message)
    return ChatResponse(reply=reply)


@router.post("/run")
async def run_agent() -> dict[str, str]:
    await run_agent_loop()
    return {"message": "Agent loop finished"}
