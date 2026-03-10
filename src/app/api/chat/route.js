import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req) {
    try {
        const { messages, canvasElements } = await req.json();

        // Give the AI context about the current canvas state
        const systemPrompt = `You are an expert Senior UI/UX Designer and Frontend Developer for the PrisMap canvas app.
Your goal is to generate beautiful, modern, and highly aesthetically pleasing designs when the user asks you to create UI elements, layouts, or graphics. 

### Core Design Principles to Follow:
1. **Modern Aesthetics**: Avoid basic, pure primary colors (like #FF0000 or #0000FF) unless specifically requested. Use sophisticated, harmonious color palettes (e.g., soft pastels, sleek dark mode colors, vibrant gradients).
2. **Depth & Hierarchy**: Use shadows (\`shadowColor\`, \`shadowBlur\`, \`shadowOffsetY\`) to create elevation and visual hierarchy between background cards and foreground elements.
3. **Softness**: Modern UI often uses rounded corners. Utilize \`cornerRadius\` (e.g., 8, 12, or 24) on rectangles (cards, buttons).
4. **Typography**: When adding text, choose appropriate \`fontSize\`, \`fontWeight\` (e.g., 'bold' for headers, 'normal' for body), and pleasing colors (e.g., dark gray #333333 instead of pure black #000000 for softer contrast).
5. **Composition**: If asked to design a complex component (like a "pricing card" or "header"), construct it using multiple overlapping elements (e.g., a background rectangle with shadow + a title text + a subtitle text + a button rectangle + button text). Position (\`x\`, \`y\`) these coherently.

Current Canvas Elements (JSON):
${JSON.stringify(canvasElements || [])}

When the user asks to add, remove, or modify shapes/text on the canvas, use the 'updateCanvas' tool.
When the user asks to generate a new image/logo/graphic, use the 'generateImage' tool.`;

        const result = await streamText({
            model: google('gemini-2.0-flash'),
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
                    description: 'Modify the Konva canvas state. Crucially used to compose UI elements.',
                    parameters: z.object({
                        action: z.enum(['add', 'update', 'delete', 'clear']).describe('The action to perform on the canvas.'),
                        elementParams: z.object({
                            type: z.enum(['rectangle', 'circle', 'text', 'star', 'image']).optional(),
                            x: z.number().optional().describe('X position (defaults to center if not provided)'),
                            y: z.number().optional().describe('Y position (defaults to center if not provided)'),
                            width: z.number().optional(),
                            height: z.number().optional(),
                            radius: z.number().optional(),
                            fill: z.string().optional().describe('Fill color. Use modern hex codes.'),
                            stroke: z.string().optional().describe('Border/Stroke color.'),
                            strokeWidth: z.number().optional(),
                            opacity: z.number().min(0).max(1).optional().describe('0.0 (transparent) to 1.0 (opaque)'),
                            cornerRadius: z.number().optional().describe('Rounds corners for rectangles (e.g., 8, 16)'),
                            shadowColor: z.string().optional().describe('Use semi-transparent defaults if adding depth, e.g., rgba(0,0,0,0.1)'),
                            shadowBlur: z.number().optional().describe('Blur radius for shadow (e.g., 10, 20)'),
                            shadowOffsetX: z.number().optional(),
                            shadowOffsetY: z.number().optional().describe('Vertical shadow drop (e.g., 4, 10)'),
                            text: z.string().optional(),
                            fontSize: z.number().optional(),
                            fontFamily: z.string().optional(),
                            fontWeight: z.string().optional().describe('e.g., normal, bold'),
                            fontStyle: z.string().optional().describe('e.g., normal, italic'),
                            textAlign: z.enum(['left', 'center', 'right']).optional(),
                            targetId: z.string().optional().describe('The ID of the element to modify or delete (required for update/delete).'),
                            properties: z.any().optional().describe('Any other specific Konva node properties.'),
                        }).optional().describe('Details of the element to add or update. Provide all necessary styling styling here.'),
                        explanation: z.string().describe('Explain your design decisions and what you are doing.'),
                    }),
                    // Client-side tool execution, no server-side execute block.
                }),
            },
            onError: ({ error }) => {
                console.error('[streamText Error]:', error);
            }
        });

        return result.toDataStreamResponse({
            sendUsage: true,
        });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
    }
}
