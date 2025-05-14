// Chat UI page
// Client-side Chat UI
'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Add this import for GitHub Flavored Markdown (includes tables)

export default function ChatPage() {
    const [input, setInput] = useState<string>('');
    const [responseText, setResponseText] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [retryCount, setRetryCount] = useState<number>(0);

    // Called when user clicks "Send"
    const sendQuery = async () => {
        if (!input.trim()) return;
        
        setLoading(true);
        setError('');
        setResponseText('');
        
        try {
            // Set a timeout for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const res = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: input }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                if (res.status === 504 || res.status === 502 || res.status === 503) {
                    throw new Error('The server took too long to respond. The service might be temporarily unavailable.');
                }
                
                const errorData = await res.json();
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            // Get the response as text
            const textResponse = await res.text();
            
            // Process the response
            processResponse(textResponse);
            
            // Reset retry count on success
            setRetryCount(0);
            
        } catch (error: any) {
            console.error('Error:', error);
            
            if (error.name === 'AbortError') {
                setError('Request timed out. The server took too long to respond.');
            } else {
                setError(error.message || 'An unknown error occurred');
            }
            
            // If we have a timeout or connection error, show a retry button
            if (error.message?.includes('timeout') || 
                error.message?.includes('network') ||
                error.message?.includes('unavailable') ||
                error.name === 'AbortError') {
                
                setRetryCount(prev => prev + 1);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const processResponse = (textResponse: string) => {
        try {
            // Ensure proper line breaks in the response
            // Replace single newlines with double newlines for markdown
            let formattedText = textResponse;
            
            // Check if the response contains a tool_applied section
            if (textResponse.includes('<tool_applied>')) {
                // Extract the main text before the tool output
                const mainText = textResponse.split('<tool_applied>')[0].trim();
                
                // Format the response to extract tags from the JSON
                formattedText = mainText + "\n\n";
                
                // Try to extract tags from the JSON in the tool output
                try {
                    // Extract the JSON part
                    const toolStartIndex = textResponse.indexOf('<tool_applied>');
                    const toolEndIndex = textResponse.indexOf('</tool_applied>');
                    
                    if (toolStartIndex !== -1 && toolEndIndex !== -1) {
                        const toolContent = textResponse.substring(
                            toolStartIndex + '<tool_applied>'.length, 
                            toolEndIndex
                        );
                        
                        try {
                            const toolData = JSON.parse(toolContent);
                            
                            if (toolData.result && typeof toolData.result === 'string') {
                                // Try to extract tags from the search results
                                const searchResults = toolData.result;
                                
                                if (searchResults.includes('Search results:')) {
                                    // Extract tags from the search results
                                    formattedText += "### Found Alarm Tags\n\n";
                                    formattedText += "| Optix Path | Symbol Name | Data Type | Description |\n";
                                    formattedText += "|------------|-------------|-----------|-------------|\n";
                                    
                                    // Parse the JSON objects in the search results
                                    // Using a simpler approach to extract tag information
                                    const paragraphs = searchResults.match(/"optixPath":\s*"[^"]+"/g);
                                    let tagCount = 0;
                                    
                                    if (paragraphs) {
                                        // For each paragraph that contains optixPath
                                        for (let i = 0; i < paragraphs.length && tagCount < 20; i++) {
                                            // Find the paragraph containing this optixPath
                                            const startIndex = searchResults.indexOf(paragraphs[i]);
                                            if (startIndex === -1) continue;
                                            
                                            // Extract a chunk of text that should contain the full tag
                                            const chunk = searchResults.substring(startIndex, startIndex + 500);
                                            
                                            // Extract the individual fields
                                            const optixPathMatch = chunk.match(/"optixPath":\s*"([^"]+)"/);
                                            const symbolNameMatch = chunk.match(/"symbolName":\s*"([^"]+)"/);
                                            const dataTypeMatch = chunk.match(/"dataType":\s*"([^"]+)"/);
                                            const descriptionMatch = chunk.match(/"description":\s*"([^"]+)"/);
                                            
                                            if (optixPathMatch && symbolNameMatch && descriptionMatch) {
                                                const optixPath = optixPathMatch[1];
                                                const symbolName = symbolNameMatch[1];
                                                const dataType = dataTypeMatch ? dataTypeMatch[1] : "N/A";
                                                const description = descriptionMatch[1];
                                                
                                                if (description.toLowerCase().includes('alarm')) {
                                                    formattedText += `| ${optixPath} | ${symbolName} | ${dataType} | ${description} |\n`;
                                                    tagCount++;
                                                }
                                            }
                                        }
                                    }
                                    
                                    if (tagCount === 0) {
                                        formattedText += "No alarm tags found in the search results.\n";
                                    } else if (tagCount === 20) {
                                        formattedText += "\n*Showing first 20 results. There may be more alarm tags available.*\n";
                                    }
                                }
                            }
                        } catch (jsonParseError) {
                            console.error('Error parsing tool data JSON:', jsonParseError);
                            formattedText = textResponse;
                        }
                    }
                } catch (jsonError) {
                    console.error('Error parsing tool output:', jsonError);
                    // Just use the text response if we can't parse the JSON
                    formattedText = textResponse;
                }
            } else {
                // Ensure proper line breaks for plain text responses
                // Replace single newlines with double newlines for markdown
                formattedText = textResponse
                    .replace(/\n(?!\n)/g, '\n\n')  // Replace single newlines with double newlines
                    .replace(/\|\s*\|/g, '| |');   // Fix empty table cells
            }
            
            setResponseText(formattedText);
        } catch (error) {
            console.error('Error processing response:', error);
            setResponseText(textResponse);
        }
    };

    const handleRetry = () => {
        sendQuery();
    };

    return (
        <div  className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1  className="text-2xl font-bold mb-4">Chatbot</h1>
            
            <div  className="w-full max-w-3xl">
                <div  className="flex gap-2 mb-4">
                    <input
                         type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                sendQuery();
                            }
                        }}
                        className="border border-gray-300 p-2 flex-grow rounded"
                        placeholder="Type your message..."
                    />
                    <button  
                        onClick={sendQuery} 
                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Send'}
                    </button>
                </div>
                
                {loading && (
                    <div  className="p-4 bg-white border rounded">
                        <p  className="text-gray-500">Processing your request...</p>
                    </div>
                )}
                
                {error && (
                    <div  className="p-4 border border-red-300 bg-red-100 text-red-700 rounded mb-4">
                        <p  className="mb-2">{error}</p>
                        {retryCount > 0 && retryCount < 3 && (
                            <button  
                                onClick={handleRetry}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                                Retry Request
                            </button>
                        )}
                        {retryCount >= 3 && (
                            <p  className="text-sm">
                                Multiple retry attempts failed. The service might be down or experiencing issues.
                                Please try again later or contact support.
                            </p>
                        )}
                    </div>
                )}
                
                {!loading && responseText && (
                    <div  className="p-4 bg-white border rounded shadow-sm">
                        <div  className="prose prose-sm max-w-none whitespace-pre-line">
                            <ReactMarkdown  remarkPlugins={[remarkGfm]}>
                                {responseText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}