// Ready-made issues customers can pick in the chatbot. Picking one sends the
// message text to the AI, which then asks follow-up questions or suggests fixes.
export interface ChatTopic {
  icon: string;
  label: string;
  message: string;
}

export const CHAT_TOPICS: ChatTopic[] = [
  { icon: "🔐", label: "Can't log in", message: "I can't log in to my account, even after resetting my password." },
  { icon: "🚐", label: "Fleet tracker offline", message: "Our fleet GPS trackers stopped updating their live location." },
  { icon: "📊", label: "SAP / ERP report error", message: "Exporting a report from our SAP / ERP system fails with an error." },
  { icon: "📱", label: "Mobile app crash or sync", message: "The mobile app keeps crashing or won't sync our data." },
  { icon: "🐢", label: "System is slow", message: "The system has been very slow since this morning." },
  { icon: "🧾", label: "Billing or invoice", message: "There's a problem with our invoice. I think we were charged incorrectly." },
  { icon: "🅿️", label: "Parking sensor issue", message: "Our parking sensors are not showing real-time bay availability." },
  { icon: "🗺️", label: "GIS map not loading", message: "The GIS map layers are not loading on our dashboard." },
  { icon: "🚨", label: "Service down for everyone", message: "The service is completely down for everyone in our team." },
  { icon: "🛡️", label: "Security concern", message: "I think someone else has accessed our account without permission." },
  { icon: "💡", label: "Request a feature", message: "I'd like to request a new feature for our system." },
  { icon: "👥", label: "Recruitment enquiry", message: "I have a question about your IT or medical recruitment services." },
];

export const INITIAL_TOPIC_COUNT = 6;
