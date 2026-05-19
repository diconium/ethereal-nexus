import { ChatbotWidget } from '@/components/ChatbotWidget/ChatbotWidget.tsx';
import { ChatbotPrompt } from '@/components/ChatbotPrompt/ChatbotPrompt.tsx';

function App() {
  return (
    <div>
      <h1>Hello World!</h1>
      <ChatbotPrompt
        apiUrl="https://dev.ethereal-nexus.org/api/v1/chatbots/dsv-bot/messages"
        aiTitle="What would you like to know today?"
        inputPlaceholder="Ask about careers, offices, or our services..."
        initialMessage="Hello, I am ready to help. Tell me what you are looking for and I will guide you."
      />
      <ChatbotWidget
        apiUrl="https://dev.ethereal-nexus.org/api/v1/chatbots/dsv-bot/messages"
        initialMessage="Hallo, ich bin Ihr Demo-Chatbot. Wie kann ich Ihnen helfen?"
        quickActions={[
          { label: 'Karriere' },
          { label: 'Kontakt' },
          { label: 'Leistungen' },
          { label: 'Standorte' },
        ]}
      />
    </div>
  );
}

export default App;
