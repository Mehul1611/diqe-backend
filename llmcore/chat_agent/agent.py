from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate
from llmcore.constants import LLMConstants
from llmcore.chat_agent.prompt import AGENT_SYSTEM_PROMPT
from llmcore.chat_agent.tools import get_tools

class ChatAgentExecutor:
    def __init__(self, model_id: str, language: str, mode: str):
        self.model_id = model_id
        self.language = language
        self.mode = mode
        self.tools = get_tools(model_id)
        self.llm = self._init_llm(mode)
        self.agent_executor = self._init_agent()

    def _init_llm(self, mode: str) -> ChatOpenAI:
        reasoning_val = "high" if mode == "thinking" else "low"
        return ChatOpenAI(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.OPENAI_API_KEY,
            reasoning_effort=reasoning_val,
        )

    def _init_agent(self):
        system_prompt = AGENT_SYSTEM_PROMPT.format(language=self.language)
        agent = create_agent(self.llm, self.tools, system_prompt=system_prompt)
        return agent

    async def stream_execute(self, query: str, search_type: str):
        input_msg = f"query mode is: '{search_type}'. Question: {query}"
        async for event in self.agent_executor.astream_events(
            {"messages": [("user", input_msg)]}, 
            version="v2"
        ):
            if event["event"] == "on_tool_start":
                print(f"Agent using tool: {event['name']} with input: {event['data'].get('input')}")
            
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk and isinstance(chunk, str):
                    yield chunk

    async def execute(self, query: str, search_type: str) -> str:
        response = ""
        async for chunk in self.stream_execute(query, search_type):
            response += chunk
        return response
