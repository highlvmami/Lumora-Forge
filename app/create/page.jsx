"use client";

import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function CreateProject() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState("");
  const [length, setLength] = useState("orta");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImgGenerating, setIsImgGenerating] = useState(false);
  
  const [images, setImages] = useState([null, null, null]);
  const [imageLoading, setImageLoading] = useState([false, false, false]);

  const [sentences, setSentences] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [subtitle, setSubtitle] = useState("");
  
  const isPlayingRef = useRef(false);
  const manualCancelRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      setUser(u);
    });
    return () => {
      unsub();
      window.speechSynthesis.cancel();
    };
  }, [router]);

  useEffect(() => {
    if (story) {
      setSentences(story.match(/[^.!?]+[.!?]+/g) || [story]);
      setCurrentSentenceIndex(0);
    }
  }, [story]);

  const stopVideo = () => {
    manualCancelRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    setCurrentSentenceIndex(0);
    setActiveScene(0);
    setSubtitle("");
  };

  // 1. STORY: LLM ile program içerisinden prompt oluşturma
  const generateStory = async () => {
    if (!prompt) return alert("Lütfen bir konu yazın.");
    setIsGenerating(true);
    setImages([null, null, null]);
    stopVideo(); 

    let lengthInstruction = "";
    if (length === "kısa") lengthInstruction = "En fazla 3 cümleden oluşan, özet niteliğinde, ÇOK KISA";
    else if (length === "orta") lengthInstruction = "Yaklaşık 6-7 cümleden oluşan, ORTA UZUNLUKTA";
    else if (length === "uzun") lengthInstruction = "En az 12 cümleden oluşan, detaylı betimlemelere sahip UZUN";

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.6,
          messages: [
            {
              role: "system",
              content: `Sen usta bir Türk yazar ve edebiyatçısın. Görevin, sana verilen konularda mükemmel bir Türkçe ile akıcı hikayeler yazmaktır. ÇOK ÖNEMLİ KURAL: SADECE Türk alfabesi (Latin harfleri) kullan. KESİNLİKLE İngilizce kelimeler, Çince/Japonca karakterler (Örn: 世界) veya başka bir yabancı dile ait hiçbir sembol KULLANMA. Yazdığın her bir kelime %100 saf Türkçe olmak zorundadır.`
            },
            {
              role: "user",
              content: `Konu: "${prompt}". Lütfen bu konu hakkında akıcı, betimlemeleri güçlü ve sinematik, ${lengthInstruction} bir hikaye yaz.`,
            }
          ]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStory(data.choices[0]?.message?.content || "");
      } else {
        alert("Hikaye motoru yanıt vermedi.");
      }
    } catch (err) {
      alert("Hikaye üretilirken sistem hatası oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. STORY: Hikaye temelli en az 3 görselin LLM'ile oluşturulması
  const generateImages = async () => {
    if (!story) return alert("Önce hikaye oluşturmalısınız.");

    setIsImgGenerating(true);
    setImages([null, null, null]);

    const scenes = story.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15).slice(0, 3);
    while (scenes.length < 3) scenes.push(scenes[scenes.length - 1] || "");

    const updatedImages = [null, null, null];

    for (let i = 0; i < scenes.length; i++) {
      setImageLoading((prev) => { const copy = [...prev]; copy[i] = true; return copy; });

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: scenes[i] }),
        });

        const data = await res.json();
        if (res.ok && data.image) {
          updatedImages[i] = data.image;
          setImages([...updatedImages]);
        }
      } catch (error) {
        console.error(`Sahne ${i + 1} çekilirken hata oluştu:`, error);
      } finally {
        setImageLoading((prev) => { const copy = [...prev]; copy[i] = false; return copy; });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setIsImgGenerating(false);
  };

  // 4, 5, 6, 7. STORY: Sese dönüştürme, Ses ve Görsel, Efekt, Altyazı
  const playAudio = (index) => {
    if (!sentences[index]) return;
    manualCancelRef.current = false;

    const text = sentences[index].trim();
    setSubtitle(text);

    const validImagesCount = images.filter(Boolean).length || 1;
    const sentencesPerImage = Math.ceil(sentences.length / validImagesCount) || 1;
    setActiveScene(Math.min(Math.floor(index / sentencesPerImage), validImagesCount - 1));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.9;

    utterance.onend = () => {
      if (!manualCancelRef.current && isPlayingRef.current) {
        if (index + 1 < sentences.length) {
          setCurrentSentenceIndex(index + 1);
          playAudio(index + 1);
        } else {
          stopVideo();
        }
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const togglePlayPause = () => {
    if (!images[0]) return alert("Önce hikaye ve görseller oluşturulmalı!");
    
    if (!isPlaying) {
      setIsPlaying(true);
      isPlayingRef.current = true;
      setIsPaused(false);
      playAudio(currentSentenceIndex);
    } else {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const handleNext = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      manualCancelRef.current = true;
      window.speechSynthesis.cancel();
      const nextIdx = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIdx);
      
      if (isPlaying && !isPaused) {
        setTimeout(() => playAudio(nextIdx), 100);
      } else {
        updateSceneAndSubtitle(nextIdx);
      }
    }
  };

  const handlePrev = () => {
    if (currentSentenceIndex > 0) {
      manualCancelRef.current = true;
      window.speechSynthesis.cancel();
      const prevIdx = currentSentenceIndex - 1;
      setCurrentSentenceIndex(prevIdx);
      
      if (isPlaying && !isPaused) {
        setTimeout(() => playAudio(prevIdx), 100);
      } else {
        updateSceneAndSubtitle(prevIdx);
      }
    }
  };

  const updateSceneAndSubtitle = (index) => {
    setSubtitle(sentences[index]?.trim() || "");
    const validImagesCount = images.filter(Boolean).length || 1;
    const sentencesPerImage = Math.ceil(sentences.length / validImagesCount) || 1;
    setActiveScene(Math.min(Math.floor(index / sentencesPerImage), validImagesCount - 1));
  };

  // 2. STORY: Oluşan hikayenin veri tabanına kaydedilmesi
  const saveToFirebase = async () => {
    if (!story) return alert("Kaydedilecek bir hikaye bulunamadı.");

    try {
      const projectData = {
        userId: user?.uid || "anonim_kullanici",
        userName: user?.displayName || "Anonim Kullanıcı",
        prompt: prompt || "Konu belirtilmedi",
        story: story,
        length: length || "orta",
        images: images.map((img) => img || ""), 
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "projects"), projectData);
      alert("Projeniz başarıyla veritabanına kaydedildi!");
    } catch (e) {
      console.error("Firebase Hatası:", e);
      alert(`Kaydedilirken bir hata oluştu: ${e.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 pt-24">
      <div className="max-w-6xl mx-auto flex justify-between mb-10 items-center">
        <h1 className="text-3xl font-bold tracking-tighter">LUMORA STUDIO</h1>
        <button
          onClick={saveToFirebase}
          className="px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 transition"
        >
          KAYDET
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Hikayenizin konusunu Türkçe olarak buraya yazın..."
              className="w-full bg-transparent text-xl outline-none h-24 resize-none text-white placeholder-zinc-500"
            />
            <div className="flex gap-2 mt-4 items-center">
              {["kısa", "orta", "uzun"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    length === l ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={generateStory}
                disabled={isGenerating}
                className="ml-auto px-6 py-2 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 disabled:opacity-50 transition"
              >
                {isGenerating ? "YAZILIYOR..." : "HİKAYE OLUŞTUR"}
              </button>
            </div>
          </div>

          <div className="p-6 bg-zinc-900 rounded-3xl min-h-[250px] border border-zinc-800 relative">
            <pre className="whitespace-pre-wrap text-zinc-300 font-sans leading-relaxed text-sm">
              {story || "Üretilen Türkçe hikaye içeriği burada görüntülenecek..."}
            </pre>
          </div>

          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Sinematik Hikaye Videosu</h3>
              <span className="text-xs font-mono text-zinc-500">
                {sentences.length > 0 ? `Sahne ${currentSentenceIndex + 1} / ${sentences.length}` : ""}
              </span>
            </div>

            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden relative border border-zinc-800 shadow-2xl">
              {images[0] ? (
                <>
                  {images.map((img, idx) => (
                    img && (
                      <img 
                        key={idx}
                        src={img} 
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ease-in-out ${
                          activeScene === idx 
                            ? "opacity-100 scale-105" 
                            : "opacity-0 scale-100"   
                        }`}
                        alt="Sahne" 
                      />
                    )
                  ))}

                  {(isPlaying || subtitle) && (
                    <div className="absolute bottom-6 left-0 right-0 px-8 text-center z-10 transition-opacity duration-300">
                      <span className="bg-black/60 text-yellow-400 font-bold px-4 py-2 rounded text-lg lg:text-xl drop-shadow-md border border-white/10">
                        {subtitle}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex w-full h-full items-center justify-center text-xs text-zinc-600 uppercase tracking-widest text-center px-4">
                  Görseller üretildiğinde video burada izlenebilir
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 bg-zinc-950 p-3 rounded-full border border-zinc-800 w-max mx-auto">
              <button onClick={handlePrev} disabled={!images[0] || currentSentenceIndex === 0} className="text-xl hover:text-white text-zinc-500 disabled:opacity-30 transition">
                ⏮
              </button>
              <button onClick={togglePlayPause} disabled={!images[0]} className="text-3xl hover:text-white text-white disabled:opacity-30 transition w-8 flex justify-center">
                {!isPlaying || isPaused ? "▶" : "⏸"}
              </button>
              <button onClick={stopVideo} disabled={!isPlaying && !isPaused && currentSentenceIndex === 0} className="text-xl hover:text-red-500 text-zinc-500 disabled:opacity-30 transition">
                ⏹
              </button>
              <button onClick={handleNext} disabled={!images[0] || currentSentenceIndex === sentences.length - 1} className="text-xl hover:text-white text-zinc-500 disabled:opacity-30 transition">
                ⏭
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <h2 className="text-sm font-bold tracking-wider text-zinc-400 mb-4 uppercase">Görsel Sahneler</h2>
            
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Sahne {i + 1}</div>
                  <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800">
                    {img ? (
                      <img src={img} alt={`Sahne ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-zinc-600 flex flex-col items-center gap-3">
                        {imageLoading[i] ? (
                          <>
                            <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-zinc-400 animate-pulse text-[10px] tracking-wider">Çiziliyor...</span>
                          </>
                        ) : (
                          <span className="tracking-wider text-zinc-500 text-[10px] uppercase">Boş Sahne</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={generateImages}
              disabled={isImgGenerating || !story || (isPlaying && !isPaused)}
              className="w-full mt-6 px-4 py-2.5 bg-zinc-800 text-white rounded-full text-xs font-bold hover:bg-zinc-700 disabled:opacity-40 transition border border-zinc-700"
            >
              {isImgGenerating ? "GÖRSELLER ÇİZİLİYOR..." : "GÖRSELLERİ ÜRET"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}