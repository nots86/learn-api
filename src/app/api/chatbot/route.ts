// Internal chatbot API route
import { NextRequest, NextResponse } from "next/server";
import getAuthCookies from "@/lib/auth";   
import { secureAxios } from "@/lib/secureAxios";

interface ChatbotRequestBody {
  query: string;
}

interface Tag {
  optixPath: string;
  symbolName: string;
  //sourceDocument?: string;
  description: string;
}

interface ChatbotResponseData {
  explanation?: string;
  tags?: Tag[];
  rawText?: string;
  retrievalTime?: string;
  totalResponseTime?: string;
  userExperienceTime?: string;
  metrics?: {
    retrievalTime?: string;
    totalResponseTime?: string;
    userExperienceTime?: string;
  };
  [key: string]: any; // Allow for additional properties
}

// This function handles POST requests to the '/api/chatbot' endpoint
export async function POST(req: NextRequest) {
    try {
        // Extract the 'query' parameter from the request body
        const { query } = await req.json() as ChatbotRequestBody;
        console.log("Query received:", query);

        // Step 1: Get authentication cookies
        const authCookies = await getAuthCookies();

        // Define the chatbot API constants
        const CHATBOT_PK = "static";
        const CHATBOT_SK = "gpt-4";

        // Step 2: Send the user's query to the chatbot endpoint with the authentication cookies
        const chatbotResponse = await secureAxios.post<string  | ChatbotResponseData>(
            'https://pschat.novonordisk.com/api/chatbot/nots@novonordisk.com/1747040832.0671475/query',
            { query },
            {
                headers: {
                    'Cookie': authCookies,
                },
            }
        );

        console.log("Chatbot response received");
        console.log("Chatbot response data:", chatbotResponse.data);
        //console.log("Chatbot response headers:", chatbotResponse.headers);
        console.log("Chatbot response status:", chatbotResponse.status);

        // Step 3: Return the complete chatbot response to the frontend
        const responseData = chatbotResponse.data;
        
        // If the response is a string (which it appears to be based on your logs),
        // return it directly as plain text
        if (typeof responseData === 'string') {
            console.log("Returning plain text response");
            return new NextResponse(responseData, {
                headers: {
                    'Content-Type': 'text/plain',
                }
            });
        }
        
        // If we get here, the response is a structured object
        console.log("Processing structured response");
        
        // If the response has a raw text field, return that
        if (responseData.rawText) {
            return new NextResponse(responseData.rawText, {
                headers: {
                    'Content-Type': 'text/plain',
                }
            });
        }
        
        // Otherwise, return the structured response as JSON
        return NextResponse.json({
            response: {
                explanation: responseData.explanation || "No explanation provided",
                tags: Array.isArray(responseData.tags) ? responseData.tags : [],
            },
            metrics: {
                retrievalTime: responseData.retrievalTime || responseData.metrics?.retrievalTime,
                totalResponseTime: responseData.totalResponseTime || responseData.metrics?.totalResponseTime,
                userExperienceTime: responseData.userExperienceTime || responseData.metrics?.userExperienceTime,
            }
        });
        
    } catch (error: any) {
        console.error("Error in chatbot API route:", error);
        return NextResponse.json(
            {
                error: "An error occurred while processing your request.",
                details: error.message
            },
            { status: 500 }
        );
    }
}