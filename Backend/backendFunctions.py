"""
This python script is for managing all the backend functions

"""

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv , dotenv_values

load_dotenv()


nexusClient = genai.Client(api_key=os.getenv("GEMINI_KEY"))


"""
Model              RPM     TPM      RPD
Gemini 2.0 Flash	15	1,000,000	200
"""
def generateResponseGemini(model: str , contents : str)->str:
    response = nexusClient.models.generate_content(
        
        model=model, 
        contents=contents,
        config=types.GenerateContentConfig(
            # thinking_config=types.ThinkingConfig(thinking_budget=0) # Disables thinking
        ),
    )
    return response.text



