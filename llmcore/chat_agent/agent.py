import logging
from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from llmcore.chat_agent.prompt import AGENT_SYSTEM_PROMPT
from llmcore.chat_agent.tools import get_tools
from llmcore.constants import LLMConstants

logger = logging.getLogger(__name__)


class ChatAgentExecutor:
    def __init__(self, model_id: str, language: str, mode: str):
        self.model_id = model_id
        self.language = language
        self.mode = mode
        self.tools = get_tools(model_id)
        self.llm = self._init_llm(mode)
        self.agent_executor = self._init_agent()

    def _init_llm(self, mode: str) -> ChatGroq:
        if mode == "thinking":
            return ChatGroq(
                model=LLMConstants.THINKING_CHAT_MODEL,
                api_key=LLMConstants.GROQ_API_KEY,
                base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
                temperature=0.2,
                reasoning_effort="high",
                reasoning_format="hidden",
            )
        return ChatGroq(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.GROQ_API_KEY,
            base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
            temperature=0.0,
        )

    def _init_agent(self):
        system_prompt = AGENT_SYSTEM_PROMPT.format(language=self.language)
        agent = create_agent(self.llm, self.tools, system_prompt=system_prompt)
        return agent

    async def stream_execute(self, query: str, search_type: str):
        input_msg = f"query mode is: '{search_type}'. Question: {query}"
        async for event in self.agent_executor.astream_events(
            {"messages": [("user", input_msg)]},
            version="v2",
        ):
            if event["event"] == "on_tool_start":
                logger.info(
                    "Agent using tool: %s with input: %s",
                    event["name"],
                    event["data"].get("input"),
                )

            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk and isinstance(chunk, str):
                    yield chunk

    async def execute(self, query: str, search_type: str) -> str:
        response = ""
        async for chunk in self.stream_execute(query, search_type):
            response += chunk
        return response
