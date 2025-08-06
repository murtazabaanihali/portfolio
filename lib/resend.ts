import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendContactMail = async ({
    name,
    email,
    subject,
    message,
}: {
    name: string;
    email: string;
    subject: string;
    message: string;
}) => {
    const _from = process.env.EMAIL_SENDER;
    const _to = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    if (!_from || !_to) {
        throw new Error(
            `No 'From' or 'To' addresses provided when sending the email.`
        );
    };

    const htmlBody = `
        <h2>New message via your portfolio contact form</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>
    `;

    const { error, data } = await resend.emails.send({
        from: _from,
        to: _to,
        subject: `New portfolio contact: ${subject}`,
        html: htmlBody,
    });

    if (error) {
        console.error(
            `Error sending email using resend: ${JSON.stringify(error, null, 2)}`,
            "From: ",
            _from,
            "TO: ",
            _to
        );
    };

    return null;
};