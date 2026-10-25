import { ChatWidget } from "@/components/chat/chat-widget";
import { Hero } from "@/components/landing/hero";
import { About, AiSupport, Contact, Footer, Recruitment, Services, Solutions, Stats } from "@/components/landing/sections";
import { SiteNav } from "@/components/landing/site-nav";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Services />
        <Solutions />
        <AiSupport />
        <About />
        <Recruitment />
        <Contact />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
