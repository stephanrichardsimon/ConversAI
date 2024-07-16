import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef(null);

  const startRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setInputText((prevText) => prevText + " " + spokenText);
    };

    recognition.onend = () => {
      recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const sendToChatGPT = async (text) => {
    setIsLoading(true);
    stopRecognition();

    try {
      const messages = buildMessageHistory(text);

      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo-0125",
          messages: messages,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
        }
      );

      const responseText = res.data.choices[0].message.content;
      setConversation((prev) => [
        ...prev,
        { question: text, answer: responseText },
      ]);
      convertTextToSpeech(responseText);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildMessageHistory = (currentQuestion) => {
    const contextMessage = {
      role: "system",
      content: "",
    };

    const messages = [
      contextMessage,
      ...conversation.flatMap((item) => [
        { role: "user", content: item.question },
        { role: "assistant", content: item.answer },
      ]),
      { role: "user", content: currentQuestion },
    ];

    return messages;
  };

  const convertTextToSpeech = (text) => {
    const chunks = text.split(/([,.!?])/).reduce((acc, part) => {
      if (acc.length && acc[acc.length - 1].length + part.length < 100) {
        acc[acc.length - 1] += part;
      } else {
        acc.push(part);
      }
      return acc;
    }, []);

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk.trim());
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (index === chunks.length - 1) {
          setIsSpeaking(false);
        }
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {}, [isSpeaking]);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const handleSendClick = () => {
    if (inputText.trim() !== "") {
      sendToChatGPT(inputText);
      setInputText("");
    }
  };

  return (
    <Grid container component="main" gap={2}>
      <Grid item xs={12}>
        <Grid container p={2}>
          {conversation.map((item, index) => (
            <Grid item xs={12} mb={10} key={index}>
              <Box>
                <Typography fontWeight="bold">
                  Você:{" "}
                  <Typography fontWeight="normal" component="span">
                    {item.question}
                  </Typography>
                </Typography>
                <Typography fontWeight="bold">
                  IA:{" "}
                  <Typography fontWeight="normal" component="span">
                    {item.answer}
                  </Typography>
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Grid>

      <Grid
        item
        xs={12}
        sx={{
          width: "100%",
          position: "fixed",
          bottom: 0,
          textAlign: "center",
          backgroundColor: "#2f4858",
          padding: 2,
        }}
      >
        {isLoading && (
          <Typography fontWeight="bold" mb={2} sx={{ color: "#fff" }}>
            Carregando...
          </Typography>
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <TextField
            sx={{ flexGrow: 1, backgroundColor: "#fff", borderRadius: 1 }}
            value={inputText}
            onChange={handleInputChange}
            placeholder="Digite sua mensagem"
          />
          {inputText && (
            <Button sx={{ color: "#fff" }} onClick={handleSendClick}>
              Enviar
            </Button>
          )}
          {!inputText && (
            <Button sx={{ color: "#fff" }} onClick={startRecognition}>
              Falar
            </Button>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default App;
