// Internal chatbot API route

import { get } from "http";
import { NextResponse } from "next/server";
import getAuthCookies from "@/lib/auth";   
import { secureAxios } from "@/lib/secureAxios";


// This function handles POST requests to the '/api/chatbot' endpoint
export async function POST (req: Request){
    try{

        // Extract the 'query' parameter from the request body
        // The request body is expected to be in JSON format
        const {query} = await req.json();
        console.log("Query received:", query);

        // Step 1: Get authentication cookies
        // This function is responsible for obtaining authentication cookies from the server
        const authCoockies = await getAuthCookies();

        // Define the chatbot API URL
        // The URL is constructed using the base URL from the environment variable
        //const CHATBOT_PK = process.env.CHATBOT_PK;
        //const CHATBOT_SK = process.env.CHATBOT_SK;
        const CHATBOT_PK = "static";
        const CHATBOT_SK = "gpt-4";

        // Step 2: Send the user's query to the chatbot endpoint with the authentication cookies
        const chatbotResponse = await secureAxios.post(
            'https://pschat.novonordisk.com/api/chatbot/static/gpt-4/query',
            { query }, // The user's query is sent in the request body
            // The request headers include the authentication cookies
            {
                headers: {
                    //'Content-Type': 'application/json',
                    'Cookie': authCoockies,
                },
            }
        )

        console.log("Chatbot response:", chatbotResponse.data);
        // Step 3: Return the chatbot's response to the frontend
        // The response is sent back as JSON
        return NextResponse.json(
            {
                response: chatbotResponse.data,
            });
    }catch (error: any){
        console.error("Error in chatbot API route:", error.message);
        return NextResponse.json(
            {
                error: "An error occurred while processing your request.",
            },
            { status: 500 }
        );
    }
}