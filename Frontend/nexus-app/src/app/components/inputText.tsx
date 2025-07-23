interface InputBoxProp{
    prompt:string,
    setPrompt:(value:string)=>void
}
export default function InputBox({prompt, setPrompt}:InputBoxProp){
    return(
        <main>
            <div>
                <div >
                    <input type="text" className="text-center px-5 basis-xl text-3xl border-2 border-teal-700 focus:border-4 focus:border-teal-900"
                    onChange={e => setPrompt(e.target.value)}
                    value={prompt} />
                </div>
            </div>
        </main>
    )
}