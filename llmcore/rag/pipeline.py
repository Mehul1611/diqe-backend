import logging
import re
import threading

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from llmcore.constants import LLMConstants, RAGConstants
from llmcore.rag.prompts import (
    GLOBAL_PROMPT,
    RAG_ASSISTANT_PROMPT,
    TRIVIAL_CHAT_PROMPT,
    WEB_PROMPT,
)
from duckduckgo_search import DDGS
from llmcore.rag.retriever import HybridRetriever

logger = logging.getLogger(__name__)

_fast_trivial_llm: ChatGroq | None = None
_fast_trivial_lock = threading.Lock()

_TRIVIAL_EXACT = frozenset(
    {
        "hi", "hello", "hey", "yo", "sup", "hiya", "howdy", "thanks", "thank you",
        "thx", "ty", "ok", "okay", "kk", "good morning", "good afternoon",
        "good evening", "good day", "gm", "gn",
    }
)

class RAGPipeline:
    def _get_fast_trivial_llm(self) -> ChatGroq:
        """Small fast model + low max_tokens for greetings (skips thinking model & retrieval)."""
        global _fast_trivial_llm
        with _fast_trivial_lock:
            if _fast_trivial_llm is None:
                _fast_trivial_llm = ChatGroq(
                    model=LLMConstants.AGENT_CHAT_MODEL,
                    api_key=LLMConstants.GROQ_API_KEY,
                    base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
                    temperature=0.4,
                    max_tokens=120,
                )
            return _fast_trivial_llm

    def _is_trivial_greeting(self, query: str) -> bool:
        raw = query.strip()
        if not raw or len(raw) > 72:
            return False
        q = re.sub(r"\s+", " ", raw).strip()
        q = q.strip("!.?…,:;").strip()
        low = q.lower()
        if low in _TRIVIAL_EXACT:
            return True
        if re.fullmatch(r"(hi|hello|hey)\s+(there|everyone|all|team)(!|\.)?", low):
            return True
        if re.fullmatch(r"(thanks?|thx)(\s+(a lot|so much|you))?(!|\.)?", low):
            return True
        return False

    @staticmethod
    def _fetch_web_snippets(query: str) -> str:
        try:
            max_r = RAGConstants.WEB_SEARCH_MAX_RESULTS
            with DDGS() as ddgs:
                hits = list(ddgs.text(query, max_results=max_r))
        except Exception as exc:
            logger.warning("Web search failed: %s", exc)
            return ""

        if not hits:
            return ""

        lines: list[str] = []
        for h in hits:
            title = (h.get("title") or "").strip()
            body = (h.get("body") or "").strip()
            if title and body:
                lines.append(f"{title}: {body}")
            elif body:
                lines.append(body)
            elif title:
                lines.append(title)
        return "\n".join(lines)

    def __init__(self, model_id: str, language: str = "English", mode: str = "fast"):
        self.model_id = model_id
        self.language = language
        self.mode = mode
        self.llm = self._build_llm()

    def _build_llm(self) -> ChatGroq:
        if self.mode == "thinking":
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

    def _build_excerpt_block(self, chunks: list[str]) -> str:
        return "\n\n---\n\n".join(chunks)

    def _should_skip_local_excerpts(self, chunks: list[str], top_score: float) -> bool:
        if not chunks:
            return True
        thr = RAGConstants.LOCAL_RETRIEVAL_FALLBACK_THRESHOLD
        if thr is not None and top_score < thr:
            return True
        return False

    async def stream(self, query: str, search_type: str = "local"):
        if self._is_trivial_greeting(query):
            llm = self._get_fast_trivial_llm()
            messages = [
                SystemMessage(
                    content=TRIVIAL_CHAT_PROMPT.format(language=self.language)
                ),
                HumanMessage(content=query.strip()),
            ]
            async for token in llm.astream(messages):
                if token.content:
                    yield token.content
            return

        if search_type == "global":
            snippets = self._fetch_web_snippets(query)
            if snippets.strip():
                messages = [
                    SystemMessage(content=WEB_PROMPT.format(language=self.language)),
                    HumanMessage(
                        content=f"Notes:\n{snippets}\n\nQuestion: {query}"
                    ),
                ]
            else:
                messages = [
                    SystemMessage(content=GLOBAL_PROMPT.format(language=self.language)),
                    HumanMessage(content=query),
                ]
            async for token in self.llm.astream(messages):
                if token.content:
                    yield token.content
            return

        retriever = HybridRetriever.get_instance(self.model_id)
        chunks, top_score = retriever.retrieve_with_scores(query)

        if self._should_skip_local_excerpts(chunks, top_score):
            messages = [
                SystemMessage(content=GLOBAL_PROMPT.format(language=self.language)),
                HumanMessage(content=query),
            ]
        else:
            block = self._build_excerpt_block(chunks)
            messages = [
                SystemMessage(content=RAG_ASSISTANT_PROMPT.format(language=self.language)),
                HumanMessage(content=f"Information:\n{block}\n\nQuestion: {query}"),
            ]

        async for token in self.llm.astream(messages):
            if token.content:
                yield token.content

    async def execute(self, query: str, search_type: str = "local") -> str:
        result = ""
        async for chunk in self.stream(query, search_type):
            result += chunk
        return result
