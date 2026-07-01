"use client";

import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hola, soy el asistente de FleetIQ. ¿En qué te puedo ayudar hoy?", isBot: true },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { text: message, isBot: false }]);
    setMessage("");

    // Simulate response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Actualmente opero en modo demostración. Pronto podré resolver esta consulta.", isBot: true },
      ]);
    }, 1000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform",
          isOpen ? "scale-0" : "scale-100"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div
        className={cn(
          "fixed bottom-6 right-6 w-[350px] h-[500px] max-h-[80vh] bg-card border border-border shadow-2xl rounded-2xl flex flex-col transition-all duration-300 transform origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="h-16 bg-primary text-white rounded-t-2xl flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Asistente IA</div>
              <div className="text-xs text-white/80">En línea</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.isBot ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  msg.isBot ? "bg-muted text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="h-16 border-t border-border flex items-center px-4 gap-2 shrink-0">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
