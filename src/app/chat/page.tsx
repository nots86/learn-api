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
            
            const res = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: input }),
                signal: controller.signal
            });
            
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
            // Check if this is an alarm tag search result
            if (textResponse.includes('search for alarm tags') && textResponse.includes('Result =')) {
                // Extract the introduction and result count
                const lines = textResponse.split('\n');
                let formattedText = '';
                
                // Process the text line by line
                let inTable = false;
                let additionalText = '';
                let captureAdditional = false;
                
                // ADDED: Variables to track table headers and column positions
                let headerLine = '';
                let separatorLine = '';
                let sourceDocColumnIndex = -1;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Skip empty lines
                    if (!line) continue;
                    
                    // MODIFIED: Check if we're starting the table section and identify the Source Document column
                    if (line.startsWith('| Optix Path') || line.startsWith('| Symbol Name')) {
                        inTable = true;
                        headerLine = line;
                        
                        // ADDED: Find the index of the Source Document column
                        const columns = line.split('|').map(col => col.trim());
                        sourceDocColumnIndex = columns.findIndex(col => 
                            col.includes('Source') && col.includes('Document'));
                        
                        // ADDED: If Source Document column is found, remove it from the header
                        if (sourceDocColumnIndex !== -1) {
                            const headerParts = line.split('|');
                            headerParts.splice(sourceDocColumnIndex, 1);
                            formattedText += headerParts.join('|') + '\n';
                        } else {
                            formattedText += line + '\n';
                        }
                        continue;
                    }
                    
                    // MODIFIED: Handle the separator line (usually |------|------|)
                    if (line.startsWith('|--')) {
                        separatorLine = line;
                        
                        // ADDED: If Source Document column is found, remove it from the separator
                        if (sourceDocColumnIndex !== -1) {
                            const separatorParts = line.split('|');
                            separatorParts.splice(sourceDocColumnIndex, 1);
                            formattedText += separatorParts.join('|') + '\n';
                        } else {
                            formattedText += line + '\n';
                        }
                        continue;
                    }
                    
                    // Check if we're at the end of the table
                    if (inTable && !line.startsWith('|')) {
                        inTable = false;
                        captureAdditional = true;
                        additionalText += line + '\n\n';
                        continue;
                    }
                    
                    // MODIFIED: If we're in the table, process each row to remove the Source Document column
                    if (inTable) {
                        if (sourceDocColumnIndex !== -1) {
                            const rowParts = line.split('|');
                            rowParts.splice(sourceDocColumnIndex, 1);
                            formattedText += rowParts.join('|') + '\n';
                        } else {
                            formattedText += line + '\n';
                        }
                        continue;
                    }
                    
                    // If we're capturing additional text after the table
                    if (captureAdditional) {
                        additionalText += line + '\n\n';
                        continue;
                    }
                    
                    // If we're before the table, add the line to the formatted text
                    formattedText += line + '\n\n';
                }
                
                // Add the additional text after the table
                if (additionalText) {
                    formattedText += '\n' + additionalText;
                }
                
                // Add metrics if they exist in the response
                if (textResponse.includes('Retrieval Time:')) {
                    const metricsMatch = textResponse.match(/Retrieval Time: ([\d.]+)s\nTotal Response Time: ([\d.]+)s\nUser Experience Time: ([\d.]+)s/);
                    if (metricsMatch) {
                        formattedText += `\n**Metrics:**\n- Retrieval Time: ${metricsMatch[1]}s\n- Total Response Time: ${metricsMatch[2]}s\n- User Experience Time: ${metricsMatch[3]}s\n`;
                    }
                }
                
                setResponseText(formattedText);
            } else {
                // Handle regular text responses
                let formattedText = textResponse
                    .replace(/\n(?!\n)/g, '\n\n')  // Replace single newlines with double newlines for markdown
                    .replace(/\|\s*\|/g, '| |');   // Fix empty table cells
                
                setResponseText(formattedText);
            }
        } catch (error) {
            console.error('Error processing response:', error);
            setResponseText(textResponse);
        }
    };

    const handleRetry = () => {
        sendQuery();
    };

    return (
        <div  className="flex flex-col items-center justify-center min-h-screen bg-gray-500 p-4">
            <h1  className="text-2xl font-bold mb-4">Chatbot</h1>
            
            <div  className="w-full max-w-4xl">
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
                    <div  className="p-4 bg-gray-800 border rounded shadow-sm max-h-[70vh] overflow-y-auto w-full max-w-4xl">
                        <div  className="prose prose-sm max-w-none whitespace-pre-line text-white">
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