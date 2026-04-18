import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Languages, Sparkles, User, Bot, GraduationCap, ArrowRight, BookOpen, School, History, LayoutDashboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GoogleGenAI } from "@google/genai";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Gemini Initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Language = "fr" | "ar";

const TRANSLATIONS = {
  fr: {
    title: "OrientAI",
    subtitle: "Orientation Post-Bac 2024",
    placeholder: "Posez votre question sur votre avenir scolaire...",
    send: "Envoyer",
    loading: "Réflexion en cours...",
    switch: "العربية",
    dir: "ltr",
    nav: ["Orientation IA", "Établissements", "Filières & Métiers", "Historique"],
    user: "Ahmed Benjelloun",
  },
  ar: {
    title: "توجيه المغرب",
    subtitle: "توجيه ما بعد البكالوريا 2024",
    placeholder: "اسأل سؤالك عن مستقبلك الدراسي...",
    send: "إرسال",
    loading: "جاري التفكير...",
    switch: "Français",
    dir: "rtl",
    nav: ["التوجيه الذكي", "المؤسسات", "التخصصات والمهن", "السجل"],
    user: "أحمد بنجلون",
  }
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<Language>("fr");
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Math.random().toString(36).substring(2, 15));
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    fetch("/api/schools")
      .then(res => res.json())
      .then(data => setSchools(data))
      .catch(err => console.error("Error fetching schools:", err));
  }, []);

  useEffect(() => {
    if (activeTab === 3) {
      setIsLoadingHistory(true);
      fetch("/api/sessions")
        .then(res => res.json())
        .then(data => setHistorySessions(data))
        .catch(err => console.error("Error fetching history:", err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(Math.random().toString(36).substring(2, 15));
    setActiveTab(0);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const systemPrompt = `Tu es "OrientAI", un conseiller d'orientation expert au Maroc. 
Ta mission est d'aider les étudiants marocains (lycéens ou universitaires) à choisir leur voie.
Réponds dans la langue demandée : ${lang === 'ar' ? 'Arabe' : 'Français'}.
Voici une liste d'écoles de référence récupérées depuis notre base de données :
${JSON.stringify(schools, null, 2)}

Instructions :
- Analyse les intérêts de l'utilisateur.
- Propose des écoles adaptées parmi la liste ou propose d'autres options si pertinent au Maroc.
- Explique les filières et les débouchés.
- Garde un ton professionnel, encourageant et expert.
- Si l'utilisateur parle en Arabe, réponds en Arabe (Darija ou Arabe standard selon le contexte).
- Structure ta réponse avec du Markdown (titres, listes).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemPrompt
        }
      });

      if (!response.text) throw new Error("Réponse vide de l'IA");
      
      const assistantMessage = response.text || "";
      const updatedMessages: Message[] = [...newMessages, { role: "assistant", content: assistantMessage }];
      setMessages(updatedMessages);

      // Save to history backend
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentSessionId,
          title: newMessages[0].content.substring(0, 40) + "...",
          messages: updatedMessages
        })
      }).catch(console.error);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: lang === 'fr' ? "Désolé, une erreur est survenue lors de la communication avec l'IA." : "عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderModuleContent = () => {
    switch(activeTab) {
      case 0: // Chat
        return (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-10 scrollbar-hide">
              <div className="max-w-3xl mx-auto space-y-8">
                <AnimatePresence mode="popLayout">
                  {messages.length === 0 ? (
                    <motion.div 
                      key="welcome"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-10 md:py-20 text-center"
                    >
                      <div className="w-16 h-16 bg-emerald-50 text-[#065F46] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100/50">
                        <Sparkles size={32} />
                      </div>
                      <h2 className="text-3xl font-extrabold text-[#111827] mb-8">
                        {lang === 'fr' ? "Bienvenue sur OrientAI" : "مرحباً بكم في OrientAI"}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { fr: "Quelles sont les meilleures écoles d'ingénierie ?", ar: "ما هي أفضل كليات الهندسة؟" },
                          { fr: "Comment entrer à l'ENCG ?", ar: "كيفية الالتحاق بالمدرسة الوطنية للتجارة والتسيير؟" },
                          { fr: "Filières après un Bac Science ?", ar: "تخصصات après شهادة البكالوريا علوم؟" },
                          { fr: "Écoles de commerce à Casablanca", ar: "مدارس التجارة في الدار البيضاء" }
                        ].map((hint, i) => (
                          <button 
                            key={i}
                            onClick={() => setInput(lang === 'fr' ? hint.fr : hint.ar)}
                            className="p-5 bg-white border border-[#E5E7EB] rounded-2xl text-left text-sm text-[#1F2937] hover:border-[#10B981] hover:shadow-md transition-all flex items-center justify-between group"
                            dir={t.dir}
                          >
                            <span className="font-medium">{lang === 'fr' ? hint.fr : hint.ar}</span>
                            <ArrowRight size={16} className="text-[#10B981] opacity-0 group-hover:opacity-100 transform transition-all translate-x-[-10px] group-hover:translate-x-0" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "flex gap-5 w-full",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm font-bold text-xs uppercase",
                          msg.role === "user" ? "bg-[#6366F1] text-white" : "bg-[#065F46] text-white"
                        )}>
                          {msg.role === "user" ? "U" : "AI"}
                        </div>
                        <div className={cn(
                          "flex-1 flex flex-col",
                          msg.role === "user" ? "items-end" : "items-start"
                        )}>
                          {msg.role === "assistant" && (
                            <span className="text-xs font-bold text-[#065F46] mb-1 uppercase tracking-wider">Conseiller Expert OrientAI</span>
                          )}
                          <div className={cn(
                            "max-w-full rounded-2xl px-6 py-4 shadow-sm leading-relaxed",
                            msg.role === "user" 
                              ? "bg-[#6366F1] text-white rounded-tr-none" 
                              : "bg-white border border-[#E5E7EB] text-[#1F2937] rounded-tl-none prose prose-slate prose-sm max-w-none shadow-sm"
                          )}>
                            {msg.role === "assistant" ? (
                              <div className="markdown-content">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}

                  {isLoading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-5 items-center"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#065F46] text-white flex items-center justify-center animate-pulse">
                        <Bot size={20} />
                      </div>
                      <div className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-3 text-sm text-[#6B7280] font-medium shadow-sm animate-pulse">
                        {t.loading}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-8 bg-[#F3F4F6] border-t border-[#E5E7EB]">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-lg shadow-black/[0.03] flex items-center gap-4">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={t.placeholder}
                    className="flex-1 bg-transparent px-2 py-1 outline-none text-[#1F2937] placeholder:text-[#9CA3AF] text-[0.95rem]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-[#065F46] text-white px-6 py-2.5 rounded-lg hover:bg-[#044e3a] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                  >
                    <span>{t.send}</span>
                    <Send size={16} className={cn("transition-transform", t.dir === "rtl" ? "transform rotate-180" : "")} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 1: // Schools
        return (
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <div className="max-w-5xl mx-auto font-[Inter]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#111827]">{lang === "fr" ? "Établissements Partenaires" : "المؤسسات الشريكة"}</h2>
                  <p className="text-sm text-[#6B7280]">{lang === "fr" ? "Explorez les options de formation à travers le Maroc." : "استكشف خيارات التكوين عبر المغرب."}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schools.length > 0 ? schools.map((school, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest mb-2 flex items-center gap-2">
                       <School size={12} /> {school.city}
                    </div>
                    <h3 className="text-lg font-bold text-[#111827] mb-2 group-hover:text-[#065F46] transition-colors">{school.name}</h3>
                    <div className="text-xs text-[#6B7280] font-medium mb-4 flex items-center gap-1">
                      <BookOpen size={12} /> {school.field}
                    </div>
                    <p className="text-sm text-[#374151] line-clamp-3 leading-relaxed">{school.description}</p>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    Chargement des établissements...
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 2: // Fields
        return (
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-extrabold text-[#111827] mb-8">{lang === "fr" ? "Parcours & Métiers" : "المسارات والمهن"}</h2>
              <div className="space-y-4">
                {[
                  { title_fr: "Ingénierie & Technologie", title_ar: "الهندسة والتكنولوجيا", count: schools.filter(s => s.field.toLowerCase().includes('ingénierie')).length },
                  { title_fr: "Management & Gestion", title_ar: "التدبير والتسيير", count: schools.filter(s => s.field.toLowerCase().includes('gestion')).length },
                  { title_fr: "Statistiques & Économie", title_ar: "الإحصائيات والاقتصاد", count: schools.filter(s => s.field.toLowerCase().includes('statistique')).length },
                  { title_fr: "Technique & Professionnel", title_ar: "التقني والمهني", count: schools.filter(s => s.field.toLowerCase().includes('technique')).length }
                ].map((field, i) => (
                  <div key={i} className="bg-white border border-[#E5E7EB] p-5 rounded-2xl flex items-center justify-between hover:bg-[#F9FAFB] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-[#065F46] rounded-xl flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#111827]">{lang === 'fr' ? field.title_fr : field.title_ar}</h4>
                        <p className="text-xs text-[#6B7280]">{field.count} {lang === 'fr' ? 'Établissements correspondants' : 'مؤسسات مطابقة'}</p>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-300 group-hover:text-[#10B981] transition-colors" size={20} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 3: // History
        return (
          <div className="flex-1 overflow-y-auto px-8 py-10">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-extrabold text-[#111827] mb-8">{lang === "fr" ? "Historique des conversations" : "سجل المحادثات"}</h2>
              {isLoadingHistory ? (
                <div className="text-center py-20 text-[#6B7280] font-medium">{t.loading}</div>
              ) : historySessions.length === 0 ? (
                <div className="text-center py-20 text-[#6B7280] italic">
                  {lang === 'fr' ? "Aucun historique disponible." : "لا يوجد سجل متاح."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {historySessions.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(session => (
                    <div 
                      key={session.id} 
                      onClick={() => {
                        setMessages(session.messages || []);
                        setCurrentSessionId(session.id);
                        setActiveTab(0);
                      }}
                      className="bg-white border border-[#E5E7EB] p-5 rounded-2xl flex items-center justify-between hover:bg-[#F9FAFB] hover:border-[#10B981] transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-bold text-[#111827] truncate text-sm md:text-base">{session.title}</h4>
                        <p className="text-xs text-[#6B7280] mt-1">{new Date(session.updatedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'ar-MA')}</p>
                      </div>
                      <ArrowRight className="text-gray-300 group-hover:text-[#10B981] transition-colors shrink-0" size={20} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("h-screen bg-[#F3F4F6] flex overflow-hidden font-sans text-[#1F2937]", t.dir === "rtl" && "text-right font-[Inter]")} dir={t.dir}>
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex w-[260px] bg-[#111827] text-white flex-col p-6 shrink-0 z-50 transition-all",
        t.dir === "rtl" ? "border-l border-white/10" : "border-r border-white/10"
      )}>
        <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setActiveTab(0)}>
          <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">{t.title}</span>
        </div>

        <div className="mb-8">
           <button 
             onClick={startNewChat} 
             className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-white py-2.5 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-bold shadow-sm"
           >
             <Bot size={16} /> {lang === 'fr' ? 'Nouvelle Discussion' : 'محادثة جديدة'}
           </button>
        </div>

        <nav className="flex-1 space-y-1">
          {t.nav.map((item, i) => (
            <div 
              key={i} 
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                activeTab === i ? "bg-white/10 text-white shadow-inner" : "text-[#D1D5DB] hover:bg-white/5 hover:text-white"
              )}
            >
              {i === 0 && <LayoutDashboard size={18} />}
              {i === 1 && <School size={18} />}
              {i === 2 && <BookOpen size={18} />}
              {i === 3 && <History size={18} />}
              <span>{item}</span>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex bg-black/20 rounded-xl p-1 mb-6">
            <button 
              onClick={() => setLang("fr")}
              className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all", lang === "fr" ? "bg-[#10B981] text-white" : "text-gray-400")}
            >
              FRANÇAIS
            </button>
            <button 
              onClick={() => setLang("ar")}
              className={cn("flex-1 text-[10px] font-bold py-2 rounded-lg transition-all", lang === "ar" ? "bg-[#10B981] text-white" : "text-gray-400")}
            >
              العربية
            </button>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold">AB</div>
            <div className="overflow-hidden">
               <p className="text-xs font-bold truncate">{t.user}</p>
               <p className="text-[10px] text-gray-500 truncate">Étudiant</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 shrink-0">
          <div className="text-sm text-[#6B7280] font-medium">
            Module: <span className="text-[#1F2937] uppercase tracking-wider font-bold">{t.nav[activeTab]}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-1.5 rounded-full">
                <Sparkles size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-gray-600 uppercase">AI Premium Active</span>
             </div>
          </div>
        </header>

        {/* Dynamic Content */}
        {renderModuleContent()}
      </main>

      <style>{`
        .markdown-content h1 { font-size: 1.25rem; font-weight: 800; color: #111827; margin-bottom: 0.75rem; }
        .markdown-content h2 { font-size: 1.15rem; font-weight: 800; color: #111827; margin-bottom: 0.75rem; margin-top: 1.5rem; border-left: 4px solid #10B981; padding-left: 12px; }
        .markdown-content p { margin-bottom: 1rem; line-height: 1.7; color: #374151; }
        .markdown-content ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
        .markdown-content li { margin-bottom: 0.5rem; }
        .markdown-content strong { color: #065F46; font-weight: 700; }
        
        [dir="rtl"] .markdown-content h2 { border-left: 0; border-right: 4px solid #10B981; padding-left: 0; padding-right: 12px; }
        [dir="rtl"] .markdown-content ul { margin-left: 0; margin-right: 1.5rem; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
