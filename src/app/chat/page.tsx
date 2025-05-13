// Chat UI page
// Client-side Chat UI
'use client';
import { useState } from 'react';

export default function ChatPage() {
    const [input, setInput] = useState(''); // State to hold user input
    const [response, setResponse] = useState([]); // State to hold chat messages
    const [loading, setLoading] = useState(false); // State to indicate loading status
    const [error, setError] = useState(''); // State to hold error messages

    // Called when user clickes "Send"
    const sendQuery = async () => {
        setLoading(true); // Set loading to true when sending a query
        setError(''); // Clear any previous error messages
        try{
            const res = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: input }), // Send user input as JSON
            });
    
            if (!res.ok) {
                setLoading(false); // Set loading to false if the response is not OK
                const errorData = await res.json(); // Parse the error response as JSON
                setError(errorData.error || 'An error occurred'); // Update the error state with the error message
                return; 
                //throw new Error(`Error: ${res.status}`); // Throw an error if the response is not OK
            }
    
            const data = await res.json(); // Parse the response as JSON
            console.log('API Response:', data); // Log the response to the console
            setResponse(data.response || 'No response'); // Update the response state with the chatbot's reply
            setLoading(false); // Set loading to false after receiving the response
        }catch (error: any) {
            console.error('Error:', error); // Log the error to the console
            setError(error.message); // Update the error state with a generic error message
            
        }finally{
            setLoading(false); // Set loading to false if an error occurs
        }
    };
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-500">
            <h1 className="text-2xl font-bold mb-4 ">Chatbot</h1>
            <div className="w-full max-w-md">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)} // Update input state on change
                    className="border border-gray-300 p-2 w-full rounded mb-4"
                    placeholder="Type your message..."
                />
                <button
                    onClick={sendQuery} // Call sendQuery function on click
                    className="bg-blue-500 text-white p-2 rounded"
                >
                    {loading ? 'Loading...' : 'Send'}
                </button>
            </div>
            {response && (
                <div className="mt-4 p-4 border border-gray-300 rounded w-full max-w-md">
                    <p>{response}</p> {/* Display the chatbot's response */}
                </div>
            )}
        </div>
    )
    }