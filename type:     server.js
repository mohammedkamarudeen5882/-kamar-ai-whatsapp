const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const PORT = process.env.PORT || 3000;

// Test that the server is running
app.get("/", (req, res) => {
  res.send("Kamar AI WhatsApp Bot is running!");
});

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  // Respond immediately to Meta
  res.sendStatus(200);

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== "text") {
      return;
    }

    const from = message.from;
    const userMessage = message.text.body;

    console.log("WhatsApp message:", userMessage);

    // Ask OpenAI
    const response = await openai.responses.create({
      model: "gpt-5.5",
      instructions:
        "You are Kamar AI, a helpful, friendly WhatsApp assistant. Answer clearly and naturally. Keep responses reasonably concise.",
      input: userMessage,
    });

    const reply = response.output_text;

    // Send AI response back to WhatsApp
    await fetch(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body: reply,
          },
        }),
      }
    );

    console.log("AI reply sent:", reply);
  } catch (error) {
    console.error("Error:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Kamar AI running on port ${PORT}`);
});