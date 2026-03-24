require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.static('public'));
app.use(express.json());

// Fonction pour télécharger le fichier depuis une URL
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filepath);
        
        protocol.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

app.post('/transcribe', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL manquante' });
        }

        // Télécharger le fichier temporairement
        const tempPath = path.join('/tmp', `audio-${Date.now()}.mp3`);
        await downloadFile(url, tempPath);
        
        // Transcrire avec Groq
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-large-v3",
            language: "fr"
        });
        
        // Nettoyer
        fs.unlinkSync(tempPath);
        
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
            model: "llama-3
