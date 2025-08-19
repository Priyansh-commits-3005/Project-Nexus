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
from langchain_core.messages import trim_messages
import json

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

# Message Trimmer
nexusTrimmer = trim_messages(
    max_tokens = 8000,  # Increased from 100 to 8000 for better memory
    strategy  ="last",
    include_system=True,
    allow_partial=False,
    start_on="human",
)

# initializing the stateGraph
nexusGraphBuilder = StateGraph(state_schema=MessagesState)

# make a function that takes the conversation history and calls the AI model.
async def chatbot(state:MessagesState , config):
    if(config['configurable']['model'] == 'Gemini'):
        llm = nexusGeminiModel
            
    else:
        llm = nexusOllamaModel
    trimmed_messages = nexusTrimmer.invoke(state['messages'] , token_counter =llm)
    prompt = nexusPromptTemplate.invoke(
        {'messages':trimmed_messages}
    )
    messages = await llm.ainvoke(prompt)
    return{"messages":[messages]}
        
# making the graph
nexusGraphBuilder.add_node("chatbot",chatbot)
nexusGraphBuilder.add_edge(START , "chatbot")
nexusGraphBuilder.add_edge("chatbot",END)









#--------------------------------------Helper Functions----------------------------------
async def streamTranslator(nexusStreamGen):
    """
    Convert LangGraph chunks to streaming format for the frontend
    """
    try:
        async for chunks in nexusStreamGen:
            # Check if chunk contains chatbot messages
            if 'chatbot' in chunks and 'messages' in chunks['chatbot'] and chunks['chatbot']['messages']:
                # Get the latest message from the chunk
                latest_message = chunks['chatbot']['messages'][-1]
                
                # Check if it's an AI message and has content
                if hasattr(latest_message, 'content') and latest_message.__class__.__name__ == 'AIMessage':
                    content = latest_message.content
                    
                    # Split content into words for word-by-word streaming
                    words = content.split()
                    for i, word in enumerate(words):
                        if i == 0:
                            token = word
                        else:
                            token = " " + word
                        
                        response_data = {"response_token": token}
                        yield f"data: {json.dumps(response_data)}\n\n"
                        # Small delay between words for streaming effect
                        await asyncio.sleep(0.1)
                    
                    # Signal end of message
                    yield f"data: {json.dumps({'response_token': '', 'end': True})}\n\n"
                
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    