require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');
const https = require('https');
const http = require('http');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.static('public'));
app.use(express.json());

app.post('/transcribe', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL manquante' });
        }

        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, async (response) => {
            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: response,
                    model: "whisper-large-v3",
                    language: "fr"
                });
                
                res.json({ transcription: transcription.text });
            } catch (error) {
                console.error('Erreur:', error.message);
                res.status(500).json({ error: error.message });
            }
        });
    } catch (error) {
        console.error('Erreur:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/refine', async (req, res) => {
    try {
        const { transcription, instruction } = req.body;
        
        const completion = await groq.chat.completions.create({
            messages: [{
                role: "user",
                content: `Voici une retranscription : "${transcription}"\n\nInstruction : ${instruction}\n\nDonne-moi la version améliorée.`
            }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5
        });
        
        const refined = completion.choices[0].message.content;
        res.json({ refined });
    } catch (error) {
        console.error('Erreur:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Application lancée sur http://localhost:${PORT}`);
});
