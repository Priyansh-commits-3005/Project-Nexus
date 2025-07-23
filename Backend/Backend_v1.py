"""
This file contains all the api endpoints and the Backend logic
"""

from fastapi import FastAPI
import uvicorn
import backendFunctions as BF


nexus = FastAPI()

@nexus.get("/")
# initial function for setting up fastapi
def initialize():
    return {"Hello":"World"}

@nexus.post("/geminiResponse/{model_tag}")
# this gives responses of gemini for query params for the content and the path params for model
def geminiResponse(model_tag:str , contents:str):
    return{"Gemini Response":BF.generateResponseGemini(model_tag,contents)}

