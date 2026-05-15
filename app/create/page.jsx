"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Groq from "groq-sdk";

export default function CreateProject() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState("");
  const [length, setLength] = useState("orta");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImgGenerating, setIsImgGenerating] = useState(false);
  const [images, setImages] = useState([null, null, null]);
  const router = useRouter();

  // Oturum Kontrolü
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push("/");
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // STORY 1: Gerçek Yapay Zeka (Gemini) ile Hikaye Üretimi
  const generateStory = async () => {
    if (!prompt) return alert("Lütfen önce bir konu veya fikir yazın.");
    
    // API Key Kontrolü (Hata almamak için fonksiyon içinde okuyoruz)
    const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    if (!API_KEY) {
      alert("Hata: API anahtarı bulunamadı. .env.local dosyasını ve NEXT_PUBLIC_ önekini kontrol edin.");
      return;
    }

    setIsGenerating(true);

    try {
      const groq = new Groq({
      apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
       dangerouslyAllowBrowser: true,
      });

      const chatCompletion = await groq.chat.completions.create({
      messages: [
      {
        role: "user",
        content: `Sen yaratıcı bir hikaye yazma yapay zekasısın.
Kullanıcının verdiği fikre göre kısa, etkileyici bir hikaye yaz.

Konu: ${prompt}
Uzunluk: ${length}
`
      },
      ],
      model: "llama-3.3-70b-versatile",
    });

const text = chatCompletion.choices[0]?.message?.content;

setStory(text);
    } catch (error) {
      console.error("AI Hatası:", error);
      alert("Yapay zeka yanıt veremedi. Konsol kaydına bakın.");
    } finally {
      setIsGenerating(false);
    }
  };

  // STORY 3: Görsel Üretme (Simülasyon)
  const generateImages = async () => {
    if (!story) return alert("Önce hikayeyi oluşturmalısınız!");
    setIsImgGenerating(true);
    
    setTimeout(() => {
      setImages([
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000",
        "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000",
        "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000"
      ]);
      setIsImgGenerating(false);
    }, 2500);
  };

  // STORY 2: Firebase Veri Tabanına Kaydetme
  const saveToFirebase = async () => {
    if (!story) return alert("Önce bir hikaye oluşturmalısın!");
    try {
      await addDoc(collection(db, "projects"), {
        userId: user?.uid,
        userName: user?.displayName || "Anonim",
        prompt: prompt,
        story: story,
        length: length,
        images: images,
        createdAt: serverTimestamp(),
        status: "completed"
      });
      alert("Proje başarıyla buluta kaydedildi!");
    } catch (error) {
      console.error("Firebase Hatası:", error);
      alert("Kaydedilirken bir hata oluştu.");
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-white p-6 md:p-12 pt-24 selection:bg-white/20">
      
      {/* Üst Panel */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter italic uppercase">LUMORA STUDIO</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.5em] mt-2 font-bold">Neural Generation Engine v1.5</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={saveToFirebase}
            className="px-10 py-3 bg-white text-black rounded-full text-[10px] font-bold tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            TASLAĞI KAYDET
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sol Kolon: Input & Hikaye */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 md:p-10">
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-6 block font-bold">01 / Concept Input</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Zihnindeki dünyayı birkaç kelimeyle tarif et..."
              className="w-full bg-transparent border-none text-2xl md:text-3xl focus:ring-0 placeholder:text-zinc-900 resize-none h-28 mb-6 font-light"
            />
            
            <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-8">
              <div className="flex bg-zinc-900/50 p-1 rounded-full border border-white/5">
                {["kısa", "orta", "uzun"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest transition-all ${
                      length === l ? "bg-white text-black font-bold" : "text-zinc-600 hover:text-white"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button 
                onClick={generateStory}
                disabled={isGenerating}
                className="ml-auto px-10 py-4 bg-zinc-900 border border-white/10 rounded-full text-[10px] font-bold tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50"
              >
                {isGenerating ? "ANALİZ EDİLİYOR..." : "ANLATIYI OLUŞTUR"}
              </button>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 md:p-10 min-h-[450px]">
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-8 block font-bold">02 / Neural Narrative</label>
            <div className="text-zinc-400 leading-[1.8] italic text-lg md:text-xl font-light whitespace-pre-wrap">
              {story || "Algoritmaların hikayeni yazmasını bekle..."}
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Görseller */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8">
            <label className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-8 block font-bold">03 / Visual Scenes</label>
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div key={i} className="aspect-video bg-[#050505] border border-white/5 rounded-3xl flex items-center justify-center overflow-hidden relative group">
                  {img ? (
                    <img src={img} alt={`Scene ${i}`} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                  ) : (
                    <span className="text-[9px] text-zinc-800 tracking-[0.4em] uppercase">Waiting</span>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={generateImages}
              disabled={isImgGenerating || !story}
              className="w-full mt-8 py-5 border border-white/10 rounded-3xl text-[10px] font-bold tracking-[0.3em] hover:bg-white hover:text-black transition-all disabled:opacity-20"
            >
              {isImgGenerating ? "GÖRSELLER İŞLENİYOR..." : "GÖRSELLERİ ÜRET"}
            </button>
          </div>

          <div className="bg-[#ececec] text-black rounded-[2.5rem] p-10 flex flex-col justify-between min-h-[300px]">
             <div>
                <div className="flex justify-between items-center mb-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Production Ready</span>
                    <div className="w-2 h-2 bg-black rounded-full animate-ping"></div>
                </div>
                <h3 className="text-3xl font-bold tracking-tighter italic leading-none">VİDEO <br/> ÖNİZLEME</h3>
             </div>
             <button 
                onClick={() => router.push("/preview")}
                className="w-full py-5 bg-black text-white rounded-full text-[10px] font-bold tracking-[0.2em] hover:scale-105 transition-transform"
             >
                PREVIEW MODÜLÜNE GEÇ ↗
             </button>
          </div>
        </div>
      </div>
    </main>
  );
}