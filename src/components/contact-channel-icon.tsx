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
          <rect x="3" y="3" width="26" height="26" rx="13" fill="#2563EB" />
          <path
            d="M10 11.75h8.65l-6.35 8.5h8.1"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" role="presentation">
        <rect x="3" y="3" width="26" height="26" rx="13" fill="#0891B2" />
        <path
          d="M10.5 15.65 21.9 11.05c.52-.2 1.03.3.83.82l-4.32 11.32c-.2.53-.93.59-1.22.1l-2.21-3.82-2.57-1.22c-.55-.26-.54-1.04.02-1.27Z"
          fill="white"
        />
        <path
          d="m14.3 19.25 4.75-5.4"
          stroke="#1D4ED8"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
