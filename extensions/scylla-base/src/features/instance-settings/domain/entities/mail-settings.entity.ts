/** How the server makes its connection to the relay secure. */
export type MailSecurity = 'tls' | 'starttls' | 'none';

/** The SMTP relay that an instance admin set. The server never gives its password. */
export interface MailRelay {
  host: string;
  port: number;
  security: MailSecurity;
  /** Empty: the relay asks for no user name and no password. */
  username: string;
  /** True: the server keeps a password for this relay. */
  passwordSet: boolean;
  fromAddress: string;
  /** Empty: the mails show the address only. */
  fromName: string;
}

export interface MailSettings {
  /** `null`: the server uses its default mailer. */
  relay: MailRelay | null;
  /** The host of the default mailer of the server. Empty: it writes the mails to its log. */
  defaultHost: string;
}

export interface UpdateMailSettingsInput {
  host: string;
  port: number;
  security: MailSecurity;
  username: string;
  /** `undefined`: the server keeps the password that it has. */
  password?: string;
  fromAddress: string;
  fromName: string;
}

/** The answer of the relay to a test mail. */
export type TestMailResult =
  | { accepted: true; host: string; reply: string; messageId: string }
  | { accepted: false; host: string; error: string };
