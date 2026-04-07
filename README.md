# DIQE Engine (Document Intelligence Query Engine)

![DIQE Engine](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Backend-FastAPI-blue) ![Next.js](https://img.shields.io/badge/Frontend-Next.js-black) ![LangGraph](https://img.shields.io/badge/AI-LangGraph%20%7C%20GraphRAG-orange)

**DIQE Engine** is an advanced, production-ready Document Intelligence system that leverages the power of **GraphRAG (Retrieval-Augmented Generation through Knowledge Graphs)** to extract highly contextual, precise answers from complex document repositories. By combining standard vector search with Graph-based indexing, DIQE discovers non-obvious relationships in unstructured data across PDFs, Word Documents, and Presentations.

---

## Use Cases

DIQE is designed to solve the limitations of traditional RAG pipelines (which struggle with multi-hop reasoning over large datasets). 

1. **Enterprise Knowledge Discovery & Search**: Quickly find highly specific data trapped within hundreds of scattered company policy documents, onboarding manuals, and internal wikis.
2. **Legal & Compliance Analysis**: Process lengthy legal contracts and automatically identify linked entities, obligations, and clauses that span across multiple documents.
3. **Financial Research & Due Diligence**: Connect the dots between different financial reports, parsing tabular data and text to find hidden risk factors or market trends.
4. **Academic & Scientific Literature Review**: Upload dozens of research papers and query the system to synthesize common methodologies, identify conflicting results, or map citation relationships.

---

## Key Features

- **Automated Knowledge Graph Construction**: Employs an ETL pipeline (Extract, Transform, Load) to chunk documents, extract entities/relations, and build a localized semantic graph.
- **Local & Global Querying**: 
  - *Local Search*: Pinpoint specific answers grounded in direct entity relationships.
  - *Global Search*: Generate holistic summaries and overarching trends across the entire dataset.
- **Multi-Format Document Parsing**: Out-of-the-box support for `.pdf`, `.docx`, and `.pptx` via advanced Python parsers.
- **Interactive Visualization**: Dedicated endpoints for visualizing the underlying Knowledge Graph and document sources.
- **Containerized Ecosystem**: Fully Dockerized standard stack utilizing FastAPI and Next.js for rapid, scalable deployment.

---

## System Architecture

The DIQE application is organized into three distinct layers:

1. **Frontend (`/frontend`)**: A modern, responsive React interface built with **Next.js**, **Tailwind CSS**, and **Framer Motion**. It provides drag-and-drop document upload, processing status monitoring, and an interactive query interface.
2. **Backend Engine (`/backend`)**: A robust **FastAPI** application managing file I/O, orchestrating background AI tasks asynchronously, and exposing RESTful endpoints.
3. **AI Core (`/llmcore`)**: Built securely via **LangChain** & **LangGraph**, it handles LLM interfacing (OpenAI), Graph construction (GraphRAG), and high-performance vector indexing (**LanceDB**).

---


## API Reference

### Core Endpoints

- `POST /upload/{model_id}`: Upload multiple documents (PDFs, DOCX, PPTX) into a specific workspace model.
- `POST /process`: Trigger the background ETL pipeline (Graph Construction & Indexing) for a specific document set.
- `POST /query`: Execute a GraphRAG search (`local` or `global` mode) against an indexed model.
- `GET /model/{model_id}/sources`: Retrieve the exact text sources feeding the responses.
- `GET /model/{model_id}/graph`: Export the raw nodes and relationships for frontend visualization.

*(See the auto-generated `/docs` Swagger page for detailed schema payloads).*

---

## License & Contribution

This project is licensed under the MIT License. Feel free to open issues and pull requests to enhance the extraction algorithms or add new user-facing visualizations.