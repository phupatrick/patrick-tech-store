type ContactChannel = "zalo" | "telegram";

type ContactChannelIconProps = {
  channel: ContactChannel;
  className?: string;
};

export function ContactChannelIcon({ channel, className = "" }: ContactChannelIconProps) {
  const classes = `contact-icon contact-icon-${channel}${className ? ` ${className}` : ""}`;

  if (channel === "zalo") {
    return (
      <span className={classes} aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" role="presentation">
          <rect x="2.5" y="2.5" width="27" height="27" rx="13.5" fill="#1473FF" />
          <path
            d="M9.1 10.25c0-1.52 1.23-2.75 2.75-2.75h8.3c1.52 0 2.75 1.23 2.75 2.75v7.35c0 1.52-1.23 2.75-2.75 2.75h-4.08l-2.7 3.05c-.43.49-1.23.18-1.23-.48v-2.57h-.3A2.75 2.75 0 0 1 9.1 17.6v-7.35Z"
            fill="white"
          />
          <path
            d="M12.45 12.05h7.15"
            stroke="#1473FF"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M12.45 14.95h6.1"
            stroke="#1473FF"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M12.45 17.85h4.2"
            stroke="#1473FF"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <text x="16" y="18.1" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#1473FF">
            Zalo
          </text>
        </svg>
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" role="presentation">
        <rect x="2.5" y="2.5" width="27" height="27" rx="13.5" fill="#229ED9" />
        <path
          d="M24.16 8.98 7.64 15.35c-.75.3-.71 1.38.06 1.61l4.21 1.3 1.63 5.02c.23.7 1.16.82 1.56.22l2.34-3.5 4.04 2.99c.69.51 1.67.13 1.83-.72L25.6 10.1c.18-.87-.59-1.45-1.44-1.12Z"
          fill="white"
        />
        <path
          d="m12.6 18.2 7.7-6.35"
          stroke="#229ED9"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
