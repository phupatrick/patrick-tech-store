import Image from "next/image";

type ContactChannel = "zalo" | "telegram";

type ContactChannelIconProps = {
  channel: ContactChannel;
  className?: string;
};

export function ContactChannelIcon({ channel, className = "" }: ContactChannelIconProps) {
  const classes = `contact-icon contact-icon-${channel}${className ? ` ${className}` : ""}`;
  const src = channel === "zalo" ? "/logos/zalo.svg" : "/logos/telegram.svg";
  const alt = channel === "zalo" ? "Zalo" : "Telegram";

  return (
    <span className={classes} aria-hidden="true">
      <Image src={src} alt={alt} width={28} height={28} className="contact-icon-image" />
    </span>
  );
}
