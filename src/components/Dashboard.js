import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const [questionData, setQuestionData] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    fetchQuestion();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const fetchQuestion = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:8000/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestionData(response.data);

      if (
        response.data.currentQuestion &&
        response.data.currentQuestion.audio
      ) {
        const audio = new Audio(
          `data:audio/mp3;base64,${response.data.currentQuestion.audio}`
        );
        setAudioElement(audio);
      }
    } catch (error) {
      console.error("Error fetching question:", error);
      if (error.response && error.response.status === 401) {
        navigate("/");
      }
    }
  };

  const playAudio = () => {
    if (audioElement) {
      audioElement.play();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      socketRef.current = new WebSocket("ws://localhost:8000/ws");
      socketRef.current.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.error) {
          console.error(result.error);
        } else {
          if (result.is_final) {
            setTranscription((prev) => prev + " " + result.transcript);
            setInterimTranscription("");
          } else {
            setInterimTranscription(result.transcript);
          }
        }
      };

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          const reader = new FileReader();
          reader.onload = () => {
            socketRef.current.send(reader.result);
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorderRef.current.start(100); // Send audio data every 100ms
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setInterimTranscription("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const submitAnswer = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:8000/submit_answer",
        { answer: transcription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTranscription("");
      fetchQuestion();
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  if (!questionData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Questions Answered: {questionData.questionsAnswered}</p>
      <p>Total Questions: {questionData.totalQuestions}</p>
      {questionData.currentQuestion && (
        <div>
          <h2>Current Question:</h2>
          <p>{questionData.currentQuestion.text}</p>
          {audioElement && (
            <button onClick={playAudio}>Play Question Audio</button>
          )}
          <div>
            <button onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>
          <div>
            <h3>Your Answer (Transcription):</h3>
            <textarea
              value={transcription + " " + interimTranscription}
              rows={5}
              cols={50}
              readOnly
            />
          </div>
          <button onClick={submitAnswer} disabled={!transcription.trim()}>
            Submit Answer
          </button>
        </div>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
