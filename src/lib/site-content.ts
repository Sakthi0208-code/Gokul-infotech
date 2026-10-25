// Landing page content, rewritten from the public Gokul Infocare website
// (gokulinfocare.com: home, About us and Solutions pages, read 2026-10-25).
// Keep facts here accurate to that source; do not add made-up numbers.

export const OFFICIAL_SITE = "https://gokulinfocare.com";
export const OFFICIAL_CONTACT_PAGE = "https://gokulinfocare.com/contact-us/";
export const CONTACT_EMAIL = "info@gokulinfocare.com";
export const CONTACT_PHONE = "0413 416 849";

export const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#solutions", label: "Solutions" },
  { href: "#recruitment", label: "Recruitment" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export const STATS = [
  { value: 5, suffix: "", label: "State governments: accredited ICT supplier" },
  { value: 8, suffix: "", label: "Service lines" },
  { value: 2, suffix: "", label: "Countries served: Australia & New Zealand" },
  { value: 24, suffix: "/7", label: "AI support assistant availability" },
];

export const SERVICES = [
  {
    title: "ERP Solutions",
    text: "We guide clients through ERP selection, implementation, optimisation and business process improvement.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    title: "SAP Consulting",
    text: "SAP-certified consultants who implement, enhance and support SAP systems across multiple versions.",
    icon: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  },
  {
    title: "Internet of Things",
    text: "We design, develop, implement and manage IoT solutions that keep your business current.",
    icon: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4m8.4 0a6 6 0 0 0 0-8.4M5 5a10 10 0 0 0 0 14m14 0a10 10 0 0 0 0-14",
  },
  {
    title: "Asset Tracking",
    text: "Pool car reservations, real-time tracking and user authorisations, hosted in an Australian data centre as a service.",
    icon: "M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  },
  {
    title: "Integrated GIS Solutions",
    text: "The latest GIS technologies, including Esri, GE Smallworld, Google and open-source platforms.",
    icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14",
  },
  {
    title: "Mobile Applications",
    text: "Mobile apps that put your business systems and field data in your team's hands.",
    icon: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 15h2",
  },
  {
    title: "Recruitment Services",
    text: "Queensland State Government approved recruitment provider for IT and medical roles.",
    icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8",
  },
  {
    title: "Solution Providers",
    text: "End-to-end delivery that brings our ERP, GIS, IoT and mobile expertise together for your project.",
    icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8Z",
  },
];

export const SOLUTIONS = [
  {
    id: "parking",
    tab: "Parking Sensors",
    title: "Smart parking sensors",
    text: "A magnetic sensor placed on the road surface detects when a vehicle parks over it, showing real-time parking availability.",
    points: [
      "Real-time parking availability",
      "Tracks how long each vehicle has been parked",
      "Easy installation with no civil works",
      "Long-life battery with minimal maintenance",
    ],
  },
  {
    id: "fleet",
    tab: "Fleet Tracking",
    title: "IoT fleet and asset tracking",
    text: "Built-in vehicle sensors help businesses see exactly how their fleet is used.",
    points: [
      "Live location and trip details",
      "Driver ID and speed monitoring",
      "Fuel use per trip",
      "Service alerts and reports",
    ],
  },
  {
    id: "erp-map",
    tab: "ERP on Map",
    title: "ERP data on the map",
    text: "Any ERP data can be shown on a map by linking GIS and ERP records through stored geolocations.",
    points: [
      "Built-in GIS engine",
      "Quick navigation to all your data",
      "Configurable menus and easy integration",
      "Reports on maps, exported to common file formats",
    ],
  },
] as const;

export type SolutionId = (typeof SOLUTIONS)[number]["id"];

// Named in text on the About us page.
export const CLIENTS = [
  "City of Gold Coast",
  "NSW Police",
  "Sydney Transport",
  "BHP Billiton Iron Ore",
];

export const ACCREDITATIONS = [
  "Accredited ICT supplier for TAS, SA, NT, NSW and QLD State Government agencies",
  "Queensland State Government registered labour hire provider (Licence LHL-02852-S7POR)",
  "Queensland State Government approved recruitment provider: IT and medical",
];
