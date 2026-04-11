import { NextResponse } from 'next/server';

import { searchBookSegments } from '@/lib/actions/book.actions';

// Helper function to process book search logic
async function processBookSearch(bookId: unknown, query: unknown) {
    const startTime = Date.now();
    console.log('🔍 [searchBook] Starting search', { bookId, query, timestamp: new Date().toISOString() });

    // Validate inputs before conversion to prevent null/undefined becoming "null"/"undefined" strings
    if (bookId == null || query == null || query === '') {
        console.warn('❌ [searchBook] Validation failed: Missing bookId or query', { bookId, query });
        return { result: 'Missing bookId or query' };
    }

    // Convert bookId to string
    const bookIdStr = String(bookId);
    const queryStr = String(query).trim();

    // Additional validation after conversion
    if (!bookIdStr || bookIdStr === 'null' || bookIdStr === 'undefined' || !queryStr) {
        console.warn('❌ [searchBook] Validation failed after conversion', { bookIdStr, queryStr });
        return { result: 'Missing bookId or query' };
    }

    console.log('✅ [searchBook] Validation passed, executing MongoDB search', { bookIdStr, queryStr });

    // Execute search
    const searchResult = await searchBookSegments(bookIdStr, queryStr, 3);
    
    const searchTime = Date.now() - startTime;
    console.log('⏱️ [searchBook] Database query completed', { 
        duration: `${searchTime}ms`, 
        success: searchResult.success, 
        segmentsFound: searchResult.data?.length || 0 
    });

    // Return results
    if (!searchResult.success || !searchResult.data?.length) {
        console.warn('⚠️ [searchBook] No segments found or search failed', { 
            success: searchResult.success,
            error: searchResult.error 
        });
        return { result: 'No information found about this topic in the book.' };
    }

    const combinedText = searchResult.data
        .map((segment: any) => {
            const pageInfo = segment.pageNumber ? ` [Page ${segment.pageNumber}]` : '';
            return `${segment.content}${pageInfo}`;
        })
        .join('\n\n');

    console.log('📝 [searchBook] Results prepared', { 
        segmentsCount: searchResult.data.length,
        combinedLength: combinedText.length,
        totalTime: `${Date.now() - startTime}ms`
    });

    return { result: combinedText };
}

export async function GET() {
    return NextResponse.json({ status: 'ok' });
}

// Parse tool arguments that may arrive as a JSON string or an object
function parseArgs(args: unknown): Record<string, unknown> {
    if (!args) return {};
    if (typeof args === 'string') {
        try { return JSON.parse(args); } catch { return {}; }
    }
    return args as Record<string, unknown>;
}

export async function POST(request: Request) {
    const requestId = `[${Date.now()}]`;
    const startTime = Date.now();

    try {
        const body = await request.json();

        console.log(`🚀 ${requestId} Vapi search-book POST request received`, {
            timestamp: new Date().toISOString(),
            hasMessage: !!body?.message,
            functionCall: !!body?.message?.functionCall,
            hasToolCalls: !!(body?.message?.toolCallList || body?.message?.toolCalls),
        });

        console.log(`📦 ${requestId} Full request body:`, JSON.stringify(body, null, 2));

        // Support multiple Vapi formats
        const functionCall = body?.message?.functionCall;
        const toolCallList = body?.message?.toolCallList || body?.message?.toolCalls;

        // Handle single functionCall format
        if (functionCall) {
            console.log(`🔧 ${requestId} Processing single functionCall format`, { 
                name: functionCall.name,
                parameters: functionCall.parameters 
            });

            const { name, parameters } = functionCall;
            const parsed = parseArgs(parameters);

            if (name === 'searchBook') {
                console.log(`🔎 ${requestId} Calling processBookSearch`, { 
                    bookId: parsed.bookId, 
                    query: parsed.query 
                });
                
                const result = await processBookSearch(parsed.bookId, parsed.query);
                
                console.log(`✅ ${requestId} Search complete, sending response`, { 
                    resultLength: result.result?.length,
                    duration: `${Date.now() - startTime}ms` 
                });
                
                return NextResponse.json(result);
            }

            console.error(`❌ ${requestId} Unknown function: ${name}`);
            return NextResponse.json({ result: `Unknown function: ${name}` });
        }

        // Handle toolCallList format (array of calls)
        if (!toolCallList || toolCallList.length === 0) {
            console.warn(`⚠️ ${requestId} No tool calls found in request`);
            return NextResponse.json({
                results: [{ result: 'No tool calls found' }],
            });
        }

        console.log(`🔧 ${requestId} Processing toolCallList format`, { 
            callCount: toolCallList.length 
        });

        const results = [];

        for (const toolCall of toolCallList) {
            const { id, function: func } = toolCall;
            const name = func?.name;
            const args = parseArgs(func?.arguments);

            console.log(`📍 ${requestId} Processing tool call [${id}]`, { 
                name,
                arguments: args 
            });

            if (name === 'searchBook') {
                console.log(`🔎 ${requestId} [${id}] Calling processBookSearch`, { 
                    bookId: args.bookId,
                    query: args.query
                });
                
                const searchResult = await processBookSearch(args.bookId, args.query);
                
                console.log(`✅ ${requestId} [${id}] Tool call complete`, { 
                    resultLength: searchResult.result?.length,
                    duration: `${Date.now() - startTime}ms`
                });
                
                results.push({ toolCallId: id, ...searchResult });
            } else {
                console.error(`❌ ${requestId} [${id}] Unknown function: ${name}`);
                results.push({ toolCallId: id, result: `Unknown function: ${name}` });
            }
        }

        console.log(`🎯 ${requestId} All tool calls processed, sending response`, { 
            resultsCount: results.length,
            totalDuration: `${Date.now() - startTime}ms` 
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error(`💥 ${requestId} Error in search-book handler:`, error);
        console.error(`💥 ${requestId} Error details:`, {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: `${Date.now() - startTime}ms`,
        });

        return NextResponse.json({
            results: [{ result: 'Error processing request' }],
        });
    }
}
