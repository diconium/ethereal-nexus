import r2wc from "@r2wc/react-to-web-component"
import {useState} from "react";

import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai";

//version: 0.0.1
const ChatGpt = () => {
    const [prompt, setPrompt] = useState<string | undefined>('');
    const [response, setResponse] = useState<string | undefined>('');
    const configuration = new Configuration({
        apiKey: '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',
    });
    const myOpenAi = new OpenAIApi(configuration);

    const chatGptMessages = [
        {
            role: ChatCompletionRequestMessageRoleEnum.System,
            content: prompt ? prompt : 'Hello',
        }
    ];
    const getOpenAIResponse = async (e: React.FormEvent<EventTarget>) => {
        e.preventDefault();
        const res = await myOpenAi.createChatCompletion({
            messages: chatGptMessages,
            model: 'gpt-3.5-turbo',
        });
        setResponse(res.data.choices[0].message?.content);
    };

    return (
        <div>
            <h1>ChatGPT</h1>
            <>
                <form onSubmit={getOpenAIResponse}>
                    <input
                        id="chat-input"
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                    />
                    <button type="submit">Submit</button>
                </form>
                {/* If there's no response then don't show the element,
   we can replace it with a Loading comonent */}
                {!!response && <div>{response}</div>}
            </>
        </div>
    );
};

export default ChatGpt;

if (!window.customElements.get('chat-gpt')) {
    console.log("hello")
    customElements.define("chat-gpt", r2wc(ChatGpt))
}