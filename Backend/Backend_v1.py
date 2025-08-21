"""
This file contains all the api endpoints and the Backend logic
"""

from fastapi import FastAPI,WebSocket,WebSocketDisconnect
import uvicorn
import backendFunctions as BF
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
from contextlib import asynccontextmanager
from langchain_core.messages import HumanMessage,SystemMessage  
from logging import Logger
from fastapi.responses import StreamingResponse



@asynccontextmanager
async def lifespan(nexus : FastAPI):
    global NEXUS_APP
    async with BF.AsyncSqliteSaver.from_conn_string("checkpoints.db") as memory:
        NEXUS_APP = BF.nexusGraphBuilder.compile(checkpointer=memory)
        yield
    
    

nexus = FastAPI(lifespan= lifespan)


# prompt class
class PromptInput(BaseModel):
    prompt:str
    thread_id:str


origins = [
    "http://localhost:3000",
    "http://localhost",
    "http://localhost:3001"
]

nexus.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)



@nexus.get("/")
# initial function for setting up fastapi
def initialize():
    return {"Hello":"World"}

@nexus.post("/ChatResponse/{model_tag}")
# this gives enhanced outputs of model with memory
async def chatResponse(model_tag:str , prompt:PromptInput):
    config = {"configurable":{"thread_id":f"thread_{prompt.thread_id}","model":f"{model_tag}"}}
    input_messages = [HumanMessage(content=prompt.prompt)]
    
    # Get the complete response from the graph
    result = await NEXUS_APP.ainvoke(input= {"messages" : input_messages} , config = config)
    
    # Extract the AI message content
    if 'messages' in result and result['messages']:
        ai_message = result['messages'][-1]
        if hasattr(ai_message, 'content'):
            return {"response": ai_message.content}
    
    # Fallback response
    return {"response": "Sorry, I couldn't process your request."}

@nexus.websocket("/ws/{thread_id}/{model_tag}")
async def streamResponse(websocket: WebSocket, thread_id: str, model_tag: str):
    config = {"configurable": {"thread_id": f"thread_{thread_id}", "model": f"{model_tag}"}}
    await websocket.accept()
    
    try:
        async for message in websocket.iter_text():
            graphInput = {"messages": [HumanMessage(content=message)]}
            
            # Step 3: Use astream_events() for proper streaming
            token_count = 0
            async for event in NEXUS_APP.astream_events(input=graphInput, config=config, version="v2"):
                # Step 4: Check for chat model streaming events
                if event['event'] == 'on_chat_model_stream':
                    # Extract the token from the streaming data
                    chunk_data = event.get('data', {})
                    chunk = chunk_data.get('chunk')
                    
                    if chunk and hasattr(chunk, 'content') and chunk.content:
                        token = chunk.content
                        token_count += 1
                        print(f"Streaming token #{token_count}: '{token}'")  # Debug output
                        # Send the token to frontend
                        await websocket.send_json({"token": token})
                else:
                    # Debug: print other event types to understand the flow
                    print(f"Event type: {event['event']}")
            
            # After streaming is complete, close the WebSocket
            print(f"Streaming complete. Total tokens sent: {token_count}")
            break  # Exit the message loop after processing one message
            
    except WebSocketDisconnect:
        print("client disconnected")
        
    finally:
        await websocket.close()
        print("WebSocket connection closed")
        
        
    

if __name__ == "__main__":
    uvicorn.run(nexus, host="127.0.0.1", port=8000, reload=True)