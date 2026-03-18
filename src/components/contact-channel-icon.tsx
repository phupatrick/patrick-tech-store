type ContactChannel = "zalo" | "telegram";

type ContactChannelIconProps = {
  channel: ContactChannel;
  className?: string;
};

export function ContactChannelIcon({ channel, className = "" }: ContactChannelIconProps) {
  const classes = `contact-icon contact-icon-${channel}${className ? ` ${className}` : ""}`;
  const src = channel === "zalo" ? "/logos/zalo.svg" : "/logos/telegram.svg";

  return (
    <span className={classes} aria-hidden="true">
      <img src={src} alt="" width={28} height={28} className="contact-icon-image" loading="lazy" decoding="async" />
    </span>
  );
}
