import { METHODS } from "http";

interface ButtonProps{
    prompt:string,
    Model :string
}
function SendButton({prompt,Model}:ButtonProps){
    async function promptResponse(){
        try
        {const response = await fetch(`http://127.0.0.1:8000/geminiResponse/${Model}`,{
            method:'POST',
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify({prompt:prompt}),    
        });
        if(!response.ok){
            throw new Error(`HTTP error! status:${response.status}`);
        }
        const data = await response.json();
        console.log(data);}
        catch(error){
            console.error('Error:',error);
        }
    }
    return (
        <main>
            <div className="">
                <button className=" px-3  bg-violet-500 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700"
                onClick={promptResponse}//When a click happens, then you should run the function inside.
                >
                    Send
                </button>
            </div>
        </main>
    )
}

export default SendButton;