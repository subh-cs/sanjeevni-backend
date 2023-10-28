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

  const langToEng = await translate(question, { from: lang, to: 'en', raw: false });

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
  // if (messages.messages) {
  //   messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  // }

  // eng to input lang translation
  const engToLang = await translate(GPT3Answer, { from: 'en', to: lang });

  console.log("engToLang", engToLang);

  // generate audio buffer
  const audioBuffer = await getAudioBuffer(engToLang.text, lang);

  const messages = [{
    message: "audio buffer created successfully",
    audio: audioBuffer.toString("base64"),
    lipsync: await readJsonTranscript("audios/api_1.json"),
    facialExpression: "smile",
    animation: "Talking_1",
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

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
