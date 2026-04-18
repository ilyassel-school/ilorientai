import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, limit, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gemini AI Config
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
  console.warn("⚠️ GEMINI_API_KEY is missing or invalid. Please set it in the Secrets panel in AI Studio.");
}
const ai = new GoogleGenAI({ apiKey: geminiKey || "" });

// Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

async function seedData() {
  const schoolsCol = collection(db, "schools");
  const snapshot = await getDocs(query(schoolsCol, limit(1)));
  
  if (snapshot.empty) {
    console.log("Seeding schools data...");
    const initialSchools = [
      { name: "EMSI (Ecole Marocaine des Sciences de l'Ingénieur)", field: "Ingénierie, Informatique, Génie Civil", city: "Casablanca, Rabat, Marrakech", description: "Grande école d'ingénierie privée leader au Maroc." },
      { name: "ENCG (Ecole Nationale de Commerce et de Gestion)", field: "Gestion, Commerce, Marketing", city: "Settat, Casablanca, Rabat, Agadir", description: "Réseau d'écoles publiques prestigieuses en management." },
      { name: "OFPPT (Office de la Formation Professionnelle et de la Promotion du Travail)", field: "Technique, Artisanat, Services", city: "Toutes les villes", description: "Principal opérateur public de formation professionnelle." },
      { name: "UM6P (Université Mohammed VI Polytechnique)", field: "Recherche, Agronomie, Management", city: "Benguerir, Rabat", description: "Institution de recherche et d'innovation tournée vers le futur." },
      { name: "ISCAE (Institut Supérieur de Commerce et d'Administration des Entreprises)", field: "Business, Finance", city: "Casablanca, Rabat", description: "La plus ancienne école de commerce publique du Maroc." },
      { name: "INSEA (Institut National de Statistique et d'Économie Appliquée)", field: "Statistiques, Actuariat, Informatique", city: "Rabat", description: "Ecole supérieure publique d'Ingénieurs d'Etat." }
    ];

    for (const school of initialSchools) {
      await addDoc(schoolsCol, school);
    }
    console.log("Seeding complete.");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Seed data
  seedData().catch(console.error);

  // API Routes
  app.get("/api/schools", async (req, res) => {
    try {
      const schoolsCol = collection(db, "schools");
      const snapshot = await getDocs(schoolsCol);
      const schoolsList = snapshot.docs.map(doc => doc.data());
      res.json(schoolsList);
    } catch (error) {
      console.error("Fetch Schools Error:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des écoles" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const { id, title, messages } = req.body;
      const sessionRef = doc(db, "chat_sessions", id);
      await setDoc(sessionRef, {
        title,
        messages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Save Session Error:", error);
      res.status(500).json({ error: "Erreur lors de la sauvegarde de la session" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const sessionsCol = collection(db, "chat_sessions");
      const snapshot = await getDocs(sessionsCol);
      const sessionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(sessionsList);
    } catch (error) {
      console.error("Fetch Sessions Error:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des sessions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
