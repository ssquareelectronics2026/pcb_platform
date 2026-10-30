import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface IncomingMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

interface ComponentRecord {
  id: number | string;
  name: string;
  description?: string | null;
  tags?: string | null;
}

/**
 * Fast-path check: Detects if the user is asking for general catalog list
 */
function isGeneralCatalogRequest(query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    q === 'components' ||
    q === 'catalog' ||
    q.includes('what components') ||
    q.includes('list components') ||
    q.includes('show components') ||
    q.includes('all components') ||
    q.includes('available components') ||
    q.includes('components in the catalog') ||
    q.includes('browse components') ||
    q.includes('what is in the catalog') ||
    q.includes('what is available') ||
    q.includes('which components')
  );
}

/**
 * Fast-path search: Checks if query directly matches any component name or tag
 */
function findMatchingComponents(query: string, components: ComponentRecord[]): ComponentRecord[] {
  const q = query.toLowerCase().trim();
  const cleanQuery = q.replace(/[^a-z0-9\s]/gi, ' ');
  const words = cleanQuery.split(/\s+/).filter((w) => w.length >= 2);

  return components.filter((comp) => {
    const compName = comp.name.toLowerCase();
    const compTags = (comp.tags || '').toLowerCase();
    const compDesc = (comp.description || '').toLowerCase();

    // Exact or substring match on name
    if (compName.includes(q) || q.includes(compName)) return true;

    // Word-level match (e.g. "mics", "esp32", "arduino", "relay", "tft")
    const hasWordMatch = words.some(
      (w) =>
        w !== 'what' &&
        w !== 'have' &&
        w !== 'with' &&
        w !== 'kicad' &&
        (compName.includes(w) || compTags.includes(w) || compDesc.includes(w))
    );

    return hasWordMatch;
  });
}

/**
 * Extract component IDs mentioned in the AI response text (e.g. /components/3)
 */
