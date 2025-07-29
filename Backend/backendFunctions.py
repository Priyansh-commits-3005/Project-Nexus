"""
This python script is for managing all the backend functions

"""

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv , dotenv_values
import ollama
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage,SystemMessage  
from logging import Logger # to be implemented


# loading the environmental variables
load_dotenv()

# dictionary for checking the model name with model tag
modelDict = {
    'Gemini':'gemini-2.0-flash',
    'DeepSeek':'deepseek-r1:8b'
}

# initializing Models using langchain
nexusOllamaModel = init_chat_model(modelDict['DeepSeek'], model_provider='ollama')
nexusGeminiModel = init_chat_model(modelDict['Gemini'] , model_provider="google_genai")


"""
Model              RPM     TPM      RPD

Gemini 2.0 Flash	15	1,000,000	200
"""
def generateResponseGemini(model: str , prompt : str,conversation_history: list = None)->str:
    messages = [HumanMessage(content=prompt)]
    response = nexusGeminiModel.invoke(messages)
    return response.content

def generateResponseOllama(model:str,prompt:str,conversation_history: list = None):
    messages = [HumanMessage(content=prompt)]
    response = nexusOllamaModel.invoke(messages)
    return response.content
    



