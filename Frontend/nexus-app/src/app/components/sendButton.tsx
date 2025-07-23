interface ButtonProps{
    prompt:string,
    Model :string
}
function SendButton({prompt,Model}:ButtonProps){
    function promptResponse(){
        
    }
    return (
        <main>
            <div className="">
                <button className=" px-3  bg-violet-500 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700"
                onClick={()=>console.log(prompt)}//When a click happens, then you should run the code inside.
                >
                    Send
                </button>
            </div>
        </main>
    )
}

export default SendButton;