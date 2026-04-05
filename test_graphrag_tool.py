from dotenv import load_dotenv
load_dotenv()

import asyncio
import os
import sys

# Add the workspace root to path to ensure imports like 'llmcore' work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from llmcore.chat_agent.agent import ChatAgentExecutor

async def test_agent_graphrag():
    print("🔍 Initializing ChatAgentExecutor...")
    # Use the model ID provided in previous logs
    model_id = "dbe3efdd-f567-4c28-a022-545236edc585"
    
    agent = ChatAgentExecutor(
        model_id=model_id, 
        language="English", 
        mode="fast"
    )

    query = "Who is Gupta? Search the local knowledge graph for this information."
    print(f"📡 Testing Query: '{query}'")
    print("-" * 50)

    try:
        accumulated_response = ""
        async for event in agent.agent_executor.astream_events({"input": query, "mode": "local"}, version="v2"):
            event_type = event["event"]
            if event_type == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk and isinstance(chunk, str):
                    print(chunk, end="", flush=True)
                    accumulated_response += chunk
            elif event_type == "on_tool_start":
                print(f"\n🛠️ Calling Tool: {event['name']} with input: {event['data'].get('input')}")
            elif event_type == "on_tool_end":
                print(f"\n📥 Tool Finished: {event['name']} (Result Length: {len(str(event['data'].get('output')))})")
        
        print("\n" + "-" * 50)
        print("✅ Streaming completed successfully.")
        
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(test_agent_graphrag())
