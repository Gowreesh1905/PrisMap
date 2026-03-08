import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req) {
    try {
        const { messages, canvasElements } = await req.json();

        // Give the AI context about the current canvas state
        const systemPrompt = `You are a helpful design assistant for the PrisMap canvas app. 
You can answer questions, provide design advice, generate images, or directly manipulate the canvas.
Current Canvas Elements (JSON):
${JSON.stringify(canvasElements || [])}

When the user asks to add, remove, or modify shapes/text on the canvas, use the 'updateCanvas' tool.
When the user asks to generate a new image/logo/graphic, use the 'generateImage' tool.`;

        const result = await streamText({
            model: google('gemini-1.5-pro-latest'),
            messages,
            system: systemPrompt,
            tools: {
                generateImage: tool({
                    description: 'Generate an image using an AI model and return the URL. Use this when the user asks for a new picture, logo, or graphic.',
                    parameters: z.object({
                        prompt: z.string().describe('The detailed prompt describing the image to generate.'),
                    }),
                    execute: async ({ prompt }) => {
                        // Using pollinations.ai for free, instant image generation without API keys
                        const encodedPrompt = encodeURIComponent(prompt);
                        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
                        return { imageUrl, prompt };
                    },
                }),
                updateCanvas: tool({
                    description: 'Modify the Konva canvas state. Use this to add, update, delete, or arrange shapes and text on the user\'s canvas.',
                    parameters: z.object({
                        action: z.enum(['add', 'update', 'delete', 'clear']).describe('The action to perform on the canvas.'),
                        elementParams: z.object({
                            type: z.enum(['rect', 'circle', 'text', 'star', 'image']).optional(),
                            x: z.number().optional(),
                            y: z.number().optional(),
                            width: z.number().optional(),
                            height: z.number().optional(),
                            radius: z.number().optional(),
                            fill: z.string().optional(),
                            text: z.string().optional(),
                            fontSize: z.number().optional(),
                            targetId: z.string().optional().describe('The ID of the element to modify or delete (required for update/delete).'),
                            properties: z.any().optional().describe('Additional specific properties for the Konva node.'),
                        }).optional().describe('Details of the element to add or update.'),
                        explanation: z.string().describe('Explain what you are doing to the canvas.'),
                    }),
                    // Client-side tool execution, no server-side execute block.
                }),
            },
        });

        return result.toDataStreamResponse();
    } catch (error) {
        console.error('Gemini API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
    }
}
