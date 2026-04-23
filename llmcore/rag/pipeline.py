import logging
import re
import threading
import time
from duckduckgo_search import DDGS
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from llmcore.constants import GenerationConstants, LLMConstants, RAGConstants
from llmcore.rag.prompts import (
    GLOBAL_PROMPT,
    RAG_ASSISTANT_PROMPT,
    TRIVIAL_CHAT_PROMPT,
    WEB_PROMPT,
)
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

_DDGS_ATTEMPTS = (
    ("text", "auto"),
    ("text", "html"),
    ("text", "lite"),
    ("news", None),
)


class RAGPipeline:
    def __init__(self, model_id: str, user_id: str = "default", language: str = "English", mode: str = "fast"):
        self.model_id = model_id
        self.user_id = user_id
        self.language = language
        self.mode = mode
        self.llm = self._build_llm()

    def _build_llm(self) -> ChatGroq:
        if self.mode == "thinking":
            return ChatGroq(
                model=LLMConstants.THINKING_CHAT_MODEL,
                api_key=LLMConstants.GROQ_API_KEY,
                base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
                temperature=GenerationConstants.THINKING_TEMPERATURE,
                max_tokens=GenerationConstants.THINKING_MAX_TOKENS,
                reasoning_effort="high",
                reasoning_format="hidden",
            )
        return ChatGroq(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.GROQ_API_KEY,
            base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
            temperature=GenerationConstants.FAST_RAG_TEMPERATURE,
            max_tokens=GenerationConstants.FAST_MAX_TOKENS,
        )

    def _build_web_llm(self) -> ChatGroq:
        if self.mode == "thinking":
            return self.llm
        return ChatGroq(
            model=LLMConstants.AGENT_CHAT_MODEL,
            api_key=LLMConstants.GROQ_API_KEY,
            base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
            temperature=GenerationConstants.FAST_WEB_TEMPERATURE,
            max_tokens=GenerationConstants.FAST_MAX_TOKENS,
        )

    def _get_fast_trivial_llm(self) -> ChatGroq:
        global _fast_trivial_llm
        with _fast_trivial_lock:
            if _fast_trivial_llm is None:
                _fast_trivial_llm = ChatGroq(
                    model=LLMConstants.AGENT_CHAT_MODEL,
                    api_key=LLMConstants.GROQ_API_KEY,
                    base_url=LLMConstants.GROQ_CLIENT_BASE_URL,
                    temperature=0,
                    max_tokens=120,
                )
            return _fast_trivial_llm

    def _is_trivial_greeting(self, query: str) -> bool:
        raw = query.strip()
        if not raw or len(raw) > 72:
            return False
        q = re.sub(r"\s+", " ", raw).strip().strip("!.?…,:;").strip()
        low = q.lower()
        if low in _TRIVIAL_EXACT:
            return True
        if re.fullmatch(r"(hi|hello|hey)\s+(there|everyone|all|team)(!|\.)?", low):
            return True
        if re.fullmatch(r"(thanks?|thx)(\s+(a lot|so much|you))?(!|\.)?", low):
            return True
        return False

    @classmethod
    def _normalize_web_query(cls, raw: str) -> str:
        if not raw:
            return ""
        text = raw.replace("\r\n", "\n").replace("\r", "\n")
        if "Conversation so far:" in text:
            text = text.split("Conversation so far:", 1)[1]
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        if lines:
            last = lines[-1]
            for prefix in ("User:", "Assistant:", "Question:"):
                if last.startswith(prefix):
                    last = last[len(prefix):].strip()
                    break
            text = last
        text = re.sub(r"\s+", " ", text).strip()
        limit = RAGConstants.WEB_QUERY_CHAR_LIMIT
        if len(text) > limit:
            text = text[:limit].rsplit(" ", 1)[0]
        return text

    @staticmethod
    def _ddgs_call(kind: str, backend: str | None, query: str, max_r: int) -> list[dict]:
        with DDGS(timeout=10) as ddgs:
            if kind == "text":
                return list(ddgs.text(
                    query, region="wt-wt", safesearch="moderate",
                    backend=backend, max_results=max_r,
                ))
            return list(ddgs.news(
                query, region="wt-wt", safesearch="moderate", max_results=max_r,
            ))

    @classmethod
    def _ddgs_search(cls, query: str, max_r: int) -> list[dict]:
        last_error: Exception | None = None
        for idx, (kind, backend) in enumerate(_DDGS_ATTEMPTS):
            if idx > 0:
                time.sleep(0.4)
            try:
                raw = cls._ddgs_call(kind, backend, query, max_r)
            except Exception as exc:
                last_error = exc
                logger.warning("Web search %s(%s) failed for query=%r: %s", kind, backend, query, exc)
                continue
            if raw:
                logger.info("Web search ok via %s(%s): hits=%d query=%r", kind, backend, len(raw), query)
                return [
                    {
                        "title": h.get("title") or "",
                        "body": h.get("body") or h.get("excerpt") or "",
                        "href": h.get("href") or h.get("url") or h.get("source") or "",
                    }
                    for h in raw
                ]
        if last_error is not None:
            logger.warning("Web search produced no hits for query=%r (last error: %s)", query, last_error)
        else:
            logger.warning("Web search produced no hits for query=%r", query)
        return []

    @classmethod
    def _fetch_web_snippets(cls, query: str) -> str:
        clean_query = cls._normalize_web_query(query)
        if not clean_query:
            logger.warning("Web search skipped: empty query after normalization")
            return ""
        hits = cls._ddgs_search(clean_query, RAGConstants.WEB_SEARCH_MAX_RESULTS)
        lines: list[str] = []
        idx = 0
        for h in hits:
            title = h["title"].strip()
            body = h["body"].strip()
            href = h["href"].strip()
            if not (title or body):
                continue
            idx += 1
            head = title or body[:80]
            tail = body if title and body else ""
            suffix = f" ({href})" if href else ""
            if tail:
                lines.append(f"[{idx}] {head}: {tail}{suffix}")
            else:
                lines.append(f"[{idx}] {head}{suffix}")
        return "\n".join(lines)

    def _build_excerpt_block(self, chunks: list[str]) -> str:
        cleaned = [c.strip() for c in chunks if c and c.strip()]
        return "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(cleaned))

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
                SystemMessage(content=TRIVIAL_CHAT_PROMPT.format(language=self.language)),
                HumanMessage(content=query.strip()),
            ]
            async for token in llm.astream(messages):
                if token.content:
                    yield token.content
            return

        if search_type == "global":
            snippets = self._fetch_web_snippets(query)
            web_llm = self._build_web_llm() if snippets.strip() else self.llm
            if snippets.strip():
                messages = [
                    SystemMessage(content=WEB_PROMPT.format(language=self.language)),
                    HumanMessage(content=f"Notes:\n{snippets}\n\nQuestion: {query}"),
                ]
            else:
                fallback_note = (
                    "Web search did not return useful results for this question. "
                    "Answer directly and confidently from your general knowledge. "
                    "Only refuse for genuinely real-time questions (today's "
                    "headlines, live scores, current prices, live events) — for "
                    "everything else (released versions, historical facts, "
                    "definitions, concepts, tutorials), give the best answer you "
                    "can. Do not announce that web search failed; just answer."
                )
                messages = [
                    SystemMessage(
                        content=GLOBAL_PROMPT.format(language=self.language)
                        + "\n\n"
                        + fallback_note
                    ),
                    HumanMessage(content=query),
                ]
            async for token in web_llm.astream(messages):
                if token.content:
                    yield token.content
            return

        retriever = HybridRetriever.get_instance(self.model_id, self.user_id)
        chunks, top_score = retriever.retrieve_with_scores(query)

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
