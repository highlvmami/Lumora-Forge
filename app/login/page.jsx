"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase"; 
import { logout } from "../../lib/auth";

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
    <main className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30">
      
      {/* --- NAVIGASYON --- */}
      <nav className="fixed top-0 w-full flex justify-between items-center px-10 py-6 z-[100] backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="text-xs font-black tracking-[0.4em] text-white uppercase">
          LUMORA <span className="text-purple-500">FORGE</span>
        </div>
        {!loading && user && (
          <div className="flex items-center gap-6 animate-in fade-in duration-1000">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest hidden md:block">
              User: <span className="text-white">{user.displayName}</span>
            </span>
            <button 
              onClick={logout} 
              className="px-4 py-1.5 border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full transition-all"
            >
              Oturumu Kapat
            </button>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a002e_0%,#000_70%)] opacity-60 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 flex flex-wrap justify-center gap-x-6 drop-shadow-2xl">
            <span>Lumora</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-500 animate-pulse">Forge</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light tracking-wide mb-10">
            Yapay zeka ile hikayeleştirmenin sınırlarını zorlayın. <br /> Sinematik bir evren, tek bir komut uzağınızda.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            {!loading && (
              user ? (
                <Link 
                  href="/create" 
                  className="group relative px-12 py-5 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 inline-block"
                >
                  <span className="relative z-10">Stüdyoyu Başlat</span>
                  <div className="absolute inset-0 bg-purple-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </Link>
              ) : (
                <button 
                  onClick={handleGoogleLogin} 
                  className="flex items-center gap-4 px-10 py-5 bg-zinc-900 border border-white/10 rounded-full font-bold hover:bg-white hover:text-black transition-all duration-500 shadow-2xl group"
                >
                  <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    className="w-5 h-5" 
                    alt="Google Logo" 
/>
                  Google ile Deneyin
                </button>
              )
            )}
            
            {!user && (
               <Link href="/" className="mt-4 text-zinc-500 text-sm underline hover:text-white transition-colors">
                  Ana Sayfaya Dön
               </Link>
            )}
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-zinc-600 text-xs tracking-widest uppercase">
          Detayları Keşfet ↓
        </div>
      </section>

      {/* --- MODÜL 1: ANLATI MOTORU --- */}
      <section className="py-32 px-10 border-t border-white/5 bg-gradient-to-b from-black to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Bilişsel Anlatı ve <br /> Veri Entegrasyonu</h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              Gelişmiş LLM mimarisi sayesinde yazdığınız basit fikirler, derinliği olan profesyonel senaryolara dönüşür. Her hikaye güvenli bir şekilde bulut veritabanına işlenir.
            </p>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Dinamik Prompt Mühendisliği</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Gerçek Zamanlı DB Kaydı</li>
            </ul>
          </div>
          <div className="aspect-square bg-zinc-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center relative overflow-hidden group">
            <div className="text-[10rem] group-hover:scale-110 transition-transform duration-700 opacity-20 select-none">🧠</div>
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* --- MODÜL 2: GÖRSEL SENTEZ --- */}
      <section className="py-32 px-10 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1 aspect-video bg-zinc-900/50 rounded-[2rem] border border-white/5 flex items-center justify-center relative group overflow-hidden">
            <div className="text-8xl group-hover:rotate-12 transition-transform duration-700 opacity-20 select-none">🖼️</div>
            <div className="absolute inset-x-10 bottom-10 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500 w-2/3 animate-pulse"></div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Nöral Görsel Dünyası</h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              Hikayenizin her sahnesi için en az 3 adet yapay zeka tabanlı görsel üretilir. Sahnenin duygusuna ve atmosferine göre görseller optimize edilir.
            </p>
          </div>
        </div>
      </section>

      {/* --- MODÜL 3: SES VE VİDEO --- */}
      <section className="py-32 px-10 bg-gradient-to-b from-[#0a0a0a] to-black">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 tracking-tighter italic">Prodüksiyonun Sonu.</h2>
          <p className="text-zinc-500 text-lg">Seslendirme, video kurgu, efektler ve altyazılar... Hepsi tek bir işlemde birleşir.</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-10 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] hover:bg-zinc-900/50 transition-all group">
            <div className="text-3xl mb-6 group-hover:scale-110 transition-transform">🎙️</div>
            <h4 className="text-xl font-bold mb-4">AI Seslendirme</h4>
            <p className="text-sm text-zinc-500">Hikayenizdeki her kelime, en doğal tonlarda sese dönüşür.</p>
          </div>
          <div className="p-10 bg-purple-600 rounded-[2.5rem] shadow-2xl shadow-purple-500/20 md:scale-105 transition-transform hover:scale-110">
            <div className="text-3xl mb-6">🎬</div>
            <h4 className="text-xl font-bold mb-4">Video Kurgu</h4>
            <p className="text-sm text-purple-100">Görseller ve sesler efektlerle birleşerek sinematik bir video oluşturur.</p>
          </div>
          <div className="p-10 bg-zinc-900/30 border border-white/5 rounded-[2.5rem] hover:bg-zinc-900/50 transition-all group">
            <div className="text-3xl mb-6 group-hover:scale-110 transition-transform">📝</div>
            <h4 className="text-xl font-bold mb-4">Akıllı Altyazı</h4>
            <p className="text-sm text-zinc-500">Sesle tam senkronize altyazılar otomatik olarak videoya işlenir.</p>
          </div>
        </div>
      </section>

      {/* --- FOOTER / SCRUM PANEL --- */}
      <footer className="py-20 px-10 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left">
            <div className="text-xl font-black tracking-widest mb-2">LUMORA</div>
            <div className="text-[10px] text-zinc-600 tracking-[0.3em] uppercase">Powered by Next-Gen AI • 2026</div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBox label="System" value="Active" />
            <StatBox label="Latency" value="24ms" />
            <StatBox label="Uptime" value="99.9%" />
            <StatBox label="AI Core" value="Stable" />
          </div>
        </div>
      </footer>

    </main>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="text-center md:text-left">
      <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-bold text-white tracking-tighter">{value}</div>
    </div>
  );
}