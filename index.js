import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { getAudioBuffer } from 'simple-tts-mp3';
import translate from '@iamtraction/google-translate';
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const readJsonTranscriptStatic = {
  "metadata": {
    "soundFile": "/Users/wawa/Documents/Projects/wawasensei/r3f-virtual-girlfriend-backend/audios/api_1.wav",
    "duration": 5.32
  },
  "mouthCues": [
    { "start": 0.00, "end": 0.77, "value": "X" },
    { "start": 0.77, "end": 0.85, "value": "B" },
    { "start": 0.85, "end": 0.99, "value": "E" },
    { "start": 0.99, "end": 1.41, "value": "F" },
    { "start": 1.41, "end": 1.55, "value": "B" },
    { "start": 1.55, "end": 1.63, "value": "A" },
    { "start": 1.63, "end": 1.70, "value": "C" },
    { "start": 1.70, "end": 1.83, "value": "F" },
    { "start": 1.83, "end": 1.97, "value": "G" },
    { "start": 1.97, "end": 2.04, "value": "C" },
    { "start": 2.04, "end": 2.18, "value": "B" },
    { "start": 2.18, "end": 2.25, "value": "C" },
    { "start": 2.25, "end": 2.60, "value": "B" },
    { "start": 2.60, "end": 2.67, "value": "C" },
    { "start": 2.67, "end": 2.88, "value": "B" },
    { "start": 2.88, "end": 3.02, "value": "C" },
    { "start": 3.02, "end": 3.23, "value": "B" },
    { "start": 3.23, "end": 3.31, "value": "A" },
    { "start": 3.31, "end": 3.80, "value": "B" },
    { "start": 3.80, "end": 3.87, "value": "C" },
    { "start": 3.87, "end": 4.01, "value": "H" },
    { "start": 4.01, "end": 4.08, "value": "B" },
    { "start": 4.08, "end": 4.29, "value": "C" },
    { "start": 4.29, "end": 4.38, "value": "A" },
    { "start": 4.38, "end": 4.42, "value": "B" },
    { "start": 4.42, "end": 4.60, "value": "C" },
    { "start": 4.60, "end": 4.74, "value": "B" },
    { "start": 4.74, "end": 4.87, "value": "X" },
    { "start": 4.87, "end": 4.93, "value": "B" },
    { "start": 4.93, "end": 4.98, "value": "C" },
    { "start": 4.98, "end": 5.19, "value": "B" },
    { "start": 5.19, "end": 5.32, "value": "X" }
  ]
}


const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "kgG7dCoKCfLehAPWkJOE";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.wav audios/message_${message}.mp3`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `./bin/rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const { lang, question } = req.body;

  console.log(req.body);

  // if no required body provided
  if (!question || !lang) {
    return res.send({
      message: `${question} or ${lang} is not provided properly`
    })
  }
  // if (!userMessage) {
  //   res.send({
  //     messages: [
  //       {
  //         text: "Hey dear... How was your day?",
  //         audio: await audioFileToBase64("audios/intro_0.wav"),
  //         lipsync: await readJsonTranscript("audios/intro_0.json"),
  //         facialExpression: "smile",
  //         animation: "Talking_1",
  //       },
  //       {
  //         text: "I missed you so much... Please don't go for so long!",
  //         audio: await audioFileToBase64("audios/intro_1.wav"),
  //         lipsync: await readJsonTranscript("audios/intro_1.json"),
  //         facialExpression: "sad",
  //         animation: "Crying",
  //       },
  //     ],
  //   });
  //   return;
  // }
  // if (!elevenLabsApiKey || openai.apiKey === "-") {
  //   res.send({
  //     messages: [
  //       {
  //         text: "Please my dear, don't forget to add your API keys!",
  //         audio: await audioFileToBase64("audios/api_0.wav"),
  //         lipsync: await readJsonTranscript("audios/api_0.json"),
  //         facialExpression: "angry",
  //         animation: "Angry",
  //       },
  //       {
  //         text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
  //         audio: await audioFileToBase64("audios/api_1.wav"),
  //         lipsync: await readJsonTranscript("audios/api_1.json"),
  //         facialExpression: "smile",
  //         animation: "Laughing",
  //       },
  //     ],
  //   });
  //   return;
  // }

  const langToEng = await translate(question, { to: 'en', raw: false });

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `
        "You're a health assitant and you're confident about it"
        "Answer the health related query in simple language within 1-2 sentences."
        `,
      },
      {
        role: "user",
        content: langToEng.text || "Hello",
      },
    ],
  });
  let GPT3Answer = completion.choices[0].message.content

  // eng to input lang translation
  const engToLang = await translate(GPT3Answer, { from: 'en', to: lang });

  console.log("engToLang", engToLang);

  // generate audio buffer
  const audioBuffer = await getAudioBuffer(engToLang.text, lang);

  const messages = [{
    message: "audio buffer created successfully",
    audio: audioBuffer.toString("base64"),
    lipsync: readJsonTranscriptStatic,
    facialExpression: "smile",
    animation: "Talking",
  }]
  res.status(200).send({
    messages
  })
  // for (let i = 0; i < messages.length; i++) {
  //   const message = messages[i];
  //   // generate audio file
  //   const fileName = `audios/message_${i}.mp3`; // The name of your audio file
  //   const textInput = message.text; // The text you wish to convert to speech
  //   await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
  //   // generate lipsync
  //   await lipSyncMessage(i);
  //   message.audio = await audioFileToBase64(fileName);
  //   message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  // }

  // res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(process.env.PORT, () => {
  console.log(`Sanjeevni listening on port ${PORT}`);
});