"""
This python script is for managing all the backend functions

"""

import asyncio
import os
from dotenv import load_dotenv , dotenv_values
import ollama
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import START,StateGraph,MessagesState,END
from langchain_core.prompts import ChatPromptTemplate,MessagesPlaceholder



from logging import Logger # to be implemented



# loading the environmental variables
load_dotenv()

# dictionary for checking the model name with model tag
modelDict = {
    'Gemini':'gemini-2.0-flash',
    'DeepSeek':'deepseek-r1:8b'
}
"""
Model              RPM     TPM      RPD

Gemini 2.0 Flash	15	1,000,000	200

"""    
# initializing Models using langchain
nexusOllamaModel = init_chat_model(modelDict['DeepSeek'], model_provider='ollama')
nexusGeminiModel = init_chat_model(modelDict['Gemini'] , model_provider="google_genai")

# prompt template

nexus_template_prompt = os.getenv("NEXUS_PROMPT_TEMPLATE")
nexusPromptTemplate = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            nexus_template_prompt,
            
        ),
        MessagesPlaceholder(variable_name = "messages")
    ]
)

# initializing the stateGraph
nexusGraphBuilder = StateGraph(state_schema=MessagesState)

    # make a function that takes the conversation history and calls the AI model.
async def chatbot(state:MessagesState , config):
        if(config['configurable']['model'] == 'Gemini'):
            llm = nexusGeminiModel
            
        else:
            llm = nexusOllamaModel
        prompt = nexusPromptTemplate.invoke(state)
        messages = await llm.ainvoke(prompt)
        return{"messages":[messages]}
        
    # making the graph
nexusGraphBuilder.add_edge(START , "chatbot")
nexusGraphBuilder.add_edge("chatbot",END)
nexusGraphBuilder.add_node("chatbot",chatbot)



        




