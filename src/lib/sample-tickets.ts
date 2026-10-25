export interface SampleTicket {
  label: string;
  text: string;
}

export const SAMPLE_TICKETS: SampleTicket[] = [
  {
    label: "Account access",
    text: "I cannot log in to my account. I have tried resetting my password three times, but I still cannot access the dashboard.",
  },
  {
    label: "Billing",
    text: "Hi, I was charged twice for my monthly subscription this month. Both charges show on my card statement from the 3rd. Can you please look into this and refund the extra charge?",
  },
  {
    label: "Technical error",
    text: "When I try to export my report as a PDF, the page shows 'Error 500 - something went wrong'. Exporting to CSV still works. This started yesterday on Chrome and Edge.",
  },
  {
    label: "Feature request",
    text: "Love the product! It would be great if we could schedule reports to be emailed to our team every Monday morning. Is this something you are planning to add?",
  },
  {
    label: "Service outage",
    text: "URGENT: Your whole platform has been down for our entire company for the last 40 minutes. None of our 200 staff can load the app and your status page still says everything is operational. We are losing sales every minute.",
  },
];
