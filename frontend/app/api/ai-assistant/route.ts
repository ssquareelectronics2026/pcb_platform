import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface IncomingMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawMessages: IncomingMessage[] = body.messages || (body.message ? [{ role: 'user', content: body.message }] : []);

    if (!rawMessages || rawMessages.length === 0) {
      return NextResponse.json({ error: 'Please provide a message or conversation history.' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({
        reply: "I am the **S SQUARE ELECTRONICS AI Hardware Assistant**. Our Gemini API key is currently being configured. In the meantime, you can explore verified KiCAD symbols and footprints in our [Components Catalog](/components), request missing symbols at [Request Component](/request/component), or submit custom board requirements at [Request Project Design](/request/project)!",
      });
    }

    // 1. Fetch live components from Supabase for real-time catalog awareness
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: catalogComponents } = await supabase
      .from('components')
      .select('id, name, description, tags')
      .order('id', { ascending: true });

    const catalogList = (catalogComponents || [])
      .map(
        (c) =>
          `- [${c.name}](/components/${c.id}) (ID #${c.id}): ${c.description || 'Verified KiCAD symbol and footprint'}${
            c.tags ? ` [Tags: ${c.tags}]` : ''
          }`
      )
      .join('\n');

    // 2. Build S SQUARE ELECTRONICS system instructions
    const systemInstruction = `
You are the **S SQUARE ELECTRONICS AI Hardware Assistant**, the official interactive AI expert for the **S SQUARE ELECTRONICS PCB Component Hub** (https://pcb-platform.vercel.app).

LIVE COMPONENT CATALOG (Real-Time Database):
${catalogList || 'No components currently published.'}

YOUR CORE RESPONSIBILITIES & RULES:
1. **Catalog Search & Recommendations**:
   - Check the LIVE COMPONENT CATALOG above whenever a user asks about an IC, microcontroller, sensor, relay, connector, or module.
   - When a component is available in our catalog, recommend it warmly and provide the direct clickable markdown link: [Component Name](/components/{id}).
   - Remind the user that verified KiCAD Schematic Symbols (\`.kicad_sym\`) and PCB Footprints (\`.kicad_mod\`) are available for free instant download directly on that component's page.

2. **Missing Component Requests**:
   - If the user asks for a component that is NOT in our catalog, inform them politely and guide them directly to [Request Component](/request/component).
   - Explain that our engineering team at S SQUARE ELECTRONICS will create, verify, and publish the symbol & footprint for them promptly.

3. **Custom PCB Design & Gerber Manufacturing Requests**:
   - If the user wants a full PCB layout, custom circuit routing, schematic capture, or production-ready Gerber files for manufacturing on JLC PCB, Lion Circuits, or PCBWay, guide them to [Request Project Design](/request/project).
   - Mention they can upload their circuit diagrams, component datasheets, board constraints, and expected deadlines.

4. **KiCAD Integration & Tutorial Guidance**:
   - Guide users through importing KiCAD libraries with reference to our step-by-step documentation:
     - [KiCAD Symbol Tutorial](/tutorial/symbol) for adding \`.kicad_sym\` files to the Symbol Library.
     - [KiCAD Footprint Tutorial](/tutorial/footprint) for creating \`.pretty\` folders and importing \`.kicad_mod\` files.
   - Answer general electronics questions (trace width, clearance, ground planes, decoupling, 2-layer vs 4-layer stackup) with technical accuracy.

5. **Language & Communication Style**:
   - Keep answers structured, crisp, helpful, and concise. Avoid unnecessary filler or excessively long essays.
   - If the user writes or speaks in **Tanglish** (Tamil written in English script, e.g. "ESP32 irukka?", "Footprint epdi add pandradhu?"), respond fluently and naturally in friendly Tanglish / English mix! Otherwise, respond in standard professional English.
   - Always represent **S SQUARE ELECTRONICS** or the **S SQUARE ELECTRONICS Team**. Never mention individual personal designer names.
    `.trim();

    // 3. Format message contents for @google/genai
    const contents = rawMessages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 4. Initialize GoogleGenAI SDK with gemini-2.5-flash (with automatic fallback to gemini-3.8-flash)
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: preferredModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      responseText = response.text || '';
    } catch (modelErr: unknown) {
      const errMessage = modelErr instanceof Error ? modelErr.message : String(modelErr);
      // If gemini-2.5-flash returns 404 migration notice, fallback automatically to gemini-3.8-flash
      if (errMessage.includes('gemini-2.5-flash') || errMessage.includes('NOT_FOUND') || errMessage.includes('404')) {
        console.warn('[AI Assistant] Falling back from gemini-2.5-flash to gemini-3.8-flash...');
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        responseText = fallbackResponse.text || '';
      } else {
        throw modelErr;
      }
    }

    if (!responseText) {
      responseText =
        "Hello! I am your S SQUARE ELECTRONICS AI Hardware Assistant. You can search our [KiCAD Components Catalog](/components), request new footprints at [Request Component](/request/component), or submit custom PCB designs at [Request Project Design](/request/project). How can I help you today?";
    }

    return NextResponse.json({ reply: responseText });
  } catch (err: unknown) {
    console.error('AI Assistant API error:', err);
    return NextResponse.json(
      {
        reply:
          "I experienced a temporary connection glitch while processing your request. Please try again, or explore our [Components Catalog](/components) and [Request Component](/request/component) pages directly!",
        error: err instanceof Error ? err.message : 'Unknown AI Assistant error',
      },
      { status: 200 }
    );
  }
}
