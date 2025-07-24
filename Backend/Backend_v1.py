"""
This file contains all the api endpoints and the Backend logic
"""

from fastapi import FastAPI
import uvicorn
import backendFunctions as BF
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

nexus = FastAPI()

# prompt class
class PromptInput(BaseModel):
    prompt:str

origins = [
    "http://localhost:3000",
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

@nexus.post("/geminiResponse/{model_tag}")
# this gives responses of gemini for query params for the content and the path params for model
def geminiResponse(model_tag:str , prompt:PromptInput):
    return{"Gemini Response":BF.generateResponseGemini(model_tag,prompt.prompt)}

