from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from llmcore.constants import LLMConstants
from llmcore.chat_agent.prompt import AGENT_SYSTEM_PROMPT
from llmcore.chat_agent.tools import get_tools

class ChatAgentExecutor:
    def __init__(self, model_id: str, language: str, mode: str):
        self.model_id = model_id
        self.language = language
        self.mode = mode
        self.tools = get_tools(model_id, language)
        self.llm = self._init_llm(mode)
        self.agent_executor = self._init_agent()

    def _init_llm(self, mode: str) -> ChatOpenAI:
        reasoning_val = "high" if mode == "thinking" else "low"
        return ChatOpenAI(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.OPENAI_API_KEY,
            reasoning_effort=reasoning_val
        )

    def _init_agent(self) -> AgentExecutor:
        prompt = ChatPromptTemplate.from_messages([
            ("system", AGENT_SYSTEM_PROMPT.format(language=self.language)),
            ("human", "query mode is: '{mode}'. Question: {input}"),
            ("placeholder", "{agent_scratchpad}")
        ])
        
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools)

    async def stream_execute(self, query: str, search_type: str):
        async for event in self.agent_executor.astream_events(
            {"input": query, "mode": search_type}, 
            version="v2"
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk and isinstance(chunk, str):
                    yield chunk
