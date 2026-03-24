require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

const app = express();

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({ storage });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.static('public'));
app.use(express.json());

app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        const audioPath = req.file.path;
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-large-v3",
            language: "fr"
        });
        fs.unlinkSync(audioPath);
        res.json({ transcription: transcription.text });
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Application lancée sur http://localhost:3000`);
});
