# Video Presentation Script (about 3 minutes)

**Before recording:** run `npm run dev` and do one full chat once so you know what to expect. Close `.env.local` and anything showing your API key.

Times are approximate. Speak naturally. You don't need to read word for word. Read out what actually appears on screen, not the bracketed placeholders.

---

### 1. Problem and motivation (0:00 – 0:20)

*[Screen: homepage]*

"Hi, I'm [your name], and this is my project for the Gokul Infocare AI Growth & Automation assessment.

Support teams spend a lot of time on repeated problems, and on reading each ticket to decide how urgent it is. I built an AI support desk that fixes simple problems directly with the customer and hands the rest to the support team, already triaged."

### 2. AI tools and their roles (0:20 – 0:40)

"I used two AI tools. Claude Code was my coding assistant in VS Code. I gave it detailed prompts, and it built the Next.js app, tests and documentation with me. Google Gemini is the AI inside the product. It powers the chatbot and the ticket triage."

### 3. Live demo: the chatbot (0:40 – 1:30)

*[Click "Chat with the AI assistant"]*

"This is my concept redesign of the Gokul Infocare website. It has animated sections for the services, solutions like smart parking sensors and fleet tracking, and recruitment. Customers can open the support assistant from anywhere."

*[Type: "My asset tracking dashboard stopped showing live locations for our vans since this morning."]*

"The AI replies with step-by-step fixes right on screen: [read one or two steps]. It asks whether that solved the problem."

*[Click "No, still not working", or type "I tried all of that, can a person look at it?"]*

"When it can't fix the issue, it escalates. Here it says [read the escalation reason]."

*[Click "Create support ticket", enter a name, then "Create support ticket"]*

"It creates a support ticket. I get a ticket number, [read it], and the AI has already set the priority to [priority] and the category to [category]. I can check progress any time by typing 'status' and the number."

### 4. Live demo: admin login, resolving the ticket (1:30 – 2:05)

*[Open a second browser window. Open the chat, type "admin", enter the access code in the masked box, click Unlock]*

"Admins get in through the same chatbot. I type 'admin' and enter a secret code in a hidden box. The code is checked on the server and never sent to the AI, and the dashboard is locked for everyone else."

*[On the Support tickets tab, point at the New / In progress / Solved columns, then click the new ticket]*

"Here's the ticket the customer just raised, already triaged: the summary, why it's [priority] priority, a recommended action, a draft reply and the full chat. I click Start working, write a resolution note, or start from the AI's draft, and mark it resolved."

*[Back in the customer window, type "status GI-…" in the chat]*

"The customer is emailed the resolution automatically, and can also see it straight away in the chat. The status comes from the real ticket records, not the AI, so it can't be made up."

*[Optional: switch to the Triage tool tab, click "Service outage", then Analyze]*

"There's also a triage tool for analysing any ticket by hand. For this outage it returns [priority], showing the same engine behind every ticket."

### 5. Prompt engineering and refinement (1:55 – 2:30)

*[Screen: src/lib/chat-prompt.ts or PROMPT_DOCUMENTATION.md]*

"The prompts were the most important part. I defined fixed categories and priority levels, and reserved Critical for real emergencies so an angry customer isn't automatically Critical. I gave the chatbot clear rules for when to escalate: outages, security, billing, repeated failed fixes, or when the customer asks for a person. And because customers write the messages, the prompt treats their text as untrusted data, so instructions hidden inside a message are ignored.

One real refinement came from testing. My first model choice kept timing out, so I diagnosed it, switched to Gemini 3.5 Flash-Lite, and documented the change."

### 6. How it works and challenges (2:30 – 2:50)

"The browser only talks to my own server routes, so the API key stays secret. Gemini returns structured JSON, and the server validates every field before showing it. If the AI fails, the user sees an honest error, never a made-up answer. I also wrote 144 automated tests with Gemini and email mocked."

### 7. Outcome (2:50 – 3:00)

"The result is a working AI support desk that solves simple issues instantly and gives the support team a clear, prioritised summary for everything else. Thank you for watching."

---

**After recording:** check that the video is 2 minutes or longer, the audio is clear, and no API key is visible. Upload it and add the link to `SUBMISSION_CHECKLIST.md`.
