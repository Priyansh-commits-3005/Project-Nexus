"use client";//this tells that this is a client component and not a server component
import SendButton from "./components/sendButton"
import InputBox from "./components/inputText"
import { useState } from "react";


export default function Landing(){

  const[prompt,setPrompt] = useState("Enter Prompt");

  return(
    <main>

      <div className="flex flex-col justify-center items-center gap-y-2 m-12 " >
        <div className = "">
        <h1 className="text-center border-2 border-amber-400 text-7xl ">Welcome to Nexus</h1>
        </div>
        <div>
          <InputBox 
          prompt={prompt}
          setPrompt={setPrompt}
          />
        </div>
        <div><SendButton prompt = {prompt} /></div>
      </div>
    </main>
  );
}