function extractMentionedComponents(text: string, components: ComponentRecord[]): ComponentRecord[] {
  const matches = text.match(/\/components\/(\d+)/g) || [];
  const ids = new Set(matches.map((m) => m.replace('/components/', '')));
  return components.filter((c) => ids.has(String(c.id)));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawMessages: IncomingMessage[] =
      body.messages || (body.message ? [{ role: 'user', content: body.message }] : []);

    if (!rawMessages || rawMessages.length === 0) {
      return NextResponse.json({ error: 'Please provide a message or conversation history.' }, { status: 400 });
    }

    const lastUserQuery = rawMessages[rawMessages.length - 1]?.content?.trim() || '';

    // 1. Fetch live components from Supabase for real-time catalog awareness
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: catalogComponents } = await supabase
      .from('components')
      .select('id, name, description, tags')
      .order('id', { ascending: true });

    const components: ComponentRecord[] = (catalogComponents || []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      tags: c.tags,
    }));

    // 2. FAST-PATH 1: Instant General Catalog Lookup (< 100ms)
    if (isGeneralCatalogRequest(lastUserQuery)) {
      if (components.length === 0) {
        return NextResponse.json({
          reply: 'There are currently no components published in the catalog. You can request any component at [Request Component](/request/component).',
          matchedComponents: [],
        });
      }

      return NextResponse.json({
        reply: `Here are the ${components.length} component(s) currently available in our catalog with verified KiCAD symbols (.kicad_sym) and footprints (.kicad_mod):`,
        matchedComponents: components,
      });
    }

    // 3. FAST-PATH 2: Direct Search on Short Query (< 100ms)
    // E.g., user types "MICS 2714", "ESP32", "Arduino", "Do you have relay?"
    const matched = findMatchingComponents(lastUserQuery, components);
    const isDirectSearch =
      matched.length > 0 &&
      (lastUserQuery.length <= 30 ||
        /^(do you have|is there|find|search|show me|have you got|got|available)\s+/i.test(lastUserQuery));

    if (isDirectSearch) {
      return NextResponse.json({
        reply: `Yes, we have ${matched.map((m) => `[${m.name}](/components/${m.id})`).join(', ')} available in our catalog for free KiCAD download:`,
        matchedComponents: matched,
      });
    }

    // 4. API Key Verification for General AI Questions
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({
        reply:
          'I am the **S SQUARE ELECTRONICS AI Assistant**. You can browse verified KiCAD footprints in our [Components Catalog](/components), request missing symbols at [Request Component](/request/component), or submit custom PCB design inquiries at [Request Project Design](/request/project).',
        matchedComponents: matched.length > 0 ? matched : undefined,
      });
    }

    // 5. Build Compact System Instructions (Direct Answers Only, Zero Boilerplate)
    const catalogSummary = components
      .map((c) => `[${c.name}](/components/${c.id}) (ID #${c.id})`)
      .join(', ');

    const systemInstruction = `
You are the S SQUARE ELECTRONICS AI Assistant for S SQUARE ELECTRONICS PCB Component Hub (https://pcb-platform.vercel.app).

LIVE CATALOG:
${catalogSummary || 'None currently published.'}

CRITICAL RULES:
1. ONLY answer the specific question asked in 1 to 3 concise sentences maximum.
2. NEVER include promotional boilerplate, footers, disclaimers, or "What's included" sections.
3. NEVER use raw markdown headers (###, ##, #) or blockquotes (>). Use plain sentences or short bullet items only.
4. When mentioning an available component, format its link exactly as [Component Name](/components/{id}).
5. Only provide the link to [Request Component](/request/component) if the user explicitly asks for a part NOT in our catalog.
6. Only provide the link to [Request Project Design](/request/project) if the user explicitly asks for custom PCB board design, routing, or Gerber manufacturing files.
7. If the user asks in Tanglish (Tamil + English), reply naturally and concisely in Tanglish.
    `.trim();

    // Format messages for @google/genai SDK
    const contents = rawMessages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 6. Fast AI Call with thinkingBudget: 0 and strict timeout
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const generateCall = async () => {
      try {
        const response = await ai.models.generateContent({
          model: preferredModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 200,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        });
        return response.text || '';
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // If gemini-2.5-flash is not available, immediately fall back to gemini-flash-lite-latest (fastest: ~800ms)
        if (msg.includes('404') || msg.includes('not available') || msg.includes('gemini-2.5-flash')) {
          console.warn('[AI Assistant] Immediate fallback to gemini-flash-lite-latest...');
          const fallbackRes = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents,
            config: {
              systemInstruction,
              temperature: 0.2,
              maxOutputTokens: 200,
            },
          });
          return fallbackRes.text || '';
        }
        throw err;
      }
    };

    // Strict 7.5 second timeout to guarantee < 8 seconds response
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('AI response timeout')), 7500)
    );

    let reply = '';
    try {
      reply = await Promise.race([generateCall(), timeoutPromise]);
    } catch (raceErr) {
      console.warn('AI call timed out or failed, using fast fallback:', raceErr);
      if (lastUserQuery.toLowerCase().includes('kicad_sym') || lastUserQuery.toLowerCase().includes('symbol')) {
        reply =
          'To import `.kicad_sym` into KiCAD, open the Symbol Editor, select File > Add Symbol Library, and choose your downloaded symbol file. See our [Symbol Tutorial](/tutorial/symbol) for step-by-step guidance.';
      } else if (
        lastUserQuery.toLowerCase().includes('kicad_mod') ||
        lastUserQuery.toLowerCase().includes('footprint')
      ) {
        reply =
          'To add a `.kicad_mod` footprint, create a `.pretty` folder, place the `.kicad_mod` file inside, and add the folder via Preferences > Manage Footprint Libraries. Check our [Footprint Tutorial](/tutorial/footprint) for full steps.';
      } else if (
        lastUserQuery.toLowerCase().includes('custom') ||
        lastUserQuery.toLowerCase().includes('project') ||
        lastUserQuery.toLowerCase().includes('gerber')
      ) {
        reply =
          'You can submit your custom PCB requirements, circuit diagrams, and datasheets directly on our [Request Project Design](/request/project) page for complete layout and Gerber files.';
      } else {
        reply =
          'You can search verified KiCAD symbols and footprints in our [Components Catalog](/components) or request new parts at [Request Component](/request/component).';
      }
    }

    // Clean any unwanted promotional footer or raw headers that AI might have generated
    reply = reply
      .replace(/^#{1,6}\s+/gm, '') // Remove raw markdown headers
      .replace(/^>\s*/gm, '') // Remove blockquotes
      .replace(/###\s*What's included[\s\S]*$/i, '') // Strip unwanted boilerplate sections
      .replace(/>\s*Need a component not listed here[\s\S]*$/i, '')
      .trim();

    // 7. Find any components mentioned in the AI reply or user query to attach as interactive cards
    const mentionedFromReply = extractMentionedComponents(reply, components);
    const combinedMatches = Array.from(
      new Map([...matched, ...mentionedFromReply].map((c) => [c.id, c])).values()
    );

    return NextResponse.json({
      reply,
      matchedComponents: combinedMatches.length > 0 ? combinedMatches : undefined,
    });
  } catch (err: unknown) {
    console.error('AI Assistant API error:', err);
    return NextResponse.json(
      {
        reply:
          'Please browse our [Components Catalog](/components) or submit your part inquiry at [Request Component](/request/component).',
        error: err instanceof Error ? err.message : 'Unknown AI Assistant error',
      },
      { status: 200 }
    );
  }
}
