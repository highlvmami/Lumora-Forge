"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase"; 
import { logout } from "../lib/auth";

// --- YARDIMCI BİLEŞENLER ---

function AudioVisualizer() {
  const [heights, setHeights] = useState([]);

  useEffect(() => {
    const randomHeights = [...Array(12)].map(() => Math.random() * 100);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeights(randomHeights);
  }, []);

  return (
    <div className="flex gap-1 items-end h-12 opacity-50">
      {heights.map((h, i) => (
        <div 
          key={i} 
          className="w-2 bg-white/20 rounded-t-sm transition-all duration-700" 
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>
  );
}

function FooterStat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-medium text-zinc-300">{value}</span>
    </div>
  );
}

// --- ANA SAYFA ---

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Giriş hatası:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-[#ededed] selection:bg-white/20 font-sans font-light overflow-x-hidden">
      
     {/* --- NAVIGASYON --- */}
<nav className="fixed top-0 w-full flex justify-between items-center px-8 md:px-16 py-6 z-[100] mix-blend-difference">
  <div className="flex items-center gap-3">
    {/* Yanıp Sönen Nokta */}
    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
    
    {/* Sol Üst Marka Yazısı */}
    <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">
      LUMORA <span className="text-zinc-500">FORGE</span>
    </span>
  </div>
  
  {!loading && user && (
    <div className="flex items-center gap-6">
      <span className="text-zinc-400 text-xs tracking-wide hidden md:block">
        <span className="text-white font-medium">{user.displayName}</span>
      </span>
      <button 
        onClick={logout} 
        className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest border border-red-500/20 px-3 py-1 rounded-full bg-red-500/5"
      >
        Çıkış
      </button>
    </div>
  )}
</nav>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-40">
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-purple-900/20 rounded-full mix-blend-screen filter blur-[140px] animate-pulse"></div>
        </div>

        <div className="relative z-10 max-w-full mx-auto flex flex-col items-center">
          <div className="px-4 py-1.5 border border-white/10 rounded-full text-[10px] text-zinc-500 tracking-[0.3em] uppercase mb-12 backdrop-blur-sm">
            Neural Storytelling Engine
          </div>
          
          {/* YAN YANA BAŞLIK */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-none mb-12 text-white whitespace-nowrap">
  LUMORA <span className="text-zinc-700 font-black">FORGE</span>
</h1>

          <p className="text-zinc-500 text-lg md:text-xl max-w-xl mx-auto tracking-wide mb-16 leading-relaxed">
            Fikirlerinizi saniyeler içinde sinematik başyapıtlara dönüştüren nöral ağ stüdyosu.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            {!loading && (
              user ? (
                <Link href="create" className="px-12 py-5 bg-white text-black rounded-full font-bold text-[11px] tracking-[0.2em] uppercase transition-all hover:scale-105 hover:bg-zinc-200 flex items-center gap-3">
                  Üretimi Başlat <span>→</span>
                </Link>
              ) : (
                <button onClick={handleGoogleLogin} className="flex items-center gap-4 px-10 py-5 bg-[#111] border border-white/10 rounded-full font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all duration-300">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                  Google ile Başla
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* --- BENTO GRID --- */}
      <section className="py-24 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[300px]">
          
          <div className="md:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full filter blur-[100px]"></div>
            <div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-6 font-bold">01 / Engine</div>
              <h3 className="text-3xl md:text-4xl font-medium tracking-tight text-white leading-tight">Gelişmiş LLM <br/> Entegrasyonu</h3>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm">Basit taslaklarınızı nöral ağlar yardımıyla profesyonel senaryolara dönüştürür.</p>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-between group overflow-hidden">
            <div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-6 font-bold">02 / Visuals</div>
              <h3 className="text-2xl font-medium tracking-tight text-white">Nöral Görsel Dünyası</h3>
            </div>
            <div className="w-full h-24 bg-[#111] rounded-2xl border border-white/5 overflow-hidden relative">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000"></div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-between">
            <div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] mb-6 font-bold">03 / Acoustic</div>
              <h3 className="text-2xl font-medium tracking-tight text-white mb-2 text-balance">Duygu Odaklı Seslendirme</h3>
            </div>
            <AudioVisualizer />
          </div>

          <div className="md:col-span-2 bg-[#ececec] text-black rounded-[2.5rem] p-12 flex flex-col justify-between group hover:bg-white transition-colors duration-500">
            <div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mb-6 font-black">04 / Output</div>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 text-balance italic">Otomatik Video Kurgu.</h3>
            </div>
            <div className="flex justify-between items-end">
               <p className="text-zinc-600 text-sm font-medium max-w-sm">Tüm medya bileşenleri tek bir render işleminde birleşir.</p>
               <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white text-xl group-hover:rotate-45 transition-transform">↗</div>
            </div>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 mt-20">
        <div className="max-w-[1400px] mx-auto px-10 py-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-bold tracking-tighter text-white">LUMORA FORGE</div>
            <div className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase">Powered by Next-Gen AI • 2026</div>
          </div>
          <div className="flex gap-16">
            <FooterStat label="System" value="Stable" />
            <FooterStat label="Uptime" value="99.9%" />
            <FooterStat label="Latency" value="12ms" />
          </div>
        </div>
      </footer>
    </main>
  );
}