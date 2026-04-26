/**
 * Multipart form-data parser for Lambda
 * Handles file uploads from API Gateway
 */

export interface ParsedMultipart {
  fields: Record<string, any>;
  files: Array<{
    fieldName: string;
    filename: string;
    contentType: string;
    buffer: Buffer;
  }>;
}

/**
 * Parse multipart/form-data from Lambda event
 */
export function parseMultipart(body: string, contentType: string, isBase64Encoded: boolean): ParsedMultipart {
  console.log('[parseMultipart] Starting parse...');
  console.log('[parseMultipart] isBase64Encoded:', isBase64Encoded);
  console.log('[parseMultipart] Content-Type:', contentType);
  
  // Decode body to buffer first
  let buffer: Buffer;
  if (isBase64Encoded) {
    buffer = Buffer.from(body, 'base64');
  } else {
    buffer = Buffer.from(body, 'latin1');
  }
  console.log('[parseMultipart] Buffer length:', buffer.length);
  console.log('[parseMultipart] First 300 bytes:', buffer.toString('utf8', 0, Math.min(300, buffer.length)));

  const result: ParsedMultipart = {
    fields: {},
    files: [],
  };

  // Find the first boundary line in the actual data (more reliable than header)
  // Boundaries start at the beginning or after CRLF
  const firstLineEnd = buffer.indexOf(Buffer.from('\r\n'));
  if (firstLineEnd === -1) {
    throw new Error('Invalid multipart format - no CRLF found');
  }
  
  const firstLine = buffer.toString('utf8', 0, firstLineEnd);
  console.log('[parseMultipart] First line (actual boundary):', firstLine);
  
  // The first line should be the boundary (with -- prefix)
  if (!firstLine.startsWith('--')) {
    throw new Error(`Invalid multipart format - first line doesn't start with --: ${firstLine}`);
  }
  
  const boundaryBuffer = Buffer.from(firstLine, 'utf8');
  console.log('[parseMultipart] Using boundary from data:', firstLine);
  
  // Find all boundary positions
  const positions: number[] = [];
  let pos = 0;
  while (pos < buffer.length) {
    const index = buffer.indexOf(boundaryBuffer, pos);
    if (index === -1) break;
    positions.push(index);
    pos = index + 1;
  }
  
  console.log('[parseMultipart] Found boundary positions:', positions.length);
  console.log('[parseMultipart] Positions:', positions.slice(0, 10)); // First 10 positions

  // Process each part between boundaries
  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i] + boundaryBuffer.length;
    const end = positions[i + 1];
    const partBuffer = buffer.subarray(start, end);
    
    // Find the blank line separating headers from body (CRLF CRLF)
    const delimiter = Buffer.from('\r\n\r\n');
    let headerEnd = -1;
    for (let j = 0; j < partBuffer.length - 3; j++) {
      if (partBuffer[j] === 13 && partBuffer[j + 1] === 10 && 
          partBuffer[j + 2] === 13 && partBuffer[j + 3] === 10) {
        headerEnd = j;
        break;
      }
    }
    
    if (headerEnd === -1) continue;
    
    // Extract headers as string
    const headersBuffer = partBuffer.subarray(0, headerEnd);
    const headers = headersBuffer.toString('utf-8').trim();
    
    // Extract body as buffer (preserve binary data)
    const bodyStart = headerEnd + 4;
    const bodyEnd = partBuffer.length - 2; // Remove trailing CRLF
    const bodyBuffer = partBuffer.subarray(bodyStart, bodyEnd);
    
    // Parse Content-Disposition header
    const dispositionMatch = headers.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!dispositionMatch) continue;

    const fieldName = dispositionMatch[1];
    const filename = dispositionMatch[2];

    // Parse Content-Type if present (for files)
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);
    const partContentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'text/plain';

    if (filename) {
      // This is a file - keep as buffer
      console.log(`[parseMultipart] File found: ${fieldName} - ${filename} (${bodyBuffer.length} bytes, type: ${partContentType})`);
      result.files.push({
        fieldName,
        filename,
        contentType: partContentType,
        buffer: bodyBuffer,
      });
    } else {
      // This is a regular field - convert to string
      const value = bodyBuffer.toString('utf-8');
      console.log(`[parseMultipart] Field found: ${fieldName} = ${value.substring(0, 100)}`);
      
      // Handle array notation like variants[0][name]
      const arrayMatch = fieldName.match(/^(.+)\[(\d+)\](?:\[(.+)\])?$/);
      if (arrayMatch) {
        const baseName = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        const subField = arrayMatch[3];

        if (!result.fields[baseName]) {
          result.fields[baseName] = [];
        }

        if (subField) {
          // Nested object array like variants[0][name]
          if (!result.fields[baseName][index]) {
            result.fields[baseName][index] = {};
          }
          result.fields[baseName][index][subField] = value;
        } else {
          // Simple array like category[0]
          result.fields[baseName][index] = value;
        }
      } else {
        // Regular field
        result.fields[fieldName] = value;
      }
    }
  }

  console.log('[parseMultipart] Parsed fields:', Object.keys(result.fields));
  console.log('[parseMultipart] Parsed files count:', result.files.length);

  return result;
}

/**
 * Parse existingImages from multipart data
 */
export function parseExistingImages(fields: Record<string, any>): string[] {
  if (fields.existingImages) {
    try {
      return JSON.parse(fields.existingImages);
    } catch (e) {
      console.error('[parseMultipart] Failed to parse existingImages', e);
      return [];
    }
  }
  return [];
}
