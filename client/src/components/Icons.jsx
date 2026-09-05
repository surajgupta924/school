/* Minimal stroke icon set (inherits currentColor, 1.7px strokes) */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
      {children}
    </svg>
  );
}

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="3.2" />
    <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 4.13A4 4 0 0 1 16 11.6" />
  </Svg>
);

export const IconUser = (p) => (
  <Svg {...p}>
    <path d="M19 20v-2a5 5 0 0 0-5-5h-4a5 5 0 0 0-5 5v2" />
    <circle cx="12" cy="7" r="3.6" />
  </Svg>
);

export const IconTeacher = (p) => (
  <Svg {...p}>
    <path d="M3 7.5 12 3l9 4.5-9 4.5z" />
    <path d="M7 10v5.2c0 1.6 2.4 2.8 5 2.8s5-1.2 5-2.8V10" />
    <path d="M21 7.5V13" />
  </Svg>
);

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M4 4.5A2 2 0 0 1 6 3h13v14H6a2 2 0 0 0-2 2z" />
    <path d="M4 18.5A2 2 0 0 1 6 17h13v4H6a2 2 0 0 1-2-2z" />
  </Svg>
);

export const IconCheckSquare = (p) => (
  <Svg {...p}>
    <path d="M9 11.5 11.5 14 16 8.5" />
    <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
  </Svg>
);

export const IconQr = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.4" />
    <rect x="14" y="3" width="7" height="7" rx="1.4" />
    <rect x="3" y="14" width="7" height="7" rx="1.4" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M20 20v.01M17.5 17.5v.01" />
  </Svg>
);

export const IconIdCard = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <circle cx="8.5" cy="11" r="2.2" />
    <path d="M5 16.5c.6-1.6 2-2.4 3.5-2.4s2.9.8 3.5 2.4M14.5 9.5h4M14.5 13h4" />
  </Svg>
);

export const IconRupee = (p) => (
  <Svg {...p}>
    <path d="M7 4h10M7 8.5h10M15.5 4c0 3.2-2.2 4.5-5 4.5H7l8 11" />
  </Svg>
);

export const IconBus = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12.5" rx="2.5" />
    <path d="M3 10.5h18M7.5 4v6.5M16.5 4v6.5" />
    <circle cx="7.5" cy="19" r="1.6" />
    <circle cx="16.5" cy="19" r="1.6" />
  </Svg>
);

export const IconMapPin = (p) => (
  <Svg {...p}>
    <path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10.2" r="2.8" />
  </Svg>
);

export const IconSteering = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <path d="M3.3 10.5h17.4M12 15v6" />
  </Svg>
);

export const IconClipboard = (p) => (
  <Svg {...p}>
    <path d="M9 4.5H7.5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2H15" />
    <rect x="9" y="2.5" width="6" height="4" rx="1.3" />
    <path d="M9 11.5h6M9 15h4" />
  </Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconMegaphone = (p) => (
  <Svg {...p}>
    <path d="M3 11v2a2 2 0 0 0 2 2h2l8 5V4L7 9H5a2 2 0 0 0-2 2z" />
    <path d="M18.5 8.5a5 5 0 0 1 0 7" />
  </Svg>
);

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9z" />
    <path d="M10.4 19.5a2 2 0 0 0 3.2 0" />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.7 15a1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.7h.08A1.6 1.6 0 0 0 10 3.24V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.3 9v.08a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </Svg>
);

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);

export const IconSearch = (p) => (
  <Svg size={16} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
);

export const IconEdit = (p) => (
  <Svg size={15} {...p}>
    <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
    <path d="M18.4 2.6a2 2 0 1 1 2.8 2.8L12 14.5l-3.5.9.9-3.5z" />
  </Svg>
);

export const IconTrash = (p) => (
  <Svg size={15} {...p}>
    <path d="M3.5 6h17M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M18.5 6l-.8 13a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);

export const IconRefresh = (p) => (
  <Svg size={16} {...p}>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
    <path d="M20.5 4v5h-5" />
  </Svg>
);

export const IconPrint = (p) => (
  <Svg {...p}>
    <path d="M6 9V3h12v6M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H18" />
    <rect x="6" y="14" width="12" height="7" rx="1.3" />
  </Svg>
);

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 8.5v4.5M12 16.5v.01" />
    <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Svg>
);

export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M21 13h-5l-1.5 2.5h-5L8 13H3" />
    <path d="M5.5 5h13l2.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
  </Svg>
);

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 21s7-3.2 7-9V5.8L12 3 5 5.8V12c0 5.8 7 9 7 9z" />
    <path d="m9.2 11.8 2 2 3.6-3.8" />
  </Svg>
);

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </Svg>
);

export const IconVideo = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
    <path d="m15.5 10.5 6-3.5v10l-6-3.5z" />
  </Svg>
);

export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M3 21h18M7 17V10M12 17V5M17 17v-4" />
  </Svg>
);
