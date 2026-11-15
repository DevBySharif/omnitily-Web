// SEO P1 FAQ content — Developer Tools + Math & Finance (22 tools).
// Every claim below is grounded in ~/workspace/omnitily-seo/TOOL_CHECK.md
// and the tool's component in src/components/. Do not invent limits,
// formats, or capabilities that are not in those sources.

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolContent {
  id: string;
  howToTitle: string;
  howToIntro: string;
  howToSteps: string[];
  faqs: ToolFaq[];
  features: string[];
}

export const TOOL_CONTENT_DEVELOPER_MATH: Record<string, ToolContent> = {
  'qr-generator': {
    id: 'qr-generator',
    howToTitle: 'How to generate a QR code',
    howToIntro:
      'The QR Code Generator turns any text or web link into a scannable QR code you can download and print. Type a URL, a Wi-Fi password, or any short text, adjust the colours and resolution, then download the image. The QR image itself is rendered by the external service api.qrserver.com, so the text you encode is sent to that service as part of the image URL.',
    howToSteps: [
      'Type or paste your text or URL into the "Text or URL Payload" field.',
      'Adjust the QR colours and pick a resolution under "QR Code Content & Style".',
      'Click "Download QR Code" to save the image, or "Copy Link" to copy the image URL.',
    ],
    faqs: [
      {
        question: 'Is the QR code generator free?',
        answer:
          'Yes. You can generate and download as many QR codes as you like, free and with no signup.',
      },
      {
        question: 'Does the QR generator need an internet connection?',
        answer:
          'Yes. The QR image is rendered by the external service api.qrserver.com, so the page needs network access to fetch and display the code.',
      },
      {
        question: 'Is my text sent anywhere when I make a QR code?',
        answer:
          'Yes. The text you encode is sent to api.qrserver.com as part of the image URL, because that service draws the QR code. Do not encode passwords or other sensitive text.',
      },
      {
        question: 'What can I put in a QR code?',
        answer:
          'Any short text: a website URL, an email address, a phone number, or plain text. When someone scans the code, their phone opens the link or shows the text.',
      },
    ],
    features: [
      'Custom foreground and background colours',
      'Adjustable QR resolution',
      'Download the QR code as an image',
      'Free, no signup',
    ],
  },
  'json-formatter': {
    id: 'json-formatter',
    howToTitle: 'How to format JSON',
    howToIntro:
      'The JSON Beautifier and Validator takes messy or compact JSON and rewrites it with clean indentation so you can read it, or compresses it to a single line for pasting into code. It also validates your input: if the JSON has a syntax error, it shows the exact error message and position instead of silently guessing what you meant.',
    howToSteps: [
      'Paste your JSON into the input box.',
      'Click "Verify & Format JSON" to pretty-print it, or "Minify JSON" to compress it to one line.',
      'Copy the result from the output box or download it as a .json file.',
    ],
    faqs: [
      {
        question: 'How do I format JSON online?',
        answer:
          'Paste your JSON into the input box and click "Verify & Format JSON". The tool rewrites it with indentation so nested objects and arrays are easy to read.',
      },
      {
        question: 'Does the JSON formatter validate my JSON?',
        answer:
          'Yes. If your input is not valid JSON, the tool shows a syntax error message with the position of the problem, for example "Expected property name or \'}\' in JSON at position 1".',
      },
      {
        question: 'Can I minify JSON with this tool?',
        answer:
          'Yes. Click "Minify JSON" and the tool removes all unnecessary whitespace, turning your JSON into a single compact line.',
      },
      {
        question: 'Does my JSON leave my browser?',
        answer:
          'No. Formatting and validation run entirely in your browser, so the JSON you paste is never uploaded anywhere.',
      },
    ],
    features: [
      'Pretty-print JSON with indentation',
      'Minify JSON to a single line',
      'Validates JSON and reports the exact error position',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'hash-generator': {
    id: 'hash-generator',
    howToTitle: 'How to generate a hash',
    howToIntro:
      'The Cryptographic Hash Solver computes a fixed-length fingerprint of any text using the SHA family of algorithms. Paste a string and it shows the SHA-1, SHA-256, SHA-384, and SHA-512 digests side by side. Hashing runs in your browser with the WebCrypto API, so the text you hash is never sent to a server.',
    howToSteps: [
      'Type or paste your text into the "Text to hash" field.',
      'Click "Generate Cryptographic Hashes".',
      'Read the SHA-1, SHA-256, SHA-384, and SHA-512 digests shown under "Digests".',
    ],
    faqs: [
      {
        question: 'Which hash algorithms does this tool support?',
        answer:
          'SHA-1, SHA-256, SHA-384, and SHA-512. For example, the SHA-256 hash of "abc" is ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.',
      },
      {
        question: 'Can I generate an MD5 hash here?',
        answer:
          'No. MD5 is deliberately not offered: it is unavailable in the WebCrypto API and is cryptographically broken, so it should not be used for security purposes.',
      },
      {
        question: 'Is SHA-1 safe to use?',
        answer:
          'SHA-1 is shown for compatibility but is labelled legacy in the tool, because it is no longer considered secure against collision attacks. Use SHA-256 or SHA-512 for anything security-sensitive.',
      },
      {
        question: 'Does the text I hash leave my browser?',
        answer:
          'No. Hashing runs locally with your browser\'s WebCrypto API, so the text is never uploaded anywhere.',
      },
    ],
    features: [
      'SHA-1, SHA-256, SHA-384, and SHA-512 digests',
      'Runs locally with the WebCrypto API',
      'SHA-1 clearly labelled legacy-only',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'uuid-generator': {
    id: 'uuid-generator',
    howToTitle: 'How to generate UUIDs',
    howToIntro:
      'The UUID Batch Generator creates cryptographically secure RFC4122 version 4 UUIDs, the random 36-character identifiers used as database keys, session IDs, and file names. You can generate up to 100 at a time, and every UUID in a batch is unique. Generation uses your browser\'s secure random source, so the IDs are safe to use as real identifiers.',
    howToSteps: [
      'Set the Count field to how many UUIDs you need, from 1 to 100.',
      'Click "Generate UUIDs".',
      'Copy the UUIDs from the output list.',
    ],
    faqs: [
      {
        question: 'What is a UUID?',
        answer:
          'A UUID (Universally Unique Identifier) is a 36-character ID like 464eb3f7-5b96-49fa-8ae0-7160e2980963. Version 4 UUIDs are random, so two independently generated ones are practically never the same.',
      },
      {
        question: 'How many UUIDs can I generate at once?',
        answer:
          'Between 1 and 100 per batch. Set the Count field to the number you need, then click "Generate UUIDs".',
      },
      {
        question: 'Are the generated UUIDs unique?',
        answer:
          'Yes. They are version 4 UUIDs built from cryptographically secure random values, and every UUID in a batch is checked to be different from the others.',
      },
      {
        question: 'Do the UUIDs leave my browser?',
        answer:
          'No. They are generated locally in your browser, so nothing is uploaded or stored anywhere.',
      },
    ],
    features: [
      'RFC4122 version 4 UUIDs',
      'Generate 1 to 100 UUIDs per batch',
      'Cryptographically secure random values',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'yaml-to-json': {
    id: 'yaml-to-json',
    howToTitle: 'How to convert YAML to JSON',
    howToIntro:
      'The YAML to JSON Converter turns a YAML configuration file into structured JSON you can use in code or APIs. It handles mappings, nested objects, lists, strings, numbers, booleans, and null values. It is a hand-written subset parser, so it converts what it understands and reports an error with a line number for anything it does not, instead of silently guessing.',
    howToSteps: [
      'Paste your YAML into the "YAML input" box, or click "Load sample" to try an example.',
      'The converted JSON appears in the "JSON output" box.',
      'Click the copy button to copy the JSON output.',
    ],
    faqs: [
      {
        question: 'What YAML does this converter support?',
        answer:
          'Mappings, nested objects, lists, strings, numbers, booleans, and null values. For example, a sample document with a name, age, admin flag, and address converts exactly to matching JSON.',
      },
      {
        question: 'What happens with YAML anchors and aliases?',
        answer:
          'The converter rejects them. It is a subset parser, so anchors and aliases fail loudly with an error that includes a line number, rather than being guessed at.',
      },
      {
        question: 'Does my YAML leave my browser?',
        answer:
          'No. The conversion runs locally in your browser, so your YAML is never uploaded to a server.',
      },
      {
        question: 'Can I convert JSON back to YAML with this tool?',
        answer:
          'No. This tool converts in one direction only, from YAML to JSON.',
      },
    ],
    features: [
      'Converts YAML mappings, lists, and nested objects to JSON',
      'Clear errors with line numbers for unsupported syntax',
      'Sample document to try instantly',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'xml-beautifier': {
    id: 'xml-beautifier',
    howToTitle: 'How to format XML',
    howToIntro:
      'The XML Beautifier and Pretty-Printer takes dense, single-line XML and rewrites it with clean indentation so nested elements are easy to read. Choose 2-space or 4-space indentation, paste your document, and the formatted result appears immediately. If the XML is malformed, the tool shows the parser\'s error instead of producing broken output.',
    howToSteps: [
      'Paste your XML into the "XML Input" box.',
      'Pick an indent size, such as 2 spaces or 4 spaces.',
      'Read the formatted XML in the output area and copy it.',
    ],
    faqs: [
      {
        question: 'How do I pretty-print XML online?',
        answer:
          'Paste your XML into the input box and choose an indent size. The tool re-aligns every nested element with consistent indentation.',
      },
      {
        question: 'What happens if my XML is invalid?',
        answer:
          'The tool shows the parser\'s error message, for example for mismatched tags like <a><b></a>, instead of formatting it anyway.',
      },
      {
        question: 'Can I choose the indentation size?',
        answer:
          'Yes. You can format with 2-space or 4-space indentation.',
      },
      {
        question: 'Does my XML leave my browser?',
        answer:
          'No. Formatting runs entirely in your browser, so the XML you paste is never uploaded anywhere.',
      },
    ],
    features: [
      'Pretty-prints nested XML with clean indentation',
      '2-space or 4-space indent options',
      'Shows the parser error for invalid XML',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'jwt-debugger': {
    id: 'jwt-debugger',
    howToTitle: 'How to decode a JWT',
    howToIntro:
      'The JSON Web Token Parser decodes a JWT and shows its header, payload claims, and signature status in plain view, so you can inspect what a token actually contains before trusting it. Paste a token to see its claims instantly, and optionally enter the secret to check whether the signature matches. Decoding runs entirely in your browser.',
    howToSteps: [
      'Paste your JWT into the "JWT Token" field.',
      'Read the decoded header, payload, and claims shown below.',
      'To verify the signature, enter the secret in the secret field and check whether it matches.',
    ],
    faqs: [
      {
        question: 'What does a JWT decoder show me?',
        answer:
          'The token\'s header (for example the HS256 algorithm), the payload claims such as the subject and name, and whether the signature is valid for the secret you enter.',
      },
      {
        question: 'Can I verify a JWT signature here?',
        answer:
          'Yes. Enter the secret the token was signed with: the tool reports "Signature is valid" for the correct secret and "does NOT match" for a wrong one, using HMAC verification in your browser.',
      },
      {
        question: 'Does my token leave my browser?',
        answer:
          'No. Decoding and signature checking run entirely in your browser, so the token and any secret you enter are never uploaded.',
      },
      {
        question: 'Can I decode an expired token?',
        answer:
          'Yes. The tool decodes the token and shows its claims, and it also tells you whether the token has expired and when it expires, based on the exp claim in the payload.',
      },
    ],
    features: [
      'Decodes JWT header, payload, and claims',
      'Verifies HMAC signatures against a secret',
      'Runs entirely in your browser',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'sql-formatter': {
    id: 'sql-formatter',
    howToTitle: 'How to format SQL',
    howToIntro:
      'The SQL Query Formatter takes a dense, single-line query and rewrites it with clean indentation and line breaks, so SELECT lists, FROM clauses, WHERE conditions, and ORDER BY clauses each sit on their own lines. Paste any query and the formatted version appears immediately, ready to copy back into your editor or database client.',
    howToSteps: [
      'Paste your SQL query into the "SQL Input" box.',
      'Read the formatted query in the "Formatted SQL" output area.',
      'Copy the formatted SQL back into your editor.',
    ],
    faqs: [
      {
        question: 'How do I format a SQL query online?',
        answer:
          'Paste the query into the input box. The tool uppercases keywords and puts each clause on its own lines, so "select id, name from users where age > 18 order by name" becomes a readable multi-line query.',
      },
      {
        question: 'Does the formatter change what my query does?',
        answer:
          'No. Formatting only changes whitespace and keyword casing; the query itself, its tables, columns, and conditions stay exactly the same.',
      },
      {
        question: 'Does my SQL leave my browser?',
        answer:
          'No. Formatting runs entirely in your browser, so your queries are never uploaded anywhere.',
      },
    ],
    features: [
      'Formats queries with clean indentation and line breaks',
      'Uppercases SQL keywords',
      'Works on any SQL query you paste',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'cron-parser': {
    id: 'cron-parser',
    howToTitle: 'How to read a cron expression',
    howToIntro:
      'The Cron Expression Checker translates a cron schedule into plain English and lists the next five times it will run, so you can check a schedule before it goes live. It understands day names like MON-FRI, step values like every 15 minutes, and standard five-field expressions. Impossible dates, such as February 31, simply return no runs instead of a misleading date.',
    howToSteps: [
      'Type your cron expression into the input box, for example "0 9 * * MON-FRI".',
      'Read the plain-English description of the schedule.',
      'Check the "Next 5 Runs" list to confirm the times are what you expect.',
    ],
    faqs: [
      {
        question: 'What does "0 9 * * MON-FRI" mean?',
        answer:
          'It runs at 9:00 AM, Monday to Friday. The five fields are minute, hour, day of month, month, and day of week, so 0 9 means the top of the 9 AM hour on weekdays.',
      },
      {
        question: 'Can I check a cron expression that runs every 15 minutes?',
        answer:
          'Yes. An expression using */15 in the minute field lists the next runs 15 minutes apart, for example 00:15, 00:30, 00:45, 01:00, and 01:15.',
      },
      {
        question: 'What happens with an impossible date like February 31?',
        answer:
          'The tool returns no runs, because February 31 never occurs. That is the honest result, rather than silently shifting the date.',
      },
      {
        question: 'Does the cron checker need a server?',
        answer:
          'No. Parsing and the next-run calculation run entirely in your browser.',
      },
    ],
    features: [
      'Plain-English description of any cron expression',
      'Lists the next 5 run times',
      'Understands day names like MON-FRI and steps like */15',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'color-blender': {
    id: 'color-blender',
    howToTitle: 'How to blend two colours',
    howToIntro:
      'The HEX Color Blender and Mixer generates the evenly spaced colours between two hex colours, giving you a smooth gradient palette in a few clicks. Pick a start and end colour, choose how many steps you want, and the tool lists every intermediate hex value, which you can copy one by one or download as CSS.',
    howToSteps: [
      'Pick Colour A and Colour B using the colour pickers.',
      'Set the number of Blend Steps, from 2 to 12.',
      'Copy any hex value from the list, or download the whole palette as CSS.',
    ],
    faqs: [
      {
        question: 'How many colours does the blender generate?',
        answer:
          'You choose the step count, from 2 to 12, with 5 as the default. Blending #10b981 into #3b82f6 in 5 steps gives #10B981, #1BAB9E, #269EBC, #3090D9, and #3B82F6.',
      },
      {
        question: 'Can I copy the blended colours?',
        answer:
          'Yes. Click any hex value in the list to copy it, or download the entire palette as CSS.',
      },
      {
        question: 'What is colour blending used for?',
        answer:
          'Building gradient palettes for websites, designs, and charts: blending two brand colours gives you the in-between shades for backgrounds, buttons, and hover states.',
      },
      {
        question: 'Do my colours leave my browser?',
        answer:
          'No. Blending runs entirely in your browser, so nothing is uploaded.',
      },
    ],
    features: [
      'Blends two hex colours in 2 to 12 steps',
      'Copy any intermediate hex value',
      'Download the palette as CSS',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'contrast-checker': {
    id: 'contrast-checker',
    howToTitle: 'How to check colour contrast',
    howToIntro:
      'The WCAG Accessibility Checker measures the contrast ratio between a foreground and a background colour and tells you whether the pair passes the WCAG accessibility standards for normal and large text. Enter two hex colours and it shows the exact ratio, such as 21.00:1 for white on black, with a pass or fail for AA and AAA at both text sizes.',
    howToSteps: [
      'Type the foreground hex colour into the Foreground field, for example #FFFFFF.',
      'Type the background hex colour into the Background field, for example #000000.',
      'Click "Check Contrast" to see the ratio and the WCAG AA and AAA results.',
    ],
    faqs: [
      {
        question: 'What is a good contrast ratio?',
        answer:
          'WCAG AA requires at least 4.5:1 for normal text and 3:1 for large text; AAA requires 7:1 for normal text and 4.5:1 for large text. White on black scores 21.00:1, the highest possible, and passes every level.',
      },
      {
        question: 'What is the difference between AA and AAA?',
        answer:
          'AA is the standard most sites are expected to meet, while AAA is a stricter level for maximum readability. The tool reports both, for normal and large text, so you can see exactly which levels your colours pass.',
      },
      {
        question: 'Can I check any two colours?',
        answer:
          'Yes. Enter any foreground and background hex values, such as your button text and button background, and the tool computes the ratio for that exact pair.',
      },
      {
        question: 'Do my colours leave my browser?',
        answer:
          'No. The contrast calculation runs entirely in your browser.',
      },
    ],
    features: [
      'Exact contrast ratio for any two hex colours',
      'WCAG AA and AAA results for normal and large text',
      'Helps make text readable for everyone',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'base-converter': {
    id: 'base-converter',
    howToTitle: 'How to convert number bases',
    howToIntro:
      'The Base System Number Converter converts a value between binary, octal, decimal, and hexadecimal, the four number systems used most in programming and electronics. Type a number, pick the base it is written in and the base you want, and the tool shows the equivalent value instantly, for example 255 in decimal is 0xFF in hexadecimal.',
    howToSteps: [
      'Type your number into the input field.',
      'Choose the starting base in the From dropdown and the target base in the To dropdown.',
      'Click "Convert" to see the converted value.',
    ],
    faqs: [
      {
        question: 'What number bases can I convert between?',
        answer:
          'Binary (base 2), octal (base 8), decimal (base 10), and hexadecimal (base 16). Any of the four can be the source or the target.',
      },
      {
        question: 'What is 255 in hexadecimal?',
        answer:
          '0xFF. The tool converts 255 decimal to hex as 0xFF, and converts hex FF back to 255 decimal.',
      },
      {
        question: 'Can I convert binary to decimal?',
        answer:
          'Yes. Choose Binary (2) in the From dropdown and Decimal (10) in the To dropdown, then click Convert.',
      },
      {
        question: 'Does the number leave my browser?',
        answer:
          'No. Conversion runs entirely in your browser.',
      },
    ],
    features: [
      'Converts between binary, octal, decimal, and hexadecimal',
      'Any base can be the source or the target',
      'Instant results',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'user-agent': {
    id: 'user-agent',
    howToTitle: 'How to inspect a user agent',
    howToIntro:
      'The User Agent Inspector breaks a user-agent string into its parts: the browser and its version, the operating system and version, and whether the device is a phone, tablet, or desktop. Paste any user-agent string, for example one copied from a server log, and the tool identifies each piece so you can tell exactly what client made a request.',
    howToSteps: [
      'Paste a user-agent string into the "User-Agent String" field.',
      'Read the Browser, Operating System, and Device results shown below.',
      'Paste a different string to inspect another client.',
    ],
    faqs: [
      {
        question: 'What is a user-agent string?',
        answer:
          'It is the short text a browser sends with every request that identifies itself, for example "Mozilla/5.0 ... Chrome/120 ... Windows". Servers use it to tell which browser and device is visiting.',
      },
      {
        question: 'What information does the inspector show?',
        answer:
          'The browser name and version, the operating system and version, and the device type. For example, an iPhone string reports Safari 18.1, iOS 18.1, and Mobile.',
      },
      {
        question: 'Which browsers can it identify?',
        answer:
          'Chrome, Firefox, Safari, and Edge on Windows, macOS, Linux, iOS, and Android, including mobile versus desktop detection.',
      },
      {
        question: 'Does the string I paste leave my browser?',
        answer:
          'No. Parsing runs entirely in your browser, so the user-agent string is never uploaded.',
      },
    ],
    features: [
      'Identifies browser, version, OS, and device type',
      'Works with Chrome, Firefox, Safari, and Edge strings',
      'Detects mobile versus desktop',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'mock-api': {
    id: 'mock-api',
    howToTitle: 'How to build a mock API response',
    howToIntro:
      'The Mock API Response Builder lets you draft a fake API endpoint and test it without a server, so you can build a front end against realistic data before the back end exists. Set the path, method, status code, headers, response body, and simulated delay, then send a test request and watch the simulated response come back with a real measured elapsed time.',
    howToSteps: [
      'Set the Endpoint Path, Method, and Status for your mock endpoint.',
      'Write the Response Body as JSON and add any Response Headers you need.',
      'Click "Send Test Request" to see the simulated response and its elapsed time.',
    ],
    faqs: [
      {
        question: 'Is this a real API server?',
        answer:
          'No. The response is simulated locally in your browser: nothing is sent over the network, and the result is clearly labelled as simulated.',
      },
      {
        question: 'Can I set the response status code?',
        answer:
          'Yes. You can choose the status, for example 200 for success or a 4xx code for an error, and the simulated response uses it.',
      },
      {
        question: 'Can I add a delay to the mock response?',
        answer:
          'Yes. The Simulated Latency setting adds a delay before the response appears, so you can test loading states in your front end.',
      },
      {
        question: 'Does the mock response leave my browser?',
        answer:
          'No. Everything is simulated locally, so your endpoint and response data never leave your browser.',
      },
    ],
    features: [
      'Custom endpoint path, method, and status code',
      'Custom JSON response body and headers',
      'Simulated latency for testing loading states',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'scientific-calc': {
    id: 'scientific-calc',
    howToTitle: 'How to use the scientific calculator',
    howToIntro:
      'The Scientific Algebra Calculator evaluates full mathematical expressions with parentheses, powers, roots, logarithms, and trigonometry, all typed as one line. Type an expression such as 2*(3+4)^2 and it returns 98, or sqrt(144)+sin(30) and it returns 12.5. Angles are measured in degrees, and the calculator keeps a history of your recent expressions.',
    howToSteps: [
      'Type your expression into the Expression field, for example "sqrt(16) + sin(30)".',
      'Check the angle mode: trigonometry uses degrees.',
      'Read the result shown below the expression, and check History for earlier calculations.',
    ],
    faqs: [
      {
        question: 'What expressions can the scientific calculator solve?',
        answer:
          'Arithmetic with parentheses and powers, square roots, logarithms, and sine, cosine, and tangent. For example, 2*(3+4)^2 gives 98 and sqrt(144)+sin(30) gives 12.5.',
      },
      {
        question: 'Are angles in degrees or radians?',
        answer:
          'Degrees. sin(30) is 0.5, so sqrt(144)+sin(30) equals 12.5.',
      },
      {
        question: 'What happens if I divide by zero?',
        answer:
          'The calculator shows "Division by zero." instead of a number.',
      },
      {
        question: 'Does the calculator run safely in my browser?',
        answer:
          'Yes. Expressions are parsed by a dedicated tokenizer and parser; the calculator never uses eval() or the Function constructor.',
      },
    ],
    features: [
      'Parentheses, powers, roots, and logarithms',
      'Sine, cosine, and tangent in degrees',
      'Calculation history',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'unit-converter': {
    id: 'unit-converter',
    howToTitle: 'How to convert units',
    howToIntro:
      'The Universal Unit Converter converts a value between the units of one measurement type, showing every equivalent at once. Pick length, temperature, weight, or volume, then drag the slider to set your value. For example, 10 metres converts to 32.81 feet, 10.94 yards, and 393.70 inches in a single view, so you can compare units without converting one pair at a time.',
    howToSteps: [
      'Click a category button: length, temp, weight, or volume.',
      'Drag the "Value to Convert" slider to your number, from 0 to 150.',
      'Read all the converted values in the Conversion Results box.',
    ],
    faqs: [
      {
        question: 'What can I convert with the unit converter?',
        answer:
          'Length, temperature, weight, and volume. Pick a category, then drag the slider to set the value and see every equivalent unit at once.',
      },
      {
        question: 'How do I convert 10 metres to feet?',
        answer:
          'Click the length category and drag the slider to 10. The results show 10 metres equals 32.81 feet, along with 10.94 yards and 393.70 inches.',
      },
      {
        question: 'What is the largest value I can convert?',
        answer:
          'The slider goes from 0 to 150, so values in that range can be converted directly.',
      },
      {
        question: 'Does the conversion leave my browser?',
        answer:
          'No. All conversions run locally in your browser.',
      },
    ],
    features: [
      'Length, temperature, weight, and volume categories',
      'Shows every equivalent unit at once',
      'Simple slider input from 0 to 150',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'currency-converter': {
    id: 'currency-converter',
    howToTitle: 'How to convert currency',
    howToIntro:
      'The Universal Currency Rates converter turns an amount in one currency into another using live exchange rates fetched from the Frankfurter rates API, so the numbers reflect the latest published rates rather than a stale table. Enter an amount, choose the From and To currencies, and click Convert. If the rates service is unreachable, the tool shows an honest error instead of a made-up number.',
    howToSteps: [
      'Enter the amount in the Amount field.',
      'Choose the source currency in the From dropdown and the target currency in the To dropdown.',
      'Click "Convert" to see the result at the live exchange rate.',
    ],
    faqs: [
      {
        question: 'Where do the exchange rates come from?',
        answer:
          'Live rates from the Frankfurter API (api.frankfurter.app), fetched when you convert. The tool never uses stored or fallback rates.',
      },
      {
        question: 'Which currencies can I convert between?',
        answer:
          'Major world currencies including USD, EUR, GBP, JPY, CAD, and AUD, plus other currencies offered by the Frankfurter rates API.',
      },
      {
        question: 'What happens if the rates service is down?',
        answer:
          'The tool shows a "Live Rates Unavailable" error and no result. It never guesses a rate or shows an old one.',
      },
      {
        question: 'Can I swap the two currencies quickly?',
        answer:
          'Yes. The swap button exchanges the From and To currencies so you can convert back the other way.',
      },
    ],
    features: [
      'Live exchange rates from the Frankfurter API',
      'Major world currencies including USD, EUR, GBP, JPY, CAD, and AUD',
      'Honest error when live rates are unavailable, never stale rates',
      'Swap currencies with one click',
      'Free, no signup',
    ],
  },
  'percent-calc': {
    id: 'percent-calc',
    howToTitle: 'How to calculate a percentage',
    howToIntro:
      'The Percentage Calculator finds what any percentage of a number equals, instantly and exactly. Enter the percentage and the base value, click Calculate, and the tool shows the result as a plain sentence, such as "25% of 200 = 50". It is the quick way to work out discounts, tax, tips, and grade percentages without doing the arithmetic by hand.',
    howToSteps: [
      'Type the percentage into the "Percentage (%)" field, for example 25.',
      'Type the base value into the "Base value" field, for example 200.',
      'Click "Calculate" to see the result in the Percentage Result box.',
    ],
    faqs: [
      {
        question: 'What is 25% of 200?',
        answer:
          '50. Enter 25 in the Percentage field and 200 in the Base value field, then click Calculate to see "25% of 200 = 50".',
      },
      {
        question: 'Can I use decimals in the percentage calculator?',
        answer:
          'Yes. Both fields accept decimal numbers, so you can calculate values like 12.5% of 80.',
      },
      {
        question: 'What is a percentage calculator used for?',
        answer:
          'Working out discounts, sales tax, grade scores, and price increases or decreases, anywhere you need to know what a share of a number is.',
      },
      {
        question: 'Does the calculation leave my browser?',
        answer:
          'No. The calculation runs entirely in your browser.',
      },
    ],
    features: [
      'Finds X% of any number instantly',
      'Accepts decimal percentages and values',
      'Clear result shown as a plain sentence',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'tip-calc': {
    id: 'tip-calc',
    howToTitle: 'How to split a bill and tip',
    howToIntro:
      'The Friendly Bill and Tip Splitter works out the tip, the total, and what each person pays when a group shares a bill. Enter the bill amount and the tip percentage, set how many people are splitting, and the tool shows the tip, the total, and the per-person share. A $100 bill at 15% split between two people gives a $15.00 tip, a $115.00 total, and $57.50 each.',
    howToSteps: [
      'Enter the bill amount in the "Bill Amount ($)" field.',
      'Enter the tip percentage, or tap a quick 10%, 15%, 20%, or 25% Tip button.',
      'Enter the Number of People, then click "Calculate Split" to see the tip, total, and per-person share.',
    ],
    faqs: [
      {
        question: 'How do I split a $100 bill between 2 people with a 15% tip?',
        answer:
          'Enter 100 as the bill, 15 as the tip percentage, and 2 as the number of people, then click Calculate Split. The tip is $15.00, the total is $115.00, and each person pays $57.50.',
      },
      {
        question: 'Can I pick a standard tip percentage quickly?',
        answer:
          'Yes. The 10%, 15%, 20%, and 25% Tip buttons set the tip percentage in one tap.',
      },
      {
        question: 'What does the tip calculator show?',
        answer:
          'The tip amount, the total bill including the tip, and the amount each person pays when the total is split evenly.',
      },
      {
        question: 'Does the calculation leave my browser?',
        answer:
          'No. The calculation runs entirely in your browser.',
      },
    ],
    features: [
      'Calculates tip, total, and per-person share',
      'Quick 10%, 15%, 20%, and 25% tip buttons',
      'Splits the bill evenly between any number of people',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'matrix-calc': {
    id: 'matrix-calc',
    howToTitle: 'How to calculate with matrices',
    howToIntro:
      'The Matrix Algebra Solver performs addition, subtraction, multiplication, determinants, transposes, and inverses on matrices you type in. Enter the numbers row by row, pick an operation, and click Calculate to see the result. Two-matrix operations use both Matrix A and Matrix B, while determinant, transpose, and inverse use Matrix A only. Singular matrices are rejected for inversion instead of returning a wrong answer.',
    howToSteps: [
      'Type Matrix A into the Matrix A box, one row per line with numbers separated by spaces.',
      'For add, subtract, or multiply, type Matrix B the same way, then pick the operation.',
      'Click "Calculate" to see the result in the Result panel.',
    ],
    faqs: [
      {
        question: 'What matrix operations does this tool support?',
        answer:
          'Addition (A + B), subtraction (A - B), multiplication (A x B), determinant of A, transpose of A, and inverse of A.',
      },
      {
        question: 'What is the product of [[1,2],[3,4]] and [[5,6],[7,8]]?',
        answer:
          '[[19,22],[43,50]]. Enter the two matrices, choose the multiply operation, and click Calculate.',
      },
      {
        question: 'Can I find the inverse of a matrix?',
        answer:
          'Yes, for matrices that have one. The inverse of [[4,7],[2,6]] is [[0.6,-0.7],[-0.2,0.4]]. Singular matrices, which have no inverse, are rejected with an error.',
      },
      {
        question: 'How do I enter a matrix?',
        answer:
          'Type one row per line, with the numbers in each row separated by spaces, for example "1 2" on the first line and "3 4" on the second.',
      },
    ],
    features: [
      'Add, subtract, and multiply matrices',
      'Determinant, transpose, and inverse of a matrix',
      'Singular matrices rejected honestly for inversion',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'binary-math': {
    id: 'binary-math',
    howToTitle: 'How to do binary math',
    howToIntro:
      'The Binary Mathematics Solver adds, subtracts, multiplies, and divides binary numbers and shows the result in binary together with its decimal value, so you can follow each step. Enter two numbers made only of 0s and 1s, pick an operation, and the tool computes the answer with exact BigInt arithmetic. Dividing by zero is rejected with an error.',
    howToSteps: [
      'Type the first binary number into the "First binary number" field, for example 1010.',
      'Type the second binary number, then pick an operation: add, subtract, multiply, or divide.',
      'Read the binary result and its decimal value in the Result panel.',
    ],
    faqs: [
      {
        question: 'What is 1010 + 1100 in binary?',
        answer:
          '10110. That is 10 + 12 = 22 in decimal, and the tool shows both the binary result and the decimal value.',
      },
      {
        question: 'Which operations does the binary calculator support?',
        answer:
          'Addition, subtraction, multiplication, and division. Division shows the quotient with its remainder.',
      },
      {
        question: 'Can I divide by zero in binary?',
        answer:
          'No. Dividing by zero is rejected with an error, because the result is undefined.',
      },
      {
        question: 'Does the calculation leave my browser?',
        answer:
          'No. The calculation uses exact BigInt arithmetic entirely in your browser.',
      },
    ],
    features: [
      'Add, subtract, multiply, and divide binary numbers',
      'Shows the result in binary and decimal',
      'Exact BigInt arithmetic',
      'Free, no signup',
      'Files never leave your browser',
    ],
  },
  'fibonacci-gen': {
    id: 'fibonacci-gen',
    howToTitle: 'How to generate the Fibonacci sequence',
    howToIntro:
      'The Fibonacci Sequence Solver generates the Fibonacci sequence to any length up to 500 terms, finds the term at any position, and shows how the ratio of consecutive terms converges to the golden ratio, about 1.618. The first 10 terms are 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, and F(10) is 55. All terms are computed with exact BigInt arithmetic, so large terms stay precise.',
    howToSteps: [
      'Enter how many terms you want, from 1 to 500, in the "How many terms?" field.',
      'Click "Generate" to see the sequence, its sum, and the golden-ratio convergence.',
      'To find one term, enter its position in the "Find a term by position (n)" field.',
    ],
    faqs: [
      {
        question: 'What are the first 10 Fibonacci numbers?',
        answer:
          '0, 1, 1, 2, 3, 5, 8, 13, 21, 34. Enter 10 in the "How many terms?" field and click Generate to see them.',
      },
      {
        question: 'How many Fibonacci terms can I generate?',
        answer:
          'From 1 to 500 terms. Larger counts are rejected with an error message.',
      },
      {
        question: 'What is the golden ratio in the Fibonacci sequence?',
        answer:
          'The ratio of each term to the one before it approaches 1.6180339887, the golden ratio. For example, F(20) divided by F(19) is 1.6180339887.',
      },
      {
        question: 'Are large Fibonacci terms exact?',
        answer:
          'Yes. The tool computes with exact BigInt arithmetic, so even very large terms are precise, not rounded floating-point approximations.',
      },
    ],
    features: [
      'Generates 1 to 500 Fibonacci terms',
      'Finds the term at any position',
      'Shows the sum and golden-ratio convergence',
      'Exact BigInt arithmetic',
      'Files never leave your browser',
    ],
  },
};
