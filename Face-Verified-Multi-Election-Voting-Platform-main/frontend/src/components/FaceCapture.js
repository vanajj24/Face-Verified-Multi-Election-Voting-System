import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function FaceCapture({ onEmbedding }) {
  const videoRef = useRef();
  const streamRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("Loading models...");

  // ✅ Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setStatus("✅ Models loaded successfully");
        startVideo();
      } catch (err) {
        console.error(err);
        setStatus("❌ Error loading models: " + err.message);
      }
    };

    loadModels();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ✅ Improved Start webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait until metadata loads before playing
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setStatus("🎥 Camera started successfully");
          } catch (err) {
            console.error("Error playing video:", err);
            setStatus("⚠️ Unable to play video: " + err.message);
          }
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("❌ Camera access denied: " + err.message);
    }
  };

  // ✅ Capture face descriptor
  const captureFace = async () => {
    if (!modelsLoaded) return setStatus("⚠️ Models not loaded yet");

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setStatus("⚠️ No face detected. Try again.");
      return;
    }

    const embedding = Array.from(detection.descriptor);
    setStatus("✅ Face captured successfully");
    if (onEmbedding) onEmbedding(embedding);
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        backgroundColor: "#f9f9f9",
        borderRadius: "10px",
        maxWidth: "700px",
        margin: "auto",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      <video
        ref={videoRef}
        width="100%"
        height="auto"
        style={{
          borderRadius: "10px",
          border: "2px solid #ddd",
          backgroundColor: "#000",
          maxWidth: "600px",
        }}
      />

      <div style={{ marginTop: "15px" }}>
        <button
          onClick={captureFace}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Capture Face
        </button>
      </div>

      <p style={{ marginTop: "20px", color: "#555" }}>{status}</p>
    </div>
  );
}
