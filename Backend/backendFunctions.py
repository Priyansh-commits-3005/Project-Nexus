"""
This python script is for managing all the backend functions

"""

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv , dotenv_values
import ollama

# loading the environmental variables
load_dotenv()

# loading the model clients
nexusOllamaClient = ollama.Client()
nexusGeminiClient = genai.Client(api_key=os.getenv("GEMINI_KEY"))

# dictionary for checking the model name with model tag
modelDict = {
    'Gemini':'gemini-2.0-flash',
    'DeepSeek':'deepseek-r1:8b'
}


"""
Model              RPM     TPM      RPD

Gemini 2.0 Flash	15	1,000,000	200
"""
def generateResponseGemini(model: str , contents : str)->str:
    model = modelDict[model]
    response = nexusGeminiClient.models.generate_content(
        
        model=model, 
        contents=contents,
        config=types.GenerateContentConfig(
        ),
    )
    return response.text

def generateResponseOllama(model:str,prompt:str):
    model = modelDict[model]
    response = nexusOllamaClient.generate(model=model,prompt=prompt)
    return response.response
    



