"""
This file contains all the api endpoints and the Backend logic
"""

from fastapi import FastAPI
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

if __name__ == "__main__":
    uvicorn.run(nexus, host="127.0.0.1", port=8000, reload=True)