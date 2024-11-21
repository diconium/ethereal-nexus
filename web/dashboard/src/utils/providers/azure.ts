import type { EmailUserConfig, EmailConfig } from 'next-auth/providers';
import { EmailClient } from '@azure/communication-email';

const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const client = new EmailClient(connectionString!);

/** @todo Document this */
export default function Azure(config: EmailUserConfig): EmailConfig {
  return {
    id: "azure-communication-service",
    type: "email",
    name: "Azure",
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest(params) {
      console.log("Azure sendVerificationRequest", params)
      const { identifier: to, provider, url, theme } = params
      const { host } = new URL(url)

      const escapedHost = host.replace(/\./g, "&#8203;.")

      const brandColor = theme.brandColor || "#346df1"

      const buttonText = theme.buttonText || "#fff"

      const color = {
        background: "#f9f9f9",
        text: "#444",
        mainBackground: "#fff",
        buttonBackground: brandColor,
        buttonBorder: brandColor,
        buttonText,
      }

      if(!provider.from) {
        throw new Error("Azure error: no from address found")
      }

      const emailMessage = {
        senderAddress: provider.from,
        content: {
          subject: `Sign in to ${host}`,
          plainText: `Sign in to ${host}\n${url}\n\n`,
          html: `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Sign in to <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`,
        },
        recipients: {
          to: [{ address: to }],
        },
      };

      const poller = await client.beginSend(emailMessage);
      const result = await poller.pollUntilDone();

      if(result.error) {
        throw new Error("Azure error: " + JSON.stringify(result.error.message))
      }
    },
    options: config,
  }
